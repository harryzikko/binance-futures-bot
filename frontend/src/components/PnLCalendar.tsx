import React, { useState, useCallback } from 'react';
import { api } from '../services/api';
import { useApiResource } from '../hooks/useApiResource';
import type { TradeRecord } from '../types';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Award,
  X,
  Clock
} from 'lucide-react';

interface DayTradeSummary {
  date: string;
  total_pnl: number;
  total_fees: number;
  trades_count: number;
  wins: number;
  losses: number;
  win_rate: number;
  trades: TradeRecord[];
}

interface WeekSummary {
  week: string;
  total_pnl: number;
  trades_count: number;
  wins: number;
  losses: number;
  win_rate: number;
}

interface MonthSummary {
  total_pnl: number;
  total_fees: number;
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  green_days: number;
  red_days: number;
}

interface CalendarResponse {
  year: number;
  month: number;
  mode: string;
  month_summary: MonthSummary;
  daily_pnl: Record<string, DayTradeSummary>;
  weekly_pnl: WeekSummary[];
}

export const PnLCalendar: React.FC = () => {
  const [today] = useState(() => new Date());
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1);
  const [filterMode, setFilterMode] = useState<string>('all');
  const [selectedDayTrades, setSelectedDayTrades] = useState<DayTradeSummary | null>(null);

  const loader = useCallback((signal: AbortSignal) => api.get<CalendarResponse>('/pnl/calendar', {
    params: { year: currentYear, month: currentMonth, mode: filterMode === 'all' ? undefined : filterMode },
    signal,
  }).then(res => res.data), [currentYear, currentMonth, filterMode]);
  const { data: calendarData, error, isLoading, reload } = useApiResource(loader);

  const handlePrevMonth = () => {
    setSelectedDayTrades(null);
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDayTrades(null);
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    setSelectedDayTrades(null);
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
  };

  // Generate calendar grid
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 is Sunday
  // Convert so Monday is 0, Sunday is 6
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const monthSummary = calendarData?.month_summary || {
    total_pnl: 0,
    total_fees: 0,
    total_trades: 0,
    wins: 0,
    losses: 0,
    win_rate: 0,
    green_days: 0,
    red_days: 0,
  };

  const dayHeaders = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

  const formatPrice = (p: number) => {
    if (!p) return '0.00';
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return p.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 });
  };

  const getReasonBadge = (reason: string, pnl: number) => {
    if (reason === 'TAKE_PROFIT' || reason === 'TP') {
      if (pnl < 0) return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Hòa / Lỗ Phí</span>;
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Chốt Lời (TP)</span>;
    }
    if (reason === 'STOP_LOSS' || reason === 'SL') {
      if (pnl > 0) return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Chốt Lời (SL+)</span>;
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">Cắt Lỗ (SL)</span>;
    }
    if (reason === 'TRAILING_STOP') return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Trailing Stop</span>;
    if (reason === 'PANIC' || reason === 'PANIC_CLOSE') return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">Panic Close</span>;
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">Thủ Công</span>;
  };

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 shadow-2xl backdrop-blur-sm space-y-5">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              Lịch Lợi Nhuận (PnL Calendar)
            </h2>
            <p className="text-xs text-slate-400">
              Nhật ký giao dịch trực quan theo Ngày, Tuần và Tháng
            </p>
          </div>
        </div>

        {/* Controls: Month Nav & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Pill Filter */}
          <div className="flex items-center bg-slate-950/80 rounded-xl p-0.5 border border-slate-800">
            {['all', 'paper', 'testnet', 'demo', 'live'].map((m) => (
              <button
                key={m}
                onClick={() => { setSelectedDayTrades(null); setFilterMode(m); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition capitalize ${
                  filterMode === m ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'all' ? 'Tất cả' : m === 'paper' ? 'Giả lập' : m === 'testnet' ? 'Testnet' : m === 'demo' ? 'Demo' : 'Live'}
              </button>
            ))}
          </div>

          {/* Month Switcher */}
          <div className="flex items-center bg-slate-950/80 rounded-xl p-1 border border-slate-800">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-mono font-extrabold text-slate-200">
              Tháng {currentMonth} / {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleCurrentMonth}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition border border-slate-700"
          >
            Hôm Nay
          </button>
        </div>
      </div>

      {isLoading && <p role="status" className="text-xs text-slate-400">Đang tải lịch...</p>}
      {error && <p role="alert" className="text-xs text-rose-400">{error} <button onClick={reload}>Thử lại</button></p>}
      {/* Monthly Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Month PnL */}
        <div className={`p-3.5 rounded-xl border ${
          monthSummary.total_pnl >= 0
            ? 'bg-emerald-950/30 border-emerald-500/30'
            : 'bg-rose-950/30 border-rose-500/30'
        }`}>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Tổng PnL Tháng {currentMonth}
          </span>
          <div className={`text-xl font-black font-mono tracking-tight ${
            monthSummary.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {monthSummary.total_pnl >= 0 ? `+$${monthSummary.total_pnl.toFixed(2)}` : `-$${Math.abs(monthSummary.total_pnl).toFixed(2)}`}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Phí sàn: ${monthSummary.total_fees.toFixed(2)}
          </span>
        </div>

        {/* Win Rate */}
        <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Tỷ Lệ Thắng
          </span>
          <div className="text-xl font-black font-mono tracking-tight text-white">
            {monthSummary.win_rate.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {monthSummary.wins} Thắng / {monthSummary.losses} Thua
          </span>
        </div>

        {/* Green vs Red Days */}
        <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Ngày Xanh / Ngày Đỏ
          </span>
          <div className="text-xl font-black font-mono tracking-tight text-white flex items-center gap-1.5">
            <span className="text-emerald-400">{monthSummary.green_days} Xanh</span>
            <span className="text-slate-600">/</span>
            <span className="text-rose-400">{monthSummary.red_days} Đỏ</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Số ngày giao dịch: {monthSummary.green_days + monthSummary.red_days} ngày
          </span>
        </div>

        {/* Total Trades */}
        <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Tổng Lệnh Trong Tháng
          </span>
          <div className="text-xl font-black font-mono tracking-tight text-cyan-300">
            {monthSummary.total_trades} Lệnh
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Trung bình: {(monthSummary.total_trades / Math.max(1, monthSummary.green_days + monthSummary.red_days)).toFixed(1)} lệnh/ngày
          </span>
        </div>
      </div>

      {/* Main Calendar Matrix & Weekly Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 1. Monthly Grid Matrix - 9 cols */}
        <div className="lg:col-span-9 bg-slate-950/40 rounded-2xl border border-slate-800/80 p-3 overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
            {dayHeaders.map((dh, idx) => (
              <div
                key={dh}
                className={`text-[11px] font-bold py-1.5 uppercase tracking-wider ${
                  idx >= 5 ? 'text-amber-400/80' : 'text-slate-400'
                }`}
              >
                {dh}
              </div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Blank cells for offset */}
            {Array.from({ length: adjustedFirstDay }).map((_, index) => (
              <div key={`blank-${index}`} className="h-20 rounded-xl bg-slate-900/10 border border-slate-900/30" />
            ))}

            {/* Days of the Month */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const dayNum = index + 1;
              const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayData = calendarData?.daily_pnl?.[dateStr];
              const hasTrades = !!dayData && dayData.trades_count > 0;
              const isProfit = hasTrades && dayData.total_pnl >= 0;
              const isToday =
                today.getFullYear() === currentYear &&
                today.getMonth() + 1 === currentMonth &&
                today.getDate() === dayNum;

              let cardStyle = 'bg-slate-900/30 border-slate-800/50 text-slate-500';
              if (hasTrades) {
                if (isProfit) {
                  cardStyle = 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-950 hover:border-emerald-400 cursor-pointer';
                } else {
                  cardStyle = 'bg-rose-950/40 border-rose-500/40 text-rose-300 shadow-sm shadow-rose-950 hover:border-rose-400 cursor-pointer';
                }
              }

              return (
                <div
                  key={dateStr}
                  onClick={() => hasTrades && setSelectedDayTrades(dayData)}
                  className={`h-20 p-2 rounded-xl border flex flex-col justify-between transition relative overflow-hidden group ${cardStyle} ${
                    isToday ? 'ring-2 ring-cyan-500/50' : ''
                  }`}
                >
                  {/* Top Bar: Date Number + Today indicator */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold font-mono ${hasTrades ? 'text-white' : 'text-slate-500'}`}>
                      {dayNum}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" title="Hôm nay" />
                    )}
                  </div>

                  {/* Middle Content: PnL Amount */}
                  {hasTrades ? (
                    <div>
                      <div className={`text-xs sm:text-sm font-black font-mono tracking-tight ${
                        isProfit ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isProfit ? `+$${dayData.total_pnl.toFixed(2)}` : `-$${Math.abs(dayData.total_pnl).toFixed(2)}`}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {dayData.trades_count} lệnh ({dayData.win_rate}%)
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-700 font-mono">--</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Weekly Summary Sidebar - 3 cols */}
        <div className="lg:col-span-3 bg-slate-950/40 rounded-2xl border border-slate-800/80 p-3.5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Award className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Tổng Kết Theo Tuần</h3>
          </div>

          <div className="space-y-2.5">
            {calendarData?.weekly_pnl && calendarData.weekly_pnl.length > 0 ? (
              calendarData.weekly_pnl.map((w, idx) => {
                const isProfit = w.total_pnl >= 0;
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition ${
                      isProfit
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-rose-950/20 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-slate-200">{w.week}</span>
                      <span className={`text-xs font-mono font-black ${
                        isProfit ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isProfit ? `+$${w.total_pnl.toFixed(2)}` : `-$${Math.abs(w.total_pnl).toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{w.trades_count} Lệnh ({w.wins}W - {w.losses}L)</span>
                      <span className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                        WR: {w.win_rate}%
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-600">
                Chưa có dữ liệu giao dịch trong tháng này
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Day Details Modal */}
      {selectedDayTrades && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedDayTrades(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Chi Tiết Giao Dịch: Ngày {selectedDayTrades.date}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span className={`font-mono font-bold ${
                    selectedDayTrades.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    PnL Ngày: {selectedDayTrades.total_pnl >= 0 ? `+$${selectedDayTrades.total_pnl.toFixed(2)}` : `-$${Math.abs(selectedDayTrades.total_pnl).toFixed(2)}`}
                  </span>
                  <span>&bull;</span>
                  <span>{selectedDayTrades.trades_count} Lệnh ({selectedDayTrades.wins}W - {selectedDayTrades.losses}L)</span>
                  <span>&bull;</span>
                  <span>Win Rate: {selectedDayTrades.win_rate}%</span>
                </div>
              </div>
            </div>

            {/* Trades List Table */}
            <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900 z-10 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="pb-2">Cặp / Chiều</th>
                    <th className="pb-2">Giá Vào / Ra</th>
                    <th className="pb-2">PnL</th>
                    <th className="pb-2">Lý Do Đóng</th>
                    <th className="pb-2 text-right">Giờ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {selectedDayTrades.trades.map(t => {
                    const isWin = t.pnl >= 0;
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/20">
                        <td className="py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5 ${
                            t.side === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {t.side}
                          </span>
                          <span className="font-bold text-white">{t.symbol}</span>
                        </td>
                        <td className="py-2.5 font-mono text-[11px] text-slate-300">
                          ${formatPrice(t.entry_price)} &rarr; ${formatPrice(t.exit_price)}
                        </td>
                        <td className="py-2.5">
                          <span className={`font-mono font-bold text-xs ${
                            isWin ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {isWin ? `+$${t.pnl.toFixed(2)}` : `-$${Math.abs(t.pnl).toFixed(2)}`}
                          </span>
                          <span className={`text-[10px] font-mono ml-1 ${
                            isWin ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            ({t.pnl_pct >= 0 ? `+${t.pnl_pct.toFixed(2)}%` : `${t.pnl_pct.toFixed(2)}%`})
                          </span>
                        </td>
                        <td className="py-2.5 text-[11px]">
                          {getReasonBadge(t.exit_reason, t.pnl)}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-400 text-[11px]">
                          {t.exit_time.split(/[ T]/)[1] || t.exit_time}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
};
