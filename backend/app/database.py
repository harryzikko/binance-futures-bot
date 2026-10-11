import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
import os

DB_PATH = os.environ.get("TRADING_BOT_DB_PATH") or os.path.join(os.path.dirname(os.path.dirname(__file__)), "trading_bot.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        entry_price REAL NOT NULL,
        exit_price REAL NOT NULL,
        amount REAL NOT NULL,
        leverage INTEGER NOT NULL,
        pnl REAL NOT NULL,
        pnl_pct REAL NOT NULL,
        fee REAL NOT NULL,
        exit_reason TEXT NOT NULL,
        entry_time TEXT NOT NULL,
        exit_time TEXT NOT NULL,
        mode TEXT NOT NULL,
        strategy TEXT NOT NULL,
        entry_reason TEXT,
        tp_price REAL,
        sl_price REAL,
        extra_info TEXT
    )
    """)

    # Dynamic migration for existing databases
    cursor.execute("PRAGMA table_info(trades)")
    existing_cols = {row["name"] for row in cursor.fetchall()}
    if "entry_reason" not in existing_cols:
        cursor.execute("ALTER TABLE trades ADD COLUMN entry_reason TEXT")
    if "tp_price" not in existing_cols:
        cursor.execute("ALTER TABLE trades ADD COLUMN tp_price REAL")
    if "sl_price" not in existing_cols:
        cursor.execute("ALTER TABLE trades ADD COLUMN sl_price REAL")
    if "extra_info" not in existing_cols:
        cursor.execute("ALTER TABLE trades ADD COLUMN extra_info TEXT")
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        level TEXT NOT NULL,
        category TEXT NOT NULL,
        message TEXT NOT NULL
    )
    """)
    
    cursor.execute("CREATE TABLE IF NOT EXISTS trade_events (event_key TEXT PRIMARY KEY, trade_id INTEGER NOT NULL)")

    conn.commit()
    conn.close()

def clear_trades(mode: Optional[str] = None) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    if mode:
        cursor.execute("DELETE FROM trades WHERE mode = ?", (mode,))
    else:
        cursor.execute("DELETE FROM trades")
    count = cursor.rowcount
    conn.commit()
    conn.close()
    return count

def save_setting(key: str, value: Any):
    conn = get_connection()
    cursor = conn.cursor()
    val_str = json.dumps(value) if not isinstance(value, str) else value
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, val_str))
    conn.commit()
    conn.close()

def get_setting(key: str, default: Any = None) -> Any:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return default
    try:
        return json.loads(row["value"])
    except Exception:
        return row["value"]

def save_trade(trade_data: Dict[str, Any], state_key: Optional[str] = None,
               state: Any = None, event_key: Optional[str] = None) -> int:
    """Atomically commit the trade and its resulting broker/tracker state."""
    conn = get_connection()
    try:
        with conn:
            conn.execute("BEGIN IMMEDIATE")
            existing = conn.execute("SELECT trade_id FROM trade_events WHERE event_key = ?", (event_key,)).fetchone() if event_key else None
            if existing:
                trade_id = existing["trade_id"]
            else:
                base_columns = ["symbol", "side", "entry_price", "exit_price", "amount", "leverage", "pnl", "pnl_pct",
                                "fee", "exit_reason", "entry_time", "exit_time", "mode", "strategy"]
                optional_columns = ["entry_reason", "tp_price", "sl_price", "extra_info"]
                columns = list(base_columns)
                for col in optional_columns:
                    if col in trade_data and trade_data[col] is not None:
                        columns.append(col)
                values = tuple(trade_data.get(c, 0.0) if c == "fee" else trade_data.get(c) for c in columns)
                cursor = conn.execute(f"INSERT INTO trades ({', '.join(columns)}) VALUES ({', '.join('?' for _ in columns)})", values)
                trade_id = cursor.lastrowid
                if event_key:
                    conn.execute("INSERT INTO trade_events (event_key, trade_id) VALUES (?, ?)", (event_key, trade_id))
            if state_key:
                conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (state_key, json.dumps(state)))
        return trade_id
    finally:
        conn.close()

