import os
import asyncio
import math
import hashlib
import time
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, SecretStr

from .models import (
    TradeConfig, ApiKeyConfig, BacktestRequest, BacktestResult,
    PinVerifyRequest, PinSetRequest
)
from .database import (
    init_db, get_trades, get_trade_stats, get_recent_logs, add_log,
    save_setting, get_setting, get_pnl_calendar_data, clear_trades
)
from .scalper_engine import bot_engine
from .gemini_agent import gemini_agent
from .binance_client import BinanceFuturesClient
from .websocket_manager import ws_manager
from .backtester import backtester
from . import telegram_notifier


class TelegramConfig(BaseModel):
    bot_token: SecretStr
    chat_id: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    add_log("INFO", "SYSTEM", "Hệ thống Binance Futures Scalping Bot khởi động")
    # Monitor prices/dashboard, but require explicit Start before placing entries.
    bot_engine.ensure_tasks()
    try:
        yield
    finally:
        await bot_engine.shutdown()
        from .market_scanner import market_scanner
        if hasattr(market_scanner.exchange, "close"):
            market_scanner.exchange.close()
        add_log("INFO", "SYSTEM", "Hệ thống Binance Futures Scalping Bot tắt")

app = FastAPI(title="Binance Futures Scalper Pro", lifespan=lifespan)

@app.get("/api/telegram/status")
def telegram_status():
    return telegram_notifier.get_status()


@app.post("/api/telegram/config")
def telegram_config(config: TelegramConfig):
    success = telegram_notifier.configure_and_test(config.bot_token.get_secret_value(), config.chat_id)
    return {"success": success,
            "message": "Đã lưu vĩnh viễn cấu hình Telegram vào cơ sở dữ liệu và gửi tin thử thành công! Bot sẽ tự động duy trì thông báo kể cả khi khởi động lại." if success else "Gửi tin thử thất bại; kiểm tra token, Chat ID và quyền gửi tin của bot",
            "status": telegram_notifier.get_status()}


@app.post("/api/telegram/test")
def telegram_test():
    success = telegram_notifier.send_test()
    return {"success": success, "message": "Đã gửi tin thử thành công từ máy chủ Telegram" if success else "Không gửi được tin; hãy kiểm tra cấu hình Telegram trên máy chủ",
            "status": telegram_notifier.get_status()}


@app.delete("/api/telegram/config")
def telegram_clear():
    telegram_notifier.clear_config()
    return {"success": True, "message": "Đã xóa cấu hình Telegram",
            "status": telegram_notifier.get_status()}

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})

# Allow CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoints ---

@app.get("/api/status")
def get_bot_status():
    return bot_engine.get_status()

@app.post("/api/testnet/pnl/reset")
async def reset_testnet_pnl():
    async with bot_engine.entry_lock, bot_engine.order_lock:
        client = bot_engine.binance_client
        if bot_engine.config.mode != "testnet" or client.environment != "testnet":
            raise ValueError("Chỉ được reset PnL lượt thử trên Testnet; không áp dụng Live")
        if bot_engine.is_running or bot_engine.live_entry_orders or bot_engine.paper_trader.open_positions:
            raise ValueError("Dừng bot và xử lý hết vị thế/tracker trước khi reset PnL")
        if not client.api_key or not client.api_secret:
            raise ValueError("Cần cấu hình API Key Testnet")
        def verify_flat_account():
            client._daily_pnl_cache = None
            client.fetch_daily_pnl()  # Fail closed if account income is unreadable.
            if client.fetch_open_positions():
                raise ValueError("Còn vị thế trên Testnet; không thể reset PnL")
            for response in (client.exchange.fapiPrivateGetOpenOrders(), client.exchange.fapiPrivateGetOpenAlgoOrders()):
                rows = response if isinstance(response, list) else response.get("orders", response.get("data")) if isinstance(response, dict) else None
                if not isinstance(rows, list):
                    raise ValueError("Không xác minh được lệnh chờ trên Testnet")
                if rows:
                    raise ValueError("Còn lệnh chờ trên Testnet; không thể reset PnL")
        await asyncio.to_thread(verify_flat_account)
        since_ms = int(time.time() * 1000)
        save_setting("testnet_pnl_reset", {"since_ms": since_ms,
                     "account": hashlib.sha256(client.api_key.encode()).hexdigest()})
        client._daily_pnl_cache = None
        pnl = await asyncio.to_thread(client.fetch_daily_pnl)
        bot_engine.daily_loss_hit = False
        add_log("INFO", "RISK", "Đặt mốc PnL lượt test mới; không xóa lịch sử thu nhập trên Binance")
        return {"success": True, "daily_pnl": pnl, "since_ms": since_ms,
                "message": "Đã reset PnL lượt test; lịch sử PnL trên Binance giữ nguyên"}

