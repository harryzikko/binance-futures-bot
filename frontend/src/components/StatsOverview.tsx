import React from 'react';
import { BotStatus, TradeStats } from '../types';
import { Wallet, DollarSign, Target, Activity } from 'lucide-react';

interface StatsOverviewProps {
  status: BotStatus | null;
  stats: TradeStats | null;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ status, stats }) => {
  const balance = status?.balance_usdt ?? 0;
  const freeMargin = status?.available_margin ?? 0;
  const unrealizedPnl = status?.unrealized_pnl ?? 0;
  const totalPnl = stats?.total_pnl ?? status?.total_realized_pnl ?? 0;
  const dailyPnl = stats?.daily_pnl ?? status?.daily_pnl ?? 0;
  const winRate = stats?.win_rate ?? status?.win_rate ?? 0;
  const totalTrades = stats?.total_trades ?? status?.total_trades_count ?? 0;
  const wins = stats?.wins ?? 0;
  const losses = stats?.losses ?? 0;
  const profitFactor = stats?.profit_factor ?? 0;
  const activeCount = status?.active_positions_count ?? 0;
  const lastSignal = status?.last_signal;
  const lastSignalTime = status?.last_signal_time;

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Balance & Margin */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 shadow-lg relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Số Dư & Ký Quỹ</span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-black tracking-tight text-white font-mono">
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs font-bold text-slate-400">USDT</span>
        </div>
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60 text-slate-400">
          <span>Khả dụng: <strong className="text-slate-200 font-mono">${freeMargin.toFixed(2)}</strong></span>
          {unrealizedPnl !== 0 && (
            <span className={`font-semibold font-mono ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              uPnL: {unrealizedPnl >= 0 ? `+$${unrealizedPnl.toFixed(2)}` : `-$${Math.abs(unrealizedPnl).toFixed(2)}`}
            </span>
          )}
        </div>
      </div>

      {/* 2. Net PnL & Daily Profit */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 shadow-lg relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lợi Nhuận Ròng (PnL)</span>
          <div className={`p-2 rounded-xl ${totalPnl >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className={`text-2xl font-black tracking-tight font-mono ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalPnl >= 0 ? `+$${totalPnl.toFixed(2)}` : `-$${Math.abs(totalPnl).toFixed(2)}`}
          </span>
          <span className="text-xs text-slate-400 font-medium">Tích lũy</span>
        </div>
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60 text-slate-400">
          <span>Hôm nay:</span>
          <span className={`font-bold font-mono ${dailyPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {dailyPnl >= 0 ? `+$${dailyPnl.toFixed(2)}` : `-$${Math.abs(dailyPnl).toFixed(2)}`}
          </span>
        </div>
      </div>

      {/* 3. Win Rate & Trades */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 shadow-lg relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tỷ Lệ Thắng (Win Rate)</span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Target className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-black tracking-tight text-white font-mono">
            {winRate.toFixed(1)}%
          </span>
          <span className="text-xs text-slate-400">
            ({wins}W - {losses}L / {totalTrades} lệnh)
          </span>
        </div>
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60 text-slate-400">
          <span>Profit Factor:</span>
          <span className="font-bold font-mono text-slate-200">{profitFactor > 0 ? profitFactor.toFixed(2) : '--'}</span>
        </div>
      </div>

      {/* 4. Strategy & Signal Engine */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 shadow-lg relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trạng Thái Scalping</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-white capitalize">
            {status?.strategy?.replace('_', ' ') || 'Trend Pullback'}
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
            {status?.timeframe || '1m'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60 text-slate-400">
          <span>Vị thế mở: <strong className="text-white font-mono">{activeCount}</strong></span>
          {lastSignal ? (
            <span className="flex items-center gap-1 font-semibold">
              Tín hiệu: 
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${lastSignal === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {lastSignal}
              </span>
              <span className="text-[10px] text-slate-500">({lastSignalTime})</span>
            </span>
          ) : (
            <span>Uptime: <strong className="text-slate-300">{formatUptime(status?.uptime_seconds ?? 0)}</strong></span>
          )}
        </div>
      </div>
    </div>
  );
};
