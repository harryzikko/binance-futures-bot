"""Safety regressions from the current audit, strictly offline."""
import json
import tempfile
import unittest
from datetime import datetime
from unittest.mock import Mock, patch

import test_regressions as regression
from app.risk import size_position
from app.execution_history import position_lifecycle
from app import telegram_notifier as telegram


class NewSafetyTests(unittest.IsolatedAsyncioTestCase):
    asyncSetUp = regression.EngineTests.asyncSetUp
    asyncTearDown = regression.EngineTests.asyncTearDown

    async def test_partial_close_preserves_protection_and_reports_incomplete(self):
        self.engine.config.mode = "testnet"
        position = dict(id="BTC/USDT:USDT_LONG", symbol="BTC/USDT:USDT", side="LONG", amount=2)
        remaining = dict(position, amount=1)
        client = self.engine.binance_client
        with patch.object(client, "fetch_open_positions", side_effect=[[position], [remaining]]), patch.object(client, "create_market_order", return_value={"success":True,"amount":1,"price":100}), patch.object(client, "cancel_all_orders") as cancel:
            result = self.engine.close_single_position(position["id"])
        self.assertFalse(result["success"])
        cancel.assert_not_called()

    async def test_flat_position_is_required_before_canceling_protection(self):
        self.engine.config.mode = "testnet"
        position = dict(id="BTC/USDT:USDT_LONG", symbol="BTC/USDT:USDT", side="LONG", amount=2)
        client = self.engine.binance_client
        with patch.object(client, "fetch_open_positions", side_effect=[[position], []]), patch.object(client, "create_market_order", return_value={"success":True,"amount":2,"price":100}), patch.object(client, "cancel_all_orders", return_value=True) as cancel:
            self.assertTrue(self.engine.close_single_position(position["id"])["success"])
        cancel.assert_called_once()

    async def test_uncertain_entry_persists_before_submission_and_restart(self):
        self.engine.config.mode = "live"
        self.engine.is_running = True
        client = self.engine.binance_client
        client.api_key, client.api_secret = "fake", "fake"
        def uncertain(**kwargs):
            saved = regression.db.get_setting("live_entry_orders")
            self.assertTrue(saved["BTC/USDT"]["pending_entry"])
            self.assertEqual(saved["BTC/USDT"]["client_order_id"], kwargs["client_order_id"])
            return {"success":False, "order_submitted":True, "order_id":"entry"}
        with patch.object(self.engine, "check_daily_loss", return_value=False), patch.object(self.engine, "get_balance", return_value={"total_usdt":5000,"free_usdt":5000}), patch.object(client, "fetch_open_positions", return_value=[]), patch.object(self.engine, "_configure_live_symbol", return_value=True), patch.object(client, "format_amount", return_value=10), patch.object(client, "create_market_order", side_effect=uncertain), patch.object(self.engine, "close_single_position", return_value={"success":False}):
            await self.engine.execute_trade_on_symbol("BTC/USDT", "LONG", "test", 100)
        restored = regression.ScalperEngine()
        try:
            self.assertTrue(restored.live_entry_orders["BTC/USDT"]["pending_entry"])
            self.assertEqual(restored.live_entry_orders["BTC/USDT"]["entry_order_id"], "entry")
        finally:
            await restored.shutdown()
        self.assertFalse(self.engine.is_running)

    async def test_later_exposure_is_closed_by_pending_recovery(self):
        meta = dict(side="LONG", pending_entry=True, client_order_id="test", entry_order_id="entry",
                    entry_time_ms=1000, entry_price=100, amount=2, mode="testnet", leverage=2,
                    margin=100, strategy="trend_pullback", time=datetime.now().isoformat())
        self.engine.live_entry_orders = {"BTC/USDT":meta}
        position = dict(id="BTC/USDT:USDT_LONG", symbol="BTC/USDT:USDT", side="LONG", amount=2)
        completed = [dict(side="buy", amount=2, price=101, timestamp=1000, order="entry"), dict(side="sell", amount=2, price=100, timestamp=2000)]
        with patch.object(self.engine.binance_client, "resolve_entry_order", return_value={"id":"entry","status":"closed","filled":2,"average":101}), patch.object(self.engine.binance_client, "fetch_position_trades", return_value=completed), patch.object(self.engine, "close_single_position", return_value={"success":True}) as close:
            self.assertFalse(self.engine.recover_pending_entry("BTC/USDT", meta, [position]))
            self.assertTrue(meta["pending_entry"])
            close.assert_called_once_with(position["id"])
            self.assertTrue(self.engine.recover_pending_entry("BTC/USDT", meta, []))
        self.assertFalse(meta["pending_entry"])
        self.assertEqual(meta["entry_price"],101)

    async def test_empty_position_snapshot_does_not_clear_pending_fill(self):
        meta = dict(side="LONG", pending_entry=True, client_order_id="test", entry_order_id="entry",
                    entry_time_ms=1000, entry_price=100, amount=2, mode="testnet", leverage=2,
                    margin=100, strategy="trend_pullback", time=datetime.now().isoformat())
        self.engine.live_entry_orders = {"BTC/USDT":meta}
        with patch.object(self.engine.binance_client, "resolve_entry_order", return_value={"id":"entry","status":"closed","filled":2,"average":101}), patch.object(self.engine.binance_client, "fetch_position_trades", return_value=[dict(side="buy", amount=2, price=101, timestamp=1000, order="entry")]):
            self.assertFalse(self.engine.recover_pending_entry("BTC/USDT", meta, []))
        self.assertTrue(meta["pending_entry"])


