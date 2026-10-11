"""Telegram checks with isolated SQLite and mocked HTTP; never sends a real message."""
import io
import json
import os
import queue
import unittest
from unittest.mock import Mock, patch

import test_regressions as regression
from app import telegram_notifier as telegram

ENV = {"TELEGRAM_BOT_TOKEN": "123456:fake_token_for_test_only", "TELEGRAM_CHAT_ID": "-100123456"}


class TelegramTests(unittest.TestCase):
    def setUp(self):
        regression.reset_db()
        self.session_patch = patch.object(telegram, "_session_config", None)
        self.session_patch.start()
        self.addCleanup(self.session_patch.stop)
    def test_important_events_only(self):
        for event in [("SUCCESS", "BOT", "Start"), ("INFO", "BOT", "Stop"),
                      ("WARN", "PANIC", "Panic"), ("ERROR", "RISK", "Limit"),
                      ("TRADE", "BINANCE", "🎯 ĐÃ KHỚP LỆNH TESTNET: LONG BTC/USDT"),
                      ("TRADE", "BINANCE", "Đóng LONG BTC/USDT trên TESTNET"),
                      ("TRADE", "BINANCE", "Đã thiết lập SL và TP"), ("TRADE", "PAPER", "Đóng paper")]:
            self.assertTrue(telegram.should_notify(*event))
        for event in [("SIGNAL", "AUTOSCAN", "signal"), ("INFO", "CONFIG", "config"),
                      ("WARN", "RISK", "Bỏ qua thiếu vốn")]:
            self.assertFalse(telegram.should_notify(*event))

    def test_disabled_without_credentials(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(telegram, "_events") as events:
            telegram.notify("SUCCESS", "BOT", "Start")
            events.put_nowait.assert_not_called()

    def test_queue_does_not_send_inline(self):
        events = queue.Queue(maxsize=2)
        worker = Mock()
        worker.is_alive.return_value = True
        with patch.dict(os.environ, ENV, clear=True), patch.object(telegram, "_events", events), patch.object(telegram, "_worker", worker), patch.object(telegram, "_send_raw") as send:
            telegram.notify("SUCCESS", "BOT", "Start")
            send.assert_not_called()
            self.assertEqual(events.get_nowait(), ("SUCCESS", "BOT", "Start"))

    def test_queue_full_does_not_raise(self):
        events = queue.Queue(maxsize=1)
        events.put(("INFO", "BOT", "old"))
        with patch.dict(os.environ, ENV, clear=True), patch.object(telegram, "_events", events):
            telegram.notify("SUCCESS", "BOT", "Start")
        self.assertEqual(events.qsize(), 1)

    def test_send_uses_plain_json_with_timeout_and_redacts_secrets(self):
        response = io.BytesIO(b'{"ok": true}')
        secret = "a" * 64
        message = f"TESTNET signature={secret} token={ENV['TELEGRAM_BOT_TOKEN']}"
        with patch.dict(os.environ, ENV, clear=True), patch.object(telegram.urllib.request, "urlopen", return_value=response) as http:
            self.assertTrue(telegram._send_raw(message, is_html=False))
        request = http.call_args.args[0]
        data = json.loads(request.data.decode("utf-8"))
        self.assertEqual(data["chat_id"], ENV["TELEGRAM_CHAT_ID"])
        self.assertNotIn("parse_mode", data)
        self.assertIn("TESTNET", data["text"])
        self.assertNotIn(secret, data["text"])
        self.assertNotIn(ENV["TELEGRAM_BOT_TOKEN"], data["text"])
        self.assertEqual(http.call_args.kwargs["timeout"], 8)

    def test_test_message_failure_does_not_leak_exception(self):
        token = ENV["TELEGRAM_BOT_TOKEN"]
        with patch.object(telegram.urllib.request, "urlopen", side_effect=RuntimeError(token)), patch.dict(os.environ, ENV, clear=True):
            self.assertFalse(telegram.send_test())
        self.assertNotIn(token, telegram.get_status().get("last_error") or "")

    def test_invalid_configuration_makes_no_http_request(self):
        with patch.dict(os.environ, {"TELEGRAM_BOT_TOKEN": "invalid", "TELEGRAM_CHAT_ID": "123"}, clear=True), patch.object(telegram.urllib.request, "urlopen") as http:
            self.assertFalse(telegram.send_test())
            http.assert_not_called()

    def test_database_logging_survives_notification_failure(self):
        regression.reset_db()
        with patch.object(telegram, "notify", side_effect=RuntimeError("telegram offline")):
            regression.db.add_log("INFO", "BOT", "Stop")
        self.assertEqual(regression.db.get_recent_logs()[-1]["message"], "Stop")


if __name__ == "__main__":
    unittest.main()
