from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime

class TradeConfig(BaseModel):
    # Mode: paper, testnet (Futures Testnet), demo (Futures Demo), live
    model_config = ConfigDict(allow_inf_nan=False)
    mode: Literal["paper", "testnet", "demo", "live"] = "paper"
    symbol: str = Field(default="BTC/USDT", pattern=r"^[A-Z0-9]+/USDT(?::USDT)?$")
    timeframe: Literal["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"] = "1m"
    strategy: Literal["trend_pullback", "bb_mean_reversion", "breakout"] = "trend_pullback"
    
    # Automation & Multi-coin Scanning Mode
    auto_scan_all: bool = True       # True = Tự động quét toàn sàn và vào lệnh; False = Chỉ đánh 1 coin cố định
    scan_top_n: int = Field(default=25, ge=1, le=200)
    min_volume_24h: float = Field(default=15000000.0, ge=0)
    
    # Margin & Leverage
    leverage: int = Field(default=10, ge=1, le=50)
    margin_type: Literal["ISOLATED", "CROSSED"] = "ISOLATED"
    position_size_usd: float = Field(default=100.0, ge=5)
    position_size_percent: Optional[float] = Field(default=None, gt=0, le=100)
    max_open_positions: int = Field(default=3, ge=1, le=100)
    risk_sizing_enabled: bool = True
    risk_per_trade_pct: float = Field(default=0.5, gt=0, le=5)
    trend_filter_enabled: bool = True
    trend_filter_timeframes: Literal["15m", "1h", "15m+1h"] = "15m+1h"
    
    # Risk Management
    take_profit_pct: float = Field(default=1.2, gt=0, lt=100)
    stop_loss_pct: float = Field(default=0.6, gt=0, lt=100)
    
    # Quant Dynamic ATR Volatility Bands
    use_atr_tp_sl: bool = True
    atr_multiplier_tp: float = Field(default=2.5, gt=0, le=20)
    atr_multiplier_sl: float = Field(default=1.5, gt=0, le=10)
    atr_min_sl_pct: float = Field(default=0.4, gt=0, le=5)
    atr_max_sl_pct: float = Field(default=3.0, gt=0, le=15)

    # Gemini Macro AI Copilot & AI Self-Learning
    gemini_ai_enabled: bool = True
    gemini_auto_regime: bool = True
    gemini_model: str = "gemini-2.5-flash"
    ai_auto_strategy_switch: bool = True       # Tự động đổi chiến thuật theo Regime (Sideways -> BB, Trend -> Pullback)
    ai_auto_leverage: bool = True              # Tự động điều chỉnh đòn bẩy an toàn theo Regime
    ai_post_trade_learning: bool = True        # Tự học từ lệnh lỗ, tự động cooldown cặp coin nhiễu & siết rủi ro

    # Partial Take-Profit & Break-Even Stop Loss
    partial_tp_enabled: bool = True            # Chốt lời từng phần TP1 (Scale-Out)
    partial_tp_level1_pct: float = Field(default=50.0, ge=10, le=90) # Tỷ lệ chốt tại TP1 (%)
    break_even_enabled: bool = True            # Tự động dời Stop Loss về Hòa Vốn (Break-Even Risk-Free) sau khi chạm TP1

    # Cost Hurdle & Safeguards
    fee_hurdle_rate_pct: float = Field(default=0.15, ge=0.0, le=2.0)  # Ngưỡng lợi nhuận tối thiểu vượt phí sàn round-trip
    funding_rate_guard_enabled: bool = True    # Lọc rủi ro Funding Rate bất lợi (tránh trả phí Funding âm nặng)
    max_funding_rate_pct: float = Field(default=0.03, ge=0.005, le=0.5) # Ngưỡng funding rate tối đa chấp nhận (0.03%)
    macro_news_filter_enabled: bool = True     # Bộ lọc sốc biến động giá cực đoan (Flash Shock Filter)

    trailing_stop_enabled: bool = True
    trailing_stop_activation_pct: float = Field(default=0.5, gt=0, lt=100)
    trailing_stop_callback_pct: float = Field(default=0.25, gt=0, lt=100)

    daily_max_loss_usd: float = Field(default=50.0, gt=0)
    cooldown_seconds: int = Field(default=30, ge=0)

    rsi_period: int = Field(default=14, ge=2, le=200)
    rsi_oversold: float = Field(default=35.0, gt=0, lt=100)
    rsi_overbought: float = Field(default=65.0, gt=0, lt=100)
    ema_fast: int = Field(default=9, ge=2, le=200)
    min_signal_volume_ratio: float = Field(default=1.0, ge=0, le=10)
    ema_slow: int = Field(default=21, ge=2, le=200)
    ema_trend: int = Field(default=50, ge=2, le=500)
    bb_period: int = Field(default=20, ge=2, le=200)
    bb_std: float = Field(default=2.0, gt=0, le=10)

    @model_validator(mode="after")
    def validate_indicators(self):
        if not self.ema_fast < self.ema_slow <= self.ema_trend:
            raise ValueError("EMA phải thỏa mãn fast < slow <= trend")
        if self.rsi_oversold >= self.rsi_overbought:
            raise ValueError("RSI oversold phải nhỏ hơn overbought")
        if self.atr_min_sl_pct > self.atr_max_sl_pct:
            raise ValueError("ATR min SL phải không lớn hơn max SL")
        return self


