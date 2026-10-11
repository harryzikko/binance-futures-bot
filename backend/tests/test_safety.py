"""Regression tests for lifecycle races and atomic broker state."""
import asyncio
import threading
import unittest
from unittest.mock import patch
import test_regressions as regression
from test_regressions import db, open_paper, reset_db, PaperTrader


class LifecycleTests(unittest.IsolatedAsyncioTestCase):
    asyncSetUp = regression.EngineTests.asyncSetUp
    asyncTearDown = regression.EngineTests.asyncTearDown

    async def test_stop_cancels_pending_start(self):
        entered = threading.Event()
        release = threading.Event()
        def delayed_check():
            entered.set()
            release.wait(3)
            return False
        with patch.object(self.engine, "check_daily_loss", side_effect=delayed_check), patch.object(self.engine, "ensure_tasks"):
            task = asyncio.create_task(self.engine.start())
            await asyncio.to_thread(entered.wait, 3)
            self.engine.stop()
            release.set()
            with self.assertRaises(ValueError):
                await task
        self.assertFalse(self.engine.is_running)

    async def test_stale_signal_rejected_after_waiting_for_lock(self):
        self.engine.is_running = True
        revision = self.engine.config_revision
        async with self.engine.entry_lock:
            task = asyncio.create_task(self.engine.execute_trade_on_symbol("BTC/USDT", "LONG", "old", 100, revision))
            await asyncio.sleep(0)
            self.engine.config_revision += 1
        await task
        self.assertFalse(self.engine.paper_trader.open_positions)
        self.engine.binance_client.fetch_ticker.assert_not_called()

    async def test_shutdown_waits_for_entry_protection(self):
        entered = asyncio.Event()
        release = asyncio.Event()
        protected = asyncio.Event()
        async def entry(*args, **kwargs):
            entered.set()
            await release.wait()
            protected.set()
        with patch.object(self.engine, "_execute_trade_on_symbol", side_effect=entry):
            task = asyncio.create_task(self.engine.execute_trade_on_symbol("BTC/USDT", "LONG", "test", 100))
            self.engine.scanner_task = task
            await asyncio.wait_for(entered.wait(), 3)
            shutdown = asyncio.create_task(self.engine.shutdown())
            await asyncio.sleep(0)
            self.assertFalse(shutdown.done())
            release.set()
            await asyncio.wait_for(shutdown, 3)
            self.assertTrue(protected.is_set())

    async def test_websocket_cancel_does_not_restart(self):
        entered = asyncio.Event()
        async def watch(*args):
            entered.set()
            await asyncio.Event().wait()
        with patch.object(self.engine.binance_client, "watch_ticker_stream", side_effect=watch):
            task = asyncio.create_task(self.engine.run_ws_ticker_stream())
            await asyncio.wait_for(entered.wait(), 3)
            task.cancel()
            await asyncio.wait_for(task, 3)


class AtomicStateTests(unittest.TestCase):
    def setUp(self):
        reset_db()
        self.trader = PaperTrader()

    def test_failed_paper_save_rolls_back_memory_and_db(self):
        position = open_paper(self.trader)
        old_balance = self.trader.balance
        with patch("app.database.json.dumps", side_effect=RuntimeError("disk failure")):
            with self.assertRaises(RuntimeError):
                self.trader.close_position(position["id"], 110, "TAKE_PROFIT")
        self.assertEqual(self.trader.balance, old_balance)
        self.assertIn(position["id"], self.trader.open_positions)
        self.assertEqual(db.get_trades(), [])
        restored = PaperTrader()
        self.assertEqual(restored.balance, old_balance)
        self.assertIn(position["id"], restored.open_positions)

    def test_trade_event_retry_is_idempotent(self):
        position = open_paper(self.trader)
        record = self.trader.close_position(position["id"], 110, "TAKE_PROFIT")
        db.save_trade(record, event_key=f"paper:{position['id']}")
        self.assertEqual(len(db.get_trades()), 1)
        self.assertFalse(PaperTrader().open_positions)


class RestartPositionModeTests(unittest.TestCase):
    setUp = regression.ClientTests.setUp

    def test_reconcile_detects_hedge_before_filtering_trades(self):
        self.client.exchange.fapiPrivateGetPositionSideDual.return_value = {"dualSidePosition": True}
        long_trade = {"timestamp": 1000, "info": {"positionSide": "LONG"}}
        short_trade = {"timestamp": 1001, "info": {"positionSide": "SHORT"}}
        self.client.exchange.fetch_my_trades.return_value = [long_trade, short_trade]
        trades = self.client.fetch_position_trades("BTC/USDT", {"entry_time_ms": 0, "side": "LONG"})
        self.assertEqual(trades, [long_trade])
        self.assertTrue(self.client.position_mode_detected)

    def test_reconcile_refuses_unknown_position_mode(self):
        self.client.exchange.fapiPrivateGetPositionSideDual.side_effect = RuntimeError("offline")
        with self.assertRaises(ValueError):
            self.client.fetch_position_trades("BTC/USDT", {"entry_time_ms": 0, "side": "LONG"})
        self.client.exchange.fetch_my_trades.assert_not_called()
