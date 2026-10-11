"""Higher-timeframe directional confirmation using only fully closed bars."""
import math
import pandas as pd


def confirmed_trend(df: pd.DataFrame) -> str:
    """Require close and EMA50 on the same side of EMA200; otherwise HOLD."""
    if len(df) < 200:
        return "HOLD"
    closes = pd.to_numeric(df["close"], errors="coerce")
    if closes.isna().any() or (closes <= 0).any():
        return "HOLD"
    ema50 = closes.ewm(span=50, adjust=False, min_periods=50).mean().iloc[-1]
    ema200 = closes.ewm(span=200, adjust=False, min_periods=200).mean().iloc[-1]
    price = closes.iloc[-1]
    if not all(math.isfinite(float(v)) for v in (ema50, ema200, price)):
        return "HOLD"
    if price > ema50 > ema200:
        return "LONG"
    if price < ema50 < ema200:
        return "SHORT"
    return "HOLD"
