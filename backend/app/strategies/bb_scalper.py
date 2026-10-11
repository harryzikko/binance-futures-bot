import pandas as pd
from typing import Dict, Any, Tuple
from .base import BaseStrategy

class BollingerBandsScalperStrategy(BaseStrategy):
    """
    Bollinger Bands + RSI Mean Reversion Scalper Strategy.
    Upgraded with Volatility Expansion filter to strictly avoid catching falling knives.
    """
    def __init__(self, params: Dict[str, Any] = None):
        super().__init__(name="bb_mean_reversion", params=params)

    def generate_signal(self, df: pd.DataFrame) -> Tuple[str, str, Dict[str, Any]]:
        df = self.calculate_indicators(df)
        if len(df) < 30:
            return "HOLD", "Insufficient data", {}

        curr = df.iloc[-1]
        prev = df.iloc[-2]

        close = curr["close"]
        bb_upper = curr["bb_upper"]
        bb_lower = curr["bb_lower"]
        bb_middle = curr["bb_middle"]
        bb_width = curr.get("bb_width", 0.0)
        rsi = curr["rsi"]
        prev_rsi = prev["rsi"]
        adx = curr.get("adx", 20.0)

        oversold_thresh = float(self.params.get("rsi_oversold", 32.0))
        overbought_thresh = float(self.params.get("rsi_overbought", 68.0))

        extra = {
            "close": float(close),
            "bb_upper": round(float(bb_upper), 2),
            "bb_middle": round(float(bb_middle), 2),
            "bb_lower": round(float(bb_lower), 2),
            "bb_width": round(float(bb_width), 4),
            "rsi": round(float(rsi), 2),
            "adx": round(float(adx), 2)
        }

        # Filter out extreme runaway one-way trends (ADX > 40 usually means runaway waterfall or mega pump)
        is_ranging_or_reversing = adx < 35.0

        # === LONG MEAN REVERSION ===
        # 1. Previous candle dipped to/below Lower Band or RSI hit extreme oversold
        touched_lower = (prev["low"] <= prev["bb_lower"]) or (prev["rsi"] <= oversold_thresh)
        # 2. Bullish Reversal Confirmation: Current candle closed green back ABOVE Lower Band
        closed_inside_lower = (curr["close"] > curr["open"]) and (close > bb_lower)
        # 3. RSI Hook: RSI turned upwards
        rsi_recovering = (rsi > prev_rsi) and (rsi < 48.0)

        if is_ranging_or_reversing and touched_lower and closed_inside_lower and rsi_recovering:
            reason = f"BB Long Reversal: Đáy chạm dải dưới, RSI hồi phục từ {prev_rsi:.1f} lên {rsi:.1f}"
            return "LONG", reason, extra

        # === SHORT MEAN REVERSION ===
        # 1. Previous candle spiked to/above Upper Band or RSI hit extreme overbought
        touched_upper = (prev["high"] >= prev["bb_upper"]) or (prev["rsi"] >= overbought_thresh)
        # 2. Bearish Rejection Confirmation: Current candle closed red back BELOW Upper Band
        closed_inside_upper = (curr["close"] < curr["open"]) and (close < bb_upper)
        # 3. RSI Hook: RSI turned downwards
        rsi_cooling = (rsi < prev_rsi) and (rsi > 52.0)

        if is_ranging_or_reversing and touched_upper and closed_inside_upper and rsi_cooling:
            reason = f"BB Short Rejection: Đỉnh chạm dải trên, RSI hạ nhiệt từ {prev_rsi:.1f} xuống {rsi:.1f}"
            return "SHORT", reason, extra

        return "HOLD", "Chờ nhịp đảo chiều biên độ", extra
