import asyncio
import json
import time
from datetime import datetime
import math
from typing import Dict, Any, List, Optional
import logging
import uuid
import pandas as pd

from .models import TradeConfig, Position, BotStatus
from .database import save_setting, get_setting, get_trades, get_trade_stats, add_log, get_recent_logs, save_trade
from .database import init_db
from .binance_client import BinanceFuturesClient
from .paper_trader import PaperTrader
from .strategies import get_strategy
from .market_scanner import market_scanner
from .risk import size_position
from .trend_filter import confirmed_trend
from .execution_history import position_lifecycle
from .websocket_manager import ws_manager
from .gemini_agent import gemini_agent

logger = logging.getLogger("scalper_engine")

class ScalperEngine:
    def __init__(self):
        self.is_running = False
        self.start_time: Optional[datetime] = None
        self.last_trade_time: Optional[datetime] = None
        self.coin_last_trade_times: Dict[str, datetime] = {}
        self.last_signal: Optional[str] = None
        self.last_signal_time: Optional[str] = None
        self.daily_loss_hit = False
        
        # Load or create default config
        init_db()
        saved_config = get_setting("trade_config", None)
        if saved_config:
            try:
                self.config = TradeConfig(**saved_config)
            except Exception:
                self.config = TradeConfig()
        else:
            self.config = TradeConfig()
            save_setting("trade_config", self.config.model_dump())

        # Load API keys
        api_keys = get_setting("api_keys", {"api_key": "", "api_secret": "", "testnet": False})
        # Legacy testnet=True means Futures Testnet; never reinterpret as Demo.
        environment = api_keys.get("environment", "testnet" if api_keys.get("testnet") else "live")
        self.binance_client = BinanceFuturesClient(
            api_key=api_keys.get("api_key", ""),
            api_secret=api_keys.get("api_secret", ""),
            testnet=environment == "testnet",
            demo=environment == "demo",
        )

        self.paper_trader = PaperTrader(initial_balance=10000.0)
        self.strategy = get_strategy(self.config.strategy, self.config.model_dump())
        self.loop_task: Optional[asyncio.Task] = None
        self.scanner_task: Optional[asyncio.Task] = None
        self.ws_stream_task: Optional[asyncio.Task] = None
        self.ai_task: Optional[asyncio.Task] = None
        self.last_ticker: Dict[str, Any] = {"price": 0.0, "change24h": 0.0}
        self.symbol_tickers: Dict[str, Dict[str, Any]] = {}
        self.live_entry_orders: Dict[str, Dict[str, Any]] = get_setting("live_entry_orders", {})
        self.cached_top_coins: List[str] = []
        self.trend_cache: Dict[tuple, tuple] = {}
        self.last_coins_cache_time = 0.0
        self.symbol_loss_streak: Dict[str, int] = {}
        self.symbol_blacklists: Dict[str, float] = {}  # {symbol: cooldown_expiry_timestamp}
        self.entry_lock = asyncio.Lock()
        self.order_lock = asyncio.Lock()
        self.config_revision = 0

    def ensure_tasks(self):
        if not self.loop_task or self.loop_task.done():
            self.loop_task = asyncio.create_task(self.run_loop())
        if not self.scanner_task or self.scanner_task.done():
            self.scanner_task = asyncio.create_task(self.run_scanner_loop())
        if not self.ws_stream_task or self.ws_stream_task.done():
            self.ws_stream_task = asyncio.create_task(self.run_ws_ticker_stream())
        if not self.ai_task or self.ai_task.done():
            self.ai_task = asyncio.create_task(self.run_ai_regime_loop())

    async def shutdown(self):
        self.stop()
        # A worker thread may still be filling an entry; finish its protection first.
        async with self.entry_lock, self.order_lock:
            pass
        tasks = [t for t in (self.loop_task, self.scanner_task, self.ws_stream_task, self.ai_task) if t]
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        await self.binance_client.close()

    def validate_account_mode(self):
        if self.config.mode != "paper":
            if not self.binance_client.api_key or not self.binance_client.api_secret:
                raise ValueError("Cần cấu hình API Key và Secret trước khi giao dịch")
            if self.binance_client.environment != self.config.mode:
                raise ValueError("Chế độ giao dịch và môi trường API Key không khớp; chọn lại Testnet, Demo hoặc Live")
            if any(m.get("pending_entry") for m in self.live_entry_orders.values()):
                raise ValueError("Còn lệnh vào chưa xác minh; chờ phục hồi trạng thái trên sàn trước khi chạy")

    def check_daily_loss(self):
        daily_pnl = get_trade_stats(mode=self.config.mode).get("daily_pnl", 0.0)
        if self.config.mode != "paper":
            daily_pnl = self.binance_client.fetch_daily_pnl()
        self.daily_loss_hit = daily_pnl <= -self.config.daily_max_loss_usd
        if self.daily_loss_hit and self.is_running:
            self.stop()
            add_log("ERROR", "RISK", f"Đạt giới hạn lỗ hôm nay: {daily_pnl:.2f} USDT. Dừng vào lệnh mới, tiếp tục bảo vệ vị thế mở.")
        return self.daily_loss_hit

    async def start(self):
        if not self.is_running:
            revision = self.config_revision
            self.validate_account_mode()
            if await asyncio.to_thread(self.check_daily_loss):
                raise ValueError("Đã đạt giới hạn lỗ trong ngày, không thể khởi động")
            if revision != self.config_revision:
                raise ValueError("Yêu cầu Start đã bị hủy bởi Stop hoặc thay đổi cấu hình")
            self.is_running = True
            self.start_time = datetime.now()
            mode_desc = "TỰ ĐỘNG QUÉT TOÀN SÀN" if self.config.auto_scan_all else f"CỐ ĐỊNH ({self.config.symbol})"
            add_log("SUCCESS", "BOT", f"Khởi động Scalper Bot | Chế độ: {mode_desc} | Mode: {self.config.mode.upper()} | Chiến thuật: {self.config.strategy}")
            
            self.ensure_tasks()

    def stop(self):
        was_running = self.is_running
        self.is_running = False
        self.config_revision += 1
        if was_running:
            add_log("INFO", "BOT", "Tạm dừng Scalper Bot")

    def update_config(self, new_config: TradeConfig):
        old_symbol = self.config.symbol
        if new_config.mode != self.config.mode:
            if self.is_running or self.paper_trader.open_positions or self.live_entry_orders:
                raise ValueError("Hãy dừng bot và đóng vị thế trước khi đổi chế độ")
            if self.config.mode != "paper" and self.get_positions():
                raise ValueError("Cần đóng vị thế trên sàn trước khi đổi chế độ")
        self.config_revision += 1
        self.config = new_config
        save_setting("trade_config", self.config.model_dump())
        self.strategy = get_strategy(self.config.strategy, self.config.model_dump())
        add_log("INFO", "CONFIG", f"Cập nhật cấu hình: Auto-Scan={self.config.auto_scan_all} | Max Positions={self.config.max_open_positions} | Chiến thuật={self.config.strategy}")
        
        # Reset cache if needed
        self.cached_top_coins.clear()
        if old_symbol != new_config.symbol:
            self.last_ticker = {"price": 0.0, "change24h": 0.0}
        if old_symbol != new_config.symbol and self.ws_stream_task and not self.ws_stream_task.done():
            self.ws_stream_task.cancel()
            self.ws_stream_task = asyncio.create_task(self.run_ws_ticker_stream())
        if not self.ai_task or self.ai_task.done():
            self.ai_task = asyncio.create_task(self.run_ai_regime_loop())

    def update_api_keys(self, api_key: str, api_secret: str, testnet: bool, demo: bool = False):
        if self.is_running or self.live_entry_orders or self.paper_trader.open_positions:
            raise ValueError("Dừng bot và đóng vị thế trước khi đổi API Key")
        environment = "testnet" if testnet else "demo" if demo else "live"
        if self.config.mode != "paper" and environment != self.config.mode:
            raise ValueError("Môi trường API Key không khớp với chế độ giao dịch")
        self.binance_client.update_credentials(api_key, api_secret, testnet, demo)
        save_setting("api_keys", {"api_key": api_key, "api_secret": api_secret, "environment": environment, "testnet": testnet})
        add_log("INFO", "SYSTEM", f"Cập nhật API Key Binance ({environment})")

    async def on_realtime_ticker(self, ticker: Dict[str, Any]):
        """Executed on every direct WebSocket tick from Binance for the active primary coin."""
        if not ticker or ticker.get("price", 0) <= 0:
            return
            
        sym = ticker["symbol"].replace(":USDT", "")
        if sym == self.config.symbol.replace(":USDT", ""):
            self.last_ticker = ticker
        self.symbol_tickers[sym] = ticker
        current_price = ticker["price"]

        if self.config.mode == "paper":
            self.paper_trader.update_position_price(sym, current_price)
            for pos_id, pos in list(self.paper_trader.open_positions.items()):
                if pos["symbol"].replace(":USDT", "") != sym:
                    continue
                side = pos["side"]

                # 1. Partial TP (Scale-Out) at TP1 (e.g. 50%)
                if (pos.get("partial_tp_enabled", True) and not pos.get("tp1_hit", False)
                        and pos.get("tp1_price") is not None):
                    tp1_hit = (side == "LONG" and current_price >= pos["tp1_price"]) or (side == "SHORT" and current_price <= pos["tp1_price"])
                    if tp1_hit:
                        ratio = getattr(self.config, "partial_tp_level1_pct", 50.0) / 100.0
                        self.paper_trader.partial_close_position(pos_id, current_price, ratio=ratio)

                # 2. Full Take Profit
                if (side == "LONG" and current_price >= pos["take_profit_price"]) or (side == "SHORT" and current_price <= pos["take_profit_price"]):
                    self.paper_trader.close_position(pos_id, current_price, "TAKE_PROFIT")
                    self._handle_post_trade_learning(sym, is_win=True)
                # 3. Stop Loss (or Break-Even Stop)
                elif (side == "LONG" and current_price <= pos["stop_loss_price"]) or (side == "SHORT" and current_price >= pos["stop_loss_price"]):
                    exit_reason = "BREAK_EVEN" if pos.get("break_even_active") else "STOP_LOSS"
                    self.paper_trader.close_position(pos_id, current_price, exit_reason)
                    self._handle_post_trade_learning(sym, is_win=(exit_reason == "BREAK_EVEN"))
                # 4. Trailing Stop
                elif pos.get("trailing_enabled", True) and pos.get("trailing_stop_price") is not None:
                    if (side == "LONG" and current_price <= pos["trailing_stop_price"]) or (side == "SHORT" and current_price >= pos["trailing_stop_price"]):
                        self.paper_trader.close_position(pos_id, current_price, "TRAILING_STOP")
                        self._handle_post_trade_learning(sym, is_win=True)
        elif sym in self.live_entry_orders:
            async with self.order_lock:
                meta = self.live_entry_orders.get(sym)
                if not meta or not meta.get("trailing_enabled", False):
                    return
                side, entry = meta["side"], meta["entry_price"]
                meta["peak_price"] = max(meta["peak_price"], current_price) if side == "LONG" else min(meta["peak_price"], current_price)
                meta["last_price"] = current_price
                peak_profit = abs(meta["peak_price"] - entry) / entry * 100
                if peak_profit >= meta["trailing_activation_pct"]:
                    meta["trailing_active"] = True
                self.persist_live_entries()
                if meta.get("trailing_active"):
                    trail = meta["peak_price"] * (1 - meta["trailing_callback_pct"] / 100 if side == "LONG" else 1 + meta["trailing_callback_pct"] / 100)
                    if (side == "LONG" and current_price <= trail) or (side == "SHORT" and current_price >= trail):
                        result = await asyncio.to_thread(self.close_single_position, f"{sym}_{side}")
                        if result.get("success"):
                            add_log("TRADE", "BINANCE", f"Đóng Trailing Stop {side} {sym} tại {current_price}")
                        else:
                            add_log("ERROR", "BINANCE", f"Không đóng được Trailing Stop {sym}: {result.get('message')}")

    def _handle_post_trade_learning(self, symbol: str, is_win: bool):
        """AI Post-Trade Feedback Loop: Tracks streaks and engages dynamic cooldown on whipsawing coins."""
        sym = symbol.replace(":USDT", "")
        if is_win:
            self.symbol_loss_streak[sym] = 0
        else:
            streak = self.symbol_loss_streak.get(sym, 0) + 1
            self.symbol_loss_streak[sym] = streak
            if getattr(self.config, "ai_post_trade_learning", True) and streak >= 2:
                cooldown_expiry = time.time() + 1800.0  # 30-minute cooldown
                self.symbol_blacklists[sym] = cooldown_expiry
                add_log(
                    "WARN",
                    "AI_LEARN",
                    f"🛡️ AI Post-Trade Learning: {sym} dính {streak} lệnh Stop Loss liên tiếp. Tự động đưa vào Cooldown 30 phút để chống nhiễu thị trường."
                )

    async def run_ws_ticker_stream(self):
        """Stream primary ticker; CCXT's Futures Testnet WS points to Live, so use Testnet REST."""
        while True:
            try:
                if self.binance_client.testnet:
                    ticker = await asyncio.to_thread(self.binance_client.fetch_ticker, self.config.symbol)
                    if ticker.get("price", 0) > 0:
                        await self.on_realtime_ticker(ticker)
                    await asyncio.sleep(2)
                else:
                    await self.binance_client.watch_ticker_stream(self.config.symbol, self.on_realtime_ticker)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"WebSocket stream reconnecting: {e}")
                await asyncio.sleep(2)

    async def get_top_liquid_coins(self) -> List[str]:
        """Fetch and cache list of Top N volume USDT-M coins on Binance."""
        now = time.time()
        if self.cached_top_coins and (now - self.last_coins_cache_time) < 180:
            return self.cached_top_coins

        try:
            markets = await market_scanner.scan_all_tickers(min_volume_usd=self.config.min_volume_24h,
                                                             exchange=self.binance_client.exchange)
            coins = [m["symbol"] for m in markets[:self.config.scan_top_n]]
            self.cached_top_coins = coins
            self.last_coins_cache_time = now
            return coins
        except Exception as e:
            logger.error(f"Error fetching top coins: {e}")
            return []

    async def execute_trade_on_symbol(self, symbol: str, signal: str, reason: str, current_price: float, signal_revision: Optional[int] = None, extra: Optional[Dict[str, Any]] = None):
        async with self.entry_lock:
            if signal_revision is not None and signal_revision != self.config_revision:
                return
            await self._execute_trade_on_symbol(symbol, signal, reason, current_price, extra=extra)
    async def trend_confirms(self, symbol: str, signal: str) -> bool:
        if not self.config.trend_filter_enabled:
            return True
        frames = self.config.trend_filter_timeframes.split("+")
        for timeframe in frames:
            key = (symbol, timeframe)
            now = time.time()
            cached = self.trend_cache.get(key)
            if cached and cached[0] > now:
                trend = cached[1]
            else:
                df = await asyncio.to_thread(self.binance_client.fetch_ohlcv, symbol, timeframe, 205)
                if df.empty:
                    return False
                duration = self.binance_client.exchange.parse_timeframe(timeframe) * 1000
                closed = df[df["timestamp"] + duration <= time.time() * 1000].copy()
                trend = confirmed_trend(closed)
                if len(closed):
                    self.trend_cache[key] = (min((float(closed["timestamp"].iloc[-1]) + 2 * duration) / 1000, now + 60), trend)
            if trend != signal:
                return False
        return True


    async def _execute_trade_on_symbol(self, symbol: str, signal: str, reason: str, current_price: float, extra: Optional[Dict[str, Any]] = None):
        if not self.is_running or signal not in {"LONG", "SHORT"} or not math.isfinite(current_price) or current_price <= 0:
            return
        revision = self.config_revision
        if await asyncio.to_thread(self.check_daily_loss):
            return
        self.validate_account_mode()
        positions = await asyncio.to_thread(self.get_positions)
        clean_symbol = symbol.replace(":USDT", "")
        symbol = clean_symbol
        if clean_symbol in self.live_entry_orders:
            return
        if len(positions) >= self.config.max_open_positions or any(p["symbol"].replace(":USDT", "") == clean_symbol for p in positions):
            return
        # Check AI Learning Cooldown
        cooldown_expiry = self.symbol_blacklists.get(clean_symbol, 0.0)
        if time.time() < cooldown_expiry:
            return

        last_time = self.coin_last_trade_times.get(symbol)
        if last_time and (datetime.now() - last_time).total_seconds() < self.config.cooldown_seconds:
            return
        if revision != self.config_revision or not self.is_running:
            return
        self.last_signal = signal
        self.last_signal_time = datetime.now().strftime("%H:%M:%S")
        add_log("SIGNAL", "AUTOSCAN", f"⚡ TÍN HIỆU {signal} TRÊN {symbol} ({self.config.strategy}): {reason}")

        if not await self.trend_confirms(symbol, signal):
            return
        if revision != self.config_revision or not self.is_running:
            return

        # 1. Check Gemini Macro AI Regime Guard & Risk Multiplier
        ai_risk_multiplier = 1.0
        if self.config.gemini_ai_enabled and gemini_agent.last_analysis:
            if gemini_agent.last_analysis.get("pause_trading"):
                add_log("WARN", "GEMINI_AI", f"⚠️ Tạm dừng mở {symbol}: AI cảnh báo rủi ro cao ({gemini_agent.last_analysis.get('regime_vn')})")
                return
            ai_risk_multiplier = float(gemini_agent.last_analysis.get("risk_multiplier", 1.0))
            if not math.isfinite(ai_risk_multiplier) or ai_risk_multiplier <= 0:
                return

        # 1b. Flash Volatility Shock Filter
        if getattr(self.config, "macro_news_filter_enabled", True):
            btc_tk = self.symbol_tickers.get("BTC/USDT") or self.symbol_tickers.get("BTCUSDT")
            if btc_tk and abs(float(btc_tk.get("change24h") or 0.0)) >= 12.0:
                add_log("WARN", "RISK", f"⚡ Tạm hoãn mở {symbol}: Thị trường biến động cực đoan (BTC 24h: {btc_tk.get('change24h')}%)")
                return

        # 1c. Funding Rate Safeguard
        if getattr(self.config, "funding_rate_guard_enabled", True):
            frate = await asyncio.to_thread(self.binance_client.fetch_funding_rate, symbol)
            max_fr = getattr(self.config, "max_funding_rate_pct", 0.03) / 100.0
            if signal == "LONG" and frate > max_fr:
                add_log("WARN", "RISK", f"Bỏ qua LONG {symbol}: Funding Rate bất lợi ({frate*100:+.4f}% > {self.config.max_funding_rate_pct}%)")
                return
            elif signal == "SHORT" and frate < -max_fr:
                add_log("WARN", "RISK", f"Bỏ qua SHORT {symbol}: Funding Rate bất lợi ({frate*100:+.4f}% < -{self.config.max_funding_rate_pct}%)")
                return

        # 2. Dynamic ATR Volatility Bands
        ticker = await asyncio.to_thread(self.binance_client.fetch_ticker, symbol)
        current_price = float(ticker.get("price") or 0)
        if not math.isfinite(current_price) or current_price <= 0:
            return

        atr_val = extra.get("atr") if extra else None
        if self.config.use_atr_tp_sl and atr_val and atr_val > 0 and current_price > 0:
            raw_sl = (self.config.atr_multiplier_sl * atr_val / current_price) * 100.0
            raw_tp = (self.config.atr_multiplier_tp * atr_val / current_price) * 100.0
            effective_sl_pct = max(self.config.atr_min_sl_pct, min(self.config.atr_max_sl_pct, raw_sl))
            effective_tp_pct = max(effective_sl_pct * 1.5, raw_tp)
            atr_tag = f" | ATR: {atr_val:.6g} (SL {effective_sl_pct:.2f}% / TP {effective_tp_pct:.2f}%)"
        else:
            effective_sl_pct = self.config.stop_loss_pct
            effective_tp_pct = self.config.take_profit_pct
            atr_tag = ""

        # 2b. Fee Hurdle Rate Verification
        fee_hurdle = getattr(self.config, "fee_hurdle_rate_pct", 0.15)
        if effective_tp_pct <= fee_hurdle:
            add_log("WARN", "RISK", f"Bỏ qua {symbol}: TP ({effective_tp_pct:.2f}%) không vượt ngưỡng phí sàn ({fee_hurdle:.2f}%)")
            return

        # 3. Position Sizing with Volatility Parity & AI Risk Multiplier
        balance = await asyncio.to_thread(self.get_balance)
        daily_pnl = (self.binance_client._daily_pnl_cache[2] if self.config.mode != "paper" and self.binance_client._daily_pnl_cache
                     else get_trade_stats(mode=self.config.mode).get("daily_pnl", 0.0))
        sizing = size_position(self.config, balance, positions, daily_pnl,
                               effective_sl_pct=effective_sl_pct,
                               risk_multiplier=ai_risk_multiplier)
        if not sizing:
            add_log("WARN", "RISK", f"Bỏ qua {symbol}: vốn hoặc ngân sách rủi ro không đủ")
            return
        margin_amt = sizing["margin"]
        trade_leverage = sizing["leverage"]

        if revision != self.config_revision or not self.is_running:
            return

        # 4. PAPER TRADING EXECUTION
        if self.config.mode == "paper":
            pos = self.paper_trader.open_position(
                symbol=symbol,
                side=signal,
                price=current_price,
                margin_amount=margin_amt,
                leverage=trade_leverage,
                tp_pct=effective_tp_pct,
                sl_pct=effective_sl_pct,
                trailing_activation_pct=self.config.trailing_stop_activation_pct,
                trailing_callback_pct=self.config.trailing_stop_callback_pct,
                strategy_name=self.config.strategy,
                trailing_enabled=self.config.trailing_stop_enabled,
                entry_reason=reason,
                extra=extra,
                partial_tp_enabled=self.config.partial_tp_enabled,
                break_even_enabled=self.config.break_even_enabled,
            )
            if pos:
                self.last_trade_time = datetime.now()
                self.coin_last_trade_times[symbol] = datetime.now()
                ai_note = f" [AI: {ai_risk_multiplier:.2f}x]" if ai_risk_multiplier != 1.0 else ""
                add_log("TRADE", "AUTOSCAN", f"Mở {signal} {symbol} tại {current_price} | Ký quỹ ${margin_amt:.2f} x{trade_leverage}{atr_tag}{ai_note}")
        
        # 2. LIVE / TESTNET TRADING EXECUTION
        else:
            configured = await asyncio.to_thread(self._configure_live_symbol, symbol, trade_leverage)
            if not configured or revision != self.config_revision or not self.is_running:
                return
            
            notional = margin_amt * trade_leverage
            raw_amount = notional / current_price
            coin_amount = await asyncio.to_thread(self.binance_client.format_amount, symbol, raw_amount)
            if coin_amount <= 0 or revision != self.config_revision or not self.is_running:
                return
            order_side = "buy" if signal == "LONG" else "sell"

            # Entry Market Order
            entry_time_ms = int(time.time() * 1000)
            client_order_id = "scalper_" + uuid.uuid4().hex[:24]
            self.live_entry_orders[symbol] = {"side": signal, "pending_entry": True,
                "client_order_id": client_order_id, "entry_time_ms": entry_time_ms,
                "entry_price": current_price, "amount": coin_amount, "margin": margin_amt,
                "leverage": trade_leverage, "mode": self.config.mode, "strategy": self.config.strategy,
                "effective_sl_pct": effective_sl_pct, "trailing_enabled": False,
                "time": datetime.now().isoformat()}
            self.persist_live_entries()
            res = await asyncio.to_thread(self.binance_client.create_market_order,
                symbol=symbol,
                side=order_side,
                amount=coin_amount,
                position_side=signal, client_order_id=client_order_id
            )
            if res.get("success") and (not math.isfinite(float(res.get("price") or 0)) or float(res.get("price") or 0) <= 0
                                       or not math.isfinite(float(res.get("amount") or 0)) or float(res.get("amount") or 0) <= 0):
                res = {"success": False, "order_submitted": True, "message": "Không có giá/khối lượng khớp đã xác minh"}

            if res.get("success"):
                fill_price = float(res["price"])
                self.last_trade_time = datetime.now()
                self.coin_last_trade_times[symbol] = datetime.now()
                add_log("TRADE", "BINANCE", f"🎯 ĐÃ KHỚP LỆNH {self.config.mode.upper()}: {signal} {symbol} {coin_amount} tại {fill_price:.8g} | Ký quỹ {margin_amt:.2f} USDT x{trade_leverage}")

                # Calculate TP and SL prices using Dynamic ATR Volatility
                if signal == "LONG":
                    tp_price = fill_price * (1 + effective_tp_pct / 100.0)
                    sl_price = fill_price * (1 - effective_sl_pct / 100.0)
                else:
                    tp_price = fill_price * (1 - effective_tp_pct / 100.0)
                    sl_price = fill_price * (1 + effective_sl_pct / 100.0)

                # Native Binance Exchange Orders
                coin_amount = res.get("amount") or coin_amount
                sl_result = await asyncio.to_thread(self.binance_client.place_stop_loss_order, symbol, signal, coin_amount, sl_price)
                tp_result = await asyncio.to_thread(self.binance_client.place_take_profit_order, symbol, signal, coin_amount, tp_price)

                # Register in live tracker for trailing stop
                self.live_entry_orders[symbol.replace(":USDT", "")] = {
                    "side": signal,
                    "entry_price": fill_price,
                    "amount": coin_amount,
                    "peak_price": fill_price,
                    "last_price": fill_price,
                    "margin": margin_amt,
                    "leverage": trade_leverage,
                    "strategy": self.config.strategy,
                    "mode": self.config.mode,
                    "entry_time_ms": entry_time_ms,
                    "entry_order_id": res.get("order_id"),
                    "client_order_id": client_order_id,
                    "trailing_enabled": self.config.trailing_stop_enabled,
                    "trailing_activation_pct": self.config.trailing_stop_activation_pct,
                    "trailing_callback_pct": self.config.trailing_stop_callback_pct,
                    "time": datetime.now().isoformat(),
                    "entry_reason": reason,
                    "tp_price": tp_price,
                    "sl_price": sl_price,
                    "effective_sl_pct": effective_sl_pct,
                    "extra": extra or {}
                }
                self.persist_live_entries()
                if sl_result.get("success") and tp_result.get("success"):
                    add_log("TRADE", "BINANCE", f"Đã thiết lập SL và TP trên sàn cho {symbol}")
                else:
                    self.stop()
                    add_log("ERROR", "RISK", f"Không thiết lập đủ SL/TP cho {symbol}; dừng bot và đóng vị thế để tránh lệnh không được bảo vệ")
                    result = await asyncio.to_thread(self.close_single_position, f"{symbol}_{signal}")
                    if not result.get("success"):
                        add_log("ERROR", "RISK", f"Không đóng được vị thế thiếu SL/TP {symbol}: {result.get('message')}")
            else:
                add_log("ERROR", "BINANCE", f"Lỗi khớp lệnh Live {symbol}: {res.get('message')}")
                self.live_entry_orders[symbol]["entry_order_id"] = res.get("order_id")
                self.persist_live_entries()
                if res.get("order_submitted"):
                    self.stop()
                    add_log("ERROR", "RISK", f"Dừng bot: chưa xác minh được fill {symbol}; kiểm tra và thử đóng vị thế trên sàn")
                    try:
                        result = await asyncio.to_thread(self.close_single_position, f"{symbol}_{signal}")
                        if not result.get("success"):
                            add_log("ERROR", "RISK", f"Chưa xác nhận đã đóng vị thế {symbol}: {result.get('message')}")
                    except Exception:
                        add_log("ERROR", "RISK", f"Không kiểm tra/đóng được vị thế {symbol}; cần kiểm tra trên Binance")
                else:
                    self.live_entry_orders.pop(symbol, None)
                    self.persist_live_entries()

        await self.broadcast_state()
    def _configure_live_symbol(self, symbol, leverage):
        return self.binance_client.set_leverage(symbol, leverage) and self.binance_client.set_margin_mode(symbol, self.config.margin_type)

    def persist_live_entries(self):
        save_setting("live_entry_orders", self.live_entry_orders)

    def recover_pending_entry(self, symbol, meta, positions):
        self.stop()
        try:
            order = self.binance_client.resolve_entry_order(symbol, meta)
            terminal_states = ("closed", "canceled", "expired", "rejected")
            if order.get("status") not in terminal_states:
                self.binance_client.cancel_entry_order(symbol, meta)
                order = self.binance_client.resolve_entry_order(symbol, meta)
            filled = float(order.get("filled") or (order.get("info") or {}).get("executedQty") or 0)
            matching = [p for p in positions if p["symbol"].replace(":USDT", "") == symbol and p["side"] == meta["side"]]
            if matching:
                self.close_single_position(matching[0]["id"])
                return False
            if order.get("status") not in terminal_states:
                return False
            if filled <= 0:
                self.live_entry_orders.pop(symbol, None)
                self.persist_live_entries()
                return False
            average = float(order.get("average") or (order.get("info") or {}).get("avgPrice") or 0)
            if not math.isfinite(average) or average <= 0:
                return False
            meta.update(amount=filled, entry_price=average, entry_order_id=order.get("id"), trailing_enabled=False)
            completed = position_lifecycle(self.binance_client.fetch_position_trades(symbol, meta), meta)
            if not completed:
                self.persist_live_entries()
                return False
            meta["pending_entry"] = False
            self.persist_live_entries()
            return True
        except Exception:
            return False

    def reconcile_live_entries(self, positions):
        active = {(p["symbol"].replace(":USDT", ""), p["side"]) for p in positions}
        for symbol, meta in list(self.live_entry_orders.items()):
            if meta.get("pending_entry") and not self.recover_pending_entry(symbol, meta, positions):
                continue
            if (symbol, meta["side"]) in active:
                continue
            if not meta.get("recorded"):
                trades = position_lifecycle(self.binance_client.fetch_position_trades(symbol, meta), meta)
                exits = [t for t in trades if t["side"] == ("sell" if meta["side"] == "LONG" else "buy")]
                if not exits:
                    continue
                exit_amount = sum(float(t["amount"]) for t in exits)
                if exit_amount <= 0:
                    continue
                exit_price = sum(float(t["amount"]) * float(t["price"]) for t in exits) / exit_amount
                fees = sum(float((t.get("fee") or {}).get("cost") or 0.0) for t in trades if (t.get("fee") or {}).get("currency") == "USDT")
                raw_pnl = sum(float(t.get("info", {}).get("realizedPnl") or 0.0) for t in exits)
                net_pnl = raw_pnl - fees
                exit_time = datetime.fromtimestamp(max(t["timestamp"] for t in exits) / 1000).strftime("%Y-%m-%d %H:%M:%S")
                entries = [t for t in trades if t["side"] == ("buy" if meta["side"] == "LONG" else "sell")
                           and (not meta.get("entry_order_id") or str(t.get("order") or t.get("info", {}).get("orderId")) == str(meta["entry_order_id"]))]
                entry_amount = sum(float(t["amount"]) for t in entries)
                actual_entry_price = sum(float(t["amount"]) * float(t["price"]) for t in entries) / entry_amount if entry_amount > 0 else meta["entry_price"]
                # Determine accurate exit reason based on target prices or manual trigger
                is_win = net_pnl > 0
                if meta.get("manual_closed"):
                    live_exit_reason = "MANUAL"
                elif meta.get("tp_price") and abs(exit_price - meta["tp_price"]) / meta["tp_price"] < 0.005:
                    live_exit_reason = "TAKE_PROFIT"
                elif meta.get("sl_price") and abs(exit_price - meta["sl_price"]) / meta["sl_price"] < 0.005:
                    live_exit_reason = "STOP_LOSS"
                elif is_win:
                    live_exit_reason = "TAKE_PROFIT"
                else:
                    live_exit_reason = "STOP_LOSS"

                record = {
                    "symbol": symbol,
                    "side": meta["side"],
                    "entry_price": actual_entry_price,
                    "exit_price": exit_price,
                    "amount": meta["amount"],
                    "leverage": meta["leverage"],
                    "pnl": round(net_pnl, 2),
                    "pnl_pct": round(net_pnl / meta["margin"] * 100, 2),
                    "fee": round(fees, 2),
                    "exit_reason": live_exit_reason,
                    "entry_time": datetime.fromisoformat(meta["time"]).strftime("%Y-%m-%d %H:%M:%S"),
                    "exit_time": exit_time,
                    "mode": meta["mode"],
                    "strategy": meta["strategy"],
                    "entry_reason": meta.get("entry_reason"),
                    "tp_price": meta.get("tp_price"),
                    "sl_price": meta.get("sl_price"),
                    "extra_info": json.dumps(meta.get("extra") or {}) if meta.get("extra") else None
                }
                meta["recorded"] = True
                try:
                    save_trade(record, "live_entry_orders", self.live_entry_orders, f"{meta['mode']}:{symbol}:{meta['side']}:{meta['entry_time_ms']}")
                except Exception:
                    meta.pop("recorded", None)
                    raise
                add_log("TRADE", "BINANCE", f"Đóng {meta['side']} {symbol} trên {meta['mode'].upper()} | PnL ròng: {net_pnl:+.2f} USDT | Giá thoát: {exit_price:.8g}")
            if self.binance_client.cancel_all_orders(symbol):
                self.live_entry_orders.pop(symbol, None)
                self.persist_live_entries()

    async def run_scanner_loop(self):
        """Continuous background scanner that scans top coins and executes trades automatically."""
        logger.info("Starting Autonomous Multi-Coin Scanner Loop...")
        scan_index = 0

        while True:
            try:
                # Only scan if auto_scan_all is enabled
                if not self.is_running or not self.config.auto_scan_all:
                    await asyncio.sleep(2.0)
                    continue

                # Check if can open new position
                positions = await asyncio.to_thread(self.get_positions)
                can_open_more = (
                    self.is_running and
                    not self.daily_loss_hit and
                    len(positions) < self.config.max_open_positions
                )

                if not can_open_more:
                    await asyncio.sleep(1.5)
                    continue

                # Get list of top volume coins
                coins = await self.get_top_liquid_coins()
                if not coins:
                    await asyncio.sleep(2.0)
                    continue

                # Get active open symbols
                open_symbols = {p["symbol"] for p in positions}

                # Scan a batch of coins sequentially with tiny sleep to respect rate limits
                batch_size = 5
                batch = coins[scan_index:scan_index + batch_size]
                scan_index = (scan_index + batch_size) % len(coins)

                for sym in batch:
                    # Skip if already holding a position on this coin
                    if sym in open_symbols:
                        continue

                    # Check per-coin cooldown
                    last_time = self.coin_last_trade_times.get(sym)
                    if last_time and (datetime.now() - last_time).total_seconds() < self.config.cooldown_seconds:
                        continue

                    # Fetch recent candles
                    revision = self.config_revision
                    df = await asyncio.to_thread(self.binance_client.fetch_ohlcv, sym, self.config.timeframe, self.required_candles())
                    df = self.closed_candles(df)
                    if revision != self.config_revision or not self.is_running:
                        break
                    if len(df) < 30:
                        continue

                    # Evaluate strategy
                    signal, reason, extra = self.strategy.generate_signal(df)
                    
                    if signal in ["LONG", "SHORT"]:
                        current_price = extra.get("close", float(df["close"].iloc[-1]))
                        # Re-check open positions limit right before execution
                        if len(await asyncio.to_thread(self.get_positions)) < self.config.max_open_positions:
                            await self.execute_trade_on_symbol(sym, signal, reason, current_price, revision, extra=extra)
                            # Once trade executed, break batch to let next cycle evaluate
                            break

                    await asyncio.sleep(0.08)

            except Exception as e:
                logger.error(f"Error in scanner loop: {e}", exc_info=True)

            await asyncio.sleep(1.0)

    async def run_loop(self):
        """Loop for monitoring open positions, PnL updates, single-coin mode, and broadcast."""
        logger.info("Starting Scalper Engine Main Loop...")
        tick_counter = 0

        while True:
            try:
                # 1. Update prices of ALL active positions
                positions = await asyncio.to_thread(self.get_positions)
                if self.config.mode != "paper":
                    async with self.entry_lock, self.order_lock:
                        positions = await asyncio.to_thread(self.get_positions)
                        await asyncio.to_thread(self.reconcile_live_entries, positions)
                for pos in positions:
                    sym = pos["symbol"].replace(":USDT", "")
                    ticker = await asyncio.to_thread(self.binance_client.fetch_ticker, sym)
                    if ticker and ticker.get("price", 0) > 0:
                        await self.on_realtime_ticker(ticker)

                # Fallback primary ticker
                if not self.last_ticker or self.last_ticker.get("price", 0) <= 0:
                    t = await asyncio.to_thread(self.binance_client.fetch_ticker, self.config.symbol)
                    if t and t.get("price", 0) > 0:
                        self.last_ticker = t

                if self.is_running:
                    await asyncio.to_thread(self.check_daily_loss)

                # 3. If in Single-Symbol Mode (auto_scan_all is False), evaluate primary coin
                tick_counter += 1
                if not self.config.auto_scan_all and (tick_counter % 2 == 0):
                    can_trade = (
                        self.is_running and
                        not self.daily_loss_hit and
                        len(positions) < self.config.max_open_positions
                    )
                    if can_trade and self.last_trade_time:
                        if (datetime.now() - self.last_trade_time).total_seconds() < self.config.cooldown_seconds:
                            can_trade = False

                    if can_trade:
                        revision = self.config_revision
                        df = await asyncio.to_thread(self.binance_client.fetch_ohlcv, self.config.symbol, self.config.timeframe, self.required_candles())
                        df = self.closed_candles(df)
                        if revision != self.config_revision or not self.is_running:
                            continue
                        if len(df) >= 30:
                            signal, reason, extra = self.strategy.generate_signal(df)
                            if signal in ["LONG", "SHORT"]:
                                current_price = extra.get("close", float(df["close"].iloc[-1]))
                                await self.execute_trade_on_symbol(self.config.symbol, signal, reason, current_price, revision, extra=extra)

                # 4. Broadcast live state to dashboard
                await self.broadcast_state()
            except ValueError as e:
                if self.config.mode != "paper" and ("-2015" in str(e) or "-2014" in str(e)):
                    self.stop()
                logger.warning("Không đọc được trạng thái giao dịch: %s. Thử lại sau 15 giây.", e)
                await asyncio.sleep(15)
            except Exception as e:
                logger.error(f"Error in main loop: {e}", exc_info=True)

            await asyncio.sleep(1.2)

    def required_candles(self):
        return min(1500, max(202, self.config.ema_trend + 2, self.config.rsi_period + 2, self.config.bb_period + 2))

    def closed_candles(self, df):
        if df.empty:
            return df
        duration = self.binance_client.exchange.parse_timeframe(self.config.timeframe) * 1000
        return df[df["timestamp"] + duration <= time.time() * 1000].copy()

    async def panic_close_all(self) -> Dict[str, Any]:
        """Emergency Close All Positions, Cancel Orders & Halt Trading."""
        self.stop()
        closed_count = 0
        
        # 1. Close Paper Positions
        if self.paper_trader.open_positions:
            for pos_id, pos in list(self.paper_trader.open_positions.items()):
                sym = pos["symbol"]
                cur_price = self.symbol_tickers.get(sym, {}).get("price", pos["current_price"])
                self.paper_trader.close_position(pos_id, cur_price, "PANIC_CLOSE")
                closed_count += 1
                
        # 2. Close Live Positions & Cancel pending SL/TP
        if self.config.mode in ["live", "testnet", "demo"] and self.binance_client.api_key:
            positions = await asyncio.to_thread(self.get_positions)
            failures = []
            for pos in positions:
                res = await asyncio.to_thread(self.close_single_position, pos["id"])
                if res.get("success"):
                    closed_count += 1
                else:
                    failures.append({"id": pos["id"], "message": res.get("message", "Không đóng được vị thế")})
            if failures:
                add_log("ERROR", "PANIC", f"Đóng khẩn cấp thất bại {len(failures)} vị thế; cần kiểm tra trên sàn")
                await self.broadcast_state()
                return {"success": False, "closed_positions": closed_count, "failures": failures}

        add_log("WARN", "PANIC", f"Đã dừng bot và đóng {closed_count} vị thế")
        await self.broadcast_state()
        return {"success": True, "closed_positions": closed_count}

    def close_single_position(self, pos_id: str) -> Dict[str, Any]:
        if pos_id in self.paper_trader.open_positions:
            pos = self.paper_trader.open_positions[pos_id]
            sym = pos["symbol"]
            cur_price = self.symbol_tickers.get(sym, {}).get("price", pos["current_price"])
            rec = self.paper_trader.close_position(pos_id, cur_price, "MANUAL_CLOSE")
            return {"success": True, "trade": rec}
        elif self.config.mode in ["live", "testnet", "demo"]:
            positions = self.binance_client.fetch_open_positions()
            for pos in positions:
                if pos["id"] == pos_id or pos["id"].replace(":USDT", "") == pos_id.replace(":USDT", ""):
                    sym = pos["symbol"]
                    opp_side = "sell" if pos["side"] == "LONG" else "buy"
                    res = self.binance_client.create_market_order(sym, opp_side, pos["amount"], position_side=pos["side"], reduce_only=True)
                    if not res.get("success"):
                        return res
                    remaining = self.binance_client.fetch_open_positions(sym)
                    if any(p["side"] == pos["side"] and p["symbol"].replace(":USDT", "") == sym.replace(":USDT", "") for p in remaining):
                        return {"success": False, "message": "Lệnh đóng chỉ khớp một phần hoặc chưa phẳng; giữ SL/TP cho phần vị thế còn lại"}
                    clean_sym = sym.replace(":USDT", "")
                    if clean_sym in self.live_entry_orders:
                        self.live_entry_orders[clean_sym]["manual_closed"] = True
                    cancelled = self.binance_client.cancel_all_orders(sym)
                    # Keep metadata until execution records are reconciled into history.
                    return {"success": cancelled, "message": "Đã đóng vị thế" if cancelled else "Đã đóng vị thế nhưng chưa hủy được lệnh chờ"}
        return {"success": False, "message": "Position not found"}

    def get_positions(self) -> List[Dict[str, Any]]:
        if self.config.mode == "paper":
            return list(self.paper_trader.open_positions.values())
        else:
            positions = self.binance_client.fetch_open_positions()
            positions = self.binance_client.enrich_position_protection(positions)
            for pos in positions:
                meta = self.live_entry_orders.get(pos["symbol"].replace(":USDT", ""))
                if not meta or meta["side"] != pos["side"]:
                    continue
                pos["entry_time"] = meta.get("time")
                pos["mode"] = meta.get("mode", self.config.mode)
                pos["effective_sl_pct"] = meta.get("effective_sl_pct") or (abs(meta["entry_price"] - meta["sl_price"]) / meta["entry_price"] * 100 if meta.get("sl_price") else None)
                if meta.get("trailing_active") and meta.get("trailing_enabled"):
                    callback = meta["trailing_callback_pct"] / 100
                    pos["trailing_stop_price"] = meta["peak_price"] * (1 - callback if pos["side"] == "LONG" else 1 + callback)
            return positions

    def get_balance(self) -> Dict[str, float]:
        if self.config.mode == "paper":
            return self.paper_trader.get_balance()
        else:
            return self.binance_client.fetch_balance()

    def get_status(self) -> Dict[str, Any]:
        balance = self.get_balance()
        stats = get_trade_stats(mode=self.config.mode)
        daily_pnl = self.binance_client.fetch_daily_pnl() if self.config.mode != "paper" else stats.get("daily_pnl", 0.0)
        cache = self.binance_client._daily_pnl_cache
        since_ms = cache[0][1] if self.config.mode == "testnet" and cache and isinstance(cache[0], tuple) else None
        uptime = int((datetime.now() - self.start_time).total_seconds()) if self.is_running and self.start_time else 0
        
        return {
            "is_running": self.is_running,
            "mode": self.config.mode,
            "symbol": self.config.symbol,
            "timeframe": self.config.timeframe,
            "strategy": self.config.strategy,
            "auto_scan_all": self.config.auto_scan_all,
            "scan_top_n": self.config.scan_top_n,
            "max_open_positions": self.config.max_open_positions,
            "uptime_seconds": uptime,
            "balance_usdt": balance.get("total_usdt", 0.0),
            "available_margin": balance.get("free_usdt", 0.0),
            "margin_used": balance.get("used_usdt", 0.0),
            "unrealized_pnl": balance.get("unrealized_pnl", 0.0),
            "active_positions_count": len(self.get_positions()),
            "total_trades_count": stats.get("total_trades", 0),
            "win_rate": stats.get("win_rate", 0.0),
            "total_realized_pnl": stats.get("total_pnl", 0.0),
            "daily_pnl": daily_pnl,
            "daily_pnl_scope": "testnet_session" if since_ms and since_ms > int(datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).timestamp()*1000) else "calendar_day",
            "daily_pnl_since_ms": since_ms,
            "last_signal": self.last_signal,
            "last_signal_time": self.last_signal_time,
            "daily_loss_hit": self.daily_loss_hit,
            "ticker": self.last_ticker,
                "gemini_regime": gemini_agent.last_analysis
        }

    async def broadcast_state(self):
        try:
            status = await asyncio.to_thread(self.get_status)
            positions = await asyncio.to_thread(self.get_positions)
            recent_logs = get_recent_logs(limit=30)
            stats = get_trade_stats(mode=self.config.mode)
            
            payload = {
                "type": "state_update",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "status": status,
                "positions": positions,
                "stats": stats,
                "logs": recent_logs,
                "ticker": self.last_ticker,
                "gemini_regime": gemini_agent.last_analysis
            }
            await ws_manager.broadcast(payload)
        except Exception as e:
            logger.error(f"Error broadcasting state: {e}")


    async def get_macro_market_context(self) -> Dict[str, Any]:
        """Gathers market breadth, BTC HTF trend, and funding for Gemini Regime Agent."""
        try:
            btc_ticker = await asyncio.to_thread(self.binance_client.fetch_ticker, "BTC/USDT")
            btc_price = float(btc_ticker.get("price") or 0.0)
            btc_change = float(btc_ticker.get("change24h") or 0.0)

            btc_df = await asyncio.to_thread(self.binance_client.fetch_ohlcv, "BTC/USDT", "1h", 205)
            btc_htf = confirmed_trend(btc_df) if not btc_df.empty else "HOLD"

            symbols = await self.get_top_liquid_coins()
            gainers = 0
            losers = 0
            changes = []
            for s in symbols[:25]:
                t = self.symbol_tickers.get(s)
                if t:
                    c = float(t.get("change24h") or 0.0)
                    changes.append(c)
                    if c > 0: gainers += 1
                    else: losers += 1

            avg_change = sum(changes) / len(changes) if changes else btc_change
            positions = await asyncio.to_thread(self.get_positions)
            stats = get_trade_stats(mode=self.config.mode)

            return {
                "btc_price": btc_price,
                "btc_change_24h": btc_change,
                "btc_htf_trend": btc_htf,
                "funding_rate": 0.0001,
                "gainers_count": gainers,
                "losers_count": losers,
                "total_scanned": len(changes) or 25,
                "avg_market_change": avg_change,
                "daily_pnl": stats.get("daily_pnl", 0.0),
                "open_positions_count": len(positions)
            }
        except Exception as e:
            logger.warning(f"Failed to gather macro market context: {e}")
            return {}

    def _apply_ai_regime_adaptation(self, analysis: Optional[Dict[str, Any]]):
        """AI Self-Adapting Engine: Automatically switches strategy and adapts leverage based on Market Regime."""
        if not analysis:
            return

        # 1. AI Auto Strategy Switch
        if getattr(self.config, "ai_auto_strategy_switch", True):
            rec_strategy = analysis.get("recommended_strategy")
            if rec_strategy and rec_strategy in {"trend_pullback", "bb_mean_reversion", "breakout"}:
                if rec_strategy != self.config.strategy:
                    old_strat = self.config.strategy
                    self.config.strategy = rec_strategy
                    self.strategy = get_strategy(rec_strategy, self.config.model_dump())
                    save_setting("trade_config", self.config.model_dump())
                    add_log(
                        "INFO",
                        "AI_ADAPT",
                        f"🧠 AI Auto-Adapting: Tự động đổi chiến thuật '{old_strat}' ➔ '{rec_strategy}' phù hợp chế độ thị trường {analysis.get('regime_vn')}"
                    )

        # 2. AI Auto Leverage Adjustment
        if getattr(self.config, "ai_auto_leverage", True):
            rec_lev = analysis.get("recommended_leverage")
            if rec_lev and isinstance(rec_lev, (int, float)):
                rec_lev = int(rec_lev)
                if 5 <= rec_lev <= 25 and rec_lev != self.config.leverage:
                    old_lev = self.config.leverage
                    self.config.leverage = rec_lev
                    save_setting("trade_config", self.config.model_dump())
                    add_log(
                        "INFO",
                        "AI_ADAPT",
                        f"🧠 AI Auto-Adapting: Tự động điều chỉnh đòn bẩy an toàn từ x{old_lev} ➔ x{rec_lev}"
                    )

    async def run_ai_regime_loop(self):
        """Runs every 60 minutes to evaluate macro crypto market regime via Gemini AI."""
        logger.info("Starting Gemini AI Macro Regime Monitor Loop...")
        # Initial analysis on startup after 5 seconds
        await asyncio.sleep(5)
        while True:
            try:
                if self.config.gemini_ai_enabled and self.config.gemini_auto_regime:
                    ctx = await self.get_macro_market_context()
                    analysis = await gemini_agent.analyze_market(ctx)
                    self._apply_ai_regime_adaptation(analysis)
                    await self.broadcast_state()
            except Exception as e:
                logger.error(f"Error in Gemini Regime Loop: {e}", exc_info=True)
            await asyncio.sleep(3600)

    async def trigger_ai_analysis(self) -> Dict[str, Any]:
        """Trigger on-demand immediate Gemini AI analysis."""
        ctx = await self.get_macro_market_context()
        analysis = await gemini_agent.analyze_market(ctx)
        self._apply_ai_regime_adaptation(analysis)
        await self.broadcast_state()
        return analysis

bot_engine = ScalperEngine()