@app.post("/api/bot/start")
async def start_bot():
    async with bot_engine.entry_lock:
        await bot_engine.start()
    return {"success": True, "message": "Bot đã khởi động thành công"}

@app.post("/api/bot/stop")
async def stop_bot():
    bot_engine.stop()
    return {"success": True, "message": "Bot đã tạm dừng"}

@app.post("/api/bot/panic")
async def panic_stop():
    bot_engine.stop()
    async with bot_engine.entry_lock, bot_engine.order_lock:
        res = await bot_engine.panic_close_all()
    return res

@app.get("/api/config")
def get_config():
    return bot_engine.config.model_dump()

@app.post("/api/config")
async def update_config(config: TradeConfig):
    async with bot_engine.entry_lock, bot_engine.order_lock:
        bot_engine.update_config(config)
    return {"success": True, "config": bot_engine.config.model_dump()}

@app.post("/api/api-keys")
async def save_api_keys(keys: ApiKeyConfig):
    async with bot_engine.entry_lock, bot_engine.order_lock:
        if bot_engine.is_running or bot_engine.live_entry_orders or bot_engine.paper_trader.open_positions:
            raise ValueError("Dừng bot và đóng vị thế trước khi đổi API Key")
        if bot_engine.config.mode != "paper" and bot_engine.binance_client.api_key:
            try:
                positions = await asyncio.to_thread(bot_engine.get_positions)
            except ValueError as exc:
                # An expired/revoked key must not prevent replacing itself, but
                # never bypass a network error or a readable open position.
                if "-2015" not in str(exc) and "-2014" not in str(exc):
                    raise
            else:
                if positions:
                    raise ValueError("Cần đóng vị thế trên sàn trước khi đổi API Key")
        if bot_engine.config.mode != "paper" and keys.environment != bot_engine.config.mode:
            raise ValueError("Môi trường API Key không khớp với chế độ giao dịch hiện tại")
        candidate = BinanceFuturesClient(
            keys.api_key,
            keys.api_secret,
            testnet=keys.environment == "testnet",
            demo=keys.environment == "demo",
        )
        try:
            result = await asyncio.to_thread(candidate.test_connection)
            if result.get("success"):
                positions = await asyncio.to_thread(candidate.fetch_open_positions)
                if positions:
                    raise ValueError("Tài khoản API mới còn vị thế mở; hãy đóng vị thế trước khi thay khóa")
        finally:
            await candidate.close()
        if not result.get("success"):
            return result
        if bot_engine.ws_stream_task:
            bot_engine.ws_stream_task.cancel()
            await asyncio.gather(bot_engine.ws_stream_task, return_exceptions=True)
        await bot_engine.binance_client.close()
        try:
            await asyncio.to_thread(
                bot_engine.update_api_keys,
                keys.api_key,
                keys.api_secret,
                keys.environment == "testnet",
                keys.environment == "demo",
            )
        finally:
            bot_engine.ws_stream_task = asyncio.create_task(bot_engine.run_ws_ticker_stream())
        return result

@app.get("/api/test-connection")
def test_connection():
    return bot_engine.binance_client.test_connection()

@app.get("/api/positions")
def get_positions():
    return bot_engine.get_positions()

@app.post("/api/positions/{pos_id:path}/close")
async def close_position(pos_id: str):
    async with bot_engine.entry_lock, bot_engine.order_lock:
        res = bot_engine.close_single_position(pos_id) if bot_engine.config.mode == "paper" else await asyncio.to_thread(bot_engine.close_single_position, pos_id)
    await bot_engine.broadcast_state()
    return res

