"""Explicit Testnet-only PnL session reset; no exchange orders or real HTTP."""
import hashlib
import time
import unittest
from datetime import datetime
from unittest.mock import Mock, patch
import test_regressions as regression
from app.binance_client import BinanceFuturesClient
from app import main


class PnlWindowTests(unittest.TestCase):
    def setUp(self):
        regression.reset_db()
        self.key = "test-account"
        self.since = int(time.time() * 1000) - 2000
        self.day_start = int(datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).timestamp()*1000)
        regression.db.save_setting("testnet_pnl_reset", {"account":hashlib.sha256(self.key.encode()).hexdigest(),"since_ms":self.since})

    def client(self, testnet=True, key=None):
        c=BinanceFuturesClient(key or self.key,"fake",testnet=testnet)
        c.exchange=Mock()
        c.exchange.fapiPrivateGetIncome.return_value=[]
        return c

    def test_testnet_uses_reset_and_counts_new_fees_funding(self):
        c=self.client()
        c.exchange.fapiPrivateGetIncome.return_value=[{"asset":"USDT","incomeType":"COMMISSION","income":"-0.1"},{"asset":"USDT","incomeType":"FUNDING_FEE","income":"-0.2"},{"asset":"USDT","incomeType":"TRANSFER","income":"50"}]
        self.assertAlmostEqual(c.fetch_daily_pnl(),-0.3)
        self.assertEqual(c.exchange.fapiPrivateGetIncome.call_args.args[0]["startTime"],self.since)

    def test_live_and_other_account_ignore_testnet_reset(self):
        for c in (self.client(False),self.client(True,"another-key")):
            c.fetch_daily_pnl()
            self.assertEqual(c.exchange.fapiPrivateGetIncome.call_args.args[0]["startTime"],self.day_start)

    def test_yesterday_reset_expires_at_new_local_day(self):
        regression.db.save_setting("testnet_pnl_reset",{"account":hashlib.sha256(self.key.encode()).hexdigest(),"since_ms":self.day_start-1000})
        c=self.client(); c.fetch_daily_pnl()
        self.assertEqual(c.exchange.fapiPrivateGetIncome.call_args.args[0]["startTime"],self.day_start)

    def test_new_reset_invalidates_cached_pnl(self):
        c=self.client();c.exchange.fapiPrivateGetIncome.return_value=[{"asset":"USDT","incomeType":"REALIZED_PNL","income":"-10"}]
        self.assertEqual(c.fetch_daily_pnl(),-10)
        regression.db.save_setting("testnet_pnl_reset",{"account":hashlib.sha256(self.key.encode()).hexdigest(),"since_ms":self.since+1000})
        c.exchange.fapiPrivateGetIncome.return_value=[]
        self.assertEqual(c.fetch_daily_pnl(),0)
        self.assertEqual(c.exchange.fapiPrivateGetIncome.call_count,2)


class ResetApiTests(unittest.IsolatedAsyncioTestCase):
    asyncSetUp=regression.EngineTests.asyncSetUp
    asyncTearDown=regression.EngineTests.asyncTearDown

    async def test_live_and_running_testnet_cannot_reset(self):
        c=self.engine.binance_client
        c.environment="live";self.engine.config.mode="live"
        with patch.object(main,"bot_engine",self.engine):
            with self.assertRaises(ValueError):await main.reset_testnet_pnl()
            c.environment="testnet";self.engine.config.mode="testnet";self.engine.is_running=True
            with self.assertRaises(ValueError):await main.reset_testnet_pnl()
        self.assertIsNone(regression.db.get_setting("testnet_pnl_reset"))

    async def test_open_position_or_pending_orders_prevent_reset(self):
        c=self.engine.binance_client;c.environment="testnet";c.api_key="fake";c.api_secret="fake"
        self.engine.config.mode="testnet"
        with patch.object(main,"bot_engine",self.engine),patch.object(c,"fetch_daily_pnl",return_value=-20),patch.object(c,"fetch_open_positions",return_value=[{"symbol":"BTC/USDT"}]):
            with self.assertRaises(ValueError):await main.reset_testnet_pnl()
        with patch.object(main,"bot_engine",self.engine),patch.object(c,"fetch_daily_pnl",return_value=-20),patch.object(c,"fetch_open_positions",return_value=[]),patch.object(c.exchange,"fapiPrivateGetOpenOrders",return_value=[]),patch.object(c.exchange,"fapiPrivateGetOpenAlgoOrders",return_value=[{"algoId":1}]):
            with self.assertRaises(ValueError):await main.reset_testnet_pnl()
        self.assertIsNone(regression.db.get_setting("testnet_pnl_reset"))

    async def test_flat_paused_testnet_resets_and_remains_paused(self):
        c=self.engine.binance_client;c.environment="testnet";c.api_key="fake";c.api_secret="fake"
        self.engine.config.mode="testnet";self.engine.daily_loss_hit=True
        with patch.object(main,"bot_engine",self.engine),patch.object(c,"fetch_daily_pnl",side_effect=[-46.5,0.0]),patch.object(c,"fetch_open_positions",return_value=[]),patch.object(c.exchange,"fapiPrivateGetOpenOrders",return_value=[]),patch.object(c.exchange,"fapiPrivateGetOpenAlgoOrders",return_value=[]):
            result=await main.reset_testnet_pnl()
        self.assertTrue(result["success"])
        self.assertEqual(result["daily_pnl"],0)
        self.assertFalse(self.engine.is_running)
        self.assertFalse(self.engine.daily_loss_hit)
        self.assertEqual(regression.db.get_setting("testnet_pnl_reset")["account"],hashlib.sha256(b"fake").hexdigest())


if __name__=="__main__":unittest.main()
