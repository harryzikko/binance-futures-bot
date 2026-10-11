import React, { useState, useEffect } from 'react';
import type { BotStatus, Position } from '../types';
import { MobilePositionsTab } from './tabs/MobilePositionsTab';
import { MobileOrderBookChartTab } from './tabs/MobileOrderBookChartTab';
import { MobileStrategiesTab } from './tabs/MobileStrategiesTab';
import { MobileRiskWebhookTab } from './tabs/MobileRiskWebhookTab';

export type MobileTab = 'tong-quan-vi-the' | 'so-lenh-bieu-do' | 'chien-luoc-bots' | 'rui-ro-webhook';

export interface MobileTicker {
  symbol: string;
  price: number;
  change24h: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
}

interface MobileLayoutProps {
  status: BotStatus | null;
  positions: Position[];
  ticker: MobileTicker | null;
  onPanicCloseAll: () => void;
  onToggleBot: () => void;
  onSwitchToDesktop?: () => void;
  isPanicking?: boolean;
  isBotToggling?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  status,
  positions,
  ticker,
  onPanicCloseAll,
  onToggleBot,
  onSwitchToDesktop,
  isPanicking = false,
  isBotToggling = false,
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>('tong-quan-vi-the');
  const [currentTime, setCurrentTime] = useState<string>('09:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${h}:${m}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'tong-quan-vi-the':
        return 'Tong Quan Vi The';
      case 'so-lenh-bieu-do':
        return 'So Lenh Bieu Do';
      case 'chien-luoc-bots':
        return 'Chien Luoc Bots';
      case 'rui-ro-webhook':
        return 'Rui Ro Webhook';
    }
  };

  return (
    <div className="bg-surface text-on-surface font-['Manrope',sans-serif] min-h-screen flex flex-col selection:bg-primary selection:text-on-primary">
      {/* Fixed iOS Top Header */}
      <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/85 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] pt-safe">
        {/* iOS Native Status Bar Mock */}
        <div className="flex justify-between items-center px-4 h-6 text-on-surface-variant">
          <span className="font-['JetBrains_Mono'] text-[11px] font-semibold tracking-tight text-on-surface">
            {currentTime}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">signal_cellular_alt</span>
            <span className="material-symbols-outlined text-[14px]">wifi</span>
            <span className="material-symbols-outlined text-[16px]">battery_charging_full</span>
          </div>
        </div>

        {/* Main Header Bar */}
        <div className="h-14 px-4 flex items-center justify-between gap-2 border-b border-surface-container-high/30">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-high">
              <span className="font-['Space_Grotesk'] text-[18px] font-bold text-primary-container leading-none">
                ⚡
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-['Space_Grotesk'] text-[16px] font-bold tracking-tight text-on-surface">
                  BINANCE <span className="text-primary-container">PRO</span>
                </span>
              </div>
              <span className="font-['Manrope'] text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                {getTabTitle()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Ping Indicator */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container-high/80">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
              </span>
              <span className="font-['JetBrains_Mono'] text-[11px] text-tertiary font-semibold">12ms</span>
            </div>

            {/* Switch to Desktop button (if running in desktop browser) */}
            {onSwitchToDesktop && (
              <button
                onClick={onSwitchToDesktop}
                title="Chuyển sang giao diện máy tính"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">desktop_windows</span>
              </button>
            )}

            {/* Notifications Button */}
            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container/60 hover:bg-surface-container-high text-on-surface-variant transition-colors">
              <span className="material-symbols-outlined text-[18px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary-container" />
            </button>

            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-col relative w-full pt-20 pb-28 bg-surface min-h-screen px-4">
        {activeTab === 'tong-quan-vi-the' && (
          <MobilePositionsTab
            status={status}
            positions={positions}
            onPanicCloseAll={onPanicCloseAll}
            isPanicking={isPanicking}
          />
        )}

        {activeTab === 'so-lenh-bieu-do' && (
          <MobileOrderBookChartTab
            currentSymbol={status?.symbol ?? 'BTCUSDT'}
            ticker={ticker}
          />
        )}

        {activeTab === 'chien-luoc-bots' && (
          <MobileStrategiesTab
            status={status}
            onToggleBot={onToggleBot}
            isBotToggling={isBotToggling}
          />
        )}

        {activeTab === 'rui-ro-webhook' && (
          <MobileRiskWebhookTab
            status={status}
            onPanicCloseAll={onPanicCloseAll}
            isPanicking={isPanicking}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.6)] border-t border-surface-container-high/40">
        <div className="flex justify-around items-center h-16 px-2">
          {/* Tab 1: Vị Thế */}
          <button
            onClick={() => setActiveTab('tong-quan-vi-the')}
            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] transition-colors ${activeTab === 'tong-quan-vi-the' ? 'text-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined text-[22px]">space_dashboard</span>
            <span className="font-['Manrope'] text-[10px] font-bold tracking-normal">Vị Thế</span>
          </button>

          {/* Tab 2: Sổ Lệnh */}
          <button
            onClick={() => setActiveTab('so-lenh-bieu-do')}
            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] transition-colors ${activeTab === 'so-lenh-bieu-do' ? 'text-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined text-[22px]">candlestick_chart</span>
            <span className="font-['Manrope'] text-[10px] font-bold tracking-normal">Sổ Lệnh</span>
          </button>

          {/* Tab 3: Chiến Lược */}
          <button
            onClick={() => setActiveTab('chien-luoc-bots')}
            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] transition-colors ${activeTab === 'chien-luoc-bots' ? 'text-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined text-[22px]">smart_toy</span>
            <span className="font-['Manrope'] text-[10px] font-bold tracking-normal">Chiến Lược</span>
          </button>

          {/* Tab 4: Rủi Ro */}
          <button
            onClick={() => setActiveTab('rui-ro-webhook')}
            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] transition-colors ${activeTab === 'rui-ro-webhook' ? 'text-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined text-[22px]">shield</span>
            <span className="font-['Manrope'] text-[10px] font-bold tracking-normal">Rủi Ro</span>
          </button>
        </div>

        {/* iOS Home Indicator Bar */}
        <div className="flex justify-center items-center pb-2 pt-0.5">
          <div className="w-32 h-1 bg-surface-variant/80 rounded-full" />
        </div>
      </nav>
    </div>
  );
};
