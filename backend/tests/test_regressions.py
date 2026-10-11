"""Offline regression suite. Never uses the project's database or exchange credentials."""
import asyncio
import os
import sys
import tempfile
import time
import unittest
from datetime import datetime
from contextlib import closing
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
_scratch = tempfile.TemporaryDirectory(dir=os.environ.get("PI_SCRATCH_DIR"))
os.environ["TRADING_BOT_DB_PATH"] = str(Path(_scratch.name) / "tests.db")
from app import database as db
from app.models import TradeConfig
from app.paper_trader import PaperTrader
from app.scalper_engine import ScalperEngine
from app.binance_client import BinanceFuturesClient
from app.models import ApiKeyConfig
from app.binance_client import describe_exchange_error
import ccxt
from app import main
import pandas as pd
from pydantic import ValidationError


def reset_db():
    with closing(db.get_connection()) as connection, connection:
        for table in ("settings", "trades", "logs"):
            connection.execute(f"DELETE FROM {table}")


def open_paper(trader, **kwargs):
    params = dict(symbol="BTC/USDT", side="LONG", price=100, margin_amount=100,
                  leverage=10, tp_pct=10, sl_pct=5, trailing_activation_pct=0.5,
                  trailing_callback_pct=0.25, strategy_name="breakout")
    params.update(kwargs)
    return trader.open_position(**params)


class PaperTests(unittest.TestCase):
    def setUp(self):
        reset_db()
        self.trader = PaperTrader()

    def test_round_trip_fee_charged_once(self):
        position = open_paper(self.trader)
        record = self.trader.close_position(position["id"], 100, "MANUAL_CLOSE")
        self.assertAlmostEqual(record["pnl"], -0.8)
        self.assertAlmostEqual(self.trader.balance, 9999.2)
        self.assertAlmostEqual(self.trader.balance - 10000, record["pnl"])

    def test_margin_requires_entry_fee(self):
        self.trader.balance = 100
        self.assertIsNone(open_paper(self.trader))
        self.assertEqual(self.trader.balance, 100)

    def test_quantity_not_rounded_to_zero(self):
        position = open_paper(self.trader, price=10_000_000, margin_amount=5, leverage=1)
        self.assertGreater(position["amount"], 0)
        self.trader.close_position(position["id"], 10_000_000, "MANUAL_CLOSE")
        self.assertAlmostEqual(self.trader.balance, 9999.996)

    def test_short_small_coin_trailing_precision(self):
        position = open_paper(self.trader, side="SHORT", symbol="PEPE/USDT", price=0.00001)
        self.trader.update_position_price("PEPE/USDT", 0.0000099)
        self.assertGreater(position["trailing_stop_price"], 0.0000099)
        self.assertLess(position["trailing_stop_price"], position["entry_price"])

    def test_small_coin_trailing_precision(self):
        position = open_paper(self.trader, symbol="PEPE/USDT", price=0.00001)
        self.trader.update_position_price("PEPE/USDT", 0.0000101)
        self.assertGreater(position["trailing_stop_price"], position["entry_price"])
        self.assertLess(position["trailing_stop_price"], 0.0000101)

    def test_trailing_disabled(self):
        position = open_paper(self.trader, trailing_enabled=False)
        self.trader.update_position_price("BTC/USDT", 101)
        self.assertIsNone(position["trailing_stop_price"])

    def test_state_survives_restart(self):
        position = open_paper(self.trader)
        self.trader.update_position_price("BTC/USDT", 101)
        restored = PaperTrader()
        self.assertEqual(restored.balance, self.trader.balance)
        self.assertEqual(restored.open_positions, self.trader.open_positions)
        self.assertIn(position["id"], restored.open_positions)

    def test_invalid_exit_does_not_remove_position(self):
        position = open_paper(self.trader)
        with self.assertRaises(ValueError):
            self.trader.close_position(position["id"], float("nan"), "MANUAL_CLOSE")
        self.assertIn(position["id"], self.trader.open_positions)

    def test_config_validation(self):
        for kwargs in ({"mode": "oops"}, {"leverage": 0}, {"scan_top_n": 0},
                       {"take_profit_pct": -1}, {"position_size_percent": 101},
                       {"position_size_usd": float("nan")}, {"ema_fast": 30},
                       {"rsi_oversold": 90}, {"cooldown_seconds": -1}):
            with self.subTest(kwargs=kwargs), self.assertRaises(ValidationError):
                TradeConfig(**kwargs)

    def test_init_does_not_rewrite_exit_reason(self):
        position = open_paper(self.trader)
        self.trader.close_position(position["id"], 100.01, "TAKE_PROFIT")
        db.init_db()
        self.assertEqual(db.get_trades()[0]["exit_reason"], "TAKE_PROFIT")

    def test_calendar_breakeven_not_loss(self):
        position = open_paper(self.trader)
        self.trader.close_position(position["id"], 100, "MANUAL_CLOSE")
        with closing(db.get_connection()) as conn, conn:
            conn.execute("UPDATE trades SET pnl = 0")
        now = datetime.now()
        calendar = db.get_pnl_calendar_data(now.year, now.month)
        self.assertEqual(calendar["month_summary"]["losses"], 0)
        self.assertEqual(db.get_trade_stats()["losses"], 0)


