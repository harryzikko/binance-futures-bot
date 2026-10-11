import React from 'react';

export type TabPath =
  | 'dashboard'
  | 'chien-luoc'
  | 'kiem-thu-backtest'
  | 'vi-the-mo-lenh'
  | 'phan-tich-pnl-lich-su'
  | 'quan-ly-von-risk'
  | 'cai-dat-api-binance';

interface SidebarProps {
  currentTab: TabPath;
  onTabChange: (tab: TabPath) => void;
  latencyMs?: number;
  onOpenPinModal?: () => void;
  isPinEnabled?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  latencyMs = 12,
  onOpenPinModal,
  isPinEnabled = false,
}) => {
  const navItems: { path: TabPath; label: string; icon: string }[] = [
    { path: 'dashboard', label: 'Dashboard Tổng Quan', icon: 'speed' },
    { path: 'chien-luoc', label: 'Chiến Lược Bots', icon: 'smart_toy' },
    { path: 'kiem-thu-backtest', label: 'Kiểm Thử Backtesting', icon: 'science' },
    { path: 'vi-the-mo-lenh', label: 'Vị Thế & Sổ Lệnh', icon: 'receipt_long' },
    { path: 'phan-tich-pnl-lich-su', label: 'Phân Tích PnL & Log', icon: 'monitoring' },
    { path: 'quan-ly-von-risk', label: 'Quản Trị Rủi Ro Risk', icon: 'shield' },
    { path: 'cai-dat-api-binance', label: 'API Binance & Webhook', icon: 'key' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest border-r border-outline-variant/30 z-50 flex flex-col justify-between select-none">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center gap-2 border-b border-outline-variant/30">
          <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center font-black text-on-primary-container text-sm shadow-md">
            BN
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-['Space_Grotesk'] text-base font-bold tracking-tight text-on-surface">
                BINANCE BOT
              </span>
              <span className="font-['Space_Grotesk'] text-base font-bold text-primary">
                PRO
              </span>
            </div>
            <span className="font-['Manrope'] text-[10px] font-bold tracking-wider text-primary px-1.5 py-0.2 rounded bg-surface-container-high/80 border border-primary/30 w-fit">
              FUTURES USDT-M
            </span>
          </div>
        </div>

        {/* Section Title */}
        <div className="px-4 py-2">
          <div className="text-on-surface-variant/70 font-['Manrope'] text-[10px] font-bold uppercase tracking-wider">
            Execution Terminal
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex flex-col gap-1 px-2">
          {navItems.map((item) => {
            const isActive = currentTab === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => onTabChange(item.path)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left text-xs ${
                  isActive
                    ? 'bg-surface-container-high text-primary border-l-2 border-primary font-bold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] transition-colors ${
                    isActive ? 'text-primary' : 'text-on-surface-variant'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Telemetry Footer */}
      <div className="p-3 border-t border-outline-variant/30 bg-surface-container-low/40 flex flex-col gap-2">
        <div className="flex items-center justify-between text-on-surface-variant font-['JetBrains_Mono'] text-[11px]">
          <span>RATE LIMIT FUTURES</span>
          <span className="text-tertiary font-bold">240 / 1200</span>
        </div>
        <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
          <div className="bg-tertiary-container h-full rounded-full w-[20%] transition-all"></div>
        </div>
        <div className="flex items-center justify-between text-on-surface-variant font-['JetBrains_Mono'] text-[11px]">
          <span>SERVER LATENCY</span>
          <span className="text-tertiary flex items-center gap-1 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
            {latencyMs}ms
          </span>
        </div>

        {onOpenPinModal && (
          <button
            type="button"
            onClick={onOpenPinModal}
            className="flex items-center justify-between p-1.5 rounded-lg bg-surface-container-high/60 hover:bg-surface-container-high border border-outline-variant/30 text-[10px] text-on-surface-variant transition-all font-mono"
          >
            <span className="flex items-center gap-1.5 font-bold">
              <span className={`material-symbols-outlined text-[14px] ${isPinEnabled ? 'text-primary' : 'text-on-surface-variant'}`}>
                {isPinEnabled ? 'lock' : 'lock_open'}
              </span>
              <span>BẢO MẬT PIN</span>
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isPinEnabled ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
              {isPinEnabled ? 'ĐANG BẬT' : 'CHƯA BẬT'}
            </span>
          </button>
        )}
      </div>
    </aside>
  );
};
