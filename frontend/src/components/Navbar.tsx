import React from 'react';
import { BotStatus } from '../types';
import {
  Play,
  Pause,
  AlertOctagon,
  KeyRound,
  Wifi,
  WifiOff,
  TrendingUp,
  TrendingDown,
  Cpu,
  Activity,
  Calendar,
  Flame,
  History,
  Sliders
} from 'lucide-react';

export type NavTab = 'trading' | 'calendar' | 'scanner' | 'history' | 'config';

interface NavbarProps {
  isToggling: boolean;
  isPanicking: boolean;
  status: BotStatus | null;
  ticker: { symbol: string; price: number; change24h: number } | null;
  isConnected: boolean;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onToggleBot: () => void;
  onPanic: () => void;
  onOpenApiModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isToggling,
  isPanicking,
  status,
  ticker,
  isConnected,
  activeTab,
  onTabChange,
  onToggleBot,
  onPanic,
  onOpenApiModal,
}) => {
  const isRunning = status?.is_running ?? false;
  const mode = status?.mode || 'paper';
  const price = ticker?.price ?? status?.ticker?.price ?? 0;
  const change = ticker?.change24h ?? status?.ticker?.change24h ?? 0;

  const navItems: { id: NavTab; label: string; icon: typeof Activity; activeClass: string }[] = [
    {
      id: 'trading',
      label: 'Giao Dịch Live',
      icon: Activity,
      activeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-emerald-950',
    },
    {
      id: 'calendar',
      label: 'Lịch PnL',
      icon: Calendar,
      activeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-cyan-950',
    },
    {
      id: 'scanner',
      label: 'Quét Sàn',
      icon: Flame,
      activeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-amber-950',
    },
    {
      id: 'history',
      label: 'Lịch Sử Lệnh',
      icon: History,
      activeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30 shadow-purple-950',
    },
    {
      id: 'config',
      label: 'Cấu Hình Bot',
      icon: Sliders,
      activeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30 shadow-blue-950',
    },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-6 py-2.5">
      <div className="flex flex-col xl:flex-row items-center justify-between gap-3">
        {/* Brand & Market Live Ticker */}
        <div className="flex items-center gap-4 w-full xl:w-auto justify-between xl:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[2px] shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-wider bg-gradient-to-r from-emerald-400 via-teal-200 to-white bg-clip-text text-transparent">
                  BINANCE SCALPER
                </span>
                <span className="text-[9px] uppercase font-bold tracking-widest px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">HFT Futures Realtime</p>
            </div>
          </div>

          {/* Live Symbol Ticker Pill */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 shadow-inner">
            <span className="font-extrabold text-xs text-slate-300">{ticker?.symbol || status?.ticker?.symbol || status?.symbol || 'BTC/USDT'}</span>
            <div className="h-3 w-[1px] bg-slate-700" />
            <span className="font-mono font-bold text-xs text-white">
              ${price > 0 ? (price >= 1 ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : price.toFixed(6)) : '---.--'}
            </span>
            <div className={`flex items-center text-xs font-semibold ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {change >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
              {change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`}
            </div>
          </div>
        </div>

        {/* Central Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800/80 overflow-x-auto max-w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                  isActive
                    ? `${item.activeClass} border shadow-sm`
                    : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Status Indicators & Control Actions */}
        <div className="flex items-center gap-2.5 w-full xl:w-auto justify-end">
          {/* Mode Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider bg-slate-950/60 border-slate-800">
            {mode === 'paper' && (
              <span className="text-cyan-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> Giả Lập
              </span>
            )}
            {(mode === 'testnet' || mode === 'demo') && (
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> {mode === 'testnet' ? 'Testnet' : 'Demo'}
              </span>
            )}
            {mode === 'live' && (
              <span className="text-rose-400 flex items-center gap-1 font-black">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" /> LIVE
              </span>
            )}
          </div>

          {/* Connection Status */}
          <div className="flex items-center text-xs p-1.5 rounded-lg bg-slate-950/60 border border-slate-800" title={isConnected ? 'WebSocket Đang kết nối' : 'Đang kết nối lại...'}>
            {isConnected ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            )}
          </div>

          {/* API Key Modal Button */}
          <button
            onClick={onOpenApiModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700/60 hover:border-slate-600 shadow-sm"
          >
            <KeyRound className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">API</span>
          </button>

          {/* Start / Stop Toggle */}
          <button
            onClick={onToggleBot}
            disabled={isToggling || !isConnected || !status}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition shadow-lg ${
              isRunning
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400 shadow-emerald-500/20'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>DỪNG BOT</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>BẬT BOT</span>
              </>
            )}
          </button>

          {/* Emergency Panic Button */}
          <button
            onClick={onPanic}
            disabled={isPanicking}
            title="Đóng tất cả vị thế và dừng bot ngay lập tức!"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition border border-rose-500 shadow-md shadow-rose-600/30"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">PANIC</span>
          </button>
        </div>
      </div>
    </header>
  );
};
