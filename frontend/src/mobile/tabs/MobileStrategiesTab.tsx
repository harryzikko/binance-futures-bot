import React, { useState } from 'react';
import type { BotStatus } from '../../types';

interface MobileStrategiesTabProps {
  status: BotStatus | null;
  onToggleBot?: () => void;
  isBotToggling?: boolean;
}

interface BotConfigItem {
  id: string;
  name: string;
  symbol: string;
  symbolIcon: string;
  strategy: string;
  leverage: string;
  runtime: string;
  enabled: boolean;
  param1Label: string;
  param1Value: string;
  param2Label: string;
  param2Value: string;
  todayPnl: string;
  roi: string;
  apy: string;
  progressLabel: string;
  progressValue: number;
}

export const MobileStrategiesTab: React.FC<MobileStrategiesTabProps> = ({
  status,
  onToggleBot,
  isBotToggling = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'grid' | 'dca'>('all');
  const [notice, setNotice] = useState<string | null>(null);

  const [bots, setBots] = useState<BotConfigItem[]>([
    {
      id: 'btc-grid',
      name: 'BTC Ultra Grid',
      symbol: 'BTCUSDT',
      symbolIcon: '₿',
      strategy: 'Futures Grid',
      leverage: '20x CROSS',
      runtime: '14 ngày 6 giờ',
      enabled: true,
      param1Label: 'Khung Giá Lưới:',
      param1Value: '$92,000 - $98,000',
      param2Label: 'Số Tầng Lưới:',
      param2Value: '40 Grids (Cân Bằng)',
      todayPnl: '+$1,003.42 USDT',
      roi: '+24.98%',
      apy: 'APY: 184%',
      progressLabel: 'Lưới đã khớp: 26/40',
      progressValue: 65,
    },
    {
      id: 'eth-dca',
      name: 'ETH Multi-DCA',
      symbol: 'ETHUSDT',
      symbolIcon: 'Ξ',
      strategy: 'DCA Martingale',
      leverage: '15x ISOLATED',
      runtime: '4 ngày 12 giờ',
      enabled: true,
      param1Label: 'Khối Lượng Gốc:',
      param1Value: '$150 USDT / Lệnh',
      param2Label: 'Hệ Số Nhân:',
      param2Value: '1.5x Martingale',
      todayPnl: '+$612.80 USDT',
      roi: '+18.40%',
      apy: 'APY: 142%',
      progressLabel: 'Bước DCA: Step 3/5',
      progressValue: 60,
    },
    {
      id: 'sol-scalp',
      name: 'SOL Trend Scalper',
      symbol: 'SOLUSDT',
      symbolIcon: '◎',
      strategy: 'Momentum Scalper',
      leverage: '10x CROSS',
      runtime: '2 ngày 8 giờ',
      enabled: true,
      param1Label: 'Chỉ Báo Tín Hiệu:',
      param1Value: 'SuperTrend + EMA(7)',
      param2Label: 'Trailing Stop:',
      param2Value: '0.80% Kéo Đáy',
      todayPnl: '+$420.15 USDT',
      roi: '+31.20%',
      apy: 'APY: 210%',
      progressLabel: 'Win Rate: 84.2% (38 trades)',
      progressValue: 84,
    },
    {
      id: 'bnb-arb',
      name: 'BNB Delta Arbitrage',
      symbol: 'BNBUSDT',
      symbolIcon: '⬡',
      strategy: 'Rate Arbitrage',
      leverage: '5x ISOLATED',
      runtime: '18 ngày 2 giờ',
      enabled: false,
      param1Label: 'Funding Ngưỡng:',
      param1Value: '> 0.015% / 8h',
      param2Label: 'Ký Quỹ Khóa:',
      param2Value: '$2,000 USDT',
      todayPnl: '+$95.20 USDT',
      roi: '+12.80%',
      apy: 'APY: 38%',
      progressLabel: 'Cân Bằng Delta Neutral: 100%',
      progressValue: 100,
    },
  ]);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleToggleBotItem = (id: string) => {
    setBots(prev =>
      prev.map(b => {
        if (b.id === id) {
          const nextState = !b.enabled;
          showToast(`Đã ${nextState ? 'kích hoạt' : 'tạm dừng'} bot ${b.name}`);
          return { ...b, enabled: nextState };
        }
        return b;
      })
    );
  };

  const filteredBots = bots.filter(b => {
    if (filter === 'grid') return b.strategy.toLowerCase().includes('grid');
    if (filter === 'dca') return b.strategy.toLowerCase().includes('dca');
    return true;
  });

  const activeBotsCount = bots.filter(b => b.enabled).length;

  return (
    <div className="flex flex-col w-full gap-4 pb-8">
      {/* Toast Notice */}
      {notice && (
        <div className="fixed top-20 left-4 right-4 z-50 p-3 rounded-xl bg-tertiary/20 border border-tertiary/40 backdrop-blur-md shadow-2xl flex items-center gap-2 text-tertiary">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span className="font-['JetBrains_Mono'] text-[12px] font-semibold">{notice}</span>
        </div>
      )}

      {/* System Performance Overview Banner */}
      <section className="flex flex-col p-4 rounded-xl bg-surface-container-high shadow-xl relative overflow-hidden">
        {/* Ambient Glass Glow */}
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-10 w-36 h-36 rounded-full bg-tertiary-container/10 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex p-1.5 rounded-lg bg-surface-container-lowest text-primary-container">
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            </span>
            <div className="flex flex-col">
              <span className="font-['Space_Grotesk'] text-[16px] font-bold text-on-surface">Đội Hình Bot</span>
              <span className="font-['Manrope'] text-[10px] text-on-surface-variant uppercase font-bold">
                Hệ Thống Thực Thi Định Lượng
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-lowest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
            </span>
            <span className="font-['JetBrains_Mono'] text-[11px] text-tertiary font-semibold">
              {activeBotsCount}/{bots.length} Đang Chạy
            </span>
          </div>
        </div>

        {/* Metrics Strip */}
        <div className="grid grid-cols-3 gap-2 py-3 px-3 rounded-lg bg-surface-container-lowest mb-3.5 relative z-10">
          <div className="flex flex-col">
            <span className="font-['Manrope'] text-[10px] text-on-surface-variant uppercase font-bold">
              Lợi Nhuận (30D)
            </span>
            <span className="font-['JetBrains_Mono'] text-[16px] text-tertiary font-bold tracking-tight">
              +$14,890.50
            </span>
            <span className="font-['JetBrains_Mono'] text-[10px] text-tertiary/90">USDT</span>
          </div>
          <div className="flex flex-col pl-2 border-l border-surface-container-highest">
            <span className="font-['Manrope'] text-[10px] text-on-surface-variant uppercase font-bold">
              Win Rate 30D
            </span>
            <span className="font-['JetBrains_Mono'] text-[16px] text-on-surface font-bold">78.4%</span>
            <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">312 Vòng Lệnh</span>
          </div>
          <div className="flex flex-col pl-2 border-l border-surface-container-highest">
            <span className="font-['Manrope'] text-[10px] text-on-surface-variant uppercase font-bold">
              Max Drawdown
            </span>
            <span className="font-['JetBrains_Mono'] text-[16px] text-error font-bold">4.2%</span>
            <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">Rủi ro thấp</span>
          </div>
        </div>

        {/* Performance Sparkline Mini-Visualizer */}
        <div className="flex flex-col gap-1 mb-3.5 relative z-10">
          <div className="flex justify-between items-center text-on-surface-variant font-['JetBrains_Mono'] text-[11px]">
            <span>Hiệu suất 30 ngày (PnL Net)</span>
            <span className="text-tertiary font-semibold">+412.3% APY</span>
          </div>
          <div className="w-full h-10 py-0.5">
            <svg className="w-full h-full overflow-visible" fill="none" viewBox="0 0 320 36">
              <defs>
                <linearGradient id="pnlGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#32db8f" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#32db8f" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M0 32 Q 35 28, 60 25 T 120 22 T 180 14 T 240 18 T 290 8 L 320 4 L 320 36 L 0 36 Z"
                fill="url(#pnlGrad)"
              />
              <path
                d="M0 32 Q 35 28, 60 25 T 120 22 T 180 14 T 240 18 T 290 8 L 320 4"
                stroke="#59f8a9"
                strokeLinecap="round"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx="320" cy="4" fill="#f0b90b" r="3" />
            </svg>
          </div>
        </div>

        {/* Master Bot Power CTA Button */}
        <div className="grid grid-cols-2 gap-2 relative z-10">
          <button
            onClick={() => onToggleBot && onToggleBot()}
            disabled={isBotToggling}
            className={`py-2.5 px-3 rounded-lg font-['Manrope'] text-[12px] font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98] ${status?.is_running ? 'bg-error-container/80 text-on-error-container hover:bg-error-container' : 'bg-primary-container text-on-primary hover:bg-primary-fixed-dim'}`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {status?.is_running ? 'stop_circle' : 'play_circle'}
            </span>
            <span>{isBotToggling ? 'Đang Xử Lý...' : status?.is_running ? 'Dừng Toàn Cụm' : 'Bật Toàn Cụm'}</span>
          </button>
          <button
            onClick={() => showToast('Mở trình tạo chiến lược AI / Grid Builder')}
            className="py-2.5 px-3 rounded-lg bg-surface-container hover:bg-surface-container-highest text-on-surface font-['Manrope'] text-[12px] font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Tạo Bot Mới</span>
          </button>
        </div>
      </section>

      {/* Filter & View Segments */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-['Space_Grotesk'] text-[16px] font-bold text-on-surface">Chiến Lược Hoạt Động</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-['JetBrains_Mono'] text-[11px]">
            {filteredBots.length} bots
          </span>
        </div>
        <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded font-['JetBrains_Mono'] text-[11px] font-bold transition-colors ${filter === 'all' ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Tất Cả
          </button>
          <button
            onClick={() => setFilter('grid')}
            className={`px-2.5 py-1 rounded font-['JetBrains_Mono'] text-[11px] transition-colors ${filter === 'grid' ? 'bg-primary-container text-on-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setFilter('dca')}
            className={`px-2.5 py-1 rounded font-['JetBrains_Mono'] text-[11px] transition-colors ${filter === 'dca' ? 'bg-primary-container text-on-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            DCA
          </button>
        </div>
      </div>

      {/* Bot Cards List */}
      {filteredBots.map(bot => (
        <article
          key={bot.id}
          className="flex flex-col p-4 rounded-xl bg-surface-container shadow-md relative overflow-hidden border border-surface-container-high/50"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary-container font-['Space_Grotesk'] text-[18px] font-bold">
                {bot.symbolIcon}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-['Manrope'] text-[15px] font-bold text-on-surface">{bot.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-container-lowest text-primary-container font-['JetBrains_Mono'] text-[10px] font-semibold">
                    {bot.leverage}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant font-['JetBrains_Mono'] text-[10px]">
                  <span className="text-tertiary flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[13px]">timer</span> {bot.runtime}
                  </span>
                  <span>•</span>
                  <span>{bot.strategy}</span>
                </div>
              </div>
            </div>

            {/* iOS Style Switch Toggle */}
            <button
              onClick={() => handleToggleBotItem(bot.id)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors focus:outline-none ${bot.enabled ? 'bg-secondary-container' : 'bg-surface-container-lowest'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-on-primary shadow-md transition duration-200 ease-in-out ${bot.enabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Parameter Tag Chips */}
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-surface-container-lowest mb-3 font-['JetBrains_Mono'] text-[11px]">
            <div className="flex flex-col">
              <span className="text-on-surface-variant text-[10px]">{bot.param1Label}</span>
              <span className="text-on-surface font-semibold">{bot.param1Value}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-on-surface-variant text-[10px]">{bot.param2Label}</span>
              <span className="text-on-surface font-semibold">{bot.param2Value}</span>
            </div>
          </div>

          {/* Real-time PnL & Yield Bar */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-high mb-3">
            <div className="flex flex-col">
              <span className="font-['Manrope'] text-[10px] text-on-surface-variant uppercase font-bold">
                Lãi Hôm Nay
              </span>
              <span className="font-['JetBrains_Mono'] text-[16px] text-tertiary font-bold tracking-tight">
                {bot.todayPnl}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-['JetBrains_Mono'] text-[11px] text-tertiary font-bold px-2 py-0.5 rounded bg-surface-container-lowest">
                {bot.roi}
              </span>
              <span className="font-['Manrope'] text-[10px] text-on-surface-variant mt-1 font-semibold">{bot.apy}</span>
            </div>
          </div>

          {/* Grid Visual Indicator */}
          <div className="flex flex-col gap-1 mb-3.5">
            <div className="flex justify-between font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">
              <span>{bot.progressLabel}</span>
              <span className="text-tertiary font-semibold">{bot.progressValue}%</span>
            </div>
            <div className="w-full bg-surface-container-lowest h-2 rounded-full overflow-hidden flex">
              <div className="bg-tertiary h-full transition-all duration-300" style={{ width: `${bot.progressValue}%` }} />
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => showToast(`Mở cài đặt cho ${bot.name}`)}
              className="py-2 px-2 rounded-lg bg-surface-container-highest hover:bg-surface-variant text-on-surface font-['Manrope'] text-[11px] font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">tune</span>
              <span>Cấu Hình</span>
            </button>
            <button
              onClick={() => showToast(`Đã thu hoạch chốt lời ${bot.name}`)}
              className="py-2 px-2 rounded-lg bg-tertiary/15 hover:bg-tertiary/25 text-tertiary font-['Manrope'] text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">savings</span>
              <span>Chốt Lãi</span>
            </button>
            <button
              onClick={() => handleToggleBotItem(bot.id)}
              className={`py-2 px-2 rounded-lg font-['Manrope'] text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all ${bot.enabled ? 'bg-error-container/40 hover:bg-error-container/60 text-error' : 'bg-tertiary/15 text-tertiary'}`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {bot.enabled ? 'stop_circle' : 'play_circle'}
              </span>
              <span>{bot.enabled ? 'Tạm Dừng' : 'Kích Hoạt'}</span>
            </button>
          </div>
        </article>
      ))}
    </div>
  );
};
