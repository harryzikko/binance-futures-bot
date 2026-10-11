import pandas as pd
from typing import Dict, Any, Tuple
from .base import BaseStrategy

class BreakoutScalperStrategy(BaseStrategy):
    """
    Volume Surge & Donchian Breakout Scalper Strategy.
    Catches sudden volatile breakout spikes with confirmed volume expansion.
    """
    def __init__(self, params: Dict[str, Any] = None):
        super().__init__(name="breakout", params=params)

    def generate_signal(self, df: pd.DataFrame) -> Tuple[str, str, Dict[str, Any]]:
        df = self.calculate_indicators(df)
        if len(df) < 30:
            return "HOLD", "Insufficient data", {}

        # Lookback 15 bars for local high/low excluding the current candle
        lookback = 15
        recent_high = df["high"].iloc[-lookback-1:-1].max()
        recent_low = df["low"].iloc[-lookback-1:-1].min()

        last = df.iloc[-1]
        close = last["close"]
        rsi = last["rsi"]
        vol_ratio = last.get("vol_ratio", 1.0)

        extra = {
            "close": float(close),
            "recent_high": round(float(recent_high), 2),
            "recent_low": round(float(recent_low), 2),
            "vol_ratio": round(float(vol_ratio), 2),
            "rsi": round(float(rsi), 2)
        }

        # Long Breakout: Close breaks above recent high, volume is 1.6x average, RSI > 52
        if close > recent_high and vol_ratio >= 1.5 and rsi > 52 and last["close"] > last["open"]:
            return "LONG", f"Breakout: Price broke {lookback}-bar high with {vol_ratio:.1f}x volume spike (RSI {rsi:.1f})", extra

        # Short Breakdown: Close breaks below recent low, volume is 1.6x average, RSI < 48
        if close < recent_low and vol_ratio >= 1.5 and rsi < 48 and last["close"] < last["open"]:
            return "SHORT", f"Breakdown: Price broke {lookback}-bar low with {vol_ratio:.1f}x volume spike (RSI {rsi:.1f})", extra

        return "HOLD", "No setup", extra
