"""Offline regressions derived from actual Testnet loss investigation."""
import unittest
from unittest.mock import Mock, patch
import pandas as pd

import test_regressions as regression
from app.binance_client import BinanceFuturesClient
from app.strategies.trend_scalper import TrendScalperStrategy


class ConfirmedFillTests(unittest.TestCase):
    def setUp(self):
        self.client = BinanceFuturesClient()
        self.client.exchange = Mock()
        self.client.api_key = "fake"
        self.client.api_secret = "fake"
        self.client.position_mode_detected = True
        self.client.format_amount = Mock(side_effect=lambda symbol, amount: amount)

    def test_ack_is_not_used_as_fill_or_ticker_fallback(self):
        self.client.exchange.create_order.return_value = {"id": "entry", "amount": 2, "price": 100}
        self.client.exchange.fetch_order.return_value = {"id": "entry", "filled": 2, "average": 101, "status": "closed"}
        with patch("app.binance_client.time.sleep"):
            result = self.client.create_market_order("BTC/USDT", "buy", 2, "LONG")
        self.assertTrue(result["success"])
        self.assertEqual(result["price"], 101)
        self.assertEqual(result["amount"], 2)
        self.assertEqual(self.client.exchange.create_order.call_args.kwargs["params"]["newOrderRespType"], "RESULT")
        self.client.exchange.fetch_order.assert_called_once_with("entry", "BTC/USDT")

    def test_partial_fill_waits_until_terminal_order(self):
        self.client.exchange.create_order.return_value = {"id": "entry", "filled": 1, "average": 100, "status": "open"}
        self.client.exchange.fetch_order.return_value = {"id": "entry", "filled": 2, "average": 101, "status": "closed"}
        with patch("app.binance_client.time.sleep"):
            result = self.client.create_market_order("BTC/USDT", "buy", 2, "LONG")
        self.assertEqual(result["amount"], 2)
        self.assertEqual(result["price"], 101)

    def test_average_can_be_derived_from_filled_cost(self):
        self.client.exchange.create_order.return_value = {"id": "entry", "filled": 2, "cost": 202, "status": "closed"}
        result = self.client.create_market_order("BTC/USDT", "buy", 2, "LONG")
        self.assertTrue(result["success"])
        self.assertEqual(result["price"], 101)

    def test_unknown_fill_is_not_reported_successfully(self):
        self.client.exchange.create_order.return_value = {"id": "entry", "price": 100, "amount": 2}
        self.client.exchange.fetch_order.return_value = {"id": "entry", "price": 100, "amount": 2}
        with patch("app.binance_client.time.sleep"):
            result = self.client.create_market_order("BTC/USDT", "buy", 2, "LONG")
        self.assertFalse(result["success"])
        self.assertTrue(result["order_submitted"])
        self.assertNotIn("price", result)

    def test_sell_close_uses_reduce_only_and_confirmed_fill(self):
        self.client.exchange.create_order.return_value = {"id": "exit", "filled": 2, "average": 99, "status": "closed"}
        result = self.client.create_market_order("BTC/USDT", "sell", 2, "LONG", reduce_only=True)
        self.assertTrue(result["success"])
        self.assertTrue(self.client.exchange.create_order.call_args.kwargs["params"]["reduceOnly"])


