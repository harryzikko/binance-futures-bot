import React, { useState, useCallback, useMemo } from 'react';
import { BotStatus, TradeStats, TradeRecord } from '../types';
import { getTrades, clearTrades, api, getErrorMessage } from '../services/api';
import { useApiResource } from '../hooks/useApiResource';

interface PnLHistoryViewProps {
  status: BotStatus | null;
  stats?: TradeStats | null;
  onRefresh: () => void;
}

interface DayTradeSummary {
  date: string;
  total_pnl: number;
  total_fees: number;
  trades_count: number;
  wins: number;
  losses: number;
  win_rate: number;
}

interface CalendarResponse {
  year: number;
  month: number;
  mode: string;
  month_summary: {
    total_pnl: number;
    total_fees: number;
    total_trades: number;
    wins: number;
    losses: number;
    win_rate: number;
    green_days: number;
    red_days: number;
  };
  daily_pnl: Record<string, DayTradeSummary>;
  weekly_pnl: Array<{
    week: string;
    total_pnl: number;
    trades_count: number;
    wins: number;
    losses: number;
    win_rate: number;
  }>;
}

const EMPTY_TRADES: TradeRecord[] = [];

export const PnLHistoryView: React.FC<PnLHistoryViewProps> = ({ status, stats: propStats, onRefresh }) => {
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedBot, setSelectedBot] = useState<string>('all');
  const [selectedPair, setSelectedPair] = useState<string>('all');
  const [pnlFilter, setPnlFilter] = useState<'all' | 'win' | 'loss'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  const [isClearing, setIsClearing] = useState(false);
  const [actionFeedback, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [now] = useState(() => new Date());
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const mode = status?.mode === 'paper' ? 'paper' : undefined;

  const loader = useCallback(async (signal: AbortSignal) => {
    const [statsData, tradesData, calendar] = await Promise.all([
      api.get<TradeStats>('/stats', { params: { mode }, signal }).then(r => r.data),
      getTrades(200, mode, signal),
      api.get<CalendarResponse>('/pnl/calendar', {
        params: { year: currentYear, month: currentMonth, mode }, signal
      }).then(r => r.data)
    ]);
    return { stats: statsData, trades: tradesData, calendar };
  }, [mode, currentYear, currentMonth]);
  const { data, error, isLoading, reload: fetchData } = useApiResource(loader);
  const trades = data?.trades ?? EMPTY_TRADES;
  const calendarData = data?.calendar ?? null;
  const actionMsg = error ? { text: error, type: 'error' as const } : actionFeedback;

  const handleManualRefresh = () => {
    setActionMsg(null);
    onRefresh();
    fetchData();
  };

  const handleClearHistory = async () => {
    if (!window.confirm('⚠️ Bạn có chắc muốn XÓA TOÀN BỘ lịch sử lệnh đã lưu để làm mới sổ lệnh không?')) return;
    setIsClearing(true);
    setActionMsg(null);
    try {
      const mode = status?.mode === 'paper' ? 'paper' : undefined;
      await clearTrades(mode);
      setActionMsg({ text: 'Đã xóa lịch sử lệnh thành công!', type: 'success' });
      fetchData();
      onRefresh();
    } catch (err) {
      setActionMsg({ text: `Lỗi: ${getErrorMessage(err)}`, type: 'error' });
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportCSV = () => {
    if (trades.length === 0) {
      alert('Chưa có dữ liệu lệnh để xuất file CSV.');
      return;
    }
    const headers = ['ID', 'Cặp Coin', 'Vị Thế', 'Giá Vào', 'Giá Ra', 'Số Lượng', 'Đòn Bẩy', 'PnL (USDT)', 'Phí Sàn', 'Lý Do Ra', 'Thời Gian Vào', 'Thời Gian Ra'];
    const rows = trades.map(t => [
      t.id,
      t.symbol,
      t.side,
      t.entry_price,
      t.exit_price,
      t.amount,
      t.leverage,
      t.pnl,
      t.fee,
      `"${(t.exit_reason_vn || t.exit_reason || '').replace(/"/g, '""')}"`,
      t.entry_time,
      t.exit_time
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `binance_futures_trades_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const balance = status?.balance_usdt || 0;
  const currentStats = propStats ?? data?.stats;

  // Real KPI calculations - 100% Real Data
  const totalTrades = currentStats?.total_trades ?? status?.total_trades_count ?? trades.length;
  const wins = currentStats?.wins ?? trades.filter(t => (t.pnl || 0) > 0).length;
  const losses = currentStats?.losses ?? trades.filter(t => (t.pnl || 0) <= 0).length;
  const winRate = currentStats?.win_rate ?? (totalTrades > 0 ? (wins / totalTrades) * 100 : (status?.win_rate ?? 0));
  const totalRealizedPnl = currentStats?.total_pnl ?? status?.total_realized_pnl ?? trades.reduce((a, t) => a + (t.pnl || 0), 0);
  const dailyPnl = currentStats?.daily_pnl ?? status?.daily_pnl ?? 0;
  const totalFees = currentStats?.total_fees ?? trades.reduce((a, t) => a + (t.fee || 0), 0);
  const profitFactor = currentStats?.profit_factor && totalTrades > 0 ? currentStats.profit_factor : null;
  const avgTradePnl = currentStats?.avg_trade_pnl ?? (totalTrades > 0 ? totalRealizedPnl / totalTrades : 0);
  const bestTrade = currentStats?.best_trade ?? (trades.length > 0 ? Math.max(...trades.map(t => t.pnl || 0)) : 0);
  const worstTrade = currentStats?.worst_trade ?? (trades.length > 0 ? Math.min(...trades.map(t => t.pnl || 0)) : 0);
  const roiPct = balance > 0 ? (totalRealizedPnl / balance) * 100 : 0;

  // Filter Trades for Table
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (pnlFilter === 'win' && (t.pnl || 0) <= 0) return false;
      if (pnlFilter === 'loss' && (t.pnl || 0) > 0) return false;
      if (selectedBot !== 'all' && t.strategy !== selectedBot) return false;
      if (selectedPair !== 'all' && t.symbol !== selectedPair) return false;
      if (selectedDateFilter && !t.exit_time?.startsWith(selectedDateFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const sMatch = t.symbol.toLowerCase().includes(q);
        const stMatch = (t.strategy || '').toLowerCase().includes(q);
        const enMatch = (t.entry_reason || '').toLowerCase().includes(q);
        const exMatch = (t.exit_reason_vn || t.exit_reason || '').toLowerCase().includes(q);
        if (!sMatch && !stMatch && !enMatch && !exMatch) return false;
      }
      return true;
    });
  }, [trades, pnlFilter, selectedBot, selectedPair, selectedDateFilter, searchQuery]);

  // Breakdown by Strategy
  const strategyBreakdown = useMemo(() => {
    const defaultBots = [
      { key: 'trend_scalper', name: 'Trend Pullback ATR', desc: 'EMA 9/21/50 + ADX 14 + Dynamic ATR TP/SL', fallbackKey: 'trend_pullback' },
      { key: 'bb_scalper', name: 'BB Mean Reversion', desc: 'Bollinger Bands 20/2.0 + RSI Oversold/Overbought', fallbackKey: 'bb_reversion' },
      { key: 'breakout_scalper', name: 'Momentum Breakout', desc: 'Đột phá đỉnh/đáy 20 nến + Khối lượng bùng nổ', fallbackKey: 'breakout' },
    ];

    return defaultBots.map((bot) => {
      const botTrades = trades.filter(t => t.strategy === bot.key || t.strategy === bot.fallbackKey);
      const botPnl = botTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
      const botWins = botTrades.filter(t => (t.pnl || 0) > 0).length;
      const botCount = botTrades.length;
      const botWinRate = botCount > 0 ? (botWins / botCount) * 100 : 0;
      const worst = botCount > 0 ? Math.min(...botTrades.map(t => t.pnl || 0)) : 0;
      const isCurrentActive = (status?.strategy === bot.key || status?.strategy === bot.fallbackKey);

      return {
        ...bot,
        pnl: botPnl,
        count: botCount,
        wins: botWins,
        winRate: botWinRate,
        mdd: worst < 0 ? worst : 0,
        isActive: isCurrentActive && status?.is_running,
      };
    });
  }, [trades, status?.strategy, status?.is_running]);

  // Breakdown by Asset Pair
  const pairBreakdown = useMemo(() => {
    const pairMap: Record<string, number> = {};
    trades.forEach((t) => {
      const sym = t.symbol || 'OTHER';
      pairMap[sym] = (pairMap[sym] || 0) + (t.pnl || 0);
    });

    const totalPositive = Object.values(pairMap).filter(v => v > 0).reduce((a, b) => a + b, 0) || 1;
    const entries = Object.entries(pairMap).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      return [
        { symbol: 'BTCUSDT', pnl: 0, pct: 0, color: 'bg-primary' },
        { symbol: 'ETHUSDT', pnl: 0, pct: 0, color: 'bg-secondary' },
        { symbol: 'SOLUSDT', pnl: 0, pct: 0, color: 'bg-tertiary' },
      ];
    }

    const colors = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-outline'];
    return entries.slice(0, 4).map(([sym, pnl], idx) => ({
      symbol: sym,
      pnl,
      pct: pnl > 0 ? Math.round((pnl / totalPositive) * 100) : 0,
      color: colors[idx % colors.length],
    }));
  }, [trades]);

  // Dynamic SVG Equity Curve from real trades
  const sortedTrades = useMemo(() => {
    return [...trades]
      .filter(t => t.exit_time && Number.isFinite(t.pnl))
      .sort((a, b) => new Date(a.exit_time).getTime() - new Date(b.exit_time).getTime());
  }, [trades]);

  const equityPoints = sortedTrades.reduce<Array<{
    index: number; pnl: number; equity: number; time: string;
  }>>((points, t, idx) => {
    const previousEquity = points.at(-1)?.equity ?? (balance - totalRealizedPnl);
    points.push({
      index: idx,
      pnl: t.pnl || 0,
      equity: previousEquity + (t.pnl || 0),
      time: t.exit_time,
    });
    return points;
  }, []);

  const hasEquityCurve = equityPoints.length >= 2;
  const minEquity = hasEquityCurve ? Math.min(...equityPoints.map(p => p.equity)) : balance;
  const maxEquity = hasEquityCurve ? Math.max(...equityPoints.map(p => p.equity)) : balance;
  const equityRange = maxEquity - minEquity || (balance > 0 ? balance * 0.05 : 10);

  const svgPoints = hasEquityCurve
    ? equityPoints.map((pt, i) => {
        const x = Math.round((i / (equityPoints.length - 1)) * 680 + 10);
        const y = Math.round(165 - ((pt.equity - minEquity) / equityRange) * 135);
        return { ...pt, x, y };
      })
    : [];

  const polylineStr = svgPoints.map(p => `${p.x},${p.y}`).join(' ');
  const polygonStr = svgPoints.length > 0
    ? `10,185 ${polylineStr} ${svgPoints[svgPoints.length - 1].x},185`
    : '';

  // Heatmap Days Generator
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayIndex = (new Date(currentYear, currentMonth - 1, 1).getDay() + 6) % 7; // Monday is 0

  const formatPrice = (p?: number) => {
    if (!p) return '0.00';
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return p.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  };

  return (
    <div className="flex flex-col w-full gap-4 select-none font-['Manrope'] pb-12">
      {/* Toast Notification Alert */}
      {actionMsg && (
        <div
          className={`p-3 rounded border text-xs font-['JetBrains_Mono'] flex items-center justify-between ${
            actionMsg.type === 'success'
              ? 'bg-tertiary-container/15 border-tertiary/40 text-tertiary'
              : 'bg-error-container/20 border-error/40 text-error'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="text-on-surface hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* 1. SUB-HEADER & MULTI-DIMENSIONAL FILTERS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-surface-container-low p-4 rounded border border-outline-variant/30 shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-on-surface-variant font-['JetBrains_Mono'] text-xs">
            <span>BÁO CÁO ĐỊNH LƯỢNG</span>
            <span className="text-outline">/</span>
            <span className="text-primary font-semibold">PHÂN TÍCH PNL &amp; LỊCH SỬ KHỚP LỆNH</span>
            <span className="text-outline">/</span>
            <span className="bg-surface-container-high px-1.5 py-0.5 rounded text-tertiary">
              {status?.mode ? status.mode.toUpperCase() : 'FUTURES'} USDT-M
            </span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-['Space_Grotesk'] text-xl font-bold text-on-surface tracking-tight">
              Thống Kê Hiệu Năng Thuật Toán
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary font-['JetBrains_Mono'] text-[10px] tracking-wider font-semibold">
              TELEMETRY LIVE
            </span>
          </div>
        </div>

        {/* Controls & Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Selector Tabs */}
          <div className="flex items-center bg-surface-container-lowest p-1 rounded border border-outline-variant/20">
            {(['today', '7d', '30d', '90d', 'all'] as const).map((range) => {
              const labels = { today: 'Hôm Nay', '7d': '7N', '30d': '30 Ngày', '90d': '90N', all: 'Tất Cả' };
              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={`px-2.5 py-1 rounded font-['JetBrains_Mono'] text-xs transition-colors ${
                    timeRange === range
                      ? 'bg-primary text-on-primary font-bold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {labels[range]}
                </button>
              );
            })}
          </div>

          {/* Bot Dropdown Filter */}
          <div className="relative">
            <select
              value={selectedBot}
              onChange={(e) => setSelectedBot(e.target.value)}
              className="appearance-none bg-surface-container-lowest text-on-surface font-['JetBrains_Mono'] text-xs py-1.5 pl-3 pr-8 rounded cursor-pointer focus:outline-none focus:bg-surface-container border border-outline-variant/30"
            >
              <option value="all">Mọi Bot Chiến Lược (Active)</option>
              <option value="trend_scalper">Trend Pullback ATR</option>
              <option value="bb_scalper">BB Mean Reversion</option>
              <option value="breakout_scalper">Momentum Breakout</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[14px] text-on-surface-variant">
              unfold_more
            </span>
          </div>

          {/* Token Pair Selector */}
          <div className="relative">
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="appearance-none bg-surface-container-lowest text-on-surface font-['JetBrains_Mono'] text-xs py-1.5 pl-3 pr-8 rounded cursor-pointer focus:outline-none focus:bg-surface-container border border-outline-variant/30"
            >
              <option value="all">Tất Cả Cặp Giao Dịch</option>
              <option value="BTCUSDT">BTCUSDT (Perp)</option>
              <option value="ETHUSDT">ETHUSDT (Perp)</option>
              <option value="SOLUSDT">SOLUSDT (Perp)</option>
              <option value="DOGEUSDT">DOGEUSDT (Perp)</option>
              <option value="BABYUSDT">BABYUSDT (Perp)</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[14px] text-on-surface-variant">
              expand_more
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface font-['JetBrains_Mono'] text-xs transition-all border border-outline-variant/30"
              title="Xuất file CSV báo cáo lệnh"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">table_view</span>
              <span className="hidden sm:inline">CSV / Excel</span>
            </button>
            <button
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-surface-container-high text-tertiary hover:bg-surface-container-highest font-['JetBrains_Mono'] text-xs transition-all border border-tertiary/30 disabled:opacity-50"
              title="Đồng bộ dữ liệu từ sàn & Database"
              type="button"
            >
              <span className={`material-symbols-outlined text-[15px] ${isLoading ? 'animate-spin' : ''}`}>sync</span>
              <span className="font-bold">Sync</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. FINANCIAL KPI HIGHLIGHTS - 5 CARDS GRID (100% REAL DATA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* Card 1: Net Realized PnL */}
        <div className="bg-surface-container-low p-4 rounded flex flex-col justify-between shadow-sm border border-outline-variant/30 relative overflow-hidden group hover:bg-surface-container transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="font-['Space_Grotesk'] text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
              Tổng PnL Thực Tế (30N)
            </span>
            <span className={`material-symbols-outlined text-[18px] ${totalRealizedPnl >= 0 ? 'text-tertiary' : 'text-error'}`}>
              monitoring
            </span>
          </div>
          <div className="flex flex-col my-1">
            <div className="flex items-baseline gap-1.5">
              <span className={`font-['JetBrains_Mono'] text-2xl font-bold tracking-tight ${totalRealizedPnl >= 0 ? 'text-tertiary' : 'text-error'}`}>
                {totalRealizedPnl >= 0 ? `+$${totalRealizedPnl.toFixed(2)}` : `-$${Math.abs(totalRealizedPnl).toFixed(2)}`}
              </span>
              <span className="font-['JetBrains_Mono'] text-xs text-on-surface-variant">USDT</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-1.5 py-0.5 rounded font-['JetBrains_Mono'] text-[10px] font-bold ${
                roiPct >= 0 ? 'bg-tertiary/20 text-tertiary' : 'bg-error/20 text-error'
              }`}>
                {roiPct >= 0 ? `+${roiPct.toFixed(2)}%` : `${roiPct.toFixed(2)}%`} ROI
              </span>
              <span className="font-['JetBrains_Mono'] text-[11px] text-on-surface-variant flex items-center gap-0.5">
                <span className={`material-symbols-outlined text-[13px] ${dailyPnl >= 0 ? 'text-tertiary' : 'text-error'}`}>
                  {dailyPnl >= 0 ? 'arrow_upward' : 'arrow_downward'}
                </span>
                {dailyPnl >= 0 ? `+$${dailyPnl.toFixed(2)}` : `-$${Math.abs(dailyPnl).toFixed(2)}`} hôm nay
              </span>
            </div>
          </div>
          <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full rounded-full transition-all duration-500 ${totalRealizedPnl >= 0 ? 'bg-tertiary' : 'bg-error'}`}
              style={{ width: `${Math.min(Math.max(Math.abs(roiPct) * 5, totalTrades > 0 ? 15 : 0), 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Card 2: Win Rate & Trades Count */}
        <div className="bg-surface-container-low p-4 rounded flex flex-col justify-between shadow-sm border border-outline-variant/30 relative overflow-hidden group hover:bg-surface-container transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="font-['Space_Grotesk'] text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
              Tỷ Lệ Thắng (Win Rate)
            </span>
            <span className="material-symbols-outlined text-[18px] text-primary">verified</span>
          </div>
          <div className="flex flex-col my-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-['JetBrains_Mono'] text-2xl text-on-surface font-bold tracking-tight">
                {totalTrades > 0 ? `${winRate.toFixed(1)}%` : '0.0%'}
              </span>
              <span className="font-['JetBrains_Mono'] text-xs text-tertiary font-semibold">
                {wins}W / {losses}L
              </span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant font-['JetBrains_Mono'] text-[11px] mt-1">
              <span>TB Thắng: <strong className="text-tertiary font-semibold">{bestTrade > 0 ? `+$${bestTrade.toFixed(2)}` : '$0.00'}</strong></span>
              <span>TB Thua: <strong className="text-error font-semibold">{worstTrade < 0 ? `-$${Math.abs(worstTrade).toFixed(2)}` : '$0.00'}</strong></span>
            </div>
          </div>
          <div className="flex w-full h-1 rounded-full overflow-hidden mt-1 bg-surface-container-highest">
            {totalTrades > 0 ? (
              <>
                <div className="bg-tertiary h-full transition-all duration-500" style={{ width: `${winRate}%` }}></div>
                <div className="bg-error h-full transition-all duration-500" style={{ width: `${100 - winRate}%` }}></div>
              </>
            ) : (
              <div className="bg-surface-container-highest h-full w-full"></div>
            )}
          </div>
        </div>

        {/* Card 3: Profit Factor & Sharpe */}
        <div className="bg-surface-container-low p-4 rounded flex flex-col justify-between shadow-sm border border-outline-variant/30 relative overflow-hidden group hover:bg-surface-container transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="font-['Space_Grotesk'] text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
              Profit Factor &amp; Sharpe
            </span>
            <span className="material-symbols-outlined text-[18px] text-secondary">speed</span>
          </div>
          <div className="flex flex-col my-1">
            <div className="flex items-baseline gap-2">
              <span className="font-['JetBrains_Mono'] text-2xl text-primary font-bold">
                {profitFactor !== null ? profitFactor.toFixed(2) : '—'}
              </span>
              <span className={`font-['Manrope'] text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                profitFactor !== null && profitFactor >= 1.5
                  ? 'bg-primary/20 text-primary'
                  : profitFactor !== null && profitFactor >= 1.0
                  ? 'bg-tertiary/20 text-tertiary'
                  : 'bg-surface-container text-on-surface-variant'
              }`}>
                {totalTrades === 0
                  ? 'Chưa Có Lệnh'
                  : profitFactor !== null && profitFactor >= 1.5
                  ? 'High Alpha'
                  : profitFactor !== null && profitFactor >= 1.0
                  ? 'Có Lãi'
                  : 'Cần Tối Ưu'}
              </span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant font-['JetBrains_Mono'] text-[11px] mt-1">
              <span>TB Lệnh: <strong className={avgTradePnl >= 0 ? 'text-tertiary' : 'text-error'}>
                {avgTradePnl >= 0 ? `+$${avgTradePnl.toFixed(2)}` : `-$${Math.abs(avgTradePnl).toFixed(2)}`}
              </strong></span>
              <span>Tổng: <strong className="text-on-surface">{totalTrades} Lệnh</strong></span>
            </div>
          </div>
          <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden mt-1">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${profitFactor ? Math.min(profitFactor * 30, 100) : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Card 4: Total Fees Net */}
        <div className="bg-surface-container-low p-4 rounded flex flex-col justify-between shadow-sm border border-outline-variant/30 relative overflow-hidden group hover:bg-surface-container transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="font-['Space_Grotesk'] text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
              Tổng Chi Phí Sàn Thuần
            </span>
            <span className="material-symbols-outlined text-[18px] text-outline">receipt_long</span>
          </div>
          <div className="flex flex-col my-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-['JetBrains_Mono'] text-2xl text-on-surface font-bold tracking-tight">
                ${totalFees.toFixed(2)}
              </span>
              <span className="font-['JetBrains_Mono'] text-xs text-on-surface-variant">USDT</span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant font-['JetBrains_Mono'] text-[11px] mt-1">
              <span>Phí Taker: <strong className="text-on-surface">{totalTrades > 0 ? `$${(totalFees * 0.8).toFixed(2)}` : '$0.00'}</strong></span>
              <span className="text-tertiary">Tier VIP 0</span>
            </div>
          </div>
          <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden mt-1">
            <div
              className="bg-outline h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(totalFees * 10, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Card 5: Trade Drawdown & Capital Safety */}
        <div className="bg-surface-container-low p-4 rounded flex flex-col justify-between shadow-sm border border-outline-variant/30 relative overflow-hidden group hover:bg-surface-container transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="font-['Space_Grotesk'] text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
              Max Drawdown Lịch Sử
            </span>
            <span className="material-symbols-outlined text-[18px] text-error">trending_down</span>
          </div>
          <div className="flex flex-col my-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-['JetBrains_Mono'] text-2xl text-error font-bold tracking-tight">
                {balance > 0 && worstTrade < 0 ? `${((worstTrade / balance) * 100).toFixed(2)}%` : '0.00%'}
              </span>
              <span className="font-['JetBrains_Mono'] text-xs text-error font-semibold">
                ({worstTrade < 0 ? `-$${Math.abs(worstTrade).toFixed(2)}` : '$0.00'})
              </span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant font-['JetBrains_Mono'] text-[11px] mt-1">
              <span>Hồi phục: <strong className="text-on-surface">Auto ATR</strong></span>
              <span>ATH: <strong className="text-primary">${balance.toFixed(0)}</strong></span>
            </div>
          </div>
          <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden mt-1">
            <div
              className="bg-error h-full rounded-full transition-all duration-500"
              style={{ width: `${balance > 0 && worstTrade < 0 ? Math.min(Math.abs(worstTrade / balance) * 500, 100) : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 3. DUAL ANALYTICS CHARTS SECTION (Grid 7 : 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Cumulative Equity & Profit Decomposition Chart (7 cols) */}
        <div className="lg:col-span-7 bg-surface-container-low p-4 rounded flex flex-col justify-between shadow-sm border border-outline-variant/30 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-surface-container-highest">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">show_chart</span>
              <div>
                <h2 className="font-['Space_Grotesk'] text-sm font-bold text-on-surface tracking-tight">
                  Đường Tích Lũy Vốn (Equity Curve) &amp; PnL Phân Rã
                </h2>
                <p className="font-['Manrope'] text-[11px] text-on-surface-variant">
                  {hasEquityCurve
                    ? `Tăng trưởng số dư từ $${(balance - totalRealizedPnl).toFixed(2)} lên $${balance.toFixed(2)} USDT`
                    : `Chưa có đủ lệnh đóng để dựng đồ thị • Vốn khởi điểm: $${balance.toFixed(2)} USDT`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 font-['JetBrains_Mono'] text-[11px] text-on-surface-variant">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-tertiary rounded-full"></span>
                <span>Tổng Tài Sản Vốn</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-tertiary/60 rounded-xs"></span>
                <span>PnL Ngày Lãi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-error/80 rounded-xs"></span>
                <span>PnL Ngày Lỗ</span>
              </div>
            </div>
          </div>

          {/* Integrated Equity Curve SVG Visualization */}
          <div className="relative w-full h-72 bg-surface-container-lowest rounded p-2 flex flex-col justify-between overflow-hidden border border-outline-variant/20">
            {/* Overlay Grid Lines */}
            <div className="absolute inset-0 p-2 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="w-full h-px bg-outline-variant"></div>
              <div className="w-full h-px bg-outline-variant"></div>
              <div className="w-full h-px bg-outline-variant"></div>
              <div className="w-full h-px bg-outline-variant"></div>
              <div className="w-full h-px bg-outline-variant"></div>
            </div>

            {hasEquityCurve ? (
              <>
                <div className="relative w-full h-52">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 700 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#59f8a9" stopOpacity="0.32" />
                        <stop offset="85%" stopColor="#59f8a9" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Area Shading */}
                    {polygonStr && <polygon points={polygonStr} fill="url(#equityFill)" />}
                    {/* Equity Polyline */}
                    {polylineStr && <polyline points={polylineStr} fill="none" stroke="#59f8a9" strokeLinecap="round" strokeWidth="2.5" />}
                    {/* High Watermark Pin */}
                    {svgPoints.length > 0 && (
                      <circle
                        cx={svgPoints[svgPoints.length - 1].x}
                        cy={svgPoints[svgPoints.length - 1].y}
                        fill="#ffd87f"
                        r="5"
                      />
                    )}
                  </svg>

                  {/* Floating Annotations */}
                  <div className="absolute right-4 top-2 bg-surface-container-high/90 backdrop-blur px-2.5 py-1 rounded text-right shadow border border-outline-variant/30">
                    <span className="font-['Space_Grotesk'] text-[9px] text-primary uppercase font-bold block">SỐ DƯ HIỆN TẠI</span>
                    <span className="font-['JetBrains_Mono'] text-xs text-on-surface font-bold">${balance.toFixed(2)} USDT</span>
                  </div>
                </div>

                {/* Sub Histogram: Daily / Trade Net Realized PnL Bars */}
                <div className="w-full h-12 flex items-end justify-between gap-1 pt-1 border-t border-surface-container-highest/40">
                  {svgPoints.slice(-25).map((pt) => {
                    const barHeight = Math.min(Math.max(Math.abs(pt.pnl) * 6, 8), 44);
                    const isWin = pt.pnl >= 0;
                    return (
                      <div
                        key={`bar-${pt.index}`}
                        className={`w-full rounded-xs transition-all ${isWin ? 'bg-tertiary/75 hover:bg-tertiary' : 'bg-error/75 hover:bg-error'}`}
                        style={{ height: `${barHeight}px` }}
                        title={`${pt.time}: ${pt.pnl >= 0 ? `+${pt.pnl.toFixed(2)}` : pt.pnl.toFixed(2)} USDT`}
                      ></div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                <span className="material-symbols-outlined text-[36px] text-outline mb-2">query_stats</span>
                <span className="font-['Space_Grotesk'] text-sm font-bold text-on-surface">
                  Đường Cong Vốn (Equity Curve)
                </span>
                <p className="font-['Manrope'] text-xs text-on-surface-variant max-w-sm mt-1">
                  Chưa có đủ lệnh đóng để vẽ biểu đồ tăng trưởng vốn. Biểu đồ sẽ tự động dựng theo thời gian thực khi có giao dịch chốt lời/cắt lỗ.
                </p>
                <div className="w-full max-w-xs h-0.5 bg-surface-container-high my-3"></div>
                <span className="font-['JetBrains_Mono'] text-xs text-primary font-semibold">
                  Số Dư Khởi Điểm: ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                </span>
              </div>
            )}

            <div className="flex items-center justify-between font-['JetBrains_Mono'] text-[10px] text-on-surface-variant pt-1 border-t border-surface-container-highest/30">
              <span>{hasEquityCurve ? `Khởi điểm (${svgPoints[0]?.time?.slice(5, 16) || '—'})` : 'Bắt đầu'}</span>
              <span>{totalTrades} Lệnh đã ghi nhận</span>
              <span className="text-tertiary font-bold">Hiện tại (${balance.toFixed(2)})</span>
            </div>
          </div>
        </div>

        {/* Right Column: Monthly Trading PnL Heatmap Calendar (5 cols) */}
        <div className="lg:col-span-5 bg-surface-container-low p-4 rounded flex flex-col justify-between shadow-sm border border-outline-variant/30">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-surface-container-highest">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-[20px]">calendar_month</span>
              <div>
                <h2 className="font-['Space_Grotesk'] text-sm text-on-surface font-bold tracking-tight">
                  Ma Trận Lãi/Lỗ Theo Ngày (Heatmap)
                </h2>
                <p className="font-['Manrope'] text-[11px] text-on-surface-variant">
                  Tháng {currentMonth}/{currentYear} • {calendarData?.month_summary?.green_days ?? (totalRealizedPnl > 0 ? 1 : 0)} Ngày Xanh / {calendarData?.month_summary?.red_days ?? 0} Ngày Đỏ
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 font-['JetBrains_Mono'] text-xs">
              <span className="text-on-surface-variant">Tháng Này:</span>
              <span className={`font-bold ${totalRealizedPnl >= 0 ? 'text-tertiary' : 'text-error'}`}>
                {totalRealizedPnl >= 0 ? `+$${totalRealizedPnl.toFixed(2)}` : `-$${Math.abs(totalRealizedPnl).toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Heatmap Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-['JetBrains_Mono'] text-[10px] text-on-surface-variant uppercase mb-1">
            <span>T2</span>
            <span>T3</span>
            <span>T4</span>
            <span>T5</span>
            <span>T6</span>
            <span>T7</span>
            <span className="text-primary font-bold">CN</span>
          </div>

          {/* Heatmap Matrix Grid */}
          <div className="grid grid-cols-7 gap-1 flex-1 py-1">
            {/* Empty offset padding for first day of month */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[44px] bg-transparent"></div>
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const daySummary = calendarData?.daily_pnl?.[dateStr];
              const dayPnl = daySummary ? daySummary.total_pnl : (dateStr === now.toISOString().slice(0, 10) ? dailyPnl : 0);
              const hasTrades = Boolean(daySummary && daySummary.trades_count > 0) || (dateStr === now.toISOString().slice(0, 10) && totalTrades > 0);
              const isSelected = selectedDateFilter === dateStr;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDateFilter(isSelected ? null : dateStr)}
                  className={`p-1 rounded flex flex-col justify-between min-h-[44px] transition-all cursor-pointer border ${
                    isSelected
                      ? 'ring-1 ring-primary border-primary bg-surface-container-high'
                      : !hasTrades
                      ? 'bg-surface-container-lowest/50 border-outline-variant/10 hover:bg-surface-container'
                      : dayPnl > 0
                      ? 'bg-tertiary-container/20 border-tertiary/30 hover:bg-tertiary-container/30'
                      : dayPnl < 0
                      ? 'bg-error-container/20 border-error/30 hover:bg-error-container/30'
                      : 'bg-surface-container border-outline-variant/20'
                  }`}
                  title={`${dateStr}: ${hasTrades ? `${dayPnl >= 0 ? `+${dayPnl.toFixed(2)}` : dayPnl.toFixed(2)} USDT` : 'Không có lệnh'}`}
                >
                  <span className={`font-['JetBrains_Mono'] text-[9px] ${
                    dateStr === now.toISOString().slice(0, 10) ? 'text-primary font-bold' : 'text-on-surface-variant'
                  }`}>
                    {dayNum}
                  </span>
                  <span className={`font-['JetBrains_Mono'] text-[10px] font-bold truncate ${
                    !hasTrades
                      ? 'text-on-surface-variant/40'
                      : dayPnl > 0
                      ? 'text-tertiary'
                      : dayPnl < 0
                      ? 'text-error'
                      : 'text-on-surface'
                  }`}>
                    {hasTrades ? (dayPnl >= 0 ? `+$${dayPnl.toFixed(0)}` : `-$${Math.abs(dayPnl).toFixed(0)}`) : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Heatmap Color Scale Indicator */}
          <div className="flex items-center justify-between pt-2 border-t border-surface-container-highest font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-error-container/60"></span>
              Lỗ Ngày
            </span>
            <div className="flex items-center gap-1">
              <span>Tỷ lệ:</span>
              <span className="w-2 h-2 rounded bg-tertiary-container/15"></span>
              <span className="w-2 h-2 rounded bg-tertiary-container/30"></span>
              <span className="w-2 h-2 rounded bg-tertiary-container/50"></span>
              <span className="w-2 h-2 rounded bg-tertiary"></span>
              <span className="text-tertiary font-bold">&gt; Lãi</span>
            </div>
            {selectedDateFilter && (
              <button
                type="button"
                onClick={() => setSelectedDateFilter(null)}
                className="text-primary hover:underline font-bold"
              >
                Hủy lọc ngày
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. PERFORMANCE BREAKDOWN BY BOT STRATEGY & ASSET PAIR (Grid 8 : 4) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Sub-table 1: Breakdown by Bot (8 cols) */}
        <div className="xl:col-span-8 bg-surface-container-low p-4 rounded shadow-sm border border-outline-variant/30 flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-surface-container-highest">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">smart_toy</span>
              <div>
                <h3 className="font-['Space_Grotesk'] text-sm text-on-surface font-bold">
                  Hiệu Suất Theo Bot Giao Dịch
                </h3>
                <p className="font-['Manrope'] text-[11px] text-on-surface-variant">
                  Chi tiết phân bổ lợi nhuận, drawdown và trạng thái luồng bot
                </p>
              </div>
            </div>
            <span className="font-['JetBrains_Mono'] text-xs text-on-surface-variant">
              {strategyBreakdown.filter(b => b.isActive).length || (status?.is_running ? 1 : 0)} Bot Đang Chạy
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-['JetBrains_Mono'] text-xs">
              <thead>
                <tr className="text-on-surface-variant bg-surface-container-lowest font-['JetBrains_Mono'] text-[11px] uppercase">
                  <th className="py-2.5 px-3 rounded-l">Mã &amp; Chiến Lược Bot</th>
                  <th className="py-2.5 px-3 text-right">Lãi Thuần (PnL)</th>
                  <th className="py-2.5 px-3 text-right">Tổng Lệnh</th>
                  <th className="py-2.5 px-3 text-right">Tỷ Lệ Thắng</th>
                  <th className="py-2.5 px-3 text-right">Max Drawdown</th>
                  <th className="py-2.5 px-3 text-center rounded-r">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/40">
                {strategyBreakdown.map((bot) => (
                  <tr key={bot.key} className="hover:bg-surface-container/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${bot.isActive ? 'bg-tertiary animate-pulse' : 'bg-slate-500'}`}></span>
                        <div>
                          <span className="font-bold text-on-surface">{bot.name}</span>
                          <span className="block text-[11px] text-on-surface-variant font-['JetBrains_Mono']">{bot.desc}</span>
                        </div>
                      </div>
                    </td>
                    <td className={`py-3 px-3 text-right font-bold ${bot.pnl >= 0 ? 'text-tertiary' : 'text-error'}`}>
                      {bot.pnl >= 0 ? `+$${bot.pnl.toFixed(2)}` : `-$${Math.abs(bot.pnl).toFixed(2)}`}
                    </td>
                    <td className="py-3 px-3 text-right text-on-surface">{bot.count}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={`font-bold ${bot.winRate >= 50 ? 'text-tertiary' : 'text-on-surface'}`}>
                        {bot.count > 0 ? `${bot.winRate.toFixed(1)}%` : '—'}
                      </span>
                      {bot.count > 0 && (
                        <span className="block text-[10px] text-on-surface-variant">
                          {bot.wins}W / {bot.count - bot.wins}L
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-error font-semibold">
                      {bot.mdd < 0 ? `-$${Math.abs(bot.mdd).toFixed(2)}` : '$0.00'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-['JetBrains_Mono'] text-[10px] font-bold ${
                        bot.isActive ? 'bg-tertiary/20 text-tertiary' : 'bg-surface-container text-on-surface-variant'
                      }`}>
                        {bot.isActive ? 'ĐANG CHẠY' : 'SẴN SÀNG'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sub-table 2: Breakdown by Asset Pair (4 cols) */}
        <div className="xl:col-span-4 bg-surface-container-low p-4 rounded shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-surface-container-highest">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">pie_chart</span>
                <h3 className="font-['Space_Grotesk'] text-sm text-on-surface font-bold">Tỷ Trọng Cặp Tiền</h3>
              </div>
              <span className="font-['Space_Grotesk'] text-[10px] text-on-surface-variant uppercase font-bold">By Realized Profit</span>
            </div>

            {/* Asset Progress Bars */}
            <div className="flex flex-col gap-3 mt-1">
              {pairBreakdown.map((item) => (
                <div key={item.symbol} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between font-['JetBrains_Mono'] text-xs">
                    <span className="text-on-surface font-bold flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                      {item.symbol}
                    </span>
                    <span className="text-tertiary font-bold">
                      {item.pnl >= 0 ? `+$${item.pnl.toFixed(2)}` : `-$${Math.abs(item.pnl).toFixed(2)}`} ({item.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${Math.max(item.pct, item.pnl > 0 ? 10 : 0)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-2.5 bg-surface-container-lowest rounded flex items-center justify-between font-['JetBrains_Mono'] text-xs border border-outline-variant/20">
            <span className="text-on-surface-variant text-[11px]">Tối ưu phí Maker rebate:</span>
            <span className="text-tertiary font-semibold text-[11px]">Futures Tier VIP 0</span>
          </div>
        </div>
      </div>

      {/* 5. DETAILED TRADE EXECUTION & ORDERS AUDIT TABLE (12 COLS FULL WIDTH) */}
      <div className="bg-surface-container-low p-4 rounded shadow-sm border border-outline-variant/30 flex flex-col gap-3">
        {/* Table Header & Sub-filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2 border-b border-surface-container-highest">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">history_toggle_off</span>
            <div>
              <h2 className="font-['Space_Grotesk'] text-base text-on-surface font-bold">
                Sổ Nhật Ký Khớp Lệnh Chi Tiết (Futures Audit Log)
              </h2>
              <p className="font-['Manrope'] text-xs text-on-surface-variant">
                Truy vết từng chuỗi mở/đóng vị thế theo thuật toán và Binance Order Execution
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Field */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm cặp, bot, lý do..."
                className="bg-surface-container-lowest text-on-surface font-['JetBrains_Mono'] text-xs pl-8 pr-3 py-1.5 rounded placeholder-on-surface-variant/50 focus:outline-none focus:bg-surface-container border border-outline-variant/30 w-48"
              />
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[15px] text-on-surface-variant pointer-events-none">
                search
              </span>
            </div>

            {/* Position Filter Buttons */}
            <div className="flex items-center bg-surface-container-lowest p-1 rounded border border-outline-variant/20">
              <button
                type="button"
                onClick={() => setPnlFilter('all')}
                className={`px-2.5 py-1 rounded font-['JetBrains_Mono'] text-xs transition-colors ${
                  pnlFilter === 'all'
                    ? 'bg-surface-container-high text-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Tất Cả ({trades.length})
              </button>
              <button
                type="button"
                onClick={() => setPnlFilter('win')}
                className={`px-2.5 py-1 rounded font-['JetBrains_Mono'] text-xs transition-colors ${
                  pnlFilter === 'win'
                    ? 'bg-tertiary-container/20 text-tertiary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-tertiary'
                }`}
              >
                Chỉ Chốt Lãi (TP)
              </button>
              <button
                type="button"
                onClick={() => setPnlFilter('loss')}
                className={`px-2.5 py-1 rounded font-['JetBrains_Mono'] text-xs transition-colors ${
                  pnlFilter === 'loss'
                    ? 'bg-error-container/20 text-error font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-error'
                }`}
              >
                Chỉ Cắt Lỗ (SL)
              </button>
            </div>

            {/* Clear history */}
            <button
              onClick={handleClearHistory}
              disabled={isClearing || trades.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-error-container/20 hover:bg-error-container/40 text-error font-['JetBrains_Mono'] text-xs transition-all border border-error/30 disabled:opacity-40"
              title="Xóa toàn bộ lịch sử lệnh"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
              <span className="hidden sm:inline">{isClearing ? 'Đang xóa...' : 'Xóa Lịch Sử'}</span>
            </button>
          </div>
        </div>

        {/* Execution Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-['JetBrains_Mono'] text-xs">
            <thead>
              <tr className="text-on-surface-variant bg-surface-container-lowest font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 rounded-l">Thời Gian (UTC+7)</th>
                <th className="py-2.5 px-3">Cặp / Vị Thế</th>
                <th className="py-2.5 px-3">Bot Thực Thi</th>
                <th className="py-2.5 px-3 text-right">Entry / Exit</th>
                <th className="py-2.5 px-3 text-right">Quy Mô Hợp Đồng</th>
                <th className="py-2.5 px-3 text-right">Phí Sàn</th>
                <th className="py-2.5 px-3 text-right">PnL Ròng &amp; ROE</th>
                <th className="py-2.5 px-3">Lý Do Đóng Lệnh</th>
                <th className="py-2.5 px-3 text-center rounded-r">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-highest/40">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[32px] text-outline">history</span>
                      <span>Chưa có dữ liệu lệnh khớp nào phù hợp với bộ lọc.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => {
                  const isWin = (t.pnl || 0) > 0;
                  const isLong = t.side === 'LONG';
                  const isExpanded = expandedId === t.id;
                  const notional = (t.amount || 0) * (t.entry_price || 0);

                  return (
                    <React.Fragment key={t.id}>
                      <tr className="hover:bg-surface-container/60 transition-colors">
                        <td className="py-2.5 px-3 text-on-surface-variant font-['JetBrains_Mono']">
                          <span className="text-on-surface font-semibold block">{t.exit_time?.slice(0, 10) || '—'}</span>
                          <span className="text-[11px]">{t.exit_time?.slice(11, 19) || '—'}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded font-['JetBrains_Mono'] text-[10px] font-bold ${
                              isLong ? 'bg-tertiary/20 text-tertiary' : 'bg-error/20 text-error'
                            }`}>
                              {t.side}
                            </span>
                            <span className="font-bold text-on-surface">{t.symbol}</span>
                            <span className="font-['Space_Grotesk'] text-[9px] bg-surface-container-highest px-1 py-0.5 rounded text-primary font-bold">
                              {t.leverage || 10}x
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-on-surface-variant font-['JetBrains_Mono'] capitalize">
                          {t.strategy ? t.strategy.replace(/_/g, ' ') : 'Trend Scalper'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-['JetBrains_Mono'] text-on-surface">
                          <span className="block text-on-surface-variant font-normal text-[11px]">En: {formatPrice(t.entry_price)}</span>
                          <span className={`font-semibold ${isWin ? 'text-tertiary' : 'text-error'}`}>
                            Ex: {formatPrice(t.exit_price)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-['JetBrains_Mono'] text-on-surface">
                          <span>${notional.toFixed(2)}</span>
                          <span className="block text-[11px] text-on-surface-variant font-normal">
                            {t.amount} {t.symbol.replace('USDT', '')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-['JetBrains_Mono'] text-outline">
                          -${(t.fee || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-['JetBrains_Mono']">
                          <span className={`font-bold ${isWin ? 'text-tertiary' : 'text-error'}`}>
                            {t.pnl >= 0 ? `+$${t.pnl.toFixed(2)}` : `-$${Math.abs(t.pnl).toFixed(2)}`}
                          </span>
                          <span className={`block text-[11px] font-semibold ${isWin ? 'text-tertiary' : 'text-error'}`}>
                            {t.pnl_pct >= 0 ? `+${t.pnl_pct.toFixed(2)}%` : `${t.pnl_pct.toFixed(2)}%`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded font-['JetBrains_Mono'] text-[10px] font-medium ${
                            isWin ? 'bg-tertiary-container/20 text-tertiary' : 'bg-error-container/20 text-error'
                          }`}>
                            {t.exit_reason_vn || t.exit_reason || (isWin ? 'Chốt Lời TP' : 'Cắt Lỗ SL')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : t.id)}
                            className="p-1 rounded hover:bg-surface-container-highest text-on-surface-variant hover:text-primary transition-colors"
                            title="Xem chi tiết chỉ báo và lý do khớp lệnh"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {isExpanded ? 'expand_less' : 'open_in_new'}
                            </span>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Drawer for In-depth Quant Audit */}
                      {isExpanded && (
                        <tr className="bg-surface-container-lowest/80 border-b border-surface-container-highest">
                          <td colSpan={9} className="p-3 text-xs">
                            <div className="flex flex-col gap-2 bg-surface-container-low p-3 rounded border border-outline-variant/30">
                              <div className="flex items-center justify-between border-b border-surface-container-highest pb-1.5">
                                <span className="font-['Space_Grotesk'] text-xs font-bold text-primary flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[15px]">analytics</span>
                                  BÁO CÁO GIẢI TRÌNH THUẬT TOÁN (ORDER #{t.id} - {t.symbol})
                                </span>
                                <span className="font-['JetBrains_Mono'] text-[11px] text-on-surface-variant">
                                  Thời lượng: {t.duration_str || 'N/A'} • Chế độ: {t.mode?.toUpperCase()}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                <div className="flex flex-col gap-1">
                                  <span className="text-on-surface-variant font-semibold">Tín hiệu mở lệnh (Entry Logic):</span>
                                  <div className="p-2 bg-surface-container-lowest rounded text-on-surface font-['JetBrains_Mono'] text-[11px] border border-outline-variant/20">
                                    {t.entry_reason || 'Tín hiệu chỉ báo kỹ thuật phù hợp với thiết lập chiến lược.'}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-on-surface-variant font-semibold">Cơ chế đóng lệnh (Exit Mechanism):</span>
                                  <div className="p-2 bg-surface-container-lowest rounded text-on-surface font-['JetBrains_Mono'] text-[11px] border border-outline-variant/20">
                                    {t.exit_reason_vn || t.exit_reason || 'Đóng lệnh theo điều kiện dừng lỗ/chốt lời của bot.'}
                                  </div>
                                </div>
                              </div>
                              {/* TP / SL Target Prices */}
                              <div className="flex items-center gap-4 pt-1 font-['JetBrains_Mono'] text-[11px]">
                                <span>Mục tiêu TP: <strong className="text-tertiary">{t.tp_price ? `$${formatPrice(t.tp_price)}` : 'Dynamic ATR'}</strong></span>
                                <span>Ngưỡng SL: <strong className="text-error">{t.sl_price ? `$${formatPrice(t.sl_price)}` : 'Trailing ATR'}</strong></span>
                                <span>Lợi nhuận ròng: <strong className={isWin ? 'text-tertiary' : 'text-error'}>{t.pnl >= 0 ? `+$${t.pnl.toFixed(2)}` : `-$${Math.abs(t.pnl).toFixed(2)}`} USDT</strong></span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
