import React, { useState, useCallback, useMemo } from 'react';
import { getTrades, clearTrades, getErrorMessage } from '../services/api';
import { useApiResource } from '../hooks/useApiResource';
import { TradeRecord } from '../types';
import {
  History,
  RefreshCw,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Target,
  Shield,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  BarChart3,
  Percent,
  DollarSign
} from 'lucide-react';

interface TradeHistoryProps {
  refreshTrigger?: number;
}

const EMPTY_TRADES: TradeRecord[] = [];

export const TradeHistory: React.FC<TradeHistoryProps> = ({ refreshTrigger }) => {
  const [filterMode, setFilterMode] = useState<string>('all');
  const [pnlFilter, setPnlFilter] = useState<'all' | 'win' | 'loss'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [isClearing, setIsClearing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loader = useCallback(
    (signal: AbortSignal) => {
      void refreshTrigger;
      return getTrades(200, filterMode === 'all' ? undefined : filterMode, signal);
    },
    [filterMode, refreshTrigger]
  );

  const { data, error, isLoading, reload: fetchHistory } = useApiResource(loader);
  const trades = data ?? EMPTY_TRADES;

  const handleClear = async () => {
    const confirmMsg =
      filterMode === 'all'
        ? 'Bạn có chắc chắn muốn XÓA TOÀN BỘ lịch sử lệnh để làm mới dữ liệu không?'
        : `Bạn có chắc muốn xóa lịch sử lệnh ở chế độ ${filterMode}?`;

    if (window.confirm(confirmMsg)) {
      setIsClearing(true);
      setActionError(null);
      try {
        const modeParam = filterMode === 'all' ? undefined : filterMode;
        await clearTrades(modeParam);
        fetchHistory();
      } catch (err) {
        setActionError(getErrorMessage(err));
      } finally {
        setIsClearing(false);
      }
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatPrice = (p: number | undefined | null) => {
    if (p == null || !Number.isFinite(p) || p <= 0) return '--';
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    if (p >= 0.001) return p.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
    return p.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 8 });
  };

  // Filter trades by search query and win/loss
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (pnlFilter === 'win' && t.pnl <= 0) return false;
      if (pnlFilter === 'loss' && t.pnl > 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const symbolMatch = t.symbol.toLowerCase().includes(q);
        const strategyMatch = (t.strategy || '').toLowerCase().includes(q);
        const entryReasonMatch = (t.entry_reason || '').toLowerCase().includes(q);
        const exitReasonMatch = (t.exit_reason_vn || t.exit_reason || '').toLowerCase().includes(q);
        if (!symbolMatch && !strategyMatch && !entryReasonMatch && !exitReasonMatch) return false;
      }
      return true;
    });
  }, [trades, pnlFilter, searchQuery]);

  // Key metrics calculation
  const totalPnl = useMemo(() => trades.reduce((acc, t) => acc + (t.pnl || 0), 0), [trades]);
  const totalFees = useMemo(() => trades.reduce((acc, t) => acc + (t.fee || 0), 0), [trades]);
  const winCount = useMemo(() => trades.filter((t) => (t.pnl || 0) > 0).length, [trades]);
  const lossCount = useMemo(() => trades.filter((t) => (t.pnl || 0) <= 0).length, [trades]);
  const winRate = trades.length > 0 ? ((winCount / trades.length) * 100).toFixed(1) : '0.0';
  const avgPnl = trades.length > 0 ? (totalPnl / trades.length).toFixed(2) : '0.00';

  // Helper for Exit Badge
  const renderExitBadge = (trade: TradeRecord) => {
    const isWin = trade.pnl > 0;
    const label = trade.exit_reason_vn || (isWin ? 'Chốt Lời (TP)' : 'Cắt Lỗ (SL)');
    const type = trade.exit_type || (isWin ? 'TP' : 'SL');

    if (type === 'TP' || label.includes('Chốt Lời')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <Target className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{label}</span>
        </span>
      );
    }
    if (type === 'TRAILING' || label.includes('Trailing')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
          <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{label}</span>
        </span>
      );
    }
    if (type === 'MANUAL' || label.includes('thủ công')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
          <span>✋ {label}</span>
        </span>
      );
    }
    if (type === 'PANIC' || label.includes('khẩn cấp')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600/20 text-rose-300 border border-rose-500/40">
          <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{label}</span>
        </span>
      );
    }
    if (type === 'BE' || label.includes('Hòa vốn')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <span>⚖️ {label}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <Shield className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{label}</span>
      </span>
    );
  };

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 sm:p-6 shadow-2xl backdrop-blur-md space-y-5">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-inner">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Lịch Sử Giao Dịch & Minh Bạch Lý Do Lệnh
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Giải trình chi tiết lý do vào lệnh theo thuật toán, cơ chế thoát lệnh và PnL ròng sau phí sàn
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Pill Filter */}
          <div className="inline-flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'live', label: 'Live' },
              { key: 'testnet', label: 'Testnet' },
              { key: 'paper', label: 'Giả lập' }
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => setFilterMode(m.key)}
                className={`px-3 py-1 rounded-lg transition ${
                  filterMode === m.key
                    ? 'bg-purple-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Win/Loss Pill Filter */}
          <div className="inline-flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setPnlFilter('all')}
              className={`px-3 py-1 rounded-lg transition ${
                pnlFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất cả ({trades.length})
            </button>
            <button
              onClick={() => setPnlFilter('win')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                pnlFilter === 'win' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Thắng ({winCount})</span>
            </button>
            <button
              onClick={() => setPnlFilter('loss')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                pnlFilter === 'loss' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Thua ({lossCount})</span>
            </button>
          </div>

          {/* Refresh & Clear Actions */}
          <button
            onClick={fetchHistory}
            disabled={isLoading || isClearing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700/80"
            title="Tải lại lịch sử"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
          </button>

          <button
            onClick={handleClear}
            disabled={isLoading || isClearing || trades.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition border border-rose-500/30 disabled:opacity-40"
            title="Xóa lịch sử của chế độ đang chọn"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isClearing ? 'Đang xóa...' : 'Xóa Lịch Sử'}</span>
          </button>
        </div>
      </div>

      {/* 2. Sleek KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Net PnL Card */}
        <div
          className={`p-4 rounded-xl border transition ${
            totalPnl >= 0
              ? 'bg-gradient-to-br from-emerald-950/30 to-slate-900/60 border-emerald-500/30'
              : 'bg-gradient-to-br from-rose-950/30 to-slate-900/60 border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>Tổng PnL Thực Nhận</span>
            <DollarSign className={`w-4 h-4 ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
              totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalPnl >= 0 ? `+$${totalPnl.toFixed(2)}` : `-$${Math.abs(totalPnl).toFixed(2)}`}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            Đã trừ phí sàn: ${totalFees.toFixed(2)} USDT
          </div>
        </div>

        {/* Win Rate Card */}
        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>Tỷ Lệ Thắng (Win Rate)</span>
            <Percent className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
            {winRate}%
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, parseFloat(winRate)))}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {winCount}W / {lossCount}L
            </span>
          </div>
        </div>

        {/* Total Closed Trades Card */}
        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>Tổng Lệnh Đã Đóng</span>
            <BarChart3 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
            {trades.length}{' '}
            <span className="text-xs font-normal text-slate-500">lệnh</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Hiển thị: {filteredTrades.length} lệnh phù hợp
          </div>
        </div>

        {/* Average Profit Card */}
        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>Lãi Ròng Trung Bình</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300 tracking-tight">
            {avgPnl} <span className="text-xs font-normal text-slate-500">USDT</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Tỷ số W/L:{' '}
            {lossCount > 0 ? (winCount / lossCount).toFixed(2) : winCount > 0 ? 'Hoàn hảo' : '--'}
          </div>
        </div>
      </div>

      {/* 3. Search Bar for Fast Lookup */}
      <div className="flex items-center gap-3 bg-slate-950/60 px-3.5 py-2.5 rounded-xl border border-slate-800/80">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm theo mã coin (ví dụ: BTC, SOL, BABY), chiến lược hoặc lý do vào lệnh..."
          className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none flex-1 font-medium"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
          >
            Xóa tìm
          </button>
        )}
      </div>

      {(error || actionError) && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
          {error || actionError}
        </div>
      )}

      {/* 4. Main Trades List / Table */}
      {filteredTrades.length === 0 ? (
        <div className="py-16 text-center text-slate-500 space-y-2">
          <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto text-slate-400">
            <History className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-300">
            {trades.length === 0
              ? 'Chưa có lệnh nào được hoàn thành trong danh mục này.'
              : 'Không tìm thấy lệnh nào khớp với bộ lọc hoặc từ khóa tìm kiếm.'}
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Khi bot vào lệnh và chốt lời hoặc cắt lỗ, toàn bộ lý do và nhật ký chi tiết sẽ hiển thị ở đây.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTrades.map((t) => {
            const isProfit = t.pnl >= 0;
            const isExpanded = expandedId === t.id;
            const durationText = t.duration_str || '--';

            return (
              <div
                key={t.id}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'bg-slate-900/90 border-purple-500/50 shadow-lg'
                    : 'bg-slate-950/40 hover:bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Main Row Bar (Clickable to Expand) */}
                <div
                  onClick={() => toggleExpand(t.id)}
                  className="p-3.5 sm:p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3.5"
                >
                  {/* Left: Coin, Position, Strategy */}
                  <div className="flex items-center gap-3.5 min-w-[220px]">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border ${
                        t.side === 'LONG'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {t.side}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm tracking-wide">
                          {t.symbol}
                        </span>
                        <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {t.leverage}x
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                            t.mode === 'live'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : t.mode === 'testnet'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          }`}
                        >
                          {t.mode}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span className="capitalize text-slate-300 font-medium">
                          {t.strategy ? t.strategy.replace('_', ' ') : 'Scalper'}
                        </span>
                        <span>&bull;</span>
                        <span className="font-mono text-slate-400">
                          KL: {t.amount?.toLocaleString()} {t.symbol.split('/')[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Left: Price Flow & Hold Duration */}
                  <div className="flex items-center gap-4 text-xs font-mono min-w-[190px]">
                    <div>
                      <div className="text-slate-400 text-[10px] uppercase font-semibold">Giá Vào ➔ Ra</div>
                      <div className="text-slate-200 font-bold flex items-center gap-1.5 mt-0.5">
                        <span>${formatPrice(t.entry_price)}</span>
                        <span className="text-slate-500">→</span>
                        <span className={isProfit ? 'text-emerald-300' : 'text-rose-300'}>
                          ${formatPrice(t.exit_price)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-sans">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Giữ vị thế: <strong className="font-mono text-slate-400">{durationText}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Right: Clear Entry & Exit Reason Badges */}
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                    {/* Entry Reason Badge */}
                    <div className="flex-1 max-w-sm">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold mb-0.5 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Tín Hiệu Vào Lệnh</span>
                      </div>
                      <p
                        className="text-xs text-slate-200 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 line-clamp-1"
                        title={t.entry_reason || 'Tín hiệu kỹ thuật theo xu hướng'}
                      >
                        {t.entry_reason || 'Tín hiệu kỹ thuật theo xu hướng'}
                      </p>
                    </div>

                    {/* Exit Reason Badge */}
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold mb-0.5">
                        Lý Do Đóng
                      </div>
                      <div>{renderExitBadge(t)}</div>
                    </div>
                  </div>

                  {/* Right: Net PnL & Expand Chevron */}
                  <div className="flex items-center justify-between md:justify-end gap-4 min-w-[150px] pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/60">
                    <div className="text-right">
                      <div
                        className={`text-sm sm:text-base font-black font-mono tracking-tight ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isProfit ? `+$${t.pnl.toFixed(2)}` : `-$${Math.abs(t.pnl).toFixed(2)}`}
                      </div>
                      <div
                        className={`text-[11px] font-mono font-bold ${
                          isProfit ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {t.pnl_pct >= 0 ? `+${t.pnl_pct.toFixed(2)}%` : `${t.pnl_pct.toFixed(2)}%`}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Phí: ${t.fee ? t.fee.toFixed(2) : '0.00'}
                      </div>
                    </div>

                    <div className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white transition">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-purple-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. Expanded Accordion: Full Trade Breakdown Dossier */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-slate-950/60 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
                      {/* Box 1: Lý do vào lệnh chi tiết & Chỉ báo kỹ thuật */}
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span>1. Tín Hiệu & Lý Do Vào Lệnh</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                          {t.entry_reason ||
                            'Thuật toán quét phát hiện nến giá thỏa mãn điều kiện xu hướng, động lượng RSI và xác nhận khối lượng giao dịch.'}
                        </p>
                        <div className="text-[11px] text-slate-400 font-mono space-y-1 pt-1">
                          <div>
                            &bull; Thời điểm mở lệnh:{' '}
                            <span className="text-slate-200 font-semibold">{t.entry_time}</span>
                          </div>
                          <div>
                            &bull; Chiến lược:{' '}
                            <span className="text-cyan-300 font-semibold capitalize">
                              {t.strategy ? t.strategy.replace('_', ' ') : 'Trend Scalper'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Box 2: Kế hoạch Quản trị Rủi ro Ban đầu */}
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                          <Shield className="w-4 h-4 text-cyan-400" />
                          <span>2. Kế Hoạch Quản Trị Rủi Ro</span>
                        </div>
                        <div className="space-y-1.5 text-xs font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                          <div className="flex justify-between">
                            <span className="text-slate-400">TP Mục Tiêu:</span>
                            <span className="text-emerald-400 font-bold">
                              ${formatPrice(t.tp_price)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">SL Bảo Vệ:</span>
                            <span className="text-rose-400 font-bold">
                              ${formatPrice(t.sl_price)}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-slate-800 pt-1 text-[11px]">
                            <span className="text-slate-400">Tỷ lệ R:R:</span>
                            <span className="text-cyan-300 font-bold">~ 1 : 1.67</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          {t.tp_price
                            ? 'Mức chốt lời/cắt lỗ tự động kích hoạt bảo vệ tài khoản ngay khi vào lệnh.'
                            : 'Mức SL/TP được kiểm soát liên tục thông qua thuật toán máy chủ.'}
                        </p>
                      </div>

                      {/* Box 3: Diễn biến Kết quả Khớp lệnh & Phí Sàn */}
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                          <Target className="w-4 h-4 text-emerald-400" />
                          <span>3. Kết Quả & Thanh Lý Lệnh</span>
                        </div>
                        <div className="space-y-1.5 text-xs font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Nguyên nhân đóng:</span>
                            <span className="text-slate-200 font-bold">{renderExitBadge(t)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Thời điểm đóng:</span>
                            <span className="text-slate-300">{t.exit_time}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-800 pt-1">
                            <span className="text-slate-400">Phí giao dịch:</span>
                            <span className="text-amber-400">-${t.fee ? t.fee.toFixed(2) : '0.00'} USDT</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-300 font-semibold">PnL Ròng:</span>
                            <span className={`font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? `+$${t.pnl.toFixed(2)}` : `-$${Math.abs(t.pnl).toFixed(2)}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
