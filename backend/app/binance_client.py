import asyncio
import ccxt
import ccxt.pro
import pandas as pd
from typing import Dict, Any, List, Optional, Callable
import logging

import time
import math
from datetime import datetime
import re
import threading
import hashlib


def describe_exchange_error(exc: Exception, environment: str | bool) -> str:
    """Return an actionable exchange error without exposing raw API data."""
    if isinstance(environment, bool):
        environment = "demo" if environment else "live"
    code = re.search(r'"code"\s*:\s*(-?\d+)', str(exc))
    error_code = code.group(1) if code else None
    venue = {"demo": "Binance Futures Demo", "testnet": "Binance Futures Testnet", "live": "Binance Futures Live"}[environment]
    if error_code in {"-2015", "-2014"} or isinstance(exc, ccxt.AuthenticationError):
        return f"{venue}: API Key không hợp lệ, thiếu quyền Futures hoặc IP không được phép (mã {error_code or 'xác thực'}). Dùng khóa riêng của đúng môi trường và kiểm tra quyền/IP."
    if error_code == "-1021":
        return f"{venue}: đồng hồ máy lệch so với Binance (mã -1021). Hãy đồng bộ ngày giờ hệ thống."
    if isinstance(exc, ccxt.NetworkError):
        return f"Không kết nối được {venue}; kiểm tra Internet, DNS và tường lửa ({type(exc).__name__})."
    if error_code:
        return f"{venue} trả lỗi mã {error_code} ({type(exc).__name__})."
    return f"{venue} không phản hồi hợp lệ ({type(exc).__name__})."

logger = logging.getLogger("binance_client")

