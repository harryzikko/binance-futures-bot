from app.binance_client import BinanceFuturesClient
import asyncio
import unittest
from unittest.mock import Mock

import pandas as pd

from test_regressions import TradeConfig, ScalperEngine, reset_db
from app.risk import size_position, ROUND_TRIP_COST_RATE
from app.trend_filter import confirmed_trend
from app.market_scanner import MarketScanner


class RiskSizingTests(unittest.TestCase):
    def setUp(self):
        self.config = TradeConfig(position_size_usd=100, leverage=10, stop_loss_pct=0.6,
                                  daily_max_loss_usd=50, risk_per_trade_pct=0.5)
        self.balance = {"total_usdt": 5000, "free_usdt": 5000}

    def test_auto_leverage_never_exceeds_cap_and_risk_budget(self):
        size = size_position(self.config, self.balance, [], 0)
        self.assertIsNotNone(size)
        self.assertGreaterEqual(size["leverage"], 1)
        self.assertLessEqual(size["leverage"], 10)
        self.assertLessEqual(size["margin"], 100)
        self.assertLessEqual(size["estimated_risk"], 25)
        self.assertAlmostEqual(size["estimated_risk"], size["margin"] * size["leverage"] * (0.006 + ROUND_TRIP_COST_RATE))

    def test_daily_budget_reserves_open_positions_and_realized_losses(self):
        open_positions = [{"notional": 1000, "effective_sl_pct": 0.6}]
        size = size_position(self.config, self.balance, open_positions, -40)
        self.assertIsNotNone(size)
        self.assertLessEqual(size["estimated_risk"], 50 - 40 - 1000 * 0.008)
        self.assertIsNone(size_position(self.config, self.balance, open_positions, -49))

    def test_low_free_margin_never_borrows_balance(self):
        size = size_position(self.config, {"total_usdt": 5000, "free_usdt": 4}, [], 0)
        self.assertIsNone(size)

    def test_non_finite_account_values_are_rejected(self):
        self.assertIsNone(size_position(self.config, {"total_usdt": float('nan'), "free_usdt": 500}, [], 0))

    def test_fixed_sizing_can_be_selected_explicitly(self):
        self.config.risk_sizing_enabled = False
        size = size_position(self.config, self.balance, [], 0)
        self.assertEqual(size["leverage"], 10)
        self.assertEqual(size["margin"], 100)

    def test_scan_limit_validation(self):
        self.assertEqual(TradeConfig(scan_top_n=200).scan_top_n, 200)
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            TradeConfig(scan_top_n=201)


class HigherTimeframeTests(unittest.TestCase):
    def test_only_clear_ema_alignment_passes(self):
        up = pd.DataFrame({"close": [100 + i * 0.1 for i in range(205)]})
        down = pd.DataFrame({"close": [200 - i * 0.1 for i in range(205)]})
        self.assertEqual(confirmed_trend(up), "LONG")
        self.assertEqual(confirmed_trend(down), "SHORT")
        self.assertEqual(confirmed_trend(up.iloc[:199]), "HOLD")
        self.assertEqual(confirmed_trend(pd.DataFrame({"close": [100] * 205})), "HOLD")


class ScannerEnvironmentTests(unittest.IsolatedAsyncioTestCase):
    async def test_scanner_filters_inactive_and_non_swap_and_uses_supplied_exchange(self):
        live = Mock()
        live.fetch_tickers.side_effect = AssertionError("must not call live")
        exchange = Mock()
        exchange.fetch_tickers.return_value = {
            "BTC/USDT:USDT": {"quoteVolume": 20_000_000, "last": 100, "percentage": 1},
            "BAD/USDT:USDT": {"quoteVolume": 30_000_000, "last": 10},
            "SPOT/USDT": {"quoteVolume": 30_000_000, "last": 10},
        }
        exchange.markets = {
            "BTC/USDT:USDT": {"active": True, "swap": True, "linear": True, "quote": "USDT"},
            "BAD/USDT:USDT": {"active": False, "swap": True, "linear": True, "quote": "USDT"},
            "SPOT/USDT": {"active": True, "swap": False, "linear": False, "quote": "USDT"},
        }
        result = await MarketScanner(live).scan_all_tickers(exchange=exchange)
        self.assertEqual([item["symbol"] for item in result], ["BTC/USDT"])
        live.fetch_tickers.assert_not_called()

    async def test_engine_caps_top_coins_at_200(self):
        reset_db()
        engine = ScalperEngine()
        engine.config.scan_top_n = 200
        try:
            from app.scalper_engine import market_scanner
            async def scan_all_tickers(**kwargs):
                self.assertIs(kwargs["exchange"], engine.binance_client.exchange)
                return [{"symbol": f"COIN{i}/USDT"} for i in range(260)]
            from unittest.mock import patch
            with patch.object(market_scanner, "scan_all_tickers", side_effect=scan_all_tickers):
                self.assertEqual(len(await engine.get_top_liquid_coins()), 200)
        finally:
            await engine.shutdown()


class OrderCleanupTests(unittest.TestCase):
    def test_cancel_all_orders_cancels_regular_and_algo(self):
        client = BinanceFuturesClient("fake", "fake", testnet=True)
        client.exchange = Mock()
        client.exchange.fapiPrivateDeleteAlgoOpenOrders.return_value = {"code": 200}
        self.assertTrue(client.cancel_all_orders("BTC/USDT"))
        client.exchange.cancel_all_orders.assert_called_once_with("BTC/USDT")
        client.exchange.fapiPrivateDeleteAlgoOpenOrders.assert_called_once_with({"symbol": "BTCUSDT"})


if __name__ == "__main__":
    unittest.main()
