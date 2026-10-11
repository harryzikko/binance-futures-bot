"""Offline regression checks for server Telegram configuration and actual TP/SL."""
import io
import os
import unittest
from unittest.mock import Mock, patch

import test_regressions as regression
from app import telegram_notifier as telegram
from app.binance_client import BinanceFuturesClient


class ProtectionTests(unittest.TestCase):
    def setUp(self):
        self.client = BinanceFuturesClient()
        self.client.exchange = Mock()
        self.position = {"symbol": "BTC/USDT:USDT", "side": "LONG", "amount": 2}

    def order(self, kind, price, **extra):
        order = dict(symbol="BTCUSDT", side="SELL", positionSide="BOTH", reduceOnly=True,
                     algoStatus="NEW", quantity="2", triggerPrice=str(price), orderType=kind)
        order.update(extra)
        return order

    def test_actual_algo_triggers_are_returned_and_cached(self):
        self.client.exchange.fapiPrivateGetOpenAlgoOrders.return_value = [
            self.order("STOP_MARKET", 90), self.order("TAKE_PROFIT_MARKET", 120)]
        positions = self.client.enrich_position_protection([self.position])
        self.assertEqual(positions[0]["stop_loss_price"], 90)
        self.assertEqual(positions[0]["take_profit_price"], 120)
        self.assertEqual(positions[0]["protection_status"], "verified")
        self.client.enrich_position_protection([self.position])
        self.client.exchange.fapiPrivateGetOpenAlgoOrders.assert_called_once()
        self.assertNotIn("stop_loss_price", self.position)

    def test_wrong_side_partial_size_and_opening_orders_not_used(self):
        self.client.exchange.fapiPrivateGetOpenAlgoOrders.return_value = [
            self.order("STOP_MARKET", 90, quantity="1"),
            self.order("TAKE_PROFIT_MARKET", 120, side="BUY"),
            self.order("TAKE_PROFIT_MARKET", 130, reduceOnly=False),
            self.order("STOP_MARKET", 80, algoStatus="CANCELED"),
            self.order("STOP_MARKET", 70, symbol="ETHUSDT"),
        ]
        pos = self.client.enrich_position_protection([self.position])[0]
        self.assertIsNone(pos["stop_loss_price"])
        self.assertIsNone(pos["take_profit_price"])
        self.assertEqual(pos["protection_status"], "verified")

    def test_hedge_short_matches_only_its_position_side(self):
        self.position["side"] = "SHORT"
        self.client.exchange.fapiPrivateGetOpenAlgoOrders.return_value = [
            self.order("STOP_MARKET", 110, side="BUY", positionSide="SHORT", reduceOnly=False),
            self.order("TAKE_PROFIT_MARKET", 80, side="BUY", positionSide="SHORT", reduceOnly=False),
            self.order("STOP_MARKET", 105, side="BUY", positionSide="LONG"),
        ]
        pos = self.client.enrich_position_protection([self.position])[0]
        self.assertEqual(pos["stop_loss_price"], 110)
        self.assertEqual(pos["take_profit_price"], 80)

    def test_read_failure_does_not_fabricate_protection(self):
        self.client.exchange.fapiPrivateGetOpenAlgoOrders.side_effect = RuntimeError("secret response")
        pos = self.client.enrich_position_protection([self.position])[0]
        self.assertEqual(pos["protection_status"], "unverified")
        self.assertIsNone(pos["stop_loss_price"])
        self.assertNotIn("secret", pos["protection_error"])

    def test_engine_adds_entry_time_and_trailing_without_inventing_tp_sl(self):
        regression.reset_db()
        engine = regression.ScalperEngine()
        engine.config.mode = "testnet"
        engine.live_entry_orders = {"BTC/USDT": {"side": "LONG", "time": "2026-10-11T12:00:00",
            "mode": "testnet", "trailing_enabled": True, "trailing_active": True,
            "peak_price": 110, "trailing_callback_pct": 1}}
        with patch.object(engine.binance_client, "fetch_open_positions", return_value=[self.position]), patch.object(engine.binance_client, "enrich_position_protection", side_effect=lambda p: p):
            pos = engine.get_positions()[0]
        self.assertEqual(pos["entry_time"], "2026-10-11T12:00:00")
        self.assertAlmostEqual(pos["trailing_stop_price"], 108.9)
        self.assertNotIn("stop_loss_price", pos)


class TelegramServerTests(unittest.IsolatedAsyncioTestCase):
    async def test_status_does_not_expose_credentials(self):
        with patch.object(telegram, "_session_config", ("123:SECRET", "99999")):
            code, data = await regression.api_request("GET", "/api/telegram/status")
        self.assertEqual(code, 200)
        self.assertTrue(data["configured"])
        self.assertNotIn("SECRET", str(data))
        self.assertEqual(data["chat_id"], "99999")

    async def test_config_sends_test_before_activation(self):
        with patch.object(telegram, "_session_config", None), patch.object(telegram, "_send_raw", return_value=True) as send:
            code, data = await regression.api_request("POST", "/api/telegram/config", {"bot_token": "123:new", "chat_id": "99"})
            self.assertEqual(code, 200)
            self.assertTrue(data["success"])
            self.assertEqual(telegram.credentials(), ("123:new", "99"))
            send.assert_called_once()
            self.assertNotIn("123:new", str(data))

    async def test_failed_config_keeps_working_credentials(self):
        with patch.object(telegram, "_session_config", ("123:old", "1")), patch.object(telegram, "_send_raw", return_value=False):
            code, data = await regression.api_request("POST", "/api/telegram/config", {"bot_token": "123:bad", "chat_id": "2"})
            self.assertEqual(code, 200)
            self.assertFalse(data["success"])
            self.assertEqual(telegram.credentials(), ("123:old", "1"))

    async def test_server_test_updates_last_sent_status(self):
        with patch.object(telegram, "_session_config", ("123:test", "1")), patch.object(telegram, "_last_sent_at", None), patch.object(telegram.urllib.request, "urlopen", return_value=io.BytesIO(b'{"ok":true}')):
            code, data = await regression.api_request("POST", "/api/telegram/test")
            self.assertEqual(code, 200)
            self.assertTrue(data["success"])
            self.assertIsNotNone(data["status"]["last_sent_at"])

    async def test_trade_log_uses_server_session_without_shell_environment(self):
        import queue
        regression.reset_db()
        events = queue.Queue(maxsize=2)
        worker = Mock()
        worker.is_alive.return_value = True
        with patch.dict(os.environ, {}, clear=True), patch.object(telegram, "_session_config", ("123:test", "1")), patch.object(telegram, "_events", events), patch.object(telegram, "_worker", worker):
            regression.db.add_log("TRADE", "BINANCE", "🎯 ĐÃ KHỚP LỆNH TESTNET: LONG BTC/USDT")
            self.assertEqual(events.get_nowait()[0:2], ("TRADE", "BINANCE"))


if __name__ == "__main__":
    unittest.main()