class ApiKeyConfig(BaseModel):
    api_key: str = Field(min_length=1)
    api_secret: str = Field(min_length=1)
    environment: Literal["testnet", "demo", "live"] = "testnet"


class Position(BaseModel):
    id: str
    symbol: str
    side: str  # "LONG" or "SHORT"
    entry_price: float
    current_price: float
    mark_price: Optional[float] = None
    liquidation_price: Optional[float] = None
    amount: float      # Base coin amount (e.g., 0.01 BTC)
    notional: float    # USD notional value
    margin: float      # Margin used (USDT)
    leverage: int
    unrealized_pnl: float
    unrealized_pnl_pct: float
    take_profit_price: float
    stop_loss_price: float
    trailing_stop_price: Optional[float] = None
    peak_price: float
    entry_time: str
    mode: str          # "paper", "testnet", "demo", "live"

class TradeRecord(BaseModel):
    id: Optional[int] = None
    symbol: str
    side: str
    entry_price: float
    exit_price: float
    amount: float
    leverage: int
    pnl: float
    pnl_pct: float
    fee: float
    exit_reason: str  # "TP", "SL", "TRAILING_STOP", "MANUAL", "PANIC", etc.
    exit_reason_vn: Optional[str] = None
    exit_type: Optional[str] = None
    entry_reason: Optional[str] = None
    entry_time: str
    exit_time: str
    duration_str: Optional[str] = None
    mode: str
    strategy: str
    tp_price: Optional[float] = None
    sl_price: Optional[float] = None
    indicators: Optional[Dict[str, Any]] = None

class BotStatus(BaseModel):
    is_running: bool
    mode: str
    symbol: str
    timeframe: str
    strategy: str
    uptime_seconds: int
    balance_usdt: float
    available_margin: float
    active_positions_count: int
    total_trades_count: int
    win_rate: float
    total_realized_pnl: float
    daily_pnl: float
    last_signal: Optional[str] = None
    last_signal_time: Optional[str] = None
    daily_loss_hit: bool = False

class LogEntry(BaseModel):
    id: Optional[int] = None
    timestamp: str
    level: str  # "INFO", "SUCCESS", "WARN", "ERROR", "SIGNAL", "TRADE"
    category: str
    message: str


class BacktestRequest(BaseModel):
    symbol: str = "BTC/USDT"
    timeframe: str = "15m"
    strategy: Literal["trend_pullback", "bb_mean_reversion", "breakout"] = "trend_pullback"
    days: int = Field(default=14, ge=1, le=90)
    initial_balance: float = Field(default=1000.0, ge=50)
    leverage: int = Field(default=10, ge=1, le=50)
    position_size_usd: float = Field(default=100.0, ge=10)
    take_profit_pct: float = Field(default=1.5, gt=0)
    stop_loss_pct: float = Field(default=0.8, gt=0)
    use_atr_tp_sl: bool = True
    partial_tp_enabled: bool = True
    break_even_enabled: bool = True
    fee_pct: float = Field(default=0.05, ge=0.0)


class BacktestTradeItem(BaseModel):
    id: int
    entry_time: str
    exit_time: str
    side: str
    entry_price: float
    exit_price: float
    amount: float
    pnl_usd: float
    pnl_pct: float
    fee_usd: float
    exit_reason: str
    duration_minutes: int


class BacktestEquityPoint(BaseModel):
    timestamp: str
    time: int
    equity: float
    drawdown_pct: float


class BacktestResult(BaseModel):
    symbol: str
    timeframe: str
    strategy: str
    days: int
    initial_balance: float
    final_balance: float
    total_net_pnl_usd: float
    total_net_pnl_pct: float
    total_trades: int
    win_trades: int
    loss_trades: int
    win_rate: float
    profit_factor: float
    max_drawdown_usd: float
    max_drawdown_pct: float
    sharpe_ratio: float
    equity_curve: List[BacktestEquityPoint]
    trades: List[BacktestTradeItem]


class PinVerifyRequest(BaseModel):
    pin: str


class PinSetRequest(BaseModel):
    old_pin: Optional[str] = None
    new_pin: str
    enabled: bool = True

