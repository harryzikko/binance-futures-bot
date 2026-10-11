import pandas as pd
import numpy as np
import ta
from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple, Optional

class BaseStrategy(ABC):
    def __init__(self, name: str, params: Optional[Dict[str, Any]] = None):
        self.name = name
        self.params = params or {}

    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Takes OHLCV dataframe and appends technical indicators.
        Columns required: ['timestamp', 'open', 'high', 'low', 'close', 'volume']
        """
        if len(df) < 30:
            return df
            
        df = df.copy()
        
        # EMAs
        ema_fast = int(self.params.get("ema_fast", 9))
        ema_slow = int(self.params.get("ema_slow", 21))
        ema_trend = int(self.params.get("ema_trend", 50))
        
        df["ema_fast"] = ta.trend.EMAIndicator(close=df["close"], window=ema_fast).ema_indicator()
        df["ema_slow"] = ta.trend.EMAIndicator(close=df["close"], window=ema_slow).ema_indicator()
        df["ema_trend"] = ta.trend.EMAIndicator(close=df["close"], window=ema_trend).ema_indicator()
        df["ema_200"] = ta.trend.EMAIndicator(close=df["close"], window=200).ema_indicator()
        
        # RSI
        rsi_period = int(self.params.get("rsi_period", 14))
        df["rsi"] = ta.momentum.RSIIndicator(close=df["close"], window=rsi_period).rsi()
        
        # ADX (Trend Strength Indicator - avoids flat choppy sideways traps)
        try:
            adx_ind = ta.trend.ADXIndicator(high=df["high"], low=df["low"], close=df["close"], window=14)
            df["adx"] = adx_ind.adx()
            df["adx_pos"] = adx_ind.adx_pos()
            df["adx_neg"] = adx_ind.adx_neg()
        except Exception:
            df["adx"] = 25.0
            df["adx_pos"] = 25.0
            df["adx_neg"] = 25.0

        # Bollinger Bands
        bb_period = int(self.params.get("bb_period", 20))
        bb_std = float(self.params.get("bb_std", 2.0))
        bb = ta.volatility.BollingerBands(close=df["close"], window=bb_period, window_dev=bb_std)
        df["bb_upper"] = bb.bollinger_hband()
        df["bb_middle"] = bb.bollinger_mavg()
        df["bb_lower"] = bb.bollinger_lband()
        df["bb_width"] = (df["bb_upper"] - df["bb_lower"]) / (df["bb_middle"] + 1e-9)
        
        # ATR (Average True Range)
        df["atr"] = ta.volatility.AverageTrueRange(high=df["high"], low=df["low"], close=df["close"], window=14).average_true_range()
        
        # Volume Moving Average & Volume Ratio
        df["vol_sma"] = df["volume"].rolling(window=20).mean()
        df["vol_ratio"] = df["volume"] / (df["vol_sma"] + 1e-9)
        
        # Candle Body & Wick properties (for rejection confirmation)
        df["body"] = (df["close"] - df["open"]).abs()
        df["range"] = df["high"] - df["low"]
        df["upper_wick"] = df["high"] - df[["open", "close"]].max(axis=1)
        df["lower_wick"] = df[["open", "close"]].min(axis=1) - df["low"]
        
        return df

    @abstractmethod
    def generate_signal(self, df: pd.DataFrame) -> Tuple[str, str, Dict[str, Any]]:
        pass