@app.get("/api/balance")
def get_balance():
    return bot_engine.get_balance()

@app.post("/api/paper/reset")
async def reset_paper_balance(amount: float = Query(default=10000.0, gt=0, le=1_000_000_000)):
    if not math.isfinite(amount):
        raise ValueError("Số dư không hợp lệ")
    async with bot_engine.entry_lock:
        if bot_engine.is_running or bot_engine.paper_trader.open_positions:
            raise ValueError("Dừng bot và đóng vị thế Paper trước khi đặt lại số dư")
        bot_engine.paper_trader.reset_balance(amount)
    return {"success": True, "message": f"Đã đặt lại số dư giả lập về {amount} USDT"}

@app.get("/api/trades")
def get_trades_history(limit: int = Query(default=50, ge=1, le=1000), mode: Optional[str] = None):
    return get_trades(limit=limit, mode=mode)

@app.delete("/api/trades")
async def delete_trades_history(mode: Optional[str] = None):
    async with bot_engine.entry_lock:
        if bot_engine.is_running or await asyncio.to_thread(bot_engine.get_positions):
            raise ValueError("Dừng bot và đóng vị thế trước khi xóa lịch sử")
        count = clear_trades(mode=mode)
    return {"success": True, "deleted_count": count}

@app.get("/api/stats")
def get_stats(mode: Optional[str] = None):
    return get_trade_stats(mode=mode)

@app.get("/api/pnl/calendar")
def get_pnl_calendar(year: int = Query(default=datetime.now().year, ge=1970, le=9999), month: int = Query(default=datetime.now().month, ge=1, le=12), mode: Optional[str] = None):
    return get_pnl_calendar_data(year=year, month=month, mode=mode)


class GeminiKeyPayload(BaseModel):
    api_key: str
    model: Optional[str] = "gemini-2.5-flash"

@app.get("/api/ai/regime")
def get_ai_regime():
    return {
        "analysis": gemini_agent.last_analysis,
        "last_run_time": gemini_agent.last_run_time,
        "is_analyzing": gemini_agent.is_analyzing,
        "has_api_key": gemini_agent.has_api_key(),
        "model": gemini_agent.model_name
    }

@app.post("/api/ai/analyze")
async def trigger_ai_analyze():
    res = await bot_engine.trigger_ai_analysis()
    return {"success": True, "analysis": res}

@app.post("/api/ai/key")
def set_gemini_key(req: GeminiKeyPayload):
    gemini_agent.set_api_key(req.api_key)
    if req.model:
        gemini_agent.set_model(req.model)
    return {"success": True, "message": "Đã lưu Gemini API Key thành công"}

@app.get("/api/ai/key")
def get_gemini_key_status():
    return {
        "configured": gemini_agent.has_api_key(),
        "model": gemini_agent.model_name
    }

# --- Visual Backtesting API ---
@app.post("/api/backtest/run", response_model=BacktestResult)
async def run_backtest_endpoint(req: BacktestRequest):
    try:
        result = await backtester.run(req)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Dashboard Security PIN Lock API ---
def _hash_security_pin(pin: str) -> str:
    return hashlib.sha256(pin.strip().encode("utf-8")).hexdigest()

@app.get("/api/security/pin/status")
def get_security_pin_status():
    pin_hash = get_setting("security_pin_hash", "")
    pin_enabled = get_setting("security_pin_enabled", False)
    return {"enabled": bool(pin_enabled and pin_hash)}

@app.post("/api/security/pin/verify")
def verify_security_pin(req: PinVerifyRequest):
    pin_hash = get_setting("security_pin_hash", "")
    pin_enabled = get_setting("security_pin_enabled", False)
    if not pin_enabled or not pin_hash:
        return {"success": True, "message": "Bảo mật PIN chưa được bật"}
    if _hash_security_pin(req.pin) == pin_hash:
        return {"success": True, "message": "Mã PIN chính xác"}
    return {"success": False, "message": "Mã PIN không đúng, vui lòng thử lại"}

