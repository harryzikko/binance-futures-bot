"""Non-blocking, persistent Telegram notifications for important bot events.

Credentials are saved in SQLite settings so they persist across server restarts.
Can also be initialized via TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables.
"""
import json
import logging
import os
import queue
import re
import threading
import urllib.request
import html
from datetime import datetime

logger = logging.getLogger("telegram_notifier")
_events: queue.Queue[tuple[str, str, str]] = queue.Queue(maxsize=128)
_worker: threading.Thread | None = None
_worker_lock = threading.Lock()
_session_config: tuple[str, str] | None = None
_last_sent_at: str | None = None
_last_error: str | None = None


def credentials() -> tuple[str, str]:
    """Retrieve Telegram credentials from memory, SQLite settings, or environment."""
    global _session_config
    if _session_config is not None:
        return _session_config

    # 1. Check SQLite settings for persistent configuration
    try:
        from .database import get_setting
        saved = get_setting("telegram_config")
        if isinstance(saved, dict) and saved.get("bot_token") and saved.get("chat_id"):
            token = str(saved["bot_token"]).strip()
            chat = str(saved["chat_id"]).strip()
            if token and chat:
                _session_config = (token, chat)
                return _session_config
    except Exception as e:
        logger.debug("Could not read telegram_config from database: %s", e)

    # 2. Check process environment variables
    env_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    env_chat = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    if env_token and env_chat:
        _session_config = (env_token, env_chat)
        return _session_config

    return ("", "")


def get_status() -> dict:
    """Return status of Telegram notification subsystem."""
    token, chat = credentials()
    is_conf = bool(token and chat)
    masked_chat = f"{chat[:3]}***{chat[-2:]}" if len(chat) > 5 else chat
    masked_token = f"{token[:6]}...{token[-4:]}" if len(token) > 10 else ""
    return {
        "configured": is_conf,
        "source": "database" if is_conf else "none",
        "chat_id": chat if is_conf else "",
        "masked_chat_id": masked_chat,
        "masked_token": masked_token,
        "last_sent_at": _last_sent_at,
        "last_error": _last_error,
        "queued": _events.qsize(),
    }


def configure_and_test(token: str, chat_id: str) -> bool:
    """Validate, test, and permanently persist Telegram credentials into SQLite."""
    global _session_config
    cand_token = token.strip()
    cand_chat = chat_id.strip()
    candidate = (cand_token, cand_chat)

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    test_msg = (
        f"🤖 <b>[BINANCE FUTURES SCALPER] KẾT NỐI TELEGRAM THÀNH CÔNG!</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"✅ <b>Trạng Thái:</b> Đã kích hoạt hệ thống thông báo tự động\n"
        f"💾 <b>Lưu Trữ:</b> Đã lưu vĩnh viễn cấu hình trên máy chủ\n"
        f"📊 <b>Tính Năng Giám Sát:</b>\n"
        f"  • 🚀 Báo ngay khi khớp lệnh Mở vị thế (Giá, TP/SL, Ký quỹ)\n"
        f"  • 🎯 Báo cáo Chốt lời (TP) & Cắt lỗ (SL) chi tiết PnL ròng\n"
        f"  • 📈 Cảnh báo Trailing Stop & dời Stop Loss bảo vệ đỉnh\n"
        f"  • 🚨 Cảnh báo khẩn cấp khi chạm ngưỡng Daily Max Loss\n"
        f"  • 🧠 Báo cáo trạng thái thị trường Gemini Macro AI\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"⏱️ <i>Thời gian kiểm tra: {now_str}</i>"
    )

    try:
        success = _send_raw(test_msg, is_html=True, config=candidate)
    except Exception as exc:
        _record_error(f"Lỗi kết nối: {type(exc).__name__}")
        return False

    if success:
        _session_config = candidate
        try:
            from .database import save_setting
            save_setting("telegram_config", {
                "bot_token": cand_token,
                "chat_id": cand_chat,
                "enabled": True,
                "saved_at": now_str
            })
            logger.info("Telegram credentials permanently saved to database.")
        except Exception as e:
            logger.error("Failed to save telegram config to database: %s", e)
    return success


def clear_config() -> bool:
    """Clear credentials from memory and SQLite."""
    global _session_config
    _session_config = None
    try:
        from .database import save_setting
        save_setting("telegram_config", None)
        logger.info("Telegram credentials cleared from database.")
        return True
    except Exception as e:
        logger.error("Failed to clear telegram config: %s", e)
        return False


def _record_error(error: str) -> None:
    global _last_error
    _last_error = error


