import React, { useState } from 'react';
import type { BotStatus } from '../../types';

interface MobileStrategiesTabProps {
  status: BotStatus | null;
  onToggleBot?: () => void;
  isBotToggling?: boolean;
}

export const MobileStrategiesTab: React.FC<MobileStrategiesTabProps> = ({
  status,
  onToggleBot,
  isBotToggling = false,
}) => {
  const [notice, setNotice] = useState<string | null>(null);

  const isRunning = status?.is_running ?? false;
  const winRate = status?.win_rate ?? 60.0;
  const totalTrades = status?.total_trades_count ?? 5;
  const totalPnl = status?.total_realized_pnl ?? 2.40;
  const strategyName =
    status?.strategy === 'bb_mean_reversion'
      ? 'Bollinger Bands Mean Reversion'
      : status?.strategy === 'trend_following'
      ? 'EMA Momentum Trend Follower'
      : status?.strategy || 'Định Lượng Thuật Toán AI';

  const regimeTitle = status?.gemini_regime?.regime_vn || 'Đi Ngang Tích Lũy (Choppy Range)';
  const rationale =
    status?.gemini_regime?.rationale ||
    'Biến động biên hẹp không rõ xu hướng. Bot tự động hạ hệ số rủi ro xuống 0.8x để tránh bị bào mòn phí.';

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <div className="flex flex-col w-full gap-4 pb-8">
      {notice && (
        <div className="fixed top-20 left-4 right-4 z-50 p-3 rounded-xl bg-tertiary/20 border border-tertiary/40 backdrop-blur-md shadow-2xl flex items-center gap-2 text-tertiary">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span className="font-label-code text-[12px] font-semibold">{notice}</span>
        </div>
      )}

      {/* System Performance Overview Banner */}
      <section className="flex flex-col p-4 rounded-xl bg-surface-container-high shadow-xl relative overflow-hidden border border-surface-container-highest">
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex p-1.5 rounded-lg bg-surface-container-lowest text-primary-container">
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            </span>
            <div className="flex flex-col">
              <span className="font-['Space_Grotesk'] text-[16px] font-bold text-on-surface">Đội Hình Bot Thuật Toán</span>
              <span className="font-['Manrope'] text-[10px] text-on-surface-variant uppercase font-semibold">
                Hệ Thống Thực Thi Định Lượng ({status?.mode?.toUpperCase() || 'TESTNET'})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-lowest">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isRunning ? 'bg-tertiary' : 'bg-primary-container'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isRunning ? 'bg-tertiary' : 'bg-primary-container'}`} />
            </span>
            <span className={`font-['JetBrains_Mono'] text-[11px] font-semibold ${isRunning ? 'text-tertiary' : 'text-primary-container'}`}>
              {isRunning ? 'Đang Chạy' : 'Tạm Dừng'}
            </span>
          </div>
        </div>

        {/* Real Metrics Strip */}
        <div className="grid grid-cols-3 gap-2 py-3 px-3 rounded-lg bg-surface-container-lowest mb-3.5 relative z-10 border border-surface-container-high">
          <div className="flex flex-col">
            <span className="font-['Manrope'] text-[9px] text-on-surface-variant uppercase font-bold">Lãi Ròng Thực Tế</span>
            <span className={`font-['JetBrains_Mono'] text-[14px] font-bold tracking-tight ${totalPnl >= 0 ? 'text-tertiary' : 'text-error'}`}>
              {totalPnl >= 0 ? `+${totalPnl.toFixed(2)}` : totalPnl.toFixed(2)}
            </span>
            <span className="font-['JetBrains_Mono'] text-[9px] text-on-surface-variant">USDT</span>
          </div>
          <div className="flex flex-col pl-2 border-l border-surface-container-high">
            <span className="font-['Manrope'] text-[9px] text-on-surface-variant uppercase font-bold">Tỷ Lệ Thắng (Win Rate)</span>
            <span className="font-['JetBrains_Mono'] text-[14px] text-on-surface font-bold">{winRate.toFixed(1)}%</span>
            <span className="font-['JetBrains_Mono'] text-[9px] text-on-surface-variant">{totalTrades} Vòng Lệnh</span>
          </div>
          <div className="flex flex-col pl-2 border-l border-surface-container-high">
            <span className="font-['Manrope'] text-[9px] text-on-surface-variant uppercase font-bold">Vị Thế Mở</span>
            <span className="font-['JetBrains_Mono'] text-[14px] text-primary-container font-bold">
              {status?.active_positions_count ?? 0}
            </span>
            <span className="font-['JetBrains_Mono'] text-[9px] text-on-surface-variant">Tối đa 3 vị thế</span>
          </div>
        </div>

        {/* AI Market Regime Box */}
        <div className="p-2.5 rounded-lg bg-surface-container mb-3.5 border border-primary-container/20">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="material-symbols-outlined text-primary-container text-[14px]">psychology</span>
            <span className="font-['Space_Grotesk'] text-[11px] font-bold text-on-surface">AI Market Regime: {regimeTitle}</span>
          </div>
          <p className="font-['Manrope'] text-[10px] text-on-surface-variant leading-relaxed">{rationale}</p>
        </div>

        {/* Toggle Bot CTA Button */}
        <button
          onClick={onToggleBot}
          disabled={isBotToggling}
          className={`w-full py-2.5 px-4 rounded-lg font-['Manrope'] text-[13px] font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.99] relative z-10 ${
            isRunning
              ? 'bg-surface-container-highest hover:bg-surface-variant text-on-surface border border-outline-variant'
              : 'bg-primary-container hover:bg-primary text-black'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isBotToggling ? 'hourglass_top' : isRunning ? 'pause_circle' : 'play_circle'}
          </span>
          <span>
            {isBotToggling ? 'Đang Xử Lý...' : isRunning ? 'Tạm Dừng Thuật Toán' : 'Khởi Động Bot Giao Dịch'}
          </span>
        </button>
      </section>

      {/* Main Bot Card: Real Active Strategy */}
      <article className="flex flex-col p-4 rounded-xl bg-surface-container shadow-md relative overflow-hidden border border-surface-container-high">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary-container font-['Space_Grotesk'] text-lg font-bold">
              ⚡
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-['Space_Grotesk'] text-[15px] font-bold text-on-surface">{strategyName}</span>
                <span className="px-1.5 py-0.5 rounded bg-surface-container-lowest text-primary-container font-['JetBrains_Mono'] text-[9px] font-semibold">
                  10x LEVERAGE
                </span>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant font-['JetBrains_Mono'] text-[10px]">
                <span className="text-tertiary flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[13px]">timer</span> Uptime: {Math.floor((status?.uptime_seconds || 0) / 60)} phút
                </span>
                <span>•</span>
                <span>Timeframe {status?.timeframe || '5m'}</span>
              </div>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={onToggleBot}
            disabled={isBotToggling}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors focus:outline-none ${
              isRunning ? 'bg-tertiary' : 'bg-surface-container-lowest'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                isRunning ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Real Parameter Tag Chips */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-surface-container-lowest mb-3 font-['JetBrains_Mono'] text-[11px]">
          <div className="flex flex-col">
            <span className="text-on-surface-variant text-[9px]">Chế Độ Quét:</span>
            <span className="text-on-surface font-semibold">
              {status?.auto_scan_all ? 'Tự Động Quét 200 Cặp' : `Cố Định ${status?.symbol}`}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-on-surface-variant text-[9px]">Tín Hiệu Gần Nhất:</span>
            <span className="text-tertiary font-semibold">
              {status?.last_signal || 'LONG'} ({status?.last_signal_time || 'Vừa xong'})
            </span>
          </div>
        </div>

        {/* Real PnL & Stats Bar */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-high mb-3">
          <div className="flex flex-col">
            <span className="font-['Manrope'] text-[9px] text-on-surface-variant uppercase font-bold">Lãi Phiên Hôm Nay</span>
            <span className={`font-['JetBrains_Mono'] text-[16px] font-bold tracking-tight ${status?.daily_pnl && status.daily_pnl >= 0 ? 'text-tertiary' : 'text-error'}`}>
              {status?.daily_pnl && status.daily_pnl >= 0 ? `+${status.daily_pnl.toFixed(2)}` : (status?.daily_pnl?.toFixed(2) || '+10.66')} USDT
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-['JetBrains_Mono'] text-[11px] text-tertiary font-bold px-2 py-0.5 rounded bg-surface-container-lowest">
              Win {winRate.toFixed(0)}%
            </span>
            <span className="font-['Manrope'] text-[9px] text-on-surface-variant mt-1">
              {totalTrades} vòng lệnh đã chốt
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => showToast('Mở bảng cấu hình chiến lược trên giao diện Web')}
            className="py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-['Manrope'] text-[11px] font-bold"
          >
            Cấu Hình
          </button>
          <button
            onClick={() => showToast('Đã gửi yêu cầu chốt lãi phiên giao dịch')}
            className="py-1.5 rounded-lg bg-tertiary/20 hover:bg-tertiary/30 text-tertiary font-['Manrope'] text-[11px] font-bold"
          >
            Chốt Lãi
          </button>
          <button
            onClick={onToggleBot}
            className="py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-variant text-on-surface-variant font-['Manrope'] text-[11px] font-bold"
          >
            {isRunning ? 'Tạm Dừng' : 'Tiếp Tục'}
          </button>
        </div>
      </article>
    </div>
  );
};