async def api_request(method, path, data=None):
    import json
    url, _, query = path.partition("?")
    scope = {"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1",
             "method": method, "scheme": "http", "path": url, "raw_path": url.encode(),
             "query_string": query.encode(), "headers": [(b"content-type", b"application/json")],
             "client": ("127.0.0.1", 12345), "server": ("127.0.0.1", 8000), "root_path": ""}
    body = json.dumps(data).encode() if data is not None else b""
    sent = False
    messages = []
    async def receive():
        nonlocal sent
        if not sent:
            sent = True
            return {"type": "http.request", "body": body, "more_body": False}
        await asyncio.sleep(0)
        return {"type": "http.disconnect"}
    async def send(message):
        messages.append(message)
    await main.app(scope, receive, send)
    status = next(m["status"] for m in messages if m["type"] == "http.response.start")
    response = b"".join(m.get("body", b"") for m in messages if m["type"] == "http.response.body")
    return status, json.loads(response)

from app.risk import size_position
from app.trend_filter import confirmed_trend
class EngineTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        reset_db()
        self.engine = ScalperEngine()
        self.engine.broadcast_state = AsyncMock()
        self.engine.config.trend_filter_enabled = False
        self.engine.binance_client.fetch_ticker = Mock(return_value={"price": 100, "symbol": "BTC/USDT"})
        self.engine.binance_client.fetch_funding_rate = Mock(return_value=0.0)
        self.engine.config.gemini_ai_enabled = False

    async def asyncTearDown(self):
        await self.engine.shutdown()

    async def test_http_start_stop_and_validation(self):
        with patch.object(main, "bot_engine", self.engine), patch.object(self.engine, "ensure_tasks"):
            status, result = await api_request("POST", "/api/bot/start")
            self.assertEqual(status, 200)
            self.assertTrue(result["success"])
            status, result = await api_request("POST", "/api/paper/reset?amount=20000")
            self.assertEqual(status, 400)
            status, result = await api_request("POST", "/api/bot/stop")
            self.assertEqual(status, 200)
            status, result = await api_request("POST", "/api/config", {"leverage": 0})
            self.assertEqual(status, 422)
            status, result = await api_request("GET", "/api/pnl/calendar?month=13")
            self.assertEqual(status, 422)

    async def test_start_api_runs_on_event_loop(self):
        with patch.object(main, "bot_engine", self.engine), patch.object(self.engine, "ensure_tasks"):
            result = await main.start_bot()
            self.assertTrue(result["success"])
            self.assertTrue(self.engine.is_running)

    async def test_http_close_live_id_with_slash(self):
        self.engine.config.mode = "live"
        with patch.object(main, "bot_engine", self.engine), patch.object(self.engine, "close_single_position", return_value={"success": True}) as close:
            status, result = await api_request("POST", "/api/positions/BTC/USDT:USDT_LONG/close")
            self.assertEqual(status, 200)
            self.assertTrue(result["success"])
            close.assert_called_once_with("BTC/USDT:USDT_LONG")

    async def test_entry_uses_fresh_ticker(self):
        self.engine.is_running = True
        self.engine.binance_client.fetch_ticker.return_value = {"price": 102}
        await self.engine.execute_trade_on_symbol("BTC/USDT", "LONG", "test", 100)
        self.assertEqual(self.engine.get_positions()[0]["entry_price"], 102)

    async def test_reconcile_live_records_once(self):
        self.engine.live_entry_orders["BTC/USDT"] = dict(side="LONG", entry_price=100, amount=1, margin=10, leverage=10,
            strategy="breakout", mode="live", time=datetime.now().isoformat(), entry_time_ms=1000)
        trades = [dict(side="buy", amount=1, price=100, timestamp=1000, fee={"currency": "USDT", "cost": 0.04}, info={"realizedPnl": "0"}),
                  dict(side="sell", amount=1, price=110, timestamp=2000, fee={"currency": "USDT", "cost": 0.044}, info={"realizedPnl": "10"})]
        with patch.object(self.engine.binance_client, "fetch_position_trades", return_value=trades), patch.object(self.engine.binance_client, "cancel_all_orders", side_effect=[False, True]):
            self.engine.reconcile_live_entries([])
            self.engine.reconcile_live_entries([])
        self.assertEqual(len(db.get_trades()), 1)
        self.assertEqual(db.get_trades()[0]["pnl"], 9.92)
        self.assertFalse(self.engine.live_entry_orders)

    async def test_invalid_new_key_does_not_replace_existing(self):
        self.engine.config.mode = "testnet"
        self.engine.binance_client.api_key = "previous"
        self.engine.binance_client.api_secret = "previous-secret"
        db.save_setting("api_keys", {"api_key": "previous", "api_secret": "previous-secret", "testnet": True})
        candidate = Mock()
        candidate.test_connection.return_value = {"success": False, "message": "Testnet: -2015"}
        candidate.close = AsyncMock()
        with patch.object(main, "bot_engine", self.engine), patch.object(self.engine, "get_positions", return_value=[]), patch.object(main, "BinanceFuturesClient", return_value=candidate), patch.object(self.engine, "update_api_keys") as update:
            result = await main.save_api_keys(ApiKeyConfig(api_key="invalid", api_secret="invalid-secret", environment="testnet"))
        self.assertFalse(result["success"])
        update.assert_not_called()
        candidate.fetch_open_positions.assert_not_called()
        self.assertEqual(db.get_setting("api_keys")["api_key"], "previous")

    async def test_rejected_old_key_can_be_replaced_after_validating_new_key(self):
        self.engine.config.mode = "testnet"
        self.engine.binance_client.api_key = "expired"
        candidate = Mock()
        candidate.test_connection.return_value = {"success": True, "message": "Testnet OK"}
        candidate.fetch_open_positions.return_value = []
        candidate.close = AsyncMock()
        with patch.object(main, "bot_engine", self.engine), patch.object(self.engine, "get_positions", side_effect=ValueError("Binance Futures Testnet mã -2015")), patch.object(main, "BinanceFuturesClient", return_value=candidate), patch.object(self.engine, "update_api_keys") as update, patch.object(self.engine.binance_client, "close", new_callable=AsyncMock), patch.object(self.engine, "run_ws_ticker_stream", new_callable=AsyncMock):
            result = await main.save_api_keys(ApiKeyConfig(api_key="replacement", api_secret="replacement-secret", environment="testnet"))
        self.assertTrue(result["success"])
        candidate.fetch_open_positions.assert_called_once()
        update.assert_called_once_with("replacement", "replacement-secret", True, False)

    async def test_api_rejects_key_from_wrong_environment(self):
        self.engine.config.mode = "testnet"
        with patch.object(main, "bot_engine", self.engine), patch.object(main, "BinanceFuturesClient") as candidate:
            with self.assertRaisesRegex(ValueError, "không khớp"):
                await main.save_api_keys(ApiKeyConfig(api_key="demo", api_secret="demo-secret", environment="demo"))
            candidate.assert_not_called()

    async def test_testnet_ticker_uses_rest_not_live_websocket(self):
        self.engine.binance_client.testnet = True
        self.engine.binance_client.fetch_ticker = Mock(return_value={"symbol": "BTC/USDT", "price": 123.0})
        seen = asyncio.Event()
        async def capture(ticker):
            self.assertEqual(ticker["price"], 123.0)
            seen.set()
        with patch.object(self.engine.binance_client, "watch_ticker_stream", new_callable=AsyncMock) as watch, patch.object(self.engine, "on_realtime_ticker", side_effect=capture):
            task = asyncio.create_task(self.engine.run_ws_ticker_stream())
            try:
                await asyncio.wait_for(seen.wait(), timeout=3)
                watch.assert_not_awaited()
            finally:
                task.cancel()
                await task

    async def test_lifespan_is_paused(self):
        with patch.object(main, "bot_engine", self.engine), patch.object(self.engine, "ensure_tasks"):
            async with main.lifespan(main.app):
                self.assertFalse(self.engine.is_running)

    async def test_start_cannot_bypass_daily_loss(self):
        with patch("app.scalper_engine.get_trade_stats", return_value={"daily_pnl": -51}):
            with self.assertRaises(ValueError):
                await self.engine.start()
            self.assertTrue(self.engine.daily_loss_hit)
            self.assertFalse(self.engine.is_running)

    async def test_stopped_cannot_execute(self):
        await self.engine.execute_trade_on_symbol("BTC/USDT", "LONG", "test", 100)
        self.assertFalse(self.engine.paper_trader.open_positions)

    async def test_single_symbol_duplicate_and_limit_guard(self):
        self.engine.is_running = True
        await asyncio.gather(*(self.engine.execute_trade_on_symbol("BTC/USDT", "LONG", "test", 100) for _ in range(4)))
        self.assertEqual(len(self.engine.get_positions()), 1)
        self.engine.config.max_open_positions = 1
        await self.engine.execute_trade_on_symbol("ETH/USDT", "SHORT", "test", 100)
        self.assertEqual(len(self.engine.get_positions()), 1)

    async def test_stop_during_fetch_cannot_enter(self):
        self.engine.is_running = True
        def stop_on_positions():
            self.engine.stop()
            return []
        with patch.object(self.engine, "get_positions", side_effect=stop_on_positions):
            await self.engine.execute_trade_on_symbol("BTC/USDT", "LONG", "test", 100)
        self.assertFalse(self.engine.paper_trader.open_positions)

    async def test_paused_position_still_triggers_stop(self):
        position = open_paper(self.engine.paper_trader)
        await self.engine.on_realtime_ticker({"symbol": "BTC/USDT", "price": 94})
        self.assertNotIn(position["id"], self.engine.paper_trader.open_positions)
        self.assertEqual(db.get_trades()[0]["exit_reason"], "STOP_LOSS")

    async def test_secondary_ticker_does_not_overwrite_primary(self):
        self.engine.last_ticker = {"price": 100}
        await self.engine.on_realtime_ticker({"symbol": "ETH/USDT", "price": 50})
        self.assertEqual(self.engine.last_ticker["price"], 100)

    async def test_closed_candles_excludes_forming_bar(self):
        now_ms = int(time.time() * 1000)
        df = pd.DataFrame({"timestamp": [now_ms - 120000, now_ms - 30000]})
        self.assertEqual(len(self.engine.closed_candles(df)), 1)

    async def test_cannot_switch_mode_with_open_position(self):
        open_paper(self.engine.paper_trader)
        with self.assertRaises(ValueError):
            self.engine.update_config(TradeConfig(mode="live"))
        self.assertEqual(self.engine.config.mode, "paper")

    async def test_environment_mismatch_blocks_start(self):
        self.engine.config.mode = "testnet"
        self.engine.binance_client.api_key = "fake"
        self.engine.binance_client.api_secret = "fake"
        with self.assertRaises(ValueError):
            await self.engine.start()

    async def test_failed_live_close_keeps_protection(self):
        self.engine.config.mode = "live"
        position = {"id": "BTC/USDT:USDT_LONG", "symbol": "BTC/USDT:USDT", "side": "LONG", "amount": 1}
        client = self.engine.binance_client
        with patch.object(client, "fetch_open_positions", return_value=[position]), patch.object(client, "create_market_order", return_value={"success": False, "message": "rejected"}), patch.object(client, "cancel_all_orders") as cancel:
            result = self.engine.close_single_position("BTC/USDT_LONG")
            self.assertFalse(result["success"])
            cancel.assert_not_called()

    async def test_panic_reports_failed_close(self):
        self.engine.config.mode = "live"
        self.engine.binance_client.api_key = "fake"
        with patch.object(self.engine, "get_positions", return_value=[{"id": "fake"}]), patch.object(self.engine, "close_single_position", return_value={"success": False, "message": "rejected"}):
            result = await self.engine.panic_close_all()
        self.assertFalse(result["success"])
        self.assertEqual(result["closed_positions"], 0)
        self.assertEqual(len(result["failures"]), 1)

    async def test_live_trailing_stays_active_after_profit_falls(self):
        self.engine.config.mode = "live"
        self.engine.live_entry_orders["BTC/USDT"] = dict(side="LONG", entry_price=100, peak_price=100, amount=1, trailing_enabled=True, trailing_activation_pct=0.5, trailing_callback_pct=0.25)
        with patch.object(self.engine, "close_single_position", return_value={"success": True}) as close:
            await self.engine.on_realtime_ticker({"symbol": "BTC/USDT", "price": 100.6})
            close.assert_not_called()
            await self.engine.on_realtime_ticker({"symbol": "BTC/USDT", "price": 100.2})
            close.assert_called_once()


    async def test_failed_live_protection_halts_and_closes(self):
        self.engine.config.mode = "live"
        self.engine.is_running = True
        client = self.engine.binance_client
        client.api_key = "fake"
        client.api_secret = "fake"
        with patch.object(self.engine, "check_daily_loss", return_value=False), patch.object(self.engine, "get_balance", return_value={"total_usdt": 5000.0, "free_usdt": 5000.0}), patch.object(client, "fetch_open_positions", return_value=[]), patch.object(self.engine, "_configure_live_symbol", return_value=True), patch.object(client, "format_amount", return_value=10), patch.object(client, "create_market_order", return_value={"success": True, "amount": 10, "price": 100}), patch.object(client, "place_stop_loss_order", return_value={"success": False}), patch.object(client, "place_take_profit_order", return_value={"success": True}), patch.object(self.engine, "close_single_position", return_value={"success": True}) as close:
            await self.engine.execute_trade_on_symbol("BTC/USDT", "LONG", "test", 100)
        self.assertFalse(self.engine.is_running)
        close.assert_called_once_with("BTC/USDT_LONG")