def format_duration(start_str: str, end_str: str) -> str:
    try:
        s_clean = str(start_str).replace("T", " ").split(".")[0]
        e_clean = str(end_str).replace("T", " ").split(".")[0]
        t1 = datetime.strptime(s_clean, "%Y-%m-%d %H:%M:%S")
        t2 = datetime.strptime(e_clean, "%Y-%m-%d %H:%M:%S")
        diff_sec = int((t2 - t1).total_seconds())
        if diff_sec < 0:
            diff_sec = abs(diff_sec)
        if diff_sec < 60:
            return f"{diff_sec}s"
        elif diff_sec < 3600:
            m = diff_sec // 60
            s = diff_sec % 60
            return f"{m}p {s}s" if s > 0 else f"{m}p"
        else:
            h = diff_sec // 3600
            m = (diff_sec % 3600) // 60
            return f"{h}h {m}p" if m > 0 else f"{h}h"
    except Exception:
        return "--"

def enrich_trade(trade: Dict[str, Any]) -> Dict[str, Any]:
    t = dict(trade)
    pnl = float(t.get("pnl") or 0.0)
    side = str(t.get("side") or "").upper()
    strat = str(t.get("strategy") or "").lower()
    exit_r = str(t.get("exit_reason") or "").upper()

    # 1. Format clear, descriptive Exit Reason in Vietnamese
    if "EXCHANGE" in exit_r:
        if pnl > 0:
            t["exit_reason_vn"] = "Chốt Lời (Khớp lệnh TP trên sàn)"
            t["exit_type"] = "TP"
        else:
            t["exit_reason_vn"] = "Cắt Lỗ (Khớp lệnh SL trên sàn)"
            t["exit_type"] = "SL"
    elif "TP" in exit_r or "TAKE_PROFIT" in exit_r:
        if pnl >= 0:
            t["exit_reason_vn"] = "Chốt Lời (Đạt mục tiêu TP)"
            t["exit_type"] = "TP"
        else:
            t["exit_reason_vn"] = "Hòa vốn / Phí sàn (TP)"
            t["exit_type"] = "BE"
    elif "TRAILING" in exit_r:
        t["exit_reason_vn"] = "Trailing Stop (Chốt lời sau đỉnh)"
        t["exit_type"] = "TRAILING"
    elif "PANIC" in exit_r:
        t["exit_reason_vn"] = "Đóng khẩn cấp (Panic Close)"
        t["exit_type"] = "PANIC"
    elif "MANUAL" in exit_r:
        t["exit_reason_vn"] = "Đóng thủ công (Người dùng)"
        t["exit_type"] = "MANUAL"
    elif "SL" in exit_r or "STOP_LOSS" in exit_r:
        if pnl > 0:
            t["exit_reason_vn"] = "Bảo toàn vốn / SL dời dương"
            t["exit_type"] = "TP"
        else:
            t["exit_reason_vn"] = "Cắt Lỗ (Chạm ngưỡng Stop Loss)"
            t["exit_type"] = "SL"
    else:
        t["exit_reason_vn"] = t.get("exit_reason") or ("Chốt Lời" if pnl > 0 else "Cắt Lỗ")
        t["exit_type"] = "TP" if pnl > 0 else "SL"

    # 2. Enrich Entry Reason if missing/empty
    entry_r = t.get("entry_reason")
    if not entry_r:
        if "pullback" in strat or "trend" in strat:
            if side == "LONG":
                entry_r = "Trend Pullback: Giá test hỗ trợ EMA 21 & RSI hồi phục tăng"
            else:
                entry_r = "Trend Pullback: Giá test cản kháng cự EMA 21 & RSI đảo chiều giảm"
        elif "bb" in strat or "bollinger" in strat:
            if side == "LONG":
                entry_r = "Bollinger Bands: Giá chạm Band dưới (Quá bán) & Nến rút râu bật tăng"
            else:
                entry_r = "Bollinger Bands: Giá chạm Band trên (Quá mua) & Nến rút râu đảo chiều giảm"
        elif "breakout" in strat:
            if side == "LONG":
                entry_r = "Breakout: Phá vỡ đỉnh kháng cự kèm Volume đột biến"
            else:
                entry_r = "Breakdown: Thủng đáy hỗ trợ kèm Volume bán áp đảo"
        else:
            entry_r = f"Tín hiệu {strat.replace('_', ' ')} xác nhận vào {side}"
    t["entry_reason"] = entry_r

    # 3. Calculate Duration
    t["duration_str"] = format_duration(t.get("entry_time", ""), t.get("exit_time", ""))

    # 4. Parse extra_info JSON if present
    if t.get("extra_info") and isinstance(t["extra_info"], str):
        try:
            t["indicators"] = json.loads(t["extra_info"])
        except Exception:
            t["indicators"] = None
    elif isinstance(t.get("extra_info"), dict):
        t["indicators"] = t["extra_info"]
    else:
        t["indicators"] = None

    return t

