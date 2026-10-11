import pandas as pd
from typing import Dict, Any, Tuple
from .base import BaseStrategy

class TrendScalperStrategy(BaseStrategy):
    """
    Robust Pro-Grade EMA Ribbon + RSI Pullback Scalper Strategy.
    Features:
    - Zero Repainting: Evaluates setup on confirmed closed bar (prev) + current breakout.
    - ADX Trend Filter: Prevents false signals during flat choppy consolidations.
    - Volume Confirmation: Requires genuine volume activity.
    - Candle Anatomy Check: Confirms wick rejection off dynamic EMA support/resistance.
    """
    def __init__(self, params: Dict[str, Any] = None):
        super().__init__(name="trend_pullback", params=params)

    def generate_signal(self, df: pd.DataFrame) -> Tuple[str, str, Dict[str, Any]]:
        df = self.calculate_indicators(df)
        if len(df) < 50:
            return "HOLD", "Insufficient historical data (< 50 bars)", {}

        # Confirmed closed candles
        curr = df.iloc[-1]
        prev = df.iloc[-2]
        prev2 = df.iloc[-3]

        close = curr["close"]
        ema_fast = curr["ema_fast"]
        ema_slow = curr["ema_slow"]
        ema_trend = curr["ema_trend"]
        rsi = curr["rsi"]
        adx = curr.get("adx", 25.0)
        vol_ratio = curr.get("vol_ratio", 1.0)
        atr = curr.get("atr", float(curr["high"] - curr["low"]))
        atr_pct = float(atr / (close + 1e-9) * 100)

        extra = {
            "close": float(close),
            "ema_fast": round(float(ema_fast), 2),
            "ema_slow": round(float(ema_slow), 2),
            "ema_trend": round(float(ema_trend), 2),
            "rsi": round(float(rsi), 2),
            "adx": round(float(adx), 2),
            "vol_ratio": round(float(vol_ratio), 2),
            "atr": float(atr),
            "atr_pct": round(atr_pct, 3)
        }

        # Filter 1: Trend Filter (ADX > 18 confirms active directional trend, not dead range)
        has_trend = adx >= 18.0
        has_volume = vol_ratio >= float(self.params.get("min_signal_volume_ratio", 1.0))

        # === BULLISH LONG SETUP ===
        # 1. Macro Trend: Price above EMA 50 and EMA 9 above EMA 21
        bullish_alignment = (close > ema_trend) and (ema_fast > ema_slow > ema_trend)
        # 2. Dynamic Pullback: Previous closed candle dipped to test EMA 21 or EMA 9
        bullish_pullback = (prev["low"] <= prev["ema_slow"] * 1.003) or (prev2["low"] <= prev2["ema_slow"] * 1.003)
        # 3. Reversal confirmation: Lower wick rejection on pullback candle, or current candle breaking prev high
        bullish_rejection = (prev["lower_wick"] >= prev["body"] * 0.4) or (curr["close"] > prev["high"])
        # 4. RSI momentum: Bouncing from pullback zone (38 - 62)
        bullish_rsi = (rsi > prev["rsi"]) and (38.0 <= rsi <= 65.0)
        # 5. Candle direction
        bullish_candle = curr["close"] > curr["open"]

        if has_volume and has_trend and bullish_alignment and bullish_pullback and bullish_rejection and bullish_rsi and bullish_candle:
            reason = f"Trend Long: EMA9 > EMA21 > EMA50, ADX={adx:.1f}, RSI bounce={rsi:.1f}, Vol={vol_ratio:.1f}x"
            return "LONG", reason, extra

        # === BEARISH SHORT SETUP ===
        # 1. Macro Trend: Price below EMA 50 and EMA 9 below EMA 21
        bearish_alignment = (close < ema_trend) and (ema_fast < ema_slow < ema_trend)
        # 2. Dynamic Pullback: Previous closed candle rallied to test EMA 21 or EMA 9
        bearish_pullback = (prev["high"] >= prev["ema_slow"] * 0.997) or (prev2["high"] >= prev2["ema_slow"] * 0.997)
        # 3. Reversal confirmation: Upper wick rejection on pullback candle, or current candle breaking prev low
        bearish_rejection = (prev["upper_wick"] >= prev["body"] * 0.4) or (curr["close"] < prev["low"])
        # 4. RSI momentum: Turning down from resistance zone (35 - 62)
        bearish_rsi = (rsi < prev["rsi"]) and (35.0 <= rsi <= 62.0)
        # 5. Candle direction
        bearish_candle = curr["close"] < curr["open"]

        if has_volume and has_trend and bearish_alignment and bearish_pullback and bearish_rejection and bearish_rsi and bearish_candle:
            reason = f"Trend Short: EMA9 < EMA21 < EMA50, ADX={adx:.1f}, RSI reject={rsi:.1f}, Vol={vol_ratio:.1f}x"
            return "SHORT", reason, extra

        return "HOLD", "Chờ tín hiệu xác nhận", extra
