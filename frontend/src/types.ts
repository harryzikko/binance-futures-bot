export interface TradeConfig {
  mode: "paper" | "testnet" | "demo" | "live";
  symbol: string;
  timeframe: string;
  strategy: string;
  auto_scan_all?: boolean;
  scan_top_n?: number;
  min_volume_24h?: number;
  leverage: number;
  margin_type: string;
  position_size_usd: number;
  position_size_percent?: number | null;
  max_open_positions: number;
  take_profit_pct: number;
  stop_loss_pct: number;
  use_atr_tp_sl?: boolean;
  atr_multiplier_tp?: number;
  atr_multiplier_sl?: number;
  atr_min_sl_pct?: number;
  atr_max_sl_pct?: number;
  gemini_ai_enabled?: boolean;
  gemini_auto_regime?: boolean;
  gemini_model?: string;
  ai_auto_strategy_switch?: boolean;
  ai_auto_leverage?: boolean;
  ai_post_trade_learning?: boolean;
  partial_tp_enabled?: boolean;
  partial_tp_level1_pct?: number;
  break_even_enabled?: boolean;
  fee_hurdle_rate_pct?: number;
  funding_rate_guard_enabled?: boolean;
  max_funding_rate_pct?: number;
  macro_news_filter_enabled?: boolean;
  risk_sizing_enabled?: boolean;
  risk_per_trade_pct?: number;
  trend_filter_enabled?: boolean;
  trend_filter_timeframes?: '15m' | '1h' | '15m+1h';
  trailing_stop_enabled: boolean;
  trailing_stop_activation_pct: number;
  trailing_stop_callback_pct: number;
  daily_max_loss_usd: number;
  cooldown_seconds: number;
  rsi_period: number;
  rsi_oversold: number;
  rsi_overbought: number;
  ema_fast: number;
  ema_slow: number;
  ema_trend: number;
  bb_period: number;
  bb_std: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  entry_price: number;
  current_price: number;
  mark_price?: number;
  liquidation_price?: number;
  amount: number;
  notional: number;
  margin: number;
  leverage: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  take_profit_price?: number | null;
  stop_loss_price?: number | null;
  protection_status?: 'verified' | 'unverified';
  protection_error?: string | null;
  trailing_stop_price?: number | null;
  peak_price?: number;
  entry_time?: string | null;
  mode?: string;
}

export interface TradeRecord {
  id: number;
  symbol: string;
  side: "LONG" | "SHORT";
  entry_price: number;
  exit_price: number;
  amount: number;
  leverage: number;
  pnl: number;
  pnl_pct: number;
  fee: number;
  exit_reason: string;
  exit_reason_vn?: string;
  exit_type?: string;
  entry_reason?: string;
  entry_time: string;
  exit_time: string;
  duration_str?: string;
  mode: string;
  strategy: string;
  tp_price?: number;
  sl_price?: number;
  indicators?: Record<string, any>;
}

export interface BotStatus {
  is_running: boolean;
  mode: "paper" | "testnet" | "demo" | "live";
  symbol: string;
  timeframe: string;
  strategy: string;
  auto_scan_all?: boolean;
  scan_top_n?: number;
  leverage?: number;
  margin_type?: string;
  uptime_seconds: number;
  balance_usdt: number;
  available_margin: number;
  margin_used?: number;
  unrealized_pnl?: number;
  active_positions_count: number;
  total_trades_count: number;
  win_rate: number;
  total_realized_pnl: number;
  daily_pnl: number;
  daily_pnl_scope?: 'calendar_day' | 'testnet_session';
  daily_pnl_since_ms?: number | null;
  last_signal?: string | null;
  last_signal_time?: string | null;
  daily_loss_hit: boolean;
  ticker?: {
    symbol: string;
    price: number;
    bid: number;
    ask: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    change24h: number;
  };
}

export interface TradeStats {
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_pnl: number;
  total_fees: number;
  profit_factor: number;
  avg_trade_pnl: number;
  best_trade: number;
  worst_trade: number;
  daily_pnl: number;
}

export interface LogEntry {
  id?: number;
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARN" | "ERROR" | "SIGNAL" | "TRADE";
  category: string;
  message: string;
}

export interface KlinePoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema_fast?: number | null;
  ema_slow?: number | null;
  ema_trend?: number | null;
  rsi?: number | null;
  bb_upper?: number | null;
  bb_lower?: number | null;
}

export interface TelegramStatus {
  configured: boolean;
  source: 'database' | 'session' | 'environment' | 'none';
  chat_id?: string;
  masked_chat_id?: string;
  masked_token?: string;
  last_sent_at: string | null;
  last_error: string | null;
  queued: number;
}

export interface TelegramResult {
  success: boolean;
  message: string;
  status: TelegramStatus;
}

export interface GeminiRegimeState {
  regime: string;
  regime_vn: string;
  risk_level: string;
  risk_multiplier: number;
  recommended_strategy: string;
  recommended_leverage: number;
  pause_trading: boolean;
  rationale: string;
  confidence?: number;
  source?: string;
  model?: string;
  updated_at?: string;
}

export interface BacktestRequest {
  symbol: string;
  timeframe: string;
  strategy: 'trend_pullback' | 'bb_mean_reversion' | 'breakout';
  days: number;
  initial_balance: number;
  leverage: number;
  position_size_usd: number;
  take_profit_pct: number;
  stop_loss_pct: number;
  use_atr_tp_sl: boolean;
  partial_tp_enabled: boolean;
  break_even_enabled: boolean;
  fee_pct: number;
}

export interface BacktestTradeItem {
  id: number;
  entry_time: string;
  exit_time: string;
  side: string;
  entry_price: number;
  exit_price: number;
  amount: number;
  pnl_usd: number;
  pnl_pct: number;
  fee_usd: number;
  exit_reason: string;
  duration_minutes: number;
}

export interface BacktestEquityPoint {
  timestamp: string;
  time: number;
  equity: number;
  drawdown_pct: number;
}

export interface BacktestResult {
  symbol: string;
  timeframe: string;
  strategy: string;
  days: number;
  initial_balance: number;
  final_balance: number;
  total_net_pnl_usd: number;
  total_net_pnl_pct: number;
  total_trades: number;
  win_trades: number;
  loss_trades: number;
  win_rate: number;
  profit_factor: number;
  max_drawdown_usd: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  equity_curve: BacktestEquityPoint[];
  trades: BacktestTradeItem[];
}

export interface PinStatusResponse {
  enabled: boolean;
}

export interface PinVerifyRequest {
  pin: string;
}

export interface PinSetRequest {
  old_pin?: string;
  new_pin: string;
  enabled: boolean;
}


