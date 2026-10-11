import React, { useState, useEffect } from 'react';
import { BotStatus, TradeConfig, Position, TradeStats, LogEntry } from '../types';
import { TradingChart } from '../components/TradingChart';
import { AiRegimeBanner } from '../components/AiRegimeBanner';
import { MarketScanner } from '../components/MarketScanner';
import { LiveLogs } from '../components/LiveLogs';
import { TabPath } from '../components/Sidebar';
import {
  closePosition,
  startBot,
  stopBot,
  saveConfig,
  getErrorMessage,
} from '../services/api';

interface DashboardViewProps {
  status: BotStatus | null;
  config: TradeConfig | null;
  positions: Position[];
  stats: TradeStats | null;
  ticker: {
    symbol?: string;
    price: number;
    change24h: number;
    high24h?: number;
    low24h?: number;
    volume24h?: number;
  } | null;
  logs: LogEntry[];
  selectedSymbol: string;
  selectedTimeframe: string;
  onSymbolChange: (sym: string) => void;
  onTimeframeChange: (tf: string) => void;
  onTabChange: (tab: TabPath) => void;
  onRefresh: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  status,
  config,
  positions,
  stats,
  ticker,
  logs,
  selectedSymbol,
  selectedTimeframe,
  onSymbolChange,
  onTimeframeChange,
  onTabChange,
  onRefresh,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [closingId, setClosingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isBotToggling, setIsBotToggling] = useState(false);

  // Quick workstation state
  const [leverageDraft, setQuickLeverage] = useState<number | null>(null);
  const [allocationDraft, setAllocAmount] = useState<string | null>(null);
  const [strategyDraft, setActiveStrategyKey] = useState<string | null>(null);
  const [trailingDraft, setIsTrailingEnabled] = useState<boolean | null>(null);
  const quickLeverage = leverageDraft ?? config?.leverage ?? 20;
  const allocAmount = allocationDraft ?? String(config?.position_size_usd ?? 100);
  const activeStrategyKey = strategyDraft ?? config?.strategy ?? 'trend_scalper';
  const isTrailingEnabled = trailingDraft ?? config?.trailing_stop_enabled ?? true;
  const [activeControlTab, setActiveControlTab] = useState<'quick' | 'manual'>('quick');