def should_notify(level: str, category: str, message: str) -> bool:
    if category == "BOT" and level in {"INFO", "SUCCESS", "WARN"}:
        return True
    if category == "PANIC" and level in {"ERROR", "WARN"}:
        return True
    if level == "ERROR" and category in {"RISK", "BINANCE"}:
        return True
    if level == "TRADE" and category == "PAPER":
        return True
    if level == "TRADE" and category == "AUTOSCAN":
        return "TỰ ĐỘNG KHỚP LỆNH" in message or message.startswith("Mở ")
    if level == "TRADE" and category == "BINANCE":
        return message.startswith(("🎯 ĐÃ KHỚP", "Đóng ", "Chốt lời Trailing", "Đã thiết lập SL", "Đã thiết lập TP"))
    if category == "GEMINI_AI" and level == "WARN":
        return True
    return False


def format_telegram_html(level: str, category: str, message: str) -> str:
    """Format bot log messages into clean, executive-level Telegram HTML cards."""
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    clean_msg = message.strip()

    # --- 1. MỞ VỊ THẾ GIẢ LẬP / PAPER ---
    m_open_paper = re.search(
        r"Mở vị thế\s+(LONG|SHORT)\s+(\S+)\s+tại giá\s+\$?([\d\.]+)\s+\|\s+TP:\s+\$?([\d\.]+)\s+\|\s+SL:\s+\$?([\d\.]+)\s+\|\s+Vốn:\s+\$?([\d\.]+)\s+\(x(\d+)\)",
        clean_msg, re.I
    )
    if m_open_paper:
        side, sym, price, tp, sl, margin, lev = m_open_paper.groups()
        is_long = side.upper() == "LONG"
        side_badge = "🟢 <b>LONG</b>" if is_long else "🔴 <b>SHORT</b>"
        return (
            f"🚀 <b>[PAPER TRADING] MỞ VỊ THẾ MỚI</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🪙 <b>Cặp Coin:</b> <code>{html.escape(sym)}</code>\n"
            f"📈 <b>Vị Thế:</b> {side_badge} <code>x{lev}</code>\n"
            f"💵 <b>Giá Vào:</b> <code>${price}</code>\n"
            f"💼 <b>Ký Quỹ:</b> <code>${margin} USDT</code>\n"
            f"────────────────────────────\n"
            f"🎯 <b>Take Profit (TP):</b> <code>${tp}</code>\n"
            f"🛑 <b>Stop Loss (SL):</b> <code>${sl}</code>\n"
            f"⏱️ <i>{now_str}</i>"
        )

    # --- 2. ĐÃ KHỚP LỆNH LIVE / TESTNET TRÊN BINANCE ---
    m_open_live = re.search(
        r"ĐÃ KHỚP LỆNH\s+(\w+):\s+(LONG|SHORT)\s+(\S+)\s+([\d\.]+)\s+tại\s+([\d\.]+)\s+\|\s+Ký quỹ\s+([\d\.]+)\s+USDT\s+x(\d+)",
        clean_msg, re.I
    )
    if m_open_live:
        mode, side, sym, amount, price, margin, lev = m_open_live.groups()
        is_long = side.upper() == "LONG"
        side_badge = "🟢 <b>LONG</b>" if is_long else "🔴 <b>SHORT</b>"
        clean_sym = sym if "/USDT" in sym or sym.endswith("USDT") else f"{sym}/USDT"
        return (
            f"🎯 <b>[BINANCE {mode.upper()}] KHỚP LỆNH MỞ VỊ THẾ</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🪙 <b>Cặp Coin:</b> <code>{html.escape(clean_sym)}</code>\n"
            f"📈 <b>Vị Thế:</b> {side_badge} <code>x{lev}</code>\n"
            f"💵 <b>Giá Khớp Lệnh:</b> <code>${price}</code>\n"
            f"📦 <b>Khối Lượng Coin:</b> <code>{amount}</code>\n"
            f"💼 <b>Ký Quỹ:</b> <code>${margin} USDT</code>\n"
            f"🛡️ <i>Đang thiết lập lệnh Stop Loss & Take Profit bảo vệ trên sàn...</i>\n"
            f"⏱️ <i>{now_str}</i>"
        )

    # Confirm protection only after the separate successful SL/TP event.
    if category == "BINANCE" and clean_msg.startswith("Đã thiết lập SL và TP"):
        return f"🛡️ <b>[BINANCE] ĐÃ XÁC NHẬN BẢO VỆ VỊ THẾ</b>\n{html.escape(clean_msg)}\n⏱️ <i>{now_str}</i>"

    # --- 3. ĐÓNG VỊ THẾ PAPER (CHỐT LỜI / CẮT LỖ) ---
    m_close_paper = re.search(
        r"(CHỐT LỜI|CẮT LỖ).*?(LONG|SHORT)\s+(\S+)\s+\|\s+Thoát tại\s+\$?([\d\.]+)\s+\|\s+PnL:\s+([+-]?\$?[\d\.]+)\s+\(([+-]?[\d\.]+%?)\)\s+\|\s+Lý do:\s*(.*)",
        clean_msg, re.I
    )
    if m_close_paper:
        tag, side, sym, exit_p, pnl_str, pnl_pct_str, reason = m_close_paper.groups()
        is_win = "CHỐT LỜI" in tag.upper() or not pnl_str.startswith("-")
        header = "🎯 <b>[PAPER] CHỐT LỜI THÀNH CÔNG (TP)</b>" if is_win else "🛑 <b>[PAPER] CẮT LỖ BẢO VỆ VỐN (SL)</b>"
        pnl_badge = f"🟢 <b>{html.escape(pnl_str)}</b> (<b>{html.escape(pnl_pct_str)}</b>)" if is_win else f"🔴 <b>{html.escape(pnl_str)}</b> (<b>{html.escape(pnl_pct_str)}</b>)"
        
        reason_vn = reason.strip()
        if "TP" in reason_vn.upper() or "TAKE_PROFIT" in reason_vn.upper():
            reason_vn = "🎯 Đạt mục tiêu Take Profit"
        elif "SL" in reason_vn.upper() or "STOP_LOSS" in reason_vn.upper():
            reason_vn = "🛑 Chạm mức Stop Loss an toàn"
        elif "TRAILING" in reason_vn.upper():
            reason_vn = "📈 Trailing Stop bảo toàn lợi nhuận sau đỉnh"
        elif "MANUAL" in reason_vn.upper():
            reason_vn = "✋ Đóng thủ công theo yêu cầu"
        elif "PANIC" in reason_vn.upper():
            reason_vn = "🚨 Đóng khẩn cấp bảo vệ tài khoản"

        return (
            f"{header}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🪙 <b>Cặp Coin:</b> <code>{html.escape(sym)}</code> ({side.upper()})\n"
            f"💵 <b>Giá Thoát Lệnh:</b> <code>${exit_p}</code>\n"
            f"💰 <b>Lợi Nhuận (PnL):</b> {pnl_badge}\n"
            f"📋 <b>Cơ Chế Thoát:</b> <i>{html.escape(reason_vn)}</i>\n"
            f"⏱️ <i>{now_str}</i>"
        )

    # --- 4. ĐÓNG VỊ THẾ BINANCE LIVE / TESTNET ---
    m_close_live = re.search(
        r"Đóng\s+(LONG|SHORT)\s+(\S+)\s+trên\s+(\w+)\s+\|\s+PnL ròng:\s+([+-]?[\d\.]+)\s+USDT\s+\|\s+Giá thoát:\s+([\d\.]+)",
        clean_msg, re.I
    )
    if m_close_live:
        side, sym, mode, pnl_val, exit_p = m_close_live.groups()
        pnl_clean = float(pnl_val.replace("+", "").strip())
        is_win = pnl_clean >= 0
        pnl_formatted = f"+${pnl_clean:.2f}" if is_win else f"-${abs(pnl_clean):.2f}"
        header = f"🎯 <b>[BINANCE {mode.upper()}] CHỐT LỜI THÀNH CÔNG</b>" if is_win else f"🛑 <b>[BINANCE {mode.upper()}] CẮT LỖ BẢO VỆ VỐN</b>"
        pnl_badge = f"🟢 <b>{pnl_formatted} USDT</b>" if is_win else f"🔴 <b>{pnl_formatted} USDT</b>"
        clean_sym = sym if "/USDT" in sym or sym.endswith("USDT") else f"{sym}/USDT"
        return (
            f"{header}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🪙 <b>Cặp Coin:</b> <code>{html.escape(clean_sym)}</code> ({side.upper()})\n"
            f"💵 <b>Giá Thoát Lệnh:</b> <code>${exit_p}</code>\n"
            f"💰 <b>PnL Ròng:</b> {pnl_badge}\n"
            f"⏱️ <i>{now_str}</i>"
        )

    # --- 5. CẢNH BÁO KHẨN CẤP / BẢO VỆ VỐN (PANIC / DAILY MAX LOSS) ---
    if category in ("PANIC", "RISK") or "lỗ tối đa" in clean_msg.lower() or "dừng bot" in clean_msg.lower():
        return (
            f"🚨 <b>[CẢNH BÁO BẢO VỆ VỐN] QUẢN TRỊ RỦI RO</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"⚠️ <b>Nội Dung:</b> <b>{html.escape(clean_msg)}</b>\n"
            f"🛡️ <i>Hệ thống tự động kích hoạt bảo vệ an toàn tài khoản</i>\n"
            f"⏱️ <i>{now_str}</i>"
        )

    # --- 6. AI GEMINI COPILOT ---
    if "GEMINI" in category.upper() or "AI cảnh báo" in clean_msg:
        return (
            f"🧠 <b>[GEMINI AI COPILOT] GIÁM SÁT THỊ TRƯỜNG</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"💡 {html.escape(clean_msg)}\n"
            f"⏱️ <i>{now_str}</i>"
        )

    # --- 7. BOT STATUS (START / STOP / SYSTEM) ---
    if category in ("BOT", "CONFIG", "SYSTEM"):
        emoji = "⚡" if level == "INFO" else "ℹ️"
        return (
            f"{emoji} <b>[HỆ THỐNG BINANCE SCALPER]</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"📢 {html.escape(clean_msg)}\n"
            f"⏱️ <i>{now_str}</i>"
        )

    # --- 8. FALLBACK CARD ---
    badge_icon = "🔔"
    if level == "ERROR":
        badge_icon = "❌"
    elif level == "WARN":
        badge_icon = "⚠️"
    elif level == "TRADE":
        badge_icon = "📈"

    return (
        f"{badge_icon} <b>[{html.escape(category)}] {html.escape(level)}</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"{html.escape(clean_msg)}\n"
        f"⏱️ <i>{now_str}</i>"
    )