class BinanceFuturesClient:
    def __init__(self, api_key: str = "", api_secret: str = "", testnet: bool = False, demo: bool = False):
        if testnet and demo:
            raise ValueError("Chỉ được chọn một môi trường Binance")
        self.api_key = api_key
        self.api_secret = api_secret
        self.testnet = testnet
        self.demo = demo
        self.environment = "testnet" if testnet else "demo" if demo else "live"
        self.exchange: Optional[ccxt.binanceusdm] = None
        self.pro_exchange: Optional[ccxt.pro.binanceusdm] = None
        self.markets_loaded = False
        self.is_hedge_mode = False
        self.position_mode_detected = False
        self._daily_pnl_cache = None
        self._protection_cache = None
        self._protection_lock = threading.Lock()
        self._init_exchange()

    def _init_exchange(self):
        config = {
            "apiKey": self.api_key,
            "secret": self.api_secret,
            "enableRateLimit": True,
            "options": {
                "defaultType": "future",
                "adjustForTimeDifference": True,
                "disableFuturesSandboxWarning": self.testnet,
            },
        }
        self.exchange = ccxt.binanceusdm(config)
        self.pro_exchange = ccxt.pro.binanceusdm(config)
        if self.testnet:
            self.exchange.set_sandbox_mode(True)
            self.pro_exchange.set_sandbox_mode(True)
        elif self.demo:
            self.exchange.enable_demo_trading(True)
            self.pro_exchange.enable_demo_trading(True)
        self.position_mode_detected = False
        self._protection_cache = None

    def _detect_position_mode(self):
        """Detect whether account is in Hedge Mode or One-Way Mode."""
        if not self.api_key or not self.api_secret:
            self.is_hedge_mode = False
            return
        try:
            res = self.exchange.fapiPrivateGetPositionSideDual()
            self.is_hedge_mode = res.get("dualSidePosition", False) in (True, "true")
            self.position_mode_detected = True
            logger.info(f"Binance Futures Account Position Mode: {'Hedge Mode (Dual-Side)' if self.is_hedge_mode else 'One-Way Mode'}")
        except Exception as e:
            self.position_mode_detected = False
            raise ValueError(f"Không xác định được chế độ vị thế tài khoản: {e}") from e

    def update_credentials(self, api_key: str, api_secret: str, testnet: bool = False, demo: bool = False):
        if testnet and demo:
            raise ValueError("Chỉ được chọn một môi trường Binance")
        self.api_key = api_key
        self.api_secret = api_secret
        self.testnet = testnet
        self.demo = demo
        self.environment = "testnet" if testnet else "demo" if demo else "live"
        self._init_exchange()
        self.markets_loaded = False
        self._daily_pnl_cache = None

    def ensure_markets_loaded(self):
        if not self.markets_loaded and self.exchange:
            try:
                self.exchange.load_markets()
                self.markets_loaded = True
            except Exception as e:
                logger.error(f"Error loading markets: {e}")

    def format_amount(self, symbol: str, amount: float) -> float:
        """Format order quantity according to Binance lotSize and stepSize filters."""
        self.ensure_markets_loaded()
        try:
            formatted = self.exchange.amount_to_precision(symbol, amount)
            return float(formatted)
        except Exception:
            raise ValueError(f"Không định dạng được khối lượng cho {symbol}")

    def format_price(self, symbol: str, price: float) -> float:
        """Format order price according to Binance tickSize filter."""
        self.ensure_markets_loaded()
        try:
            formatted = self.exchange.price_to_precision(symbol, price)
            return float(formatted)
        except Exception:
            raise ValueError(f"Không định dạng được giá cho {symbol}")

    def get_max_leverage(self, symbol: str) -> int:
        """Fetch maximum allowed leverage for symbol to avoid -4028 error."""
        self.ensure_markets_loaded()
        try:
            market = self.exchange.market(symbol)
            limits = market.get("limits", {})
            max_lev = limits.get("leverage", {}).get("max")
            if max_lev:
                return int(max_lev)
        except Exception:
            pass
        return 50

    def test_connection(self) -> Dict[str, Any]:
        """Test API connection and check futures balance permission."""
        try:
            if not self.api_key or not self.api_secret:
                return {"success": False, "message": "API Key và Secret chưa được cấu hình"}
            balance = self.exchange.fetch_balance()
            usdt = balance.get("USDT", {})
            self._detect_position_mode()
            mode_str = "Hedge Mode (2 chiều)" if self.is_hedge_mode else "One-Way Mode (1 chiều)"
            venue = {"demo": "Binance Futures Demo", "testnet": "Binance Futures Testnet", "live": "Binance Futures Live"}[self.environment]
            return {
                "success": True,
                "message": f"Kết nối {venue} thành công ({mode_str})! Khả dụng: {usdt.get('free', 0.0):.2f} USDT",
                "balance": float(usdt.get("total", 0.0) or 0.0),
                "free": float(usdt.get("free", 0.0) or 0.0),
                "is_hedge_mode": self.is_hedge_mode
            }
        except Exception as e:
            return {"success": False, "message": describe_exchange_error(e, self.environment)}

    async def watch_ticker_stream(self, symbol: str, callback: Callable[[Dict[str, Any]], Any]):
        """Direct Binance Futures WebSocket real-time ticker stream with auto-reconnect."""
        while True:
            try:
                ticker = await self.pro_exchange.watch_ticker(symbol)
                formatted = {
                    "symbol": symbol,
                    "price": float(ticker.get("last") or 0.0),
                    "bid": float(ticker.get("bid") or 0.0),
                    "ask": float(ticker.get("ask") or 0.0),
                    "high24h": float(ticker.get("high") or 0.0),
                    "low24h": float(ticker.get("low") or 0.0),
                    "volume24h": float(ticker.get("baseVolume") or 0.0),
                    "change24h": float(ticker.get("percentage") or 0.0)
                }
                if asyncio.iscoroutinefunction(callback):
                    await callback(formatted)
                else:
                    callback(formatted)
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.warning(f"WebSocket ticker stream re-connecting ({symbol}): {e}")
                await asyncio.sleep(2)

    def fetch_ticker(self, symbol: str = "BTC/USDT") -> Dict[str, Any]:
        """Fallback REST fetch ticker."""
        try:
            ticker = self.exchange.fetch_ticker(symbol)
            return {
                "symbol": symbol,
                "price": float(ticker.get("last") or 0.0),
                "bid": float(ticker.get("bid") or 0.0),
                "ask": float(ticker.get("ask") or 0.0),
                "high24h": float(ticker.get("high") or 0.0),
                "low24h": float(ticker.get("low") or 0.0),
                "volume24h": float(ticker.get("baseVolume") or 0.0),
                "change24h": float(ticker.get("percentage") or 0.0)
            }
        except Exception as e:
            logger.error(f"Error fetching ticker for {symbol}: {e}")
            return {"symbol": symbol, "price": 0.0, "change24h": 0.0}

    def fetch_funding_rate(self, symbol: str = "BTC/USDT") -> float:
        """Fetch current funding rate for symbol (as percentage decimal, e.g., 0.0001 = 0.01%)."""
        try:
            self.ensure_markets_loaded()
            clean_sym = symbol.replace(":USDT", "")
            if self.exchange and hasattr(self.exchange, "fetch_funding_rate"):
                data = self.exchange.fetch_funding_rate(clean_sym)
                return float(data.get("fundingRate") or 0.0)
            return 0.0001
        except Exception as e:
            logger.debug(f"Could not fetch funding rate for {symbol}: {e}")
            return 0.0001

    def fetch_ohlcv(self, symbol: str = "BTC/USDT", timeframe: str = "1m", limit: int = 100) -> pd.DataFrame:
        """Fetch historical klines and return formatted DataFrame."""
        try:
            ohlcv = self.exchange.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)
            df = pd.DataFrame(ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"])
            df["timestamp_dt"] = pd.to_datetime(df["timestamp"], unit="ms")
            for col in ["open", "high", "low", "close", "volume"]:
                df[col] = df[col].astype(float)
            return df
        except Exception as e:
            logger.error(f"Error fetching OHLCV for {symbol}: {e}")
            return pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume"])

    def fetch_balance(self) -> Dict[str, float]:
        """Fetch USDT Futures balance."""
        try:
            if not self.api_key or not self.api_secret:
                return {"total_usdt": 0.0, "free_usdt": 0.0, "used_usdt": 0.0}
            balance = self.exchange.fetch_balance()
            usdt = balance.get("USDT", {})
            return {
                "total_usdt": float(usdt.get("total", 0.0) or 0.0),
                "free_usdt": float(usdt.get("free", 0.0) or 0.0),
                "used_usdt": float(usdt.get("used", 0.0) or 0.0)
            }
        except Exception as e:
            logger.error(f"Error fetching balance: {e}")
            return {"total_usdt": 0.0, "free_usdt": 0.0, "used_usdt": 0.0}

    def set_leverage(self, symbol: str, leverage: int) -> bool:
        """Set leverage for symbol with max leverage clamping."""
        try:
            if not self.api_key:
                return True
            max_allowed = self.get_max_leverage(symbol)
            if leverage > max_allowed:
                return False
            self.exchange.set_leverage(leverage, symbol)
            return True
        except Exception as e:
            logger.warning(f"Warning setting leverage for {symbol}: {e}")
            return False

    def set_margin_mode(self, symbol: str, margin_mode: str = "ISOLATED") -> bool:
        """Set margin mode: ISOLATED or CROSSED."""
        try:
            if not self.api_key:
                return True
            mode = "isolated" if margin_mode.upper() == "ISOLATED" else "cross"
            self.exchange.set_margin_mode(mode, symbol)
            return True
        except ccxt.ExchangeError as e:
            return "-4046" in str(e) or "No need to change margin type" in str(e)
        except Exception:
            return False

    def create_market_order(self, symbol: str, side: str, amount: float, position_side: Optional[str] = None, reduce_only: bool = False, client_order_id: Optional[str] = None) -> Dict[str, Any]:
        """Create live market order compliant with both One-Way and Hedge modes."""
        order_submitted = False
        order_id = None
        try:
            if not self.position_mode_detected:
                self._detect_position_mode()
            if not math.isfinite(amount) or amount <= 0:
                raise ValueError("Khối lượng lệnh không hợp lệ")
            formatted_amount = self.format_amount(symbol, amount)
            params = {"newOrderRespType": "RESULT"}
            if client_order_id:
                params["newClientOrderId"] = client_order_id

            if self.is_hedge_mode:
                # In Hedge Mode, positionSide must be LONG or SHORT
                pos_side = position_side or ("LONG" if side.lower() == "buy" else "SHORT")
                params["positionSide"] = pos_side.upper()
            else:
                # In One-Way Mode, reduceOnly can be set
                if reduce_only:
                    params["reduceOnly"] = True

            order = self.exchange.create_order(
                symbol=symbol,
                type="market",
                side=side.lower(),
                amount=formatted_amount,
                params=params
            )
            order_submitted = True
            order_id = order.get("id")
            def fill_details(value):
                info = value.get("info") or {}
                filled = float(value.get("filled") or info.get("executedQty") or 0)
                average = float(value.get("average") or info.get("avgPrice") or 0)
                cost = float(value.get("cost") or info.get("cumQuote") or 0)
                if average <= 0 and filled > 0 and cost > 0:
                    average = cost / filled
                return average, filled
            def terminal(value):
                return value.get("status") in ("closed", "canceled", "expired") or (value.get("info") or {}).get("status") in ("FILLED", "CANCELED", "EXPIRED")
            fill_price, filled = fill_details(order)
            if (fill_price <= 0 or filled <= 0 or not terminal(order)) and order.get("id"):
                for _ in range(3):
                    time.sleep(0.2)
                    order = self.exchange.fetch_order(order["id"], symbol)
                    fill_price, filled = fill_details(order)
                    if fill_price > 0 and filled > 0 and terminal(order):
                        break
            if not math.isfinite(fill_price) or not math.isfinite(filled) or fill_price <= 0 or filled <= 0 or not terminal(order):
                raise ValueError("Lệnh đã gửi nhưng chưa xác minh được giá/khối lượng khớp thật")
            return {"success": True, "order_id": order.get("id"), "price": fill_price,
                    "amount": filled, "side": side.upper(), "raw": order}
        except Exception as e:
            logger.error("Market order result not confirmed for %s %s (%s)", side, symbol, type(e).__name__)
            return {"success": False, "order_submitted": order_submitted or isinstance(e, ccxt.NetworkError),
                    "order_id": order_id, "client_order_id": client_order_id,
                    "message": "Không xác minh được kết quả lệnh; cần kiểm tra vị thế trên sàn" if order_submitted else describe_exchange_error(e, self.environment)}

    def resolve_entry_order(self, symbol: str, meta: Dict[str, Any]) -> Dict[str, Any]:
        if meta.get("entry_order_id"):
            return self.exchange.fetch_order(meta["entry_order_id"], symbol)
        return self.exchange.fetch_order(None, symbol, {"origClientOrderId": meta["client_order_id"]})

    def cancel_entry_order(self, symbol: str, meta: Dict[str, Any]) -> None:
        params = {} if meta.get("entry_order_id") else {"origClientOrderId": meta["client_order_id"]}
        self.exchange.cancel_order(meta.get("entry_order_id"), symbol, params)

    def place_stop_loss_order(self, symbol: str, position_side: str, amount: float, stop_price: float) -> Dict[str, Any]:
        """Place exchange-native Stop Loss order (workingType='MARK_PRICE' prevents scam wicks)."""
        try:
            formatted_amount = self.format_amount(symbol, amount)
            formatted_stop_price = self.format_price(symbol, stop_price)
            opp_side = "sell" if position_side.upper() == "LONG" else "buy"
            
            params = {
                "stopPrice": formatted_stop_price,
                "workingType": "MARK_PRICE"
            }

            if self.is_hedge_mode:
                params["positionSide"] = position_side.upper()
            else:
                params["reduceOnly"] = True

            order = self.exchange.create_order(
                symbol=symbol,
                type="STOP_MARKET",
                side=opp_side,
                amount=formatted_amount,
                params=params
            )
            return {"success": True, "order_id": order.get("id")}
        except Exception as e:
            logger.error(f"Error placing SL order on Binance ({symbol}): {e}")
            return {"success": False, "message": str(e)}

    def place_take_profit_order(self, symbol: str, position_side: str, amount: float, take_profit_price: float) -> Dict[str, Any]:
        """Place exchange-native Take Profit order."""
        try:
            formatted_amount = self.format_amount(symbol, amount)
            formatted_tp_price = self.format_price(symbol, take_profit_price)
            opp_side = "sell" if position_side.upper() == "LONG" else "buy"

            params = {
                "stopPrice": formatted_tp_price,
                "workingType": "MARK_PRICE"
            }

            if self.is_hedge_mode:
                params["positionSide"] = position_side.upper()
            else:
                params["reduceOnly"] = True

            order = self.exchange.create_order(
                symbol=symbol,
                type="TAKE_PROFIT_MARKET",
                side=opp_side,
                amount=formatted_amount,
                params=params
            )
            return {"success": True, "order_id": order.get("id")}
        except Exception as e:
            logger.error(f"Error placing TP order on Binance ({symbol}): {e}")
            return {"success": False, "message": str(e)}

    def cancel_all_orders(self, symbol: str) -> bool:
        """Cancel regular and Binance Algo protection orders for one symbol."""
        try:
            if not self.api_key:
                return True
            clean = symbol.replace("/", "").replace(":USDT", "")
            regular_ok = True
            algo_ok = True
            try:
                self.exchange.cancel_all_orders(symbol)
            except Exception as exc:
                regular_ok = False
                logger.warning("Error canceling regular orders for %s: %s", symbol, type(exc).__name__)
            try:
                self.exchange.fapiPrivateDeleteAlgoOpenOrders({"symbol": clean})
            except Exception as exc:
                algo_ok = False
                logger.warning("Error canceling Algo orders for %s: %s", symbol, type(exc).__name__)
            return regular_ok and algo_ok
        except Exception as e:
            logger.warning("Error canceling orders for %s: %s", symbol, type(e).__name__)
            return False

    def enrich_position_protection(self, positions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Read actual Algo triggers, never infer protection from bot config."""
        if not positions:
            return positions
        with self._protection_lock:
            now = time.monotonic()
            if self._protection_cache and now - self._protection_cache[0] < 5:
                orders, error = self._protection_cache[1:]
            else:
                try:
                    orders = self.exchange.fapiPrivateGetOpenAlgoOrders()
                    if isinstance(orders, dict):
                        orders = orders.get("orders", orders.get("data"))
                    if not isinstance(orders, list):
                        raise ValueError("Invalid Algo response")
                    error = None
                except Exception:
                    orders, error = [], "Không đọc được lệnh bảo vệ từ Binance"
                self._protection_cache = (now, orders, error)
        result = []
        for position in positions:
            pos = dict(position)
            pos.update(take_profit_price=None, stop_loss_price=None,
                       protection_status="unverified" if error else "verified")
            if error:
                pos["protection_error"] = error
            raw_symbol = pos["symbol"].split(":")[0].replace("/", "")
            for order in orders:
                if order.get("symbol") != raw_symbol or order.get("algoStatus") not in ("NEW", "WORKING"):
                    continue
                if order.get("side") != ("SELL" if pos["side"] == "LONG" else "BUY"):
                    continue
                position_side = order.get("positionSide", "BOTH")
                if position_side not in (pos["side"], "BOTH"):
                    continue
                def enabled(value):
                    return value is True or str(value).lower() == "true"
                if position_side == "BOTH" and not (enabled(order.get("reduceOnly")) or enabled(order.get("closePosition"))):
                    continue
                try:
                    trigger = float(order.get("triggerPrice") or order.get("stopPrice") or 0)
                    quantity = float(order.get("quantity") or 0)
                except (TypeError, ValueError):
                    continue
                if not math.isfinite(trigger) or trigger <= 0:
                    continue
                if not enabled(order.get("closePosition")) and quantity + 1e-9 < abs(float(pos["amount"])):
                    continue
                field = {"STOP_MARKET": "stop_loss_price", "TAKE_PROFIT_MARKET": "take_profit_price"}.get(order.get("orderType"))
                if field:
                    old = pos[field]
                    pos[field] = trigger if old is None else (min(old, trigger) if (field == "take_profit_price") == (pos["side"] == "LONG") else max(old, trigger))
            result.append(pos)
        return result

    def fetch_open_positions(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch open positions directly from Binance Futures."""
        try:
            if not self.api_key:
                return []
            positions = self.exchange.fetch_positions([symbol] if symbol else None)
            active = []
            for p in positions:
                contracts = float(p.get("contracts") or 0.0)
                if contracts > 0:
                    side = "LONG" if p.get("side") == "long" else "SHORT"
                    entry_price = float(p.get("entryPrice") or 0.0)
                    mark_price = float(p.get("markPrice") or 0.0)
                    unrealized_pnl = float(p.get("unrealizedPnl") or 0.0)
                    margin = float(p.get("initialMargin") or 0.0)
                    active.append({
                        "id": f"{p.get('symbol')}_{side}",
                        "symbol": p.get("symbol"),
                        "side": side,
                        "entry_price": entry_price,
                        "mark_price": mark_price,
                        "current_price": mark_price,
                        "liquidation_price": float(p.get("liquidationPrice") or 0.0),
                        "amount": contracts,
                        "notional": float(p.get("notional") or 0.0),
                        "margin": margin,
                        "leverage": int(p.get("leverage") or 10),
                        "unrealized_pnl": unrealized_pnl,
                        "unrealized_pnl_pct": round((unrealized_pnl / (margin + 1e-9)) * 100, 2) if margin > 0 else 0.0,
                    })
            return active
        except Exception as e:
            logger.error("Error fetching open positions: %s", describe_exchange_error(e, self.environment))
            raise ValueError(f"Không đọc được vị thế trên sàn; chặn giao dịch để đảm bảo an toàn. {describe_exchange_error(e, self.environment)}") from e

    def fetch_position_trades(self, symbol: str, meta: Dict[str, Any]) -> List[Dict[str, Any]]:
        if not self.position_mode_detected:
            self._detect_position_mode()
        trades = []
        since = meta["entry_time_ms"]
        while True:
            batch = self.exchange.fetch_my_trades(symbol, since=since, limit=1000)
            trades.extend(t for t in batch if not self.is_hedge_mode or t.get("info", {}).get("positionSide") == meta["side"])
            if len(batch) < 1000:
                break
            next_since = max(t["timestamp"] for t in batch) + 1
            if next_since <= since:
                raise ValueError("Không phân trang được dữ liệu khớp lệnh")
            since = next_since
        return trades

    def fetch_daily_pnl(self) -> float:
        """Calendar-day income; Testnet may explicitly begin a new test session."""
        day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        now = time.time()
        start_ms, end_ms = int(day.timestamp() * 1000), int(now * 1000)
        if self.testnet:
            from .database import get_setting
            reset = get_setting("testnet_pnl_reset", {})
            account = hashlib.sha256(self.api_key.encode()).hexdigest()
            if isinstance(reset, dict) and reset.get("account") == account:
                start_ms = max(start_ms, min(int(reset.get("since_ms", 0)), end_ms))
        cache_key = (day, start_ms)
        if self._daily_pnl_cache and self._daily_pnl_cache[0] == cache_key and now - self._daily_pnl_cache[1] < 10:
            return self._daily_pnl_cache[2]
        if not self.api_key or not self.api_secret:
            raise ValueError("Chưa cấu hình API Key")
        total = 0.0
        page = 1
        try:
            while True:
                records = self.exchange.fapiPrivateGetIncome({"startTime": start_ms, "endTime": end_ms, "limit": 1000, "page": page})
                for record in records:
                    if record.get("asset") == "USDT" and record.get("incomeType") in {"REALIZED_PNL", "COMMISSION", "FUNDING_FEE"}:
                        total += float(record["income"])
                if len(records) < 1000:
                    break
                page += 1
            self._daily_pnl_cache = (cache_key, now, total)
            return total
        except Exception as e:
            raise ValueError("Không đọc được PnL trong ngày từ Binance; chặn vào lệnh mới") from e

    async def close(self):
        """Close exchange sessions cleanly."""
        if self.pro_exchange:
            await self.pro_exchange.close()
        if self.exchange and hasattr(self.exchange, "close"):
            result = self.exchange.close()
            if asyncio.iscoroutine(result):
                await result
