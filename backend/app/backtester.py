"""
Visual Backtesting Simulator Engine for Binance Futures Scalper Pro.
Simulates trading strategies on historical Binance OHLCV data with realistic
leverage, fee deductions, Partial TP (Scale-Out), Break-Even stops, and equity curve generation.
"""
import math
from datetime import datetime
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

from .models import BacktestRequest, BacktestResult, BacktestTradeItem, BacktestEquityPoint
from .strategies import get_strategy
from .binance_client import BinanceFuturesClient


class Backtester:
    def __init__(self, client: Optional[BinanceFuturesClient] = None):
        self.client = client or BinanceFuturesClient()

    async def run(self, req: BacktestRequest) -> BacktestResult:
        # Determine number of candles needed
        tf_minutes = self._parse_timeframe_minutes(req.timeframe)
        bars_needed = min(1500, max(120, int((req.days * 24 * 60) / tf_minutes)))

        # Fetch historical klines
        df = self.client.fetch_ohlcv(symbol=req.symbol, timeframe=req.timeframe, limit=bars_needed)
        if df.empty or len(df) < 50:
            raise ValueError(f"Không đủ dữ liệu lịch sử nến cho {req.symbol} trên khung {req.timeframe}")

        # Initialize strategy & indicators
        config_dict = {
            "symbol": req.symbol,
            "timeframe": req.timeframe,
            "strategy": req.strategy,
            "take_profit_pct": req.take_profit_pct,
            "stop_loss_pct": req.stop_loss_pct,
            "rsi_period": 14,
            "rsi_oversold": 35.0,
            "rsi_overbought": 65.0,
            "ema_fast": 9,
            "ema_slow": 21,
            "ema_trend": 50,
            "bb_period": 20,
            "bb_std": 2.0,
            "min_signal_volume_ratio": 1.0,
        }
        strategy_obj = get_strategy(req.strategy, config_dict)
        df = strategy_obj.calculate_indicators(df)

        fee_rate = req.fee_pct / 100.0  # e.g., 0.05% = 0.0005
        current_balance = req.initial_balance
        peak_balance = current_balance
        max_drawdown_usd = 0.0
        max_drawdown_pct = 0.0

        equity_curve: List[BacktestEquityPoint] = []
        trades: List[BacktestTradeItem] = []

        # Record starting equity
        start_ts = int(df["timestamp"].iloc[0] / 1000)
        start_dt = str(df["timestamp_dt"].iloc[0])
        equity_curve.append(BacktestEquityPoint(
            timestamp=start_dt,
            time=start_ts,
            equity=round(current_balance, 2),
            drawdown_pct=0.0
        ))

        in_pos = False
        pos_side = ""
        entry_price = 0.0
        entry_time_str = ""
        entry_idx = 0
        pos_amount = 0.0
        pos_margin = 0.0
        tp_price = 0.0
        sl_price = 0.0
        tp1_price = 0.0
        tp1_hit = False
        break_even_active = False
        peak_trade_price = 0.0
        trade_id = 0

        # Simulate candle-by-candle starting from warmup period
        warmup = max(35, config_dict["ema_trend"])
        for i in range(warmup, len(df)):
            row = df.iloc[i]
            prev_rows = df.iloc[:i]

            high = float(row["high"])
            low = float(row["low"])
            close = float(row["close"])
            open_p = float(row["open"])
            candle_time_str = str(row["timestamp_dt"])
            candle_ts = int(row["timestamp"] / 1000)

            # 1. Manage Active Position
            if in_pos:
                peak_trade_price = max(peak_trade_price, high) if pos_side == "LONG" else min(peak_trade_price, low)
                exit_triggered = False
                exit_price = 0.0
                exit_reason = ""

                # Check Partial TP1
                if req.partial_tp_enabled and not tp1_hit:
                    if (pos_side == "LONG" and high >= tp1_price) or (pos_side == "SHORT" and low <= tp1_price):
                        tp1_hit = True
                        partial_ratio = 0.5
                        p_amount = pos_amount * partial_ratio
                        p_margin = pos_margin * partial_ratio
                        realized_price = tp1_price
                        raw_partial_pnl = (realized_price - entry_price) * p_amount if pos_side == "LONG" else (entry_price - realized_price) * p_amount
                        p_fee = (p_amount * entry_price * fee_rate) + (p_amount * realized_price * fee_rate)
                        net_partial = raw_partial_pnl - p_fee

                        current_balance += (p_margin + net_partial)
                        pos_amount -= p_amount
                        pos_margin -= p_margin

                        if req.break_even_enabled:
                            break_even_active = True
                            sl_price = entry_price * 1.0008 if pos_side == "LONG" else entry_price * 0.9992

                # Check Stop Loss
                if (pos_side == "LONG" and low <= sl_price) or (pos_side == "SHORT" and high >= sl_price):
                    exit_triggered = True
                    exit_price = sl_price
                    exit_reason = "BREAK_EVEN" if break_even_active else "STOP_LOSS"
                # Check Take Profit
                elif (pos_side == "LONG" and high >= tp_price) or (pos_side == "SHORT" and low <= tp_price):
                    exit_triggered = True
                    exit_price = tp_price
                    exit_reason = "TAKE_PROFIT"

                if exit_triggered:
                    trade_id += 1
                    raw_exit_pnl = (exit_price - entry_price) * pos_amount if pos_side == "LONG" else (entry_price - exit_price) * pos_amount
                    trade_exit_fee = (pos_amount * exit_price) * fee_rate
                    trade_entry_fee = (pos_amount * entry_price) * fee_rate
                    total_fee = trade_entry_fee + trade_exit_fee
                    net_trade_pnl = raw_exit_pnl - total_fee
                    pnl_pct = (net_trade_pnl / (pos_margin + 1e-9)) * 100.0

                    current_balance += (pos_margin + net_trade_pnl)
                    duration_bars = i - entry_idx
                    duration_min = duration_bars * tf_minutes

                    trades.append(BacktestTradeItem(
                        id=trade_id,
                        entry_time=entry_time_str,
                        exit_time=candle_time_str,
                        side=pos_side,
                        entry_price=round(entry_price, 4),
                        exit_price=round(exit_price, 4),
                        amount=round(pos_amount, 6),
                        pnl_usd=round(net_trade_pnl, 2),
                        pnl_pct=round(pnl_pct, 2),
                        fee_usd=round(total_fee, 2),
                        exit_reason=exit_reason,
                        duration_minutes=duration_min,
                    ))

                    in_pos = False

            # 2. Check for New Entry Signal if not in position
            if not in_pos:
                sig_res = strategy_obj.generate_signal(prev_rows)
                if isinstance(sig_res, (tuple, list)):
                    signal = sig_res[0]
                elif isinstance(sig_res, dict):
                    signal = sig_res.get("signal", "HOLD")
                else:
                    signal = str(sig_res)

                if signal in {"LONG", "SHORT"} and current_balance > 20:
                    in_pos = True
                    pos_side = signal
                    entry_price = open_p  # Execution on bar open
                    entry_time_str = candle_time_str
                    entry_idx = i
                    peak_trade_price = entry_price
                    tp1_hit = False
                    break_even_active = False

                    # Sizing
                    pos_margin = min(req.position_size_usd, current_balance * 0.95)
                    notional = pos_margin * req.leverage
                    pos_amount = notional / entry_price
                    current_balance -= pos_margin  # Margin locked

                    # Calculate TP/SL
                    atr_val = row.get("atr") if "atr" in row and not pd.isna(row["atr"]) else None
                    if req.use_atr_tp_sl and atr_val and atr_val > 0:
                        raw_sl = (1.5 * atr_val / entry_price) * 100.0
                        raw_tp = (2.5 * atr_val / entry_price) * 100.0
                        eff_sl = max(0.5, min(3.0, raw_sl))
                        eff_tp = max(eff_sl * 1.5, raw_tp)
                    else:
                        eff_sl = req.stop_loss_pct
                        eff_tp = req.take_profit_pct

                    if pos_side == "LONG":
                        tp_price = entry_price * (1 + eff_tp / 100.0)
                        sl_price = entry_price * (1 - eff_sl / 100.0)
                        tp1_price = entry_price + (tp_price - entry_price) * 0.5
                    else:
                        tp_price = entry_price * (1 - eff_tp / 100.0)
                        sl_price = entry_price * (1 + eff_sl / 100.0)
                        tp1_price = entry_price - (entry_price - tp_price) * 0.5

            # Calculate current total equity
            unrealized = 0.0
            if in_pos:
                unrealized = (close - entry_price) * pos_amount if pos_side == "LONG" else (entry_price - close) * pos_amount
            total_equity = current_balance + (pos_margin if in_pos else 0.0) + unrealized

            peak_balance = max(peak_balance, total_equity)
            dd_usd = peak_balance - total_equity
            dd_pct = (dd_usd / peak_balance) * 100.0 if peak_balance > 0 else 0.0
            max_drawdown_usd = max(max_drawdown_usd, dd_usd)
            max_drawdown_pct = max(max_drawdown_pct, dd_pct)

            # Sample equity curve every few bars or on trades to keep payload reasonable
            if i % max(1, len(df) // 100) == 0 or i == len(df) - 1:
                equity_curve.append(BacktestEquityPoint(
                    timestamp=candle_time_str,
                    time=candle_ts,
                    equity=round(total_equity, 2),
                    drawdown_pct=round(dd_pct, 2)
                ))

        # Performance Metrics
        total_trades = len(trades)
        wins = [t for t in trades if t.pnl_usd > 0]
        losses = [t for t in trades if t.pnl_usd <= 0]
        win_trades = len(wins)
        loss_trades = len(losses)
        win_rate = (win_trades / total_trades * 100.0) if total_trades > 0 else 0.0

        gross_profit = sum(t.pnl_usd for t in wins)
        gross_loss = abs(sum(t.pnl_usd for t in losses))
        profit_factor = round(gross_profit / (gross_loss + 1e-9), 2) if gross_loss > 0 else (99.0 if gross_profit > 0 else 1.0)

        final_balance = current_balance + (pos_margin if in_pos else 0.0)
        total_net_pnl_usd = round(final_balance - req.initial_balance, 2)
        total_net_pnl_pct = round((total_net_pnl_usd / req.initial_balance) * 100.0, 2)

        # Sharpe Ratio estimation
        returns = [t.pnl_pct for t in trades]
        if len(returns) > 2 and np.std(returns) > 0:
            sharpe = round(float(np.mean(returns) / np.std(returns) * np.sqrt(365 * 24 * 60 / tf_minutes)), 2)
        else:
            sharpe = 0.0

        return BacktestResult(
            symbol=req.symbol,
            timeframe=req.timeframe,
            strategy=req.strategy,
            days=req.days,
            initial_balance=req.initial_balance,
            final_balance=round(final_balance, 2),
            total_net_pnl_usd=total_net_pnl_usd,
            total_net_pnl_pct=total_net_pnl_pct,
            total_trades=total_trades,
            win_trades=win_trades,
            loss_trades=loss_trades,
            win_rate=round(win_rate, 2),
            profit_factor=profit_factor,
            max_drawdown_usd=round(max_drawdown_usd, 2),
            max_drawdown_pct=round(max_drawdown_pct, 2),
            sharpe_ratio=sharpe,
            equity_curve=equity_curve,
            trades=trades,
        )

    def _parse_timeframe_minutes(self, tf: str) -> int:
        unit = tf[-1]
        val = int(tf[:-1])
        if unit == "m": return val
        elif unit == "h": return val * 60
        elif unit == "d": return val * 1440
        return 15


backtester = Backtester()
