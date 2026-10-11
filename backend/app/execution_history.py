"""Bound execution reconciliation to a single position lifecycle."""
import math


def position_lifecycle(trades, meta):
    opening = "buy" if meta["side"] == "LONG" else "sell"
    order_id = meta.get("entry_order_id")
    ordered = sorted(trades, key=lambda t: t.get("timestamp") or 0)
    lifecycle = []
    opened = closed = 0.0
    started = False
    for trade in ordered:
        amount = float(trade.get("amount") or 0)
        if not math.isfinite(amount) or amount <= 0:
            continue
        same_entry = not order_id or str(trade.get("order") or (trade.get("info") or {}).get("orderId")) == str(order_id)
        if trade["side"] == opening:
            if not started and not same_entry:
                continue
            if order_id and not same_entry:
                # An unrelated add-on before closure makes attribution ambiguous.
                return []
            started = True
            opened += amount
        else:
            if not started:
                continue
            closed += amount
        lifecycle.append(trade)
        if started and closed + max(1e-9, opened * 1e-8) >= opened:
            return lifecycle
    return []  # Still partial / exchange fills not yet complete.