class ClientTests(unittest.TestCase):
    def setUp(self):
        self.client = BinanceFuturesClient("fake", "fake")
        self.client.exchange = Mock()

    def test_demo_uses_demo_rest_and_websocket_not_sandbox(self):
        client = BinanceFuturesClient("", "", demo=True)
        try:
            for exchange in (client.exchange, client.pro_exchange):
                self.assertTrue(exchange.options.get("enableDemoTrading"))
                self.assertFalse(exchange.options.get("sandboxMode"))
                self.assertEqual(exchange.urls["api"]["fapiPrivate"], "https://demo-fapi.binance.com/fapi/v1")
                self.assertNotIn("testnet.binancefuture.com", exchange.urls["api"]["fapiPrivate"])
            self.assertIn("ws", client.pro_exchange.urls["api"])
        finally:
            import asyncio
            asyncio.run(client.close())

    def test_testnet_uses_testnet_rest_not_demo(self):
        client = BinanceFuturesClient("", "", testnet=True)
        try:
            self.assertTrue(client.exchange.options.get("sandboxMode"))
            self.assertEqual(client.exchange.urls["api"]["fapiPrivate"], "https://testnet.binancefuture.com/fapi/v1")
            self.assertFalse(client.exchange.options.get("enableDemoTrading"))
        finally:
            import asyncio
            asyncio.run(client.close())
    def test_live_does_not_use_demo_endpoints(self):
        client = BinanceFuturesClient("", "", testnet=False)
        try:
            self.assertFalse(client.exchange.options.get("enableDemoTrading"))
            self.assertEqual(client.exchange.urls["api"]["fapiPrivate"], "https://fapi.binance.com/fapi/v1")
        finally:
            import asyncio
            asyncio.run(client.close())

    def test_position_failure_is_not_empty_account(self):
        self.client.exchange.fetch_positions.side_effect = RuntimeError("offline")
        with self.assertRaises(ValueError):
            self.client.fetch_open_positions()

    def test_authentication_failure_has_safe_actionable_message(self):
        err = ccxt.AuthenticationError('binanceusdm {"code":-2015,"msg":"Invalid API-key, IP, or permissions"}')
        self.client.testnet = True
        self.client.exchange.fetch_positions.side_effect = err
        with self.assertRaisesRegex(ValueError, "-2015.*khóa riêng"):
            self.client.fetch_open_positions()
        message = describe_exchange_error(err, True)
        self.assertIn("Binance Futures Demo", message)
        self.assertNotIn('Invalid API-key', message)

    def test_position_mode_string_false(self):
        self.client.exchange.fapiPrivateGetPositionSideDual.return_value = {"dualSidePosition": "false"}
        self.client._detect_position_mode()
        self.assertFalse(self.client.is_hedge_mode)

    def test_daily_pnl_ignores_deposits(self):
        self.client.exchange.fapiPrivateGetIncome.return_value = [
            {"asset": "USDT", "incomeType": "REALIZED_PNL", "income": "-50"},
            {"asset": "USDT", "incomeType": "COMMISSION", "income": "-1"},
            {"asset": "USDT", "incomeType": "FUNDING_FEE", "income": "2"},
            {"asset": "USDT", "incomeType": "TRANSFER", "income": "1000"},
        ]
        self.assertEqual(self.client.fetch_daily_pnl(), -49)

    def test_precision_failure_does_not_guess_amount(self):
        self.client.markets_loaded = True
        self.client.exchange.amount_to_precision.side_effect = ValueError("unknown market")
        with self.assertRaises(ValueError):
            self.client.format_amount("UNKNOWN/USDT", 0.000001)


class StrategyTests(unittest.TestCase):
    def test_all_strategies_hold_on_insufficient_data(self):
        from app.strategies import get_strategy
        df = pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume"])
        for name in ("trend_pullback", "bb_mean_reversion", "breakout"):
            self.assertEqual(get_strategy(name).generate_signal(df)[0], "HOLD")

    def test_ema_200_is_not_shortened(self):
        from app.strategies import get_strategy
        values = list(range(100, 160))
        df = pd.DataFrame(dict(close=values, open=values, high=[v+1 for v in values], low=[v-1 for v in values], volume=[100]*60))
        self.assertTrue(get_strategy("trend_pullback").calculate_indicators(df)["ema_200"].isna().all())


if __name__ == "__main__":
    unittest.main()