def get_trades(limit: int = 50, mode: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    if mode:
        cursor.execute("SELECT * FROM trades WHERE mode = ? ORDER BY id DESC LIMIT ?", (mode, limit))
    else:
        cursor.execute("SELECT * FROM trades ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [enrich_trade(dict(row)) for row in rows]

def get_trade_stats(mode: Optional[str] = None) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM trades"
    params = []
    if mode:
        query += " WHERE mode = ?"
        params.append(mode)
        
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()
    
    total_trades = len(rows)
    if total_trades == 0:
        return {
            "total_trades": 0,
            "wins": 0,
            "losses": 0,
            "win_rate": 0.0,
            "total_pnl": 0.0,
            "total_fees": 0.0,
            "profit_factor": 0.0,
            "avg_trade_pnl": 0.0,
            "best_trade": 0.0,
            "worst_trade": 0.0,
            "daily_pnl": 0.0
        }
        
    wins = [r["pnl"] for r in rows if r["pnl"] > 0]
    losses = [abs(r["pnl"]) for r in rows if r["pnl"] < 0]
    total_pnl = sum(r["pnl"] for r in rows)
    total_fees = sum(r["fee"] for r in rows)
    win_count = len(wins)
    loss_count = len(losses)
    win_rate = (win_count / total_trades) * 100.0 if total_trades > 0 else 0.0
    
    sum_wins = sum(wins)
    sum_losses = sum(losses)
    profit_factor = (sum_wins / sum_losses) if sum_losses > 0 else (99.0 if sum_wins > 0 else 1.0)
    
    # Calculate today's PnL
    today_str = datetime.now().strftime("%Y-%m-%d")
    daily_pnl = sum(r["pnl"] for r in rows if r["exit_time"].startswith(today_str))
    
    return {
        "total_trades": total_trades,
        "wins": win_count,
        "losses": loss_count,
        "win_rate": round(win_rate, 2),
        "total_pnl": round(total_pnl, 2),
        "total_fees": round(total_fees, 2),
        "profit_factor": round(profit_factor, 2),
        "avg_trade_pnl": round(total_pnl / total_trades, 2),
        "best_trade": round(max([r["pnl"] for r in rows], default=0.0), 2),
        "worst_trade": round(min([r["pnl"] for r in rows], default=0.0), 2),
        "daily_pnl": round(daily_pnl, 2)
    }

def add_log(level: str, category: str, message: str):
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("INSERT INTO logs (timestamp, level, category, message) VALUES (?, ?, ?, ?)",
                   (now_str, level, category, message))
    conn.commit()
    conn.close()
    # Telegram delivery is queued after SQLite commit and must never block trading.
    try:
        from .telegram_notifier import notify
        notify(level, category, message)
    except Exception:
        pass

def get_recent_logs(limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in reversed(rows)]

def get_pnl_calendar_data(year: int, month: int, mode: Optional[str] = None) -> Dict[str, Any]:
    """
    Aggregates trade PnL by day, week, and month for calendar visualization.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    prefix = f"{year:04d}-{month:02d}"
    query = "SELECT * FROM trades WHERE exit_time LIKE ?"
    params = [f"{prefix}%"]
    if mode and mode != "all":
        query += " AND mode = ?"
        params.append(mode)
        
    query += " ORDER BY id ASC"
    cursor.execute(query, tuple(params))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    daily_map: Dict[str, Dict[str, Any]] = {}
    weekly_map: Dict[str, Dict[str, Any]] = {}

    month_total_pnl = 0.0
    month_total_fees = 0.0
    month_wins = 0
    month_losses = 0

    for r in rows:
        exit_time = r["exit_time"]
        date_str = exit_time.split(" ")[0]  # YYYY-MM-DD
        pnl = float(r["pnl"])
        fee = float(r.get("fee", 0.0))
        is_win = pnl > 0

        month_total_pnl += pnl
        month_total_fees += fee
        if is_win:
            month_wins += 1
        elif pnl < 0:
            month_losses += 1

        # Daily Aggregation
        if date_str not in daily_map:
            daily_map[date_str] = {
                "date": date_str,
                "total_pnl": 0.0,
                "total_fees": 0.0,
                "trades_count": 0,
                "wins": 0,
                "losses": 0,
                "win_rate": 0.0,
                "trades": []
            }
        
        d_entry = daily_map[date_str]
        d_entry["total_pnl"] += pnl
        d_entry["total_fees"] += fee
        d_entry["trades_count"] += 1
        if is_win:
            d_entry["wins"] += 1
        elif pnl < 0:
            d_entry["losses"] += 1
        d_entry["trades"].append(enrich_trade(r))

        # Weekly Aggregation
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            week_key = f"Tuần {dt.isocalendar()[1]}"
        except Exception:
            week_key = "Tuần --"

        if week_key not in weekly_map:
            weekly_map[week_key] = {
                "week": week_key,
                "total_pnl": 0.0,
                "trades_count": 0,
                "wins": 0,
                "losses": 0,
                "win_rate": 0.0
            }
        w_entry = weekly_map[week_key]
        w_entry["total_pnl"] += pnl
        w_entry["trades_count"] += 1
        if is_win:
            w_entry["wins"] += 1
        elif pnl < 0:
            w_entry["losses"] += 1

    # Round daily metrics
    green_days = 0
    red_days = 0
    for d in daily_map.values():
        d["total_pnl"] = round(d["total_pnl"], 2)
        d["total_fees"] = round(d["total_fees"], 2)
        d["win_rate"] = round((d["wins"] / d["trades_count"]) * 100, 1) if d["trades_count"] > 0 else 0.0
        if d["total_pnl"] > 0:
            green_days += 1
        elif d["total_pnl"] < 0:
            red_days += 1

    for w in weekly_map.values():
        w["total_pnl"] = round(w["total_pnl"], 2)
        w["win_rate"] = round((w["wins"] / w["trades_count"]) * 100, 1) if w["trades_count"] > 0 else 0.0

    total_month_trades = len(rows)
    month_win_rate = round((month_wins / total_month_trades) * 100, 1) if total_month_trades > 0 else 0.0

    return {
        "year": year,
        "month": month,
        "mode": mode or "all",
        "month_summary": {
            "total_pnl": round(month_total_pnl, 2),
            "total_fees": round(month_total_fees, 2),
            "total_trades": total_month_trades,
            "wins": month_wins,
            "losses": month_losses,
            "win_rate": month_win_rate,
            "green_days": green_days,
            "red_days": red_days
        },
        "daily_pnl": daily_map,
        "weekly_pnl": list(weekly_map.values())
    }
