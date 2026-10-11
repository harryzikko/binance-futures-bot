import React, { useState } from 'react';
import { BotStatus } from '../types';

interface HeaderProps {
  status: BotStatus | null;
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  onPanicClose: () => void;
  isPanicClosing?: boolean;
  isConnected?: boolean;
  onToggleBot?: () => void;
  isBotToggling?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  selectedSymbol,
  onSymbolChange,
  onPanicClose,
  isPanicClosing = false,
  isConnected = true,
  onToggleBot,
  isBotToggling = false,
}) => {
  const [showPairDropdown, setShowPairDropdown] = useState(false);

  const popularSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'BABYUSDT', 'BNBUSDT'];
  const balance = status?.balance_usdt || 0;
  const dailyPnl = status?.daily_pnl || 0;
  const isDailyProfit = dailyPnl >= 0;
  const dailyPnlPct = balance > 0 ? ((dailyPnl / balance) * 100).toFixed(2) : '0.00';

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30 z-40 px-6 flex items-center justify-between select-none">
      {/* Left: WS Status & Pair & Balance summary */}
      <div className="flex items-center gap-4">
        {/* WS Status Badge */}
        <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded border border-outline-variant/30">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isConnected ? 'bg-tertiary' : 'bg-error'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-tertiary' : 'bg-error'}`}></span>
          </span>
          <span className="font-['JetBrains_Mono'] text-[11px] font-semibold text-on-surface tracking-wider uppercase">
            {isConnected ? 'WS CONNECTED' : 'WS RECONNECTING'}
          </span>
          <span className="text-outline font-['JetBrains_Mono'] text-[11px]">|</span>
          <span className={`font-['JetBrains_Mono'] text-[11px] font-bold ${isConnected ? 'text-tertiary' : 'text-error'}`}>
            {isConnected ? '12ms' : 'offline'}
          </span>
        </div>

        {/* Pair Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPairDropdown(!showPairDropdown)}
            className="flex items-center bg-surface-container-low border border-outline-variant/30 rounded px-3 py-1.5 gap-2 hover:border-outline/50 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">currency_bitcoin</span>
            <div className="flex items-center gap-1.5">
              <span className="font-['JetBrains_Mono'] text-xs font-bold text-on-surface">
                {selectedSymbol.replace('/', '')}
              </span>
              <span className="font-['Manrope'] text-[10px] text-on-surface-variant bg-surface-container-high px-1 py-0.2 rounded font-bold">
                PERP
              </span>
            </div>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">expand_more</span>
          </button>

          {showPairDropdown && (
            <div className="absolute top-full left-0 mt-1 w-44 bg-surface-container-high border border-outline-variant/50 rounded-lg shadow-xl z-50 py-1 font-['JetBrains_Mono'] text-xs">
              {popularSymbols.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => {
                    onSymbolChange(sym);
                    setShowPairDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-surface-variant transition ${
                    selectedSymbol === sym ? 'text-primary font-bold bg-surface-container' : 'text-on-surface'
                  }`}
                >
                  <span>{sym}</span>
                  <span className="text-[10px] text-on-surface-variant">PERP</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Margin & Daily PnL Telemetry */}
        <div className="hidden xl:flex items-center gap-4 pl-4 border-l border-outline-variant/30">
          <div className="flex flex-col">
            <span className="font-['Manrope'] text-[10px] font-bold text-on-surface-variant uppercase">
              Tổng Vốn Ký Quỹ
            </span>
            <span className="font-['JetBrains_Mono'] text-xs text-on-surface font-semibold">
              ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-on-surface-variant text-[10px] font-normal">USDT</span>
            </span>
          </div>

          <div className="flex flex-col">
            <span className="font-['Manrope'] text-[10px] font-bold text-on-surface-variant uppercase">
              {status?.daily_pnl_scope === 'testnet_session' ? 'PnL Lượt Test' : 'PnL Hôm Nay'}
            </span>
            <span
              className={`font-['JetBrains_Mono'] text-xs font-semibold ${
                isDailyProfit ? 'text-tertiary' : 'text-error'
              }`}
            >
              {isDailyProfit ? `+$${dailyPnl.toFixed(2)}` : `-$${Math.abs(dailyPnl).toFixed(2)}`}{' '}
              <span className="text-[10px]">({isDailyProfit ? `+${dailyPnlPct}%` : `${dailyPnlPct}%`})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right: Bot Engine Status, Panic Stop, Desk Profile */}
      <div className="flex items-center gap-4">
        {/* Bot Engine Status Badge & Controls */}
        <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/30 px-3 py-1 rounded">
          <div className="flex flex-col">
            <span className="font-['Manrope'] text-[10px] font-bold tracking-wide flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  status?.is_running ? 'bg-tertiary animate-pulse' : 'bg-slate-500'
                }`}
              ></span>
              <span className={status?.is_running ? 'text-tertiary font-extrabold' : 'text-slate-400 font-bold'}>
                {status?.is_running ? 'BOT ĐANG CHẠY' : 'BOT TẠM DỪNG'}
              </span>
            </span>
            <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">
              {status?.mode?.toUpperCase() || 'PAPER'} &bull; {status?.active_positions_count || 0} Vị Thế
            </span>
          </div>

          {/* Master Bot Toggle Button */}
          {onToggleBot && (
            <button
              type="button"
              onClick={onToggleBot}
              disabled={isBotToggling}
              className={`ml-1.5 px-3 py-1 font-['Manrope'] text-[11px] font-bold uppercase rounded flex items-center gap-1 shadow-sm transition-all active:scale-95 disabled:opacity-50 ${
                status?.is_running
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                  : 'bg-primary hover:bg-primary-container text-on-primary border border-primary'
              }`}
              title={status?.is_running ? 'Tạm dừng thuật toán bot' : 'Bật bot giao dịch thuật toán tự động'}
            >
              <span className="material-symbols-outlined text-[15px]">
                {status?.is_running ? 'pause' : 'play_arrow'}
              </span>
              <span>
                {isBotToggling
                  ? (status?.is_running ? 'ĐANG DỪNG...' : 'ĐANG BẬT...')
                  : (status?.is_running ? 'TẮT BOT' : 'BẬT BOT')}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onPanicClose}
            disabled={isPanicClosing}
            className="ml-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-['Manrope'] text-[11px] font-bold uppercase rounded border border-rose-400/40 flex items-center gap-1 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title="Đóng toàn bộ vị thế ngay lập tức và dừng bot"
          >
            <span className="material-symbols-outlined text-[14px]">gpp_maybe</span>
            <span>{isPanicClosing ? 'ĐANG DỪNG...' : 'DỪNG KHẨN CẤP'}</span>
          </button>
        </div>

        {/* Desk Profile Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-outline-variant/30">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/40 flex items-center justify-center font-bold text-xs text-primary">
              BN
            </div>
            <span className="absolute -bottom-1 -right-1 font-['Manrope'] text-[9px] bg-primary text-on-primary font-bold px-1 rounded-sm shadow-sm">
              PRO
            </span>
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="font-['Manrope'] text-xs font-semibold text-on-surface leading-tight">
              Master Algo Desk
            </span>
            <span className="font-['JetBrains_Mono'] text-[10px] text-primary leading-none">
              #0892-FUTURES
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