class RiskAndLifecycleTests(unittest.TestCase):
    def test_atr_three_percent_stop_reserves_full_open_risk(self):
        config = regression.TradeConfig(daily_max_loss_usd=50)
        balance = {"total_usdt":5000,"free_usdt":4000}
        pos = {"notional":1000,"entry_price":100,"side":"LONG","stop_loss_price":97,"protection_status":"verified"}
        self.assertIsNone(size_position(config,balance,[pos],-20))
        self.assertIsNone(size_position(config,balance,[{"notional":1000,"effective_sl_pct":3}],-20))

    def test_unverified_stop_blocks_new_risk_when_no_metadata(self):
        self.assertIsNone(size_position(regression.TradeConfig(),{"total_usdt":5000,"free_usdt":4000},[{"notional":1000,"protection_status":"unverified"}],0))

    def test_invalid_atr_range_and_nan_multiplier_rejected(self):
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            regression.TradeConfig(atr_min_sl_pct=4,atr_max_sl_pct=1)
        self.assertIsNone(size_position(regression.TradeConfig(),{"total_usdt":5000,"free_usdt":5000},[],0,risk_multiplier=float('nan')))

    def test_lifecycle_excludes_later_round_trip(self):
        trades = [dict(side="buy",amount=2,price=100,timestamp=1000,order="entry"),
                  dict(side="sell",amount=1,price=101,timestamp=2000),
                  dict(side="sell",amount=1,price=102,timestamp=2001),
                  dict(side="buy",amount=5,price=200,timestamp=3000,order="other"),
                  dict(side="sell",amount=5,price=190,timestamp=4000)]
        self.assertEqual(position_lifecycle(trades,{"side":"LONG","entry_order_id":"entry"}),trades[:3])
        self.assertEqual(position_lifecycle(trades[:2],{"side":"LONG","entry_order_id":"entry"}),[])

    def test_telegram_entry_does_not_claim_protection_before_placed(self):
        msg="🎯 ĐÃ KHỚP LỆNH TESTNET: LONG BTC/USDT 1 tại 100 | Ký quỹ 10 USDT x10"
        formatted=telegram.format_telegram_html("TRADE","BINANCE",msg)
        self.assertIn("Đang thiết lập",formatted)
        self.assertTrue(telegram.should_notify("TRADE","BINANCE","Đã thiết lập SL và TP trên sàn cho BTC/USDT"))

    def test_gemini_initializes_fresh_database_before_loading_settings(self):
        from app.gemini_agent import GeminiRegimeAgent
        with tempfile.TemporaryDirectory() as tmp, patch.object(regression.db,"DB_PATH",tmp+"/fresh.db"), patch.dict("os.environ",{"GEMINI_API_KEY":""}):
            agent=GeminiRegimeAgent()
            self.assertFalse(agent.has_api_key())
            self.assertIsNone(regression.db.get_setting("missing"))


if __name__ == "__main__":
    unittest.main()
