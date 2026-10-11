from typing import Dict, Any
from .base import BaseStrategy
from .trend_scalper import TrendScalperStrategy
from .bb_scalper import BollingerBandsScalperStrategy
from .breakout_scalper import BreakoutScalperStrategy

STRATEGIES = {
    "trend_pullback": TrendScalperStrategy,
    "bb_mean_reversion": BollingerBandsScalperStrategy,
    "breakout": BreakoutScalperStrategy
}

def get_strategy(strategy_name: str, params: Dict[str, Any] = None) -> BaseStrategy:
    strategy_cls = STRATEGIES.get(strategy_name, TrendScalperStrategy)
    return strategy_cls(params=params)