@app.post("/api/security/pin/set")
def set_security_pin(req: PinSetRequest):
    stored_hash = get_setting("security_pin_hash", "")
    stored_enabled = get_setting("security_pin_enabled", False)

    if stored_enabled and stored_hash:
        if not req.old_pin or _hash_security_pin(req.old_pin) != stored_hash:
            raise HTTPException(status_code=400, detail="Mã PIN cũ không chính xác")

    if req.enabled:
        if len(req.new_pin.strip()) < 4:
            raise HTTPException(status_code=400, detail="Mã PIN bảo mật phải có ít nhất 4 ký tự")
        save_setting("security_pin_hash", _hash_security_pin(req.new_pin))
        save_setting("security_pin_enabled", True)
        return {"success": True, "message": "Đã thiết lập và kích hoạt khóa mã PIN an toàn"}
    else:
        save_setting("security_pin_enabled", False)
        return {"success": True, "message": "Đã hủy kích hoạt khóa mã PIN"}

@app.get("/api/logs")
def get_logs(limit: int = Query(default=50, ge=1, le=1000)):
    return get_recent_logs(limit=limit)

@app.get("/api/scanner/markets")
async def get_scanner_markets(min_volume: float = Query(default=15000000.0, ge=0)):
    from .market_scanner import market_scanner
    markets = await market_scanner.scan_all_tickers(min_volume_usd=min_volume,
                                                     exchange=bot_engine.binance_client.exchange)
    return {"count": len(markets), "last_scan": market_scanner.last_scan_time, "markets": markets[:40]}

@app.get("/api/scanner/opportunities")
async def get_scanner_opportunities(top_n: int = Query(default=15, ge=1, le=100)):
    from .market_scanner import market_scanner
    opps = await market_scanner.analyze_top_pairs(
        top_n=top_n,
        strategy_name=bot_engine.config.strategy,
        timeframe=bot_engine.config.timeframe,
        params=bot_engine.config.model_dump(),
        exchange=bot_engine.binance_client.exchange,
    )
    return {"count": len(opps), "opportunities": opps}

@app.get("/api/klines")
def get_klines(symbol: Optional[str] = None, timeframe: Optional[str] = None, limit: int = Query(default=250, ge=30, le=1500)):
    sym = symbol or bot_engine.config.symbol
    tf = timeframe or bot_engine.config.timeframe
    df = bot_engine.binance_client.fetch_ohlcv(sym, tf, limit=limit)
    if df.empty:
        return []
        
    df = bot_engine.strategy.calculate_indicators(df)
    
    # Format for TradingView lightweight-charts:
    # time (seconds), open, high, low, close, volume, ema_fast, ema_slow, ema_trend, rsi, bb_upper, bb_lower
    result = []
    for _, row in df.iterrows():
        item = {
            "time": int(row["timestamp"] / 1000),
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": float(row["volume"]),
            "ema_fast": float(row["ema_fast"]) if "ema_fast" in row and not pd_isna(row["ema_fast"]) else None,
            "ema_slow": float(row["ema_slow"]) if "ema_slow" in row and not pd_isna(row["ema_slow"]) else None,
            "ema_trend": float(row["ema_trend"]) if "ema_trend" in row and not pd_isna(row["ema_trend"]) else None,
            "rsi": float(row["rsi"]) if "rsi" in row and not pd_isna(row["rsi"]) else None,
            "bb_upper": float(row["bb_upper"]) if "bb_upper" in row and not pd_isna(row["bb_upper"]) else None,
            "bb_lower": float(row["bb_lower"]) if "bb_lower" in row and not pd_isna(row["bb_lower"]) else None,
        }
        result.append(item)
    return result

def pd_isna(val):
    import math
    if val is None:
        return True
    try:
        return math.isnan(float(val))
    except Exception:
        return False

# --- WebSocket ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    origin = websocket.headers.get("origin")
    if origin and origin not in {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000", "http://127.0.0.1:8000"}:
        await websocket.close(code=1008)
        return
    await ws_manager.connect(websocket)
    await bot_engine.broadcast_state()
    try:
        while True:
            # Client can send commands if needed
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# --- Static Frontend Serving ---
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.realpath(os.path.join(frontend_dist, full_path))
        if os.path.commonpath([os.path.realpath(frontend_dist), file_path]) != os.path.realpath(frontend_dist):
            raise HTTPException(status_code=404)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