class ExecutionGuardTests(unittest.IsolatedAsyncioTestCase):
    asyncSetUp = regression.EngineTests.asyncSetUp
    asyncTearDown = regression.EngineTests.asyncTearDown

    async def test_unknown_fill_stops_without_protection_based_on_ticker(self):
        self.engine.is_running = True
        self.engine.config.mode = "live"
        client = self.engine.binance_client
        client.api_key, client.api_secret = "fake", "fake"
        with patch.object(self.engine, "check_daily_loss", return_value=False), patch.object(self.engine, "get_balance", return_value={"total_usdt":5000,"free_usdt":5000}), patch.object(client, "fetch_open_positions", return_value=[]), patch.object(self.engine, "_configure_live_symbol", return_value=True), patch.object(client, "format_amount", return_value=10), patch.object(client, "create_market_order", return_value={"success":False,"order_submitted":True}), patch.object(client, "place_stop_loss_order") as sl, patch.object(client, "place_take_profit_order") as tp, patch.object(self.engine, "close_single_position", return_value={"success":True}) as close:
            await self.engine.execute_trade_on_symbol("BTC/USDT", "LONG", "test", 100)
        self.assertFalse(self.engine.is_running)
        sl.assert_not_called()
        tp.assert_not_called()
        close.assert_called_once_with("BTC/USDT_LONG")

    async def test_tp_sl_and_tracker_use_fill_not_signal_price(self):
        self.engine.is_running = True
        self.engine.config.mode = "live"
        client = self.engine.binance_client
        client.api_key, client.api_secret = "fake", "fake"
        with patch.object(self.engine, "check_daily_loss", return_value=False), patch.object(self.engine, "get_balance", return_value={"total_usdt":5000,"free_usdt":5000}), patch.object(client, "fetch_open_positions", return_value=[]), patch.object(self.engine, "_configure_live_symbol", return_value=True), patch.object(client, "format_amount", return_value=10), patch.object(client, "create_market_order", return_value={"success":True,"price":101,"amount":10,"order_id":"entry"}), patch.object(client, "place_stop_loss_order", return_value={"success":True}) as sl, patch.object(client, "place_take_profit_order", return_value={"success":True}) as tp:
            await self.engine.execute_trade_on_symbol("BTC/USDT", "LONG", "test", 100)
        self.assertAlmostEqual(sl.call_args.args[-1], 101 * 0.994)
        self.assertAlmostEqual(tp.call_args.args[-1], 101 * 1.012)
        self.assertEqual(self.engine.live_entry_orders["BTC/USDT"]["entry_price"], 101)
        self.assertEqual(self.engine.live_entry_orders["BTC/USDT"]["entry_order_id"], "entry")

    async def test_reconciled_history_uses_real_entry_fills_not_stale_tracker(self):
        from datetime import datetime
        self.engine.live_entry_orders = {"BTC/USDT": dict(side="LONG", entry_price=100, amount=2,
            leverage=2, margin=100, mode="testnet", strategy="trend_pullback", entry_time_ms=1000,
            entry_order_id="entry", time=datetime.now().isoformat())}
        trades = [dict(side="buy", price=101, amount=2, order="entry", timestamp=1000,
                       info={"realizedPnl":"0"}, fee={"currency":"USDT","cost":0.08}),
                  dict(side="sell", price=100, amount=2, order="exit", timestamp=2000,
                       info={"realizedPnl":"-2"}, fee={"currency":"USDT","cost":0.08})]
        with patch.object(self.engine.binance_client, "fetch_position_trades", return_value=trades), patch.object(self.engine.binance_client, "cancel_all_orders", return_value=True):
            self.engine.reconcile_live_entries([])
        record = regression.db.get_trades()[0]
        self.assertEqual(record["entry_price"], 101)
        self.assertEqual(record["pnl"], -2.16)


class PullbackConfirmationTests(unittest.TestCase):
    def setup_frame(self, side="LONG", volume=1.5, aligned=True):
        if side == "LONG":
            row = dict(close=100,open=99,high=101,low=98,ema_fast=99,ema_slow=98,ema_trend=97 if aligned else 98.5,
                       rsi=50,adx=25,vol_ratio=volume,lower_wick=1,upper_wick=1,body=1)
            previous_rsi = 45
        else:
            row = dict(close=100,open=101,high=102,low=99,ema_fast=101,ema_slow=102,ema_trend=103 if aligned else 101.5,
                       rsi=50,adx=25,vol_ratio=volume,lower_wick=1,upper_wick=1,body=1)
            previous_rsi = 55
        df = pd.DataFrame([row.copy() for _ in range(60)])
        df.loc[58,"rsi"] = previous_rsi
        return df

    def evaluate(self, side, volume=1.5, aligned=True):
        strategy = TrendScalperStrategy({"min_signal_volume_ratio": 1})
        df = self.setup_frame(side, volume, aligned)
        with patch.object(strategy, "calculate_indicators", return_value=df):
            return strategy.generate_signal(df)[0]

    def test_long_and_short_require_real_volume_confirmation(self):
        for side in ("LONG", "SHORT"):
            self.assertEqual(self.evaluate(side), side)
            self.assertEqual(self.evaluate(side,volume=0.4), "HOLD")
            self.assertEqual(self.evaluate(side,volume=0), "HOLD")

    def test_long_and_short_require_full_ema_alignment(self):
        for side in ("LONG", "SHORT"):
            self.assertEqual(self.evaluate(side,aligned=False), "HOLD")


if __name__ == "__main__":
    unittest.main()
