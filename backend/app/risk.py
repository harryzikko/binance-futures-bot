"""Conservative sizing with per-position stop risk, ATR and bounded AI scaling."""
import math
from typing import Any, Dict, List, Optional
from .models import TradeConfig

ROUND_TRIP_COST_RATE = 0.002
MIN_MARGIN_USDT = 5.0


def size_position(config: TradeConfig, balance: Dict[str, float], positions: List[Dict[str, Any]],
                  daily_pnl: float, effective_sl_pct: Optional[float] = None,
                  risk_multiplier: float = 1.0) -> Optional[Dict[str, float]]:
    equity = float(balance.get("total_usdt") or 0)
    free = float(balance.get("free_usdt") or 0)
    if not all(math.isfinite(x) for x in (equity, free, daily_pnl, risk_multiplier)) or equity <= 0 or free <= 0 or risk_multiplier <= 0:
        return None
    sl_pct = config.stop_loss_pct if effective_sl_pct is None else float(effective_sl_pct)
    if not math.isfinite(sl_pct) or not 0 < sl_pct < 100:
        return None
    loss_rate = sl_pct / 100 + ROUND_TRIP_COST_RATE
    margin_cap = free * config.position_size_percent / 100 if config.position_size_percent else config.position_size_usd
    margin_cap = min(margin_cap, free * 0.95)
    if margin_cap < MIN_MARGIN_USDT:
        return None
    if not config.risk_sizing_enabled:
        return {"margin": margin_cap, "leverage": config.leverage,
                "estimated_risk": margin_cap * config.leverage * loss_rate, "effective_sl_pct": sl_pct}

    open_risk = 0.0
    for pos in positions:
        notional = abs(float(pos.get("notional") or float(pos.get("amount") or 0) * float(pos.get("entry_price") or 0)))
        entry = float(pos.get("entry_price") or 0)
        stop = float(pos.get("stop_loss_price") or 0)
        if not all(math.isfinite(v) for v in (notional, entry, stop)):
            return None
        if pos.get("protection_status") == "verified" and stop > 0 and entry > 0:
            adverse = (entry - stop) if pos.get("side") == "LONG" else (stop - entry)
            pos_sl_pct = max(0.0, adverse / entry * 100)
        elif pos.get("effective_sl_pct") or pos.get("stop_loss_pct"):
            pos_sl_pct = float(pos.get("effective_sl_pct") or pos.get("stop_loss_pct"))
        elif "protection_status" in pos:
            # Missing/unverified exchange protection has no reliable stop budget.
            return None
        else:
            pos_sl_pct = max(config.stop_loss_pct, config.atr_max_sl_pct) if config.use_atr_tp_sl else config.stop_loss_pct
        if not math.isfinite(pos_sl_pct) or pos_sl_pct < 0:
            return None
        open_risk += notional * (pos_sl_pct / 100 + ROUND_TRIP_COST_RATE)

    remaining_daily = config.daily_max_loss_usd + daily_pnl - open_risk
    budget = min(equity * config.risk_per_trade_pct * min(1.5, risk_multiplier) / 100, remaining_daily)
    if budget <= 0:
        return None
    notional = min(budget / loss_rate, margin_cap * config.leverage)
    leverage = min(config.leverage, max(1, math.ceil(notional / margin_cap)))
    margin = min(margin_cap, notional / leverage)
    if margin < MIN_MARGIN_USDT:
        return None
    return {"margin": margin, "leverage": leverage,
            "estimated_risk": margin * leverage * loss_rate, "effective_sl_pct": sl_pct}