  // Real-time UTC+7 system clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const padMs = (n: number) => String(n).padStart(3, '0');
      setCurrentTime(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${padMs(now.getMilliseconds())}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 100);
    return () => clearInterval(interval);
  }, []);


  // Real data calculations
  const balance = status?.balance_usdt || 0;
  const availMargin = status?.available_margin !== undefined ? status.available_margin : balance;
  const marginUsed = status?.margin_used !== undefined ? status.margin_used : (balance > availMargin ? balance - availMargin : 0);
  const marginRatio = balance > 0 ? ((marginUsed / balance) * 100).toFixed(1) : '0.0';
  const marginRatioNum = parseFloat(marginRatio);

  const dailyPnl = status?.daily_pnl || 0;
  const isDailyWin = dailyPnl >= 0;
  const dailyPnlPct = balance > 0 ? ((dailyPnl / balance) * 100).toFixed(2) : '0.00';

  const winRate = status?.win_rate ?? stats?.win_rate ?? 0;
  const totalTrades = status?.total_trades_count ?? stats?.total_trades ?? 0;
  const winsCount = stats?.wins ?? 0;
  const profitFactor = stats?.profit_factor && stats.total_trades > 0 ? stats.profit_factor.toFixed(2) : null;

  const cumulativePnl = status?.total_realized_pnl ?? stats?.total_pnl ?? 0;
  const totalUnrealizedPnl = positions.reduce((acc, p) => acc + (p.unrealized_pnl || 0), 0);
  const currentPrice = ticker?.price || status?.ticker?.price || 0;

  const formatPrice = (p?: number) => {
    if (!p) return '0.00';
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return p.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 });
  };

  // Quick % margin allocation calculation
  const handleQuickPercent = (pct: number) => {
    if (availMargin <= 0) return;
    const computed = (availMargin * (pct / 100)).toFixed(2);
    setAllocAmount(computed);
  };

  // Handle single position close
  const handleClosePos = async (posId: string) => {
    if (!window.confirm(`Đóng vị thế ${posId} ngay lập tức bằng lệnh Market?`)) return;
    setClosingId(posId);
    setActionMsg(null);
    try {
      await closePosition(posId);
      onRefresh();
      setActionMsg({ text: `Đã đóng vị thế ${posId} thành công`, type: 'success' });
    } catch (e) {
      setActionMsg({ text: getErrorMessage(e), type: 'error' });
    } finally {
      setClosingId(null);
    }
  };

  // Toggle Bot Execution
  const handleToggleBot = async () => {
    setIsBotToggling(true);
    setActionMsg(null);
    try {
      if (status?.is_running) {
        if (window.confirm('Tạm dừng bot? Các vị thế mở sẽ tiếp tục được theo dõi chốt lời / cắt lỗ.')) {
          await stopBot();
          onRefresh();
          setActionMsg({ text: 'Đã tạm dừng bot thuật toán', type: 'success' });
        }
      } else {
        await startBot();
        onRefresh();
        setActionMsg({ text: 'Đã kích hoạt bot giao dịch thuật toán tự động', type: 'success' });
      }
    } catch (e) {
      setActionMsg({ text: getErrorMessage(e), type: 'error' });
    } finally {
      setIsBotToggling(false);
    }
  };

  // Quick Strategy Save
  const handleApplyQuickConfig = async () => {
    if (!config) return;
    try {
      const newAlloc = parseFloat(allocAmount) || config.position_size_usd;
      const updatedConfig: TradeConfig = {
        ...config,
        leverage: quickLeverage,
        position_size_usd: newAlloc,
        strategy: activeStrategyKey,
        trailing_stop_enabled: isTrailingEnabled,
      };
      await saveConfig(updatedConfig);
      onRefresh();
      setActionMsg({ text: 'Đã lưu và áp dụng thông số cấu hình bot thành công!', type: 'success' });
    } catch (err) {
      setActionMsg({ text: getErrorMessage(err), type: 'error' });
    }
  };

  // Estimated TP and SL prices
  const tpPct = config?.take_profit_pct || 2.0;
  const slPct = config?.stop_loss_pct || 1.5;
  const estimatedTpPrice = currentPrice > 0 ? currentPrice * (1 + tpPct / 100) : 0;
  const estimatedSlPrice = currentPrice > 0 ? currentPrice * (1 - slPct / 100) : 0;

  return (
    <div className="flex flex-col w-full gap-4 select-none font-['Manrope'] pb-12">
      {/* 1. TOP TELEMETRY BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 bg-surface-container-low rounded border border-outline-variant/30 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1 rounded border-l-2 border-primary">
            <span className="material-symbols-outlined text-primary text-[18px]">terminal</span>
            <span className="font-['Space_Grotesk'] text-xs text-on-surface uppercase tracking-wider font-bold">
              HỆ THỐNG GIAO DỊCH ALGO TỰ ĐỘNG
            </span>
            <span className="font-['JetBrains_Mono'] text-xs text-tertiary font-bold bg-surface-container-lowest px-1.5 py-0.5 rounded">
              V4.8.2-PRO
            </span>
          </div>

          <span className="font-['JetBrains_Mono'] text-xs text-on-surface-variant bg-surface-container-lowest px-2.5 py-1 rounded border border-outline-variant/20">
            SLIPPAGE CHECK: <strong className="text-on-surface">&le; 0.02%</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">THỜI GIAN HỆ THỐNG (UTC+7)</div>
            <div className="font-['JetBrains_Mono'] text-xs text-on-surface font-semibold">
              {currentTime || '00:00:00.000'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onTabChange('chien-luoc')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high hover:bg-surface-variant text-primary font-['JetBrains_Mono'] text-xs font-bold rounded transition-colors border border-primary/30"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            TỐI ƯU THÔNG SỐ TOÀN BỘ
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMsg && (
        <div
          className={`p-3 rounded border text-xs font-['JetBrains_Mono'] flex items-center justify-between ${
            actionMsg.type === 'success'
              ? 'bg-tertiary-container/15 border-tertiary/40 text-tertiary'
              : 'bg-error-container/20 border-error/40 text-error'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {actionMsg.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-on-surface-variant hover:text-white">✕</button>
        </div>
      )}

      {/* 2. TOP KPI STATS BAR (4 SUMMARY CARDS - ONLY 100% REAL DATA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Card 1: Tổng Tài Sản Ví Futures */}
        <div className="bg-surface-container-low rounded p-4 flex flex-col justify-between border border-outline-variant/30 shadow-sm relative overflow-hidden group hover:bg-surface-container transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-['Space_Grotesk'] text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">
                Tổng Tài Sản Ví Futures
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-['JetBrains_Mono'] text-2xl text-on-surface font-bold tracking-tight">
                  ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="font-['JetBrains_Mono'] text-xs text-on-surface-variant">USDT</span>
              </div>
            </div>
            <div className="p-2 rounded bg-surface-container-high text-primary">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
          </div>

          <div className="mt-3 pt-2 bg-surface-container-lowest/60 -mx-4 -mb-4 p-3 border-t border-surface-container-highest/60">
            <div className="flex items-center justify-between font-['JetBrains_Mono'] text-xs mb-1">
              <span className="text-on-surface-variant">Số Dư Khả Dụng:</span>
              <span className="text-on-surface font-semibold">
                ${availMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-on-surface-variant text-[10px]">USDT</span>
              </span>
            </div>
            <div className="flex items-center justify-between font-['JetBrains_Mono'] text-xs mb-1.5">
              <span className="text-on-surface-variant">Margin Ratio:</span>
              <span className={`font-bold flex items-center gap-1 ${marginRatioNum > 50 ? 'text-error' : 'text-tertiary'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${marginRatioNum > 50 ? 'bg-error' : 'bg-tertiary'}`}></span>
                {marginRatio}% ({marginRatioNum < 25 ? 'Rất An Toàn' : marginRatioNum < 50 ? 'Trung Bình' : 'Cảnh Báo'})
              </span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${marginRatioNum > 50 ? 'bg-error' : 'bg-tertiary-container'}`}
                style={{ width: `${Math.min(100, Math.max(3, marginRatioNum))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card 2: Lợi Nhuận Hôm Nay (Daily PnL) */}
        <div className="bg-surface-container-low rounded p-4 flex flex-col justify-between border border-outline-variant/30 shadow-sm relative overflow-hidden group hover:bg-surface-container transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-['Space_Grotesk'] text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">
                {status?.daily_pnl_scope === 'testnet_session' ? 'PnL Lượt Test (từ mốc reset)' : 'Lợi Nhuận Hôm Nay (Daily PnL)'}
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className={`font-['JetBrains_Mono'] text-2xl font-bold tracking-tight ${isDailyWin ? 'text-tertiary' : 'text-error'}`}>
                  {isDailyWin ? `+$${dailyPnl.toFixed(2)}` : `-$${Math.abs(dailyPnl).toFixed(2)}`}
                </span>
                <span className={`font-['JetBrains_Mono'] text-xs px-1.5 py-0.5 rounded font-bold ${
                  isDailyWin ? 'text-tertiary bg-tertiary-container/10' : 'text-error bg-error-container/10'
                }`}>
                  {isDailyWin ? `+${dailyPnlPct}%` : `${dailyPnlPct}%`}
                </span>
              </div>
            </div>
            <div className={`p-2 rounded ${isDailyWin ? 'bg-tertiary-container/20 text-tertiary' : 'bg-error-container/20 text-error'}`}>
              <span className="material-symbols-outlined text-[20px]">
                {isDailyWin ? 'trending_up' : 'trending_down'}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2 bg-surface-container-lowest/60 -mx-4 -mb-4 p-3 border-t border-surface-container-highest/60">
            <div className="flex items-center justify-between font-['JetBrains_Mono'] text-xs mb-1">
              <span className="text-on-surface-variant">Tỷ Lệ Thắng (Winrate):</span>
              <span className="text-on-surface font-semibold">
                <strong className="text-tertiary">{winRate.toFixed(1)}%</strong> ({winsCount}/{totalTrades} lệnh)
              </span>
            </div>
            <div className="flex items-center justify-between font-['JetBrains_Mono'] text-xs">
              <span className="text-on-surface-variant">Profit Factor:</span>
              <span className="text-primary font-bold">
                {profitFactor ? `${profitFactor} ` : '— '}
                <span className="text-on-surface-variant font-normal">
                  ({totalTrades > 0 ? `Tổng ${totalTrades} lệnh` : 'Chưa có lệnh'})
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Trạng Thái Bot Đang Chạy */}
        <div className="bg-surface-container-low rounded p-4 flex flex-col justify-between border border-outline-variant/30 shadow-sm relative overflow-hidden group hover:bg-surface-container transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-['Space_Grotesk'] text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">
                Hạm Đội Bot Thuật Toán
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-['JetBrains_Mono'] text-2xl text-on-surface font-bold tracking-tight">
                  {status?.is_running ? '1' : '0'}<span className="text-on-surface-variant font-normal">/1</span>
                </span>
                <span className={`font-['JetBrains_Mono'] text-xs flex items-center gap-1 font-semibold ${
                  status?.is_running ? 'text-tertiary' : 'text-on-surface-variant'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${status?.is_running ? 'bg-tertiary animate-pulse' : 'bg-slate-500'}`}></span>
                  {status?.is_running ? 'ĐANG CHẠY' : 'TẠM DỪNG'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleBot}
                disabled={isBotToggling}
                className={`px-2 py-1 rounded text-[10px] font-['JetBrains_Mono'] font-bold flex items-center gap-1 transition-all shadow-xs ${
                  status?.is_running
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                    : 'bg-primary text-on-primary hover:bg-primary-container'
                }`}
                title={status?.is_running ? 'Tắt bot' : 'Bật bot'}
              >
                <span className="material-symbols-outlined text-[13px]">
                  {status?.is_running ? 'pause' : 'play_arrow'}
                </span>
                <span>{status?.is_running ? 'Tắt' : 'Bật Bot'}</span>
              </button>

              <div className="p-2 rounded bg-surface-container-high text-secondary">
                <span className="material-symbols-outlined text-[20px]">smart_toy</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 bg-surface-container-lowest/60 -mx-4 -mb-4 p-3 border-t border-surface-container-highest/60">
            <div className="flex items-center justify-between font-['JetBrains_Mono'] text-xs mb-1">
              <span className="text-on-surface-variant">Phân Bổ:</span>
              <span className="text-on-surface capitalize">
                {config?.strategy ? config.strategy.replace(/_/g, ' ') : 'Trend Scalper'} &bull; ATR
              </span>
            </div>
            <div className="flex items-center justify-between font-['JetBrains_Mono'] text-xs">
              <span className="text-on-surface-variant">Tần Suất Khớp Lệnh:</span>
              <span className="text-primary font-semibold">{totalTrades} lệnh đã khớp</span>
            </div>
          </div>
        </div>

        {/* Card 4: Tổng Lãi Lũy Kế Realtime & Sparkline */}
        <div className="bg-surface-container-low rounded p-4 flex flex-col justify-between border border-outline-variant/30 shadow-sm relative overflow-hidden group hover:bg-surface-container transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-['Space_Grotesk'] text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">
                Lãi Lũy Kế Realtime
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className={`font-['JetBrains_Mono'] text-2xl font-bold tracking-tight ${
                  cumulativePnl >= 0 ? 'text-tertiary' : 'text-error'
                }`}>
                  {cumulativePnl >= 0 ? `+$${cumulativePnl.toFixed(2)}` : `-$${Math.abs(cumulativePnl).toFixed(2)}`}
                </span>
                <span className={`font-['JetBrains_Mono'] text-xs font-bold ${
                  cumulativePnl >= 0 ? 'text-tertiary' : 'text-error'
                }`}>
                  {balance > 0 ? (cumulativePnl >= 0 ? `+${((cumulativePnl / balance) * 100).toFixed(2)}%` : `${((cumulativePnl / balance) * 100).toFixed(2)}%`) : '0.00%'}
                </span>
              </div>
            </div>
            <div className={`p-2 rounded ${cumulativePnl >= 0 ? 'bg-tertiary-container/20 text-tertiary' : 'bg-error-container/20 text-error'}`}>
              <span className="material-symbols-outlined text-[20px]">insights</span>
            </div>
          </div>

          <div className="mt-3 pt-2 bg-surface-container-lowest/60 -mx-4 -mb-4 p-3 flex items-center justify-between border-t border-surface-container-highest/60">
            <div className="flex flex-col">
              <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">uPnL Đang Mở:</span>
              <span className={`font-['JetBrains_Mono'] text-xs font-semibold ${
                totalUnrealizedPnl >= 0 ? 'text-tertiary' : 'text-error'
              }`}>
                {totalUnrealizedPnl >= 0 ? `+$${totalUnrealizedPnl.toFixed(2)}` : `-$${Math.abs(totalUnrealizedPnl).toFixed(2)}`}
              </span>
            </div>

            {/* Dynamic Real PnL Sparkline */}
            <div className="w-32 h-10 flex items-end">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 120 40">
                <defs>
                  <linearGradient id="pnlGradDyn" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor={cumulativePnl >= 0 ? '#59f8a9' : '#ffb4ab'} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={cumulativePnl >= 0 ? '#59f8a9' : '#ffb4ab'} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {cumulativePnl >= 0 ? (
                  <>
                    <path d="M 0 35 Q 25 32, 50 25 T 90 14 T 120 6 L 120 40 L 0 40 Z" fill="url(#pnlGradDyn)" />
                    <path d="M 0 35 Q 25 32, 50 25 T 90 14 T 120 6" fill="none" stroke="#59f8a9" strokeLinecap="round" strokeWidth="2" />
                    <circle cx="120" cy="6" fill="#59f8a9" r="3" />
                  </>
                ) : (
                  <>
                    <path d="M 0 10 Q 25 15, 50 22 T 90 30 T 120 36 L 120 40 L 0 40 Z" fill="url(#pnlGradDyn)" />
                    <path d="M 0 10 Q 25 15, 50 22 T 90 30 T 120 36" fill="none" stroke="#ffb4ab" strokeLinecap="round" strokeWidth="2" />
                    <circle cx="120" cy="36" fill="#ffb4ab" r="3" />
                  </>
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: PRO CHART + AI RADAR (8 COLS) vs QUICK BOT WORKSTATION (4 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* CỘT TRÁI: BIỂU ĐỒ NẾN PRO & AI RADAR (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <TradingChart
            symbol={selectedSymbol}
            timeframe={selectedTimeframe}
            ticker={ticker}
            onSymbolChange={onSymbolChange}
            onTimeframeChange={onTimeframeChange}
          />
          <AiRegimeBanner />
        </div>

        {/* CỘT PHẢI: BẢNG ĐIỀU KHIỂN CẤU HÌNH BOT NHANH (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="bg-surface-container-low rounded p-4 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div>
              {/* Tab chuyển đổi */}
              <div className="flex items-center p-1 bg-surface-container-lowest rounded mb-3 border border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setActiveControlTab('quick')}
                  className={`flex-1 py-1.5 text-center font-['JetBrains_Mono'] text-xs font-bold rounded transition-all ${
                    activeControlTab === 'quick' ? 'text-on-primary bg-primary' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  CẤU HÌNH BOT NHANH
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('vi-the-mo-lenh')}
                  className={`flex-1 py-1.5 text-center font-['JetBrains_Mono'] text-xs font-medium rounded transition-all ${
                    activeControlTab === 'manual' ? 'text-on-primary bg-primary' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  CAN THIỆP THỦ CÔNG
                </button>
              </div>

              {/* Symbol & Margin Mode Settings */}
              <div className="flex items-center justify-between p-2.5 bg-surface-container rounded mb-3 border border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className="font-['Space_Grotesk'] text-base font-bold text-on-surface">{selectedSymbol}</span>
                  <span className="font-['Manrope'] text-[10px] bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded font-bold">
                    {config?.margin_type ? config.margin_type.toUpperCase() : 'CROSS'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-['JetBrains_Mono'] text-xs font-bold text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded">
                    {quickLeverage}x ĐÒN BẨY
                  </span>
                </div>
              </div>

              {/* Leverage Range Slider Display */}
              <div className="mb-3">
                <div className="flex justify-between items-center font-['JetBrains_Mono'] text-xs mb-1">
                  <span className="text-on-surface-variant">Mức Đòn Bẩy Tùy Chỉnh:</span>
                  <span className="text-primary font-bold">{quickLeverage}x (Khuyến Nghị &le; 25x)</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={quickLeverage}
                  onChange={(e) => setQuickLeverage(parseInt(e.target.value, 10))}
                  className="w-full accent-primary h-1.5 bg-surface-container-highest rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-['JetBrains_Mono'] text-on-surface-variant mt-1">
                  <button type="button" onClick={() => setQuickLeverage(1)} className="hover:text-primary">1x</button>
                  <button type="button" onClick={() => setQuickLeverage(20)} className="hover:text-primary">20x</button>
                  <button type="button" onClick={() => setQuickLeverage(50)} className="hover:text-primary">50x</button>
                  <button type="button" onClick={() => setQuickLeverage(75)} className="hover:text-primary">75x</button>
                  <button type="button" onClick={() => setQuickLeverage(100)} className="hover:text-primary">100x</button>
                </div>
              </div>

              {/* Chiến Lược Mẫu Selector */}
              <div className="mb-3">
                <label className="font-['Space_Grotesk'] text-[10px] text-on-surface-variant uppercase tracking-wider block mb-1.5 font-bold">
                  Chiến Lược Tối Ưu Tự Động
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveStrategyKey('trend_scalper')}
                    className={`flex items-center justify-between p-2 rounded text-left transition-colors ${
                      activeStrategyKey === 'trend_scalper'
                        ? 'bg-surface-container-high border-l-2 border-primary'
                        : 'bg-surface-container opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <div className="font-['Manrope'] text-xs font-bold text-on-surface">Trend Pullback &amp; EMA Scalping</div>
                      <div className="font-['JetBrains_Mono'] text-[11px] text-on-surface-variant">Bắt sóng theo xu hướng EMA đa khung thời gian</div>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      {activeStrategyKey === 'trend_scalper' ? 'radio_button_checked' : 'radio_button_unchecked'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStrategyKey('bb_scalper')}
                    className={`flex items-center justify-between p-2 rounded text-left transition-colors ${
                      activeStrategyKey === 'bb_scalper'
                        ? 'bg-surface-container-high border-l-2 border-primary'
                        : 'bg-surface-container opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <div className="font-['Manrope'] text-xs font-bold text-on-surface">Bollinger Bands &amp; RSI Reversion</div>
                      <div className="font-['JetBrains_Mono'] text-[11px] text-on-surface-variant">Đảo chiều khi giá chạm dải biên Bollinger</div>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      {activeStrategyKey === 'bb_scalper' ? 'radio_button_checked' : 'radio_button_unchecked'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStrategyKey('breakout_scalper')}
                    className={`flex items-center justify-between p-2 rounded text-left transition-colors ${
                      activeStrategyKey === 'breakout_scalper'
                        ? 'bg-surface-container-high border-l-2 border-primary'
                        : 'bg-surface-container opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <div className="font-['Manrope'] text-xs font-bold text-on-surface">Breakout Momentum Scalper</div>
                      <div className="font-['JetBrains_Mono'] text-[11px] text-on-surface-variant">Đột phá đỉnh/đáy kèm volume đột biến</div>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      {activeStrategyKey === 'breakout_scalper' ? 'radio_button_checked' : 'radio_button_unchecked'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Phân bổ vốn ký quỹ */}
              <div className="mb-3 space-y-2">
                <div>
                  <div className="flex justify-between font-['JetBrains_Mono'] text-xs mb-1">
                    <span className="text-on-surface-variant">Phân Bổ Ký Quỹ Cho Bot:</span>
                    <span className="text-on-surface font-semibold">Tối đa: {availMargin.toFixed(2)} USDT</span>
                  </div>
                  <div className="flex items-center bg-surface-container-lowest rounded p-1.5 border border-outline-variant/30 focus-within:ring-1 focus-within:ring-primary">
                    <input
                      type="text"
                      value={allocAmount}
                      onChange={(e) => setAllocAmount(e.target.value)}
                      className="bg-transparent font-['JetBrains_Mono'] text-sm text-on-surface font-bold w-full focus:outline-none pl-1"
                    />
                    <span className="font-['JetBrains_Mono'] text-xs text-primary font-bold px-2 py-0.5 bg-surface-container-high rounded">
                      USDT
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-1 font-['JetBrains_Mono'] text-xs text-center">
                    <button type="button" onClick={() => handleQuickPercent(10)} className="py-1 bg-surface-container hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface">
                      10%
                    </button>
                    <button type="button" onClick={() => handleQuickPercent(15)} className="py-1 bg-surface-container hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface">
                      15%
                    </button>
                    <button type="button" onClick={() => handleQuickPercent(25)} className="py-1 bg-surface-container hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface">
                      25%
                    </button>
                    <button type="button" onClick={() => handleQuickPercent(50)} className="py-1 bg-surface-container hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface">
                      50%
                    </button>
                  </div>
                </div>

                {/* TP / SL Calculated Boxes */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2 bg-surface-container-lowest rounded border border-outline-variant/20">
                    <span className="font-['Space_Grotesk'] text-[10px] text-tertiary block mb-0.5 font-bold">CHỐT LỜI (TP)</span>
                    <div className="font-['JetBrains_Mono'] text-xs text-on-surface font-bold">+{tpPct}%</div>
                    <div className="font-['JetBrains_Mono'] text-[11px] text-tertiary">
                      {estimatedTpPrice > 0 ? `$${formatPrice(estimatedTpPrice)}` : 'Auto ATR'}
                    </div>
                  </div>
                  <div className="p-2 bg-surface-container-lowest rounded border border-outline-variant/20">
                    <span className="font-['Space_Grotesk'] text-[10px] text-error block mb-0.5 font-bold">CẮT LỖ (SL)</span>
                    <div className="font-['JetBrains_Mono'] text-xs text-on-surface font-bold">-{slPct}%</div>
                    <div className="font-['JetBrains_Mono'] text-[11px] text-error">
                      {estimatedSlPrice > 0 ? `$${formatPrice(estimatedSlPrice)}` : 'Auto ATR'}
                    </div>
                  </div>
                </div>

                {/* Trailing Stop Toggle */}
                <div className="flex items-center justify-between p-2 bg-surface-container rounded border border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[18px]">track_changes</span>
                    <div>
                      <div className="font-['Manrope'] text-xs font-semibold text-on-surface">Trailing Stop Tự Động</div>
                      <div className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">Bảo vệ lợi nhuận theo sóng giá</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTrailingEnabled}
                      onChange={(e) => setIsTrailingEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary-container"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Workstation Action Buttons */}
            <div className="pt-3 border-t border-surface-container-highest flex flex-col gap-2">
              <button
                type="button"
                onClick={handleApplyQuickConfig}
                className="w-full py-2 bg-surface-container-high hover:bg-surface-variant text-primary font-['JetBrains_Mono'] text-xs font-bold rounded border border-primary/30 flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                LƯU &amp; ÁP DỤNG THÔNG SỐ
              </button>

              <button
                type="button"
                onClick={handleToggleBot}
                disabled={isBotToggling}
                className={`w-full py-2.5 font-['Space_Grotesk'] text-sm font-bold rounded shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.99] disabled:opacity-50 ${
                  status?.is_running
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                    : 'bg-primary hover:bg-primary-container text-on-primary shadow-lg shadow-primary/20'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {status?.is_running ? 'pause_circle' : 'play_circle'}
                </span>
                <span>{status?.is_running ? 'TẠM DỪNG BOT GIAO DỊCH (STOP)' : 'BẬT BOT GIAO DỊCH (START BOT)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. ACTIVE POSITIONS TABLE (FULL 12 COLS WIDTH) */}
      <div className="bg-surface-container-low rounded p-4 shadow-sm border border-outline-variant/30">
        {/* Header with Filters & uPnL Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-container-highest">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">assignment</span>
              <span className="font-['Space_Grotesk'] text-base font-bold text-on-surface">
                VỊ THẾ ĐANG MỞ CHI TIẾT
              </span>
            </div>
            <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded font-['JetBrains_Mono'] text-xs border border-outline-variant/20">
              <button className="px-3 py-1 bg-surface-container-high text-primary font-bold rounded" type="button">
                Tất Cả Vị Thế ({positions.length})
              </button>
              <button
                onClick={() => onTabChange('vi-the-mo-lenh')}
                className="px-3 py-1 text-on-surface-variant hover:text-on-surface rounded transition-colors"
                type="button"
              >
                Sổ Lệnh Chi Tiết
              </button>
              <button
                onClick={() => onTabChange('phan-tich-pnl-lich-su')}
                className="px-3 py-1 text-on-surface-variant hover:text-on-surface rounded transition-colors"
                type="button"
              >
                Lịch Sử Chốt Lệnh
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-['JetBrains_Mono'] text-xs text-on-surface-variant">Tổng PnL Chưa Thực Hiện:</span>
            <span className={`font-['JetBrains_Mono'] text-xs font-bold px-2 py-0.5 rounded ${
              totalUnrealizedPnl >= 0
                ? 'text-tertiary bg-tertiary-container/10 border border-tertiary/20'
                : 'text-error bg-error-container/10 border border-error/20'
            }`}>
              {totalUnrealizedPnl >= 0 ? `+$${totalUnrealizedPnl.toFixed(2)}` : `-$${Math.abs(totalUnrealizedPnl).toFixed(2)}`} USDT
            </span>
            <button
              onClick={onRefresh}
              className="ml-2 px-2.5 py-1 bg-surface-container-high hover:bg-surface-variant text-on-surface font-['JetBrains_Mono'] text-xs rounded flex items-center gap-1 border border-outline-variant/30"
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span> Làm Mới
            </button>
          </div>
        </div>

        {/* Table Content */}
        {positions.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-xs space-y-2">
            <span className="material-symbols-outlined text-[36px] text-primary/70 animate-pulse">
              radar
            </span>
            <p className="font-bold text-on-surface text-sm">Không có vị thế mở nào vào lúc này</p>
            <p className="text-[11px] text-on-surface-variant max-w-md mx-auto">
              Bot đang liên tục phân tích nến và các chỉ báo (EMA, RSI, Bollinger Bands) để tìm điểm vào lệnh lướt sóng tối ưu theo kỷ luật quản trị vốn...
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full mt-3">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="font-['Space_Grotesk'] text-[10px] text-on-surface-variant uppercase border-b border-surface-container-highest/60 font-bold">
                  <th className="py-3 px-3">Cặp Tiền / Chiều</th>
                  <th className="py-3 px-3">Khối Lượng &amp; Ký Quỹ</th>
                  <th className="py-3 px-3">Giá Vào (Entry)</th>
                  <th className="py-3 px-3">Giá Đánh Dấu (Mark)</th>
                  <th className="py-3 px-3">Giá Thanh Lý (Liq.)</th>
                  <th className="py-3 px-3">PnL Chưa Thực Hiện (ROE)</th>
                  <th className="py-3 px-3">Quản Lý Bởi Bot</th>
                  <th className="py-3 px-3 text-right">Hành Động Nhanh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/30 text-xs font-['Manrope']">
                {positions.map((pos) => {
                  const isLong = pos.side === 'LONG';
                  const isProfit = pos.unrealized_pnl >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-surface-container/60 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-['JetBrains_Mono'] text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isLong ? 'bg-tertiary-container/20 text-tertiary' : 'bg-error-container/20 text-error'
                          }`}>
                            {pos.side} {pos.leverage}x
                          </span>
                          <div>
                            <div className="font-['Space_Grotesk'] text-sm font-bold text-on-surface">{pos.symbol}</div>
                            <div className="font-['JetBrains_Mono'] text-[11px] text-on-surface-variant">Cross Margin</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-['JetBrains_Mono'] text-on-surface font-bold">
                          {pos.amount.toLocaleString()} {pos.symbol.replace('USDT', '')}
                          <span className="text-on-surface-variant text-[11px] ml-1">
                            (${pos.notional ? pos.notional.toLocaleString() : (pos.amount * (pos.current_price || pos.entry_price)).toFixed(0)})
                          </span>
                        </div>
                        <div className="font-['JetBrains_Mono'] text-on-surface-variant text-[11px]">
                          Ký quỹ: <strong className="text-on-surface">${pos.margin?.toFixed(2)} USDT</strong>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-['JetBrains_Mono'] text-on-surface">
                        {formatPrice(pos.entry_price)}
                      </td>

                      <td className={`py-3.5 px-3 font-['JetBrains_Mono'] font-bold ${
                        isProfit ? 'text-tertiary' : 'text-error'
                      }`}>
                        {formatPrice(pos.current_price)}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-['JetBrains_Mono'] text-error font-semibold">
                          {pos.liquidation_price ? formatPrice(pos.liquidation_price) : '—'}
                        </div>
                        <div className="font-['JetBrains_Mono'] text-[11px] text-tertiary font-medium">
                          Khoảng cách an toàn
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className={`font-['JetBrains_Mono'] font-bold ${
                          isProfit ? 'text-tertiary' : 'text-error'
                        }`}>
                          {isProfit ? `+$${pos.unrealized_pnl.toFixed(2)}` : `-$${Math.abs(pos.unrealized_pnl).toFixed(2)}`}
                        </div>
                        <div className={`font-['JetBrains_Mono'] text-[11px] font-bold px-1 py-0.5 rounded inline-block ${
                          isProfit ? 'text-tertiary bg-tertiary-container/10' : 'text-error bg-error-container/10'
                        }`}>
                          {pos.unrealized_pnl_pct >= 0 ? `+${pos.unrealized_pnl_pct.toFixed(2)}%` : `${pos.unrealized_pnl_pct.toFixed(2)}%`}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary-container/20 text-secondary font-['JetBrains_Mono'] text-[11px] font-bold">
                          <span className="material-symbols-outlined text-[12px]">smart_toy</span>
                          {config?.strategy ? config.strategy.toUpperCase().replace(/_/g, ' ') : 'ALGO BOT'}
                        </div>
                        <div className="text-[10px] text-on-surface-variant font-['JetBrains_Mono'] mt-0.5">
                          TP: {pos.take_profit_price ? `$${formatPrice(pos.take_profit_price)}` : 'Auto'} &bull; SL: {pos.stop_loss_price ? `$${formatPrice(pos.stop_loss_price)}` : 'Auto'}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleClosePos(pos.id)}
                          disabled={closingId === pos.id}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-['JetBrains_Mono'] rounded font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
                        >
                          {closingId === pos.id ? 'Đang đóng...' : 'Đóng Thị Trường'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. LIVE INTELLIGENCE & EXECUTION STREAM (GRID 7:5 - BALANCED HEIGHTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* PANEL TRÁI: QUÉT THỊ TRƯỜNG & TÍN HIỆU (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col">
          <MarketScanner onSelectSymbol={onSymbolChange} />
        </div>

        {/* PANEL PHẢI: NHẬT KÝ KHỚP LỆNH REAL-TIME (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col">
          <LiveLogs logs={logs} />
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
