import math
import uuid
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from .models import Position, TradeRecord
from .database import save_trade, add_log, get_setting, save_setting

logger = logging.getLogger("paper_trader")

class PaperTrader:
    """
    Virtual Binance Futures simulated broker.
    Executes trades against live Binance tick prices with realistic slippage, fee simulation and PnL calculation.
    """
    def __init__(self, initial_balance: float = 10000.0):
        self.initial_balance = initial_balance
        self.balance = initial_balance
        self.open_positions: Dict[str, Dict[str, Any]] = {}
        self.fee_rate = 0.0004  # 0.04% taker fee
        state = get_setting("paper_state", None)
        if state:
            self.balance = state["balance"]
            self.open_positions = state["open_positions"]

    def persist(self):
        save_setting("paper_state", {"balance": self.balance, "open_positions": self.open_positions})

    def reset_balance(self, amount: float = 10000.0):
        self.balance = amount
        self.open_positions.clear()
        self.persist()
        add_log("INFO", "PAPER", f"Đặt lại số dư giả lập về {amount:.2f} USDT")

    def get_balance(self) -> Dict[str, float]:
        margin_used = sum(p["margin"] for p in self.open_positions.values())
        unrealized_pnl = sum(p["unrealized_pnl"] for p in self.open_positions.values())
        return {
            "total_usdt": round(self.balance + margin_used + unrealized_pnl, 2),
            "free_usdt": round(max(0.0, self.balance), 2),
            "used_usdt": round(margin_used, 2),
            "unrealized_pnl": round(unrealized_pnl, 2)
        }

    def open_position(
        self,
        symbol: str,
        side: str,
        price: float,
        margin_amount: float,
        leverage: int,
        tp_pct: float,
        sl_pct: float,
        trailing_activation_pct: float,
        trailing_callback_pct: float,
        strategy_name: str,
        trailing_enabled: bool = True,
        entry_reason: Optional[str] = None,
        extra: Optional[Dict[str, Any]] = None,
        partial_tp_enabled: bool = True,
        break_even_enabled: bool = True,
    ) -> Optional[Dict[str, Any]]:
        if side.upper() not in {"LONG", "SHORT"} or not all(math.isfinite(v) and v > 0 for v in (price, margin_amount, leverage)):
            raise ValueError("Giá, vốn, đòn bẩy và hướng lệnh không hợp lệ")
        notional = margin_amount * leverage
        entry_fee = notional * self.fee_rate
        if self.balance < margin_amount + entry_fee:
            add_log("WARN", "PAPER", "Số dư giả lập không đủ cho ký quỹ và phí vào lệnh")
            return None

        pos_id = f"paper_{uuid.uuid4().hex[:8]}"
        notional = margin_amount * leverage
        amount = notional / price
        entry_fee = notional * self.fee_rate
        self.balance -= (margin_amount + entry_fee)

        # TP and SL price calculation with dynamic precision for altcoins
        def get_price_prec(p: float) -> int:
            if p >= 1000: return 2
            elif p >= 10: return 3
            elif p >= 1: return 4
            elif p >= 0.01: return 6
            else: return 8

        prec = get_price_prec(price)
        step = 10 ** (-prec)

        if side.upper() == "LONG":
            tp_price = round(price * (1 + tp_pct / 100.0), prec)
            sl_price = round(price * (1 - sl_pct / 100.0), prec)
            tp1_price = round(price + (tp_price - price) * 0.5, prec)
            liq_price = round(price * (1 - (1 / leverage) * 0.9), prec)
            if tp_price <= price:
                tp_price = round(price + step, prec)
            if tp1_price <= price:
                tp1_price = round(price + step, prec)
            if sl_price >= price:
                sl_price = round(max(step, price - step), prec)
        else:
            tp_price = round(price * (1 - tp_pct / 100.0), prec)
            sl_price = round(price * (1 + sl_pct / 100.0), prec)
            tp1_price = round(price - (price - tp_price) * 0.5, prec)
            liq_price = round(price * (1 + (1 / leverage) * 0.9), prec)
            if tp_price >= price:
                tp_price = round(max(step, price - step), prec)
            if tp1_price >= price:
                tp1_price = round(max(step, price - step), prec)
            if sl_price <= price:
                sl_price = round(price + step, prec)

        pos_data = {
            "id": pos_id,
            "symbol": symbol,
            "side": side.upper(),
            "entry_price": price,
            "current_price": price,
            "mark_price": price,
            "liquidation_price": liq_price,
            "amount": amount,
            "notional": notional,
            "margin": margin_amount,
            "leverage": leverage,
            "unrealized_pnl": 0.0,
            "unrealized_pnl_pct": 0.0,
            "take_profit_price": tp_price,
            "stop_loss_price": sl_price,
            "tp1_price": tp1_price,
            "tp1_hit": False,
            "partial_tp_enabled": partial_tp_enabled,
            "break_even_enabled": break_even_enabled,
            "break_even_active": False,
            "trailing_stop_price": None,
            "peak_price": price,
            "trailing_activation_pct": trailing_activation_pct,
            "trailing_callback_pct": trailing_callback_pct,
            "trailing_enabled": trailing_enabled,
            "entry_fee": entry_fee,
            "entry_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "strategy": strategy_name,
            "mode": "paper",
            "entry_reason": entry_reason,
            "extra": extra or {}
        }

        self.open_positions[pos_id] = pos_data
        self.persist()
        tp1_str = f" | TP1: ${tp1_price:.4f}" if partial_tp_enabled else ""
        add_log("TRADE", "PAPER", f"Mở vị thế {side.upper()} {symbol} tại giá ${price:.4f} | TP: ${tp_price:.4f}{tp1_str} | SL: ${sl_price:.4f} | Vốn: ${margin_amount:.2f} (x{leverage})")
        return pos_data

    def partial_close_position(self, pos_id: str, exit_price: float, ratio: float = 0.5) -> Optional[Dict[str, Any]]:
        """Realize partial profit (e.g. 50%) at TP1 and adjust Stop Loss to Break-Even."""
        if not math.isfinite(exit_price) or exit_price <= 0:
            return None
        pos = self.open_positions.get(pos_id)
        if not pos or pos.get("tp1_hit"):
            return None

        side = pos["side"]
        entry_price = pos["entry_price"]
        full_amount = pos["amount"]
        full_margin = pos["margin"]
        leverage = pos["leverage"]

        close_amount = full_amount * ratio
        close_margin = full_margin * ratio

        if side == "LONG":
            raw_pnl = (exit_price - entry_price) * close_amount
        else:
            raw_pnl = (entry_price - exit_price) * close_amount

        exit_notional = close_amount * exit_price
        exit_fee = exit_notional * self.fee_rate
        entry_fee_portion = pos.get("entry_fee", 0.0) * ratio
        total_fees = entry_fee_portion + exit_fee
        net_pnl = raw_pnl - total_fees
        pnl_pct = (net_pnl / (close_margin + 1e-9)) * 100.0

        # Return realized margin + net profit to balance
        self.balance += close_margin + raw_pnl - exit_fee

        # Deduct portion from remaining open position
        pos["amount"] -= close_amount
        pos["margin"] -= close_margin
        pos["notional"] -= close_margin * leverage
        pos["entry_fee"] = pos.get("entry_fee", 0.0) * (1 - ratio)
        pos["tp1_hit"] = True

        # Move Stop Loss to Break-Even (Risk-Free) if break_even_enabled
        if pos.get("break_even_enabled", True):
            if side == "LONG":
                be_sl = round(entry_price * 1.0008, 6)
            else:
                be_sl = round(entry_price * 0.9992, 6)
            pos["stop_loss_price"] = be_sl
            pos["break_even_active"] = True

        trade_record = {
            "symbol": pos["symbol"],
            "side": side,
            "entry_price": entry_price,
            "exit_price": exit_price,
            "amount": close_amount,
            "leverage": leverage,
            "pnl": round(net_pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "fee": round(total_fees, 2),
            "exit_reason": "PARTIAL_TP1",
            "entry_time": pos["entry_time"],
            "exit_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "mode": "paper",
            "strategy": pos.get("strategy", "unknown"),
            "entry_reason": pos.get("entry_reason"),
            "tp_price": pos.get("take_profit_price"),
            "sl_price": pos.get("stop_loss_price"),
            "extra_info": json.dumps({"partial_ratio": ratio, "break_even_moved": pos.get("break_even_active", False)})
        }

        try:
            save_trade(trade_record, "paper_state", {"balance": self.balance, "open_positions": self.open_positions}, f"paper_ptp_{pos_id}")
        except Exception as e:
            logger.error(f"Error saving partial trade: {e}")

        be_msg = f" | Tự động dời SL về Hòa Vốn Break-Even Risk-Free (${pos['stop_loss_price']:,.4f})" if pos.get("break_even_active") else ""
        add_log(
            "TRADE",
            "PAPER",
            f"🎯 CHỐT LỜI TP1 ({int(ratio*100)}%) {side} {pos['symbol']} tại ${exit_price:,.4f} | PnL: +${net_pnl:,.2f} ({pnl_pct:+.2f}%){be_msg}"
        )
        self.persist()
        return trade_record

    def update_position_price(self, symbol: str, current_price: float):
        """Update PnL and Trailing Stop for positions of a specific symbol."""
        if not math.isfinite(current_price) or current_price <= 0:
            return
        for pos_id, pos in list(self.open_positions.items()):
            if pos["symbol"] != symbol:
                continue
            pos["current_price"] = current_price
            pos["mark_price"] = current_price
            side = pos["side"]
            entry_price = pos["entry_price"]
            amount = pos["amount"]
            margin = pos["margin"]

            if side == "LONG":
                pnl = (current_price - entry_price) * amount
                pos["unrealized_pnl"] = round(pnl, 2)
                pos["unrealized_pnl_pct"] = round((pnl / (margin + 1e-9)) * 100, 2)
                
                # Peak tracking
                if current_price > pos["peak_price"]:
                    pos["peak_price"] = current_price

                # Trailing stop update
                profit_pct = ((current_price - entry_price) / entry_price) * 100
                if pos.get("trailing_enabled", True) and profit_pct >= pos["trailing_activation_pct"]:
                    new_trailing_sl = pos["peak_price"] * (1 - pos["trailing_callback_pct"] / 100.0)
                    if pos["trailing_stop_price"] is None or new_trailing_sl > pos["trailing_stop_price"]:
                        pos["trailing_stop_price"] = new_trailing_sl
            else:  # SHORT
                pnl = (entry_price - current_price) * amount
                pos["unrealized_pnl"] = round(pnl, 2)
                pos["unrealized_pnl_pct"] = round((pnl / (margin + 1e-9)) * 100, 2)

                # Peak tracking
                if current_price < pos["peak_price"]:
                    pos["peak_price"] = current_price

                # Trailing stop update
                profit_pct = ((entry_price - current_price) / entry_price) * 100
                if pos.get("trailing_enabled", True) and profit_pct >= pos["trailing_activation_pct"]:
                    new_trailing_sl = pos["peak_price"] * (1 + pos["trailing_callback_pct"] / 100.0)
                    if pos["trailing_stop_price"] is None or new_trailing_sl < pos["trailing_stop_price"]:
                        pos["trailing_stop_price"] = new_trailing_sl
        self.persist()

    def update_prices(self, current_price: float):
        """Fallback single-price update for backwards compatibility."""
        for pos in self.open_positions.values():
            self.update_position_price(pos["symbol"], current_price)

    def update_prices_map(self, prices_map: Dict[str, float]):
        """Update multiple positions with a dictionary of {symbol: price}."""
        for symbol, price in prices_map.items():
            self.update_position_price(symbol, price)

    def close_position(self, pos_id: str, exit_price: float, exit_reason: str) -> Optional[Dict[str, Any]]:
        if not math.isfinite(exit_price) or exit_price <= 0:
            raise ValueError("Giá thoát không hợp lệ")
        pos = self.open_positions.pop(pos_id, None)
        if not pos:
            return None

        side = pos["side"]
        entry_price = pos["entry_price"]
        amount = pos["amount"]
        margin = pos["margin"]
        leverage = pos["leverage"]

        if side == "LONG":
            raw_pnl = (exit_price - entry_price) * amount
        else:
            raw_pnl = (entry_price - exit_price) * amount

        exit_notional = amount * exit_price
        exit_fee = exit_notional * self.fee_rate
        total_fees = pos.get("entry_fee", 0.0) + exit_fee
        net_pnl = raw_pnl - total_fees
        pnl_pct = (net_pnl / margin) * 100.0

        # Entry fee was already deducted when opening the position.
        old_balance = self.balance
        self.balance += margin + raw_pnl - exit_fee

        trade_record = {
            "symbol": pos["symbol"],
            "side": side,
            "entry_price": entry_price,
            "exit_price": exit_price,
            "amount": amount,
            "leverage": leverage,
            "pnl": round(net_pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "fee": round(total_fees, 2),
            "exit_reason": exit_reason,
            "entry_time": pos["entry_time"],
            "exit_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "mode": "paper",
            "strategy": pos.get("strategy", "unknown"),
            "entry_reason": pos.get("entry_reason"),
            "tp_price": pos.get("take_profit_price"),
            "sl_price": pos.get("stop_loss_price"),
            "extra_info": json.dumps(pos.get("extra") or {}) if pos.get("extra") else None
        }

        try:
            save_trade(trade_record, "paper_state", {"balance": self.balance, "open_positions": self.open_positions}, f"paper:{pos_id}")
        except Exception:
            self.balance = old_balance
            self.open_positions[pos_id] = pos
            raise
        
        status_tag = "CHỐT LỜI (TP)" if net_pnl > 0 else "CẮT LỖ (SL)"
        add_log(
            "TRADE",
            "PAPER",
            f"{status_tag} {side} {pos['symbol']} | Thoát tại ${exit_price:,.2f} | PnL: ${net_pnl:+,.2f} ({pnl_pct:+.2f}%) | Lý do: {exit_reason}"
        )
        return trade_record