def notify(level: str, category: str, message: str) -> None:
    """Queue formatted notification without blocking trading loops."""
    global _worker
    if not should_notify(level, category, message):
        return
    if not all(credentials()):
        return
    try:
        _events.put_nowait((level, category, message))
    except queue.Full:
        logger.warning("Telegram queue full; dropping notification")
        return
    with _worker_lock:
        if _worker is None or not _worker.is_alive():
            _worker = threading.Thread(target=_run, name="telegram-notifier", daemon=True)
            _worker.start()


def _run() -> None:
    while True:
        event = _events.get()
        try:
            level, category, message = event
            formatted = format_telegram_html(level, category, message)
            _send_raw(formatted, is_html=True)
        except Exception as exc:
            logger.warning("Telegram delivery failed (%s)", type(exc).__name__)
            _record_error(type(exc).__name__)
        finally:
            _events.task_done()


def _send_raw(text: str, is_html: bool = True, config: tuple[str, str] | None = None) -> bool:
    """Send text payload to Telegram via Bot API with HTML parse mode and fallback."""
    global _last_sent_at, _last_error
    token, chat_id = config if config is not None else credentials()
    if not token or not chat_id:
        return False

    if not re.fullmatch(r"\d+:[A-Za-z0-9_-]+", token) or not re.fullmatch(r"-?\d+", chat_id):
        logger.warning("Telegram token/chat ID format invalid")
        _record_error("Token hoặc Chat ID không đúng định dạng")
        return False

    clean_text = text.replace(token, "[REDACTED]")
    clean_text = re.sub(r"(?i)(signature=)[^&\s]+", r"\1[REDACTED]", clean_text)
    clean_text = re.sub(r"\b[A-Za-z0-9_-]{28,}\b", "[REDACTED]", clean_text)
    clean_text = clean_text[:4000]

    payload: dict = {
        "chat_id": chat_id,
        "text": clean_text,
        "disable_web_page_preview": True
    }
    if is_html:
        payload["parse_mode"] = "HTML"

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            result = json.load(response)
    except urllib.error.HTTPError as http_err:
        # If HTML parse error occurred, retry once with plain text
        if is_html and http_err.code == 400:
            logger.warning("Telegram HTML parse rejected; falling back to plain text")
            plain_fallback = re.sub(r"<[^>]+>", "", clean_text)
            return _send_raw(plain_fallback, is_html=False, config=(token, chat_id))
        _record_error(f"HTTP {http_err.code}: {http_err.reason}")
        return False
    except Exception as exc:
        _record_error(type(exc).__name__)
        return False

    if not result.get("ok"):
        logger.warning("Telegram API rejected notification: %s", result)
        _record_error("Telegram từ chối gửi tin; kiểm tra Chat ID và quyền bot")
        return False

    _last_sent_at = datetime.now().isoformat(timespec="seconds")
    _last_error = None
    return True


def send_test() -> bool:
    """Send an explicit test notification using current active credentials."""
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    test_msg = (
        f"🤖 <b>[BINANCE FUTURES SCALPER] KIỂM TRA KẾT NỐI TELEGRAM</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"✅ <b>Trạng Thái:</b> Bot đang trực tuyến và kết nối hoàn hảo!\n"
        f"💾 <b>Lưu Trữ:</b> Cấu hình vĩnh viễn trên cơ sở dữ liệu máy chủ\n"
        f"📊 <b>Bộ Giám Sát:</b> Realtime Scalping Engine + Gemini AI Copilot\n"
        f"⏱️ <i>Thời gian gửi: {now_str}</i>"
    )
    return _send_raw(test_msg, is_html=True)


if __name__ == "__main__":
    import sys
    success = send_test()
    print("Telegram test OK" if success else "Telegram test FAILED; check token/chat ID")
    sys.exit(0 if success else 1)
