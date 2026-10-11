import React, { useState, useRef } from 'react';
import type { BotStatus } from '../../types';

interface MobileRiskWebhookTabProps {
  status: BotStatus | null;
  onPanicCloseAll: () => void;
  isPanicking?: boolean;
}

export const MobileRiskWebhookTab: React.FC<MobileRiskWebhookTabProps> = ({
  status: _status,
  onPanicCloseAll,
  isPanicking: _isPanicking = false,
}) => {
  const [rules, setRules] = useState({
    maxLossBreaker: true,
    marginHedge: true,
    slippageExit: true,
    consecutiveLoss: true,
  });

  const [channels, setChannels] = useState({
    telegram: true,
    discord: true,
    iosPush: true,
  });

  const [sliderPos, setSliderPos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label} vào clipboard!`);
  };

  // Slider Touch / Mouse handlers
  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const offsetX = clientX - rect.left - 24;
    const maxOffset = rect.width - 56;
    const clamped = Math.max(0, Math.min(offsetX, maxOffset));
    setSliderPos(clamped);

    if (clamped >= maxOffset * 0.9) {
      setIsDragging(false);
      setSliderPos(maxOffset);
      onPanicCloseAll();
      showToast('⚠️ ĐÃ KÍCH HOẠT KILL SWITCH KHẨN CẤP THÀNH CÔNG!');
      setTimeout(() => setSliderPos(0), 1500);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (!trackRef.current) return;
    const maxOffset = trackRef.current.getBoundingClientRect().width - 56;
    if (sliderPos < maxOffset * 0.9) {
      setSliderPos(0);
    }
  };

  return (
    <div className="flex flex-col w-full gap-4 pb-8">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed top-20 left-4 right-4 z-50 p-3 rounded-xl bg-tertiary/20 border border-tertiary/40 backdrop-blur-md shadow-2xl flex items-center gap-2 text-tertiary">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span className="font-['JetBrains_Mono'] text-[12px] font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* P0 Emergency Kill Switch Card */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-4 shadow-[0_0_24px_rgba(246,70,93,0.18)] border border-error/30">
        {/* Ambient Red Underglow */}
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-error/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-40 h-40 rounded-full bg-error-container/20 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col gap-3">
          {/* Header Badge Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-error animate-ping" />
              <span className="font-['Space_Grotesk'] text-[14px] text-error font-bold tracking-tight">
                KHU VỰC KHẨN CẤP P0
              </span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-error-container/40 text-on-error-container font-['Manrope'] text-[10px] font-bold">
              <span className="material-symbols-outlined text-[13px]">gpp_maybe</span>
              <span>ARMED · 4 POSITIONS</span>
            </div>
          </div>

          {/* Main Alert Title & Description */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-[20px]">warning</span>
              <h2 className="font-['Space_Grotesk'] text-[18px] font-bold text-on-surface tracking-tight">
                KILL SWITCH AN TOÀN
              </h2>
            </div>
            <p className="font-['Manrope'] text-[12px] text-on-surface-variant leading-relaxed">
              Hủy toàn bộ lệnh chờ & Đóng ngay <strong className="text-error font-semibold">4 vị thế</strong> theo giá thị trường (Market) khi phát hiện sự cố thanh khoản hoặc biến động cực đoan!
            </p>
          </div>

          {/* Tactile Swipe/Press Kill Switch Trigger */}
          <div className="mt-1 flex flex-col gap-2">
            <div
              ref={trackRef}
              onMouseMove={handleTouchMove}
              onMouseUp={handleTouchEnd}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative w-full h-14 rounded-xl bg-surface-container-lowest flex items-center p-1.5 overflow-hidden select-none touch-none border border-error/20 cursor-pointer"
            >
              {/* Track Progress Fill */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-error-container/40 transition-all pointer-events-none"
                style={{ width: `${sliderPos + 44}px` }}
              />

              {/* Track Label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none gap-1.5 text-on-surface-variant/80">
                <span className="material-symbols-outlined text-[18px] text-error animate-pulse">
                  keyboard_double_arrow_right
                </span>
                <span className="font-['Manrope'] text-[11px] tracking-widest uppercase font-bold text-error">
                  Trượt để hủy toàn bộ vị thế
                </span>
              </div>

              {/* Slider Thumb Button */}
              <div
                onMouseDown={() => setIsDragging(true)}
                onTouchStart={() => setIsDragging(true)}
                onClick={() => {
                  if (sliderPos === 0) {
                    if (window.confirm('Kích hoạt Kill Switch ngay lập tức?')) {
                      onPanicCloseAll();
                      showToast('Đã gửi lệnh dừng khẩn cấp!');
                    }
                  }
                }}
                className="relative z-10 w-11 h-11 rounded-lg bg-error text-on-error flex items-center justify-center shadow-[0_2px_12px_rgba(246,70,93,0.6)] cursor-grab active:cursor-grabbing transition-transform active:scale-95"
                style={{ transform: `translateX(${sliderPos}px)` }}
              >
                <span className="material-symbols-outlined text-[22px]">power_settings_new</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-on-surface-variant px-1 font-['JetBrains_Mono'] text-[10px]">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px] text-primary-container">lock</span>
                Xác thực 2 lớp: Soft-Arm
              </span>
              <span className="text-error">Ước tính phí: ~$4.8 USDT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Guard Metrics Overview */}
      <div className="grid grid-cols-2 gap-2">
        {/* Stat 1 */}
        <div className="rounded-xl bg-surface-container-low p-3 flex flex-col gap-1.5 shadow-sm border border-surface-container-high/40">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-['Manrope'] text-[10px] uppercase tracking-wider font-bold">
              Hạn Mức Lỗ Hôm Nay
            </span>
            <span className="material-symbols-outlined text-[14px] text-tertiary">verified_user</span>
          </div>
          <div className="flex items-baseline gap-1 font-['JetBrains_Mono']">
            <span className="text-[18px] text-on-surface font-bold">-$1,840</span>
            <span className="text-[11px] text-on-surface-variant">/ -$6.2k</span>
          </div>
          {/* Mini Progress Gauge */}
          <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
            <div className="h-full bg-tertiary rounded-full" style={{ width: '29.6%' }} />
          </div>
          <span className="font-['JetBrains_Mono'] text-[10px] text-tertiary font-medium">
            An toàn: 29.6% ngưỡng cắt
          </span>
        </div>

        {/* Stat 2 */}
        <div className="rounded-xl bg-surface-container-low p-3 flex flex-col gap-1.5 shadow-sm border border-surface-container-high/40">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-['Manrope'] text-[10px] uppercase tracking-wider font-bold">
              Tỷ Lệ Ký Quỹ
            </span>
            <span className="material-symbols-outlined text-[14px] text-primary-container">shield_with_heart</span>
          </div>
          <div className="flex items-baseline gap-1 font-['JetBrains_Mono']">
            <span className="text-[18px] text-primary-container font-bold">28.4%</span>
            <span className="text-[11px] text-on-surface-variant">/ max 50%</span>
          </div>
          {/* Mini Progress Gauge */}
          <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
            <div className="h-full bg-primary-container rounded-full" style={{ width: '56.8%' }} />
          </div>
          <span className="font-['JetBrains_Mono'] text-[10px] text-primary-container font-medium">
            Đệm an toàn còn +21.6%
          </span>
        </div>
      </div>

      {/* Risk Guard Engine Rules v4.2 */}
      <div className="rounded-xl bg-surface-container-low p-4 flex flex-col gap-3 shadow-sm border border-surface-container-high/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-secondary-container/20 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[15px]">security</span>
            </div>
            <div>
              <h3 className="font-['Space_Grotesk'] text-[15px] font-semibold text-on-surface">Risk Guard Engine</h3>
              <p className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">
                Max Loss Rules v4.2 · Execution Active
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-tertiary/10 font-['Manrope'] text-[10px] text-tertiary font-bold tracking-wider">
            4/4 ACTIVE
          </span>
        </div>

        {/* Toggles List */}
        <div className="flex flex-col gap-2 pt-1">
          {/* Rule 1 */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container">
            <div className="flex items-start gap-2.5 min-w-0 pr-2">
              <div className="w-7 h-7 rounded bg-surface-container-high flex items-center justify-center shrink-0 mt-0.5 text-error">
                <span className="material-symbols-outlined text-[16px]">trending_down</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-['Manrope'] text-[13px] font-semibold text-on-surface">Daily Max Loss Breaker</span>
                  <span className="px-1.5 py-0.2 rounded bg-surface-container-highest font-['JetBrains_Mono'] text-[10px] text-error">
                    -5.0%
                  </span>
                </div>
                <p className="font-['Manrope'] text-[11px] text-on-surface-variant truncate">
                  Tự ngắt khi tổng lỗ chạm -$6,200 USDT / 24h
                </p>
              </div>
            </div>
            <button
              onClick={() => setRules(r => ({ ...r, maxLossBreaker: !r.maxLossBreaker }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors focus:outline-none ${rules.maxLossBreaker ? 'bg-secondary-container' : 'bg-surface-container-high'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-on-primary shadow-md transition duration-200 ease-in-out ${rules.maxLossBreaker ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Rule 2 */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container">
            <div className="flex items-start gap-2.5 min-w-0 pr-2">
              <div className="w-7 h-7 rounded bg-surface-container-high flex items-center justify-center shrink-0 mt-0.5 text-primary-container">
                <span className="material-symbols-outlined text-[16px]">balance</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-['Manrope'] text-[13px] font-semibold text-on-surface">Margin &gt; 50% Auto Hedge</span>
                  <span className="px-1.5 py-0.2 rounded bg-surface-container-highest font-['JetBrains_Mono'] text-[10px] text-primary-container">
                    HEDGE
                  </span>
                </div>
                <p className="font-['Manrope'] text-[11px] text-on-surface-variant truncate">
                  Mở vị thế đối ứng cân bằng delta khi vượt ngưỡng
                </p>
              </div>
            </div>
            <button
              onClick={() => setRules(r => ({ ...r, marginHedge: !r.marginHedge }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors focus:outline-none ${rules.marginHedge ? 'bg-secondary-container' : 'bg-surface-container-high'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-on-primary shadow-md transition duration-200 ease-in-out ${rules.marginHedge ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Rule 3 */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container">
            <div className="flex items-start gap-2.5 min-w-0 pr-2">
              <div className="w-7 h-7 rounded bg-surface-container-high flex items-center justify-center shrink-0 mt-0.5 text-tertiary">
                <span className="material-symbols-outlined text-[16px]">flash_on</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-['Manrope'] text-[13px] font-semibold text-on-surface">Slippage / Flash Crash Exit</span>
                  <span className="px-1.5 py-0.2 rounded bg-surface-container-highest font-['JetBrains_Mono'] text-[10px] text-tertiary">
                    &gt;0.5% SLIP
                  </span>
                </div>
                <p className="font-['Manrope'] text-[11px] text-on-surface-variant truncate">
                  Đóng vị thế khẩn cấp nếu sổ lệnh trượt quá 0.5%
                </p>
              </div>
            </div>
            <button
              onClick={() => setRules(r => ({ ...r, slippageExit: !r.slippageExit }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors focus:outline-none ${rules.slippageExit ? 'bg-secondary-container' : 'bg-surface-container-high'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-on-primary shadow-md transition duration-200 ease-in-out ${rules.slippageExit ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Rule 4 */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container">
            <div className="flex items-start gap-2.5 min-w-0 pr-2">
              <div className="w-7 h-7 rounded bg-surface-container-high flex items-center justify-center shrink-0 mt-0.5 text-secondary">
                <span className="material-symbols-outlined text-[16px]">pause_circle</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-['Manrope'] text-[13px] font-semibold text-on-surface">Max Consecutive Losses</span>
                  <span className="px-1.5 py-0.2 rounded bg-surface-container-highest font-['JetBrains_Mono'] text-[10px] text-secondary">
                    3 TRADES
                  </span>
                </div>
                <p className="font-['Manrope'] text-[11px] text-on-surface-variant truncate">
                  Tạm dừng thuật toán sau 3 lệnh thua liên tiếp
                </p>
              </div>
            </div>
            <button
              onClick={() => setRules(r => ({ ...r, consecutiveLoss: !r.consecutiveLoss }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors focus:outline-none ${rules.consecutiveLoss ? 'bg-secondary-container' : 'bg-surface-container-high'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-on-primary shadow-md transition duration-200 ease-in-out ${rules.consecutiveLoss ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Binance API & Direct Connection Health */}
      <div className="rounded-xl bg-surface-container-low p-4 flex flex-col gap-3 shadow-sm border border-surface-container-high/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary-container/20 flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[15px]">api</span>
            </div>
            <div>
              <h3 className="font-['Space_Grotesk'] text-[15px] font-semibold text-on-surface">Binance API & Health</h3>
              <p className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">Live Connection Security Matrix</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-tertiary/10 text-tertiary">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
            <span className="font-['JetBrains_Mono'] text-[11px] font-semibold">12ms · OK</span>
          </div>
        </div>

        {/* API Info Container */}
        <div className="flex flex-col gap-2 rounded-lg bg-surface-container p-3">
          <div className="flex items-center justify-between">
            <span className="font-['Manrope'] text-[10px] uppercase text-on-surface-variant tracking-wider font-bold">
              Khóa API Kết Nối
            </span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container-highest font-['JetBrains_Mono'] text-[10px] text-tertiary">
              AES-256 GCM
            </span>
          </div>
          <div className="flex items-center justify-between bg-surface-container-lowest px-3 py-2 rounded-md font-['JetBrains_Mono'] text-[12px]">
            <span className="text-on-surface select-all">binance_live_sec_***e921</span>
            <button
              onClick={() => copyToClipboard('binance_live_sec_***e921', 'API Key')}
              className="text-on-surface-variant hover:text-primary-container transition-colors flex items-center"
            >
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
            </button>
          </div>

          {/* Scopes Pill List */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 font-['JetBrains_Mono'] text-[11px]">
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-surface-container-high text-on-surface">
              <span className="material-symbols-outlined text-[13px] text-tertiary">check_circle</span>
              <span>Read Account</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-surface-container-high text-on-surface">
              <span className="material-symbols-outlined text-[13px] text-tertiary">check_circle</span>
              <span>Futures Trading</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-error/15 text-error font-semibold">
              <span className="material-symbols-outlined text-[13px]">block</span>
              <span>Rút Tiền: Bị Cấm (An Toàn 100%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Webhook & Emergency Notifications Hub */}
      <div className="rounded-xl bg-surface-container-low p-4 flex flex-col gap-3 shadow-sm border border-surface-container-high/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-secondary-container/20 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[15px]">notifications_active</span>
            </div>
            <div>
              <h3 className="font-['Space_Grotesk'] text-[15px] font-semibold text-on-surface">Webhook & Alerts Hub</h3>
              <p className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">Đồng bộ cảnh báo đa kênh thời gian thực</p>
            </div>
          </div>
          <span className="font-['JetBrains_Mono'] text-[11px] text-tertiary font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
            4 CHANNELS
          </span>
        </div>

        {/* Alert Destinations */}
        <div className="flex flex-col gap-2">
          {/* Channel 1: TradingView Webhook */}
          <div className="p-2.5 rounded-lg bg-surface-container flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-surface-container-high flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[15px]">terminal</span>
                </div>
                <span className="font-['Manrope'] text-[13px] font-semibold text-on-surface">TradingView Webhook Engine</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-tertiary/10 font-['JetBrains_Mono'] text-[10px] text-tertiary">
                PORT 443 SSL
              </span>
            </div>
            <div className="flex items-center justify-between bg-surface-container-lowest px-2.5 py-1.5 rounded">
              <span className="font-['JetBrains_Mono'] text-[11px] text-on-surface-variant truncate mr-2 select-all">
                https://api.quantguard.trade/wh/v4/live_bf9942
              </span>
              <button
                onClick={() => copyToClipboard('https://api.quantguard.trade/wh/v4/live_bf9942', 'TradingView Webhook URL')}
                className="text-on-surface-variant hover:text-primary transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[15px]">content_copy</span>
              </button>
            </div>
          </div>

          {/* Channel 2: Telegram Bot */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="w-7 h-7 rounded bg-surface-container-high flex items-center justify-center shrink-0 text-secondary">
                <span className="material-symbols-outlined text-[16px]">send</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-['Manrope'] text-[13px] font-semibold text-on-surface">Telegram Bot Alert</span>
                  <span className="font-['JetBrains_Mono'] text-[10px] text-tertiary">&lt;250ms</span>
                </div>
                <p className="font-['Manrope'] text-[11px] text-on-surface-variant truncate">
                  @BinanceFuturesRiskBot (Cảnh báo lệnh & Stop-loss)
                </p>
              </div>
            </div>
            <button
              onClick={() => setChannels(c => ({ ...c, telegram: !c.telegram }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors focus:outline-none ${channels.telegram ? 'bg-secondary-container' : 'bg-surface-container-high'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-on-primary shadow-md transition duration-200 ease-in-out ${channels.telegram ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Channel 3: Discord Webhook */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="w-7 h-7 rounded bg-surface-container-high flex items-center justify-center shrink-0 text-secondary">
                <span className="material-symbols-outlined text-[16px]">forum</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-['Manrope'] text-[13px] font-semibold text-on-surface">Discord Alert Channel</span>
                  <span className="px-1 py-0.2 rounded bg-surface-container-highest font-['JetBrains_Mono'] text-[10px] text-secondary">
                    #alerts
                  </span>
                </div>
                <p className="font-['Manrope'] text-[11px] text-on-surface-variant truncate">
                  Kênh #alerts-emergency (Ping @RiskOfficer)
                </p>
              </div>
            </div>
            <button
              onClick={() => setChannels(c => ({ ...c, discord: !c.discord }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors focus:outline-none ${channels.discord ? 'bg-secondary-container' : 'bg-surface-container-high'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-on-primary shadow-md transition duration-200 ease-in-out ${channels.discord ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Channel 4: iOS Push Notification */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="w-7 h-7 rounded bg-surface-container-high flex items-center justify-center shrink-0 text-primary-container">
                <span className="material-symbols-outlined text-[16px]">phone_iphone</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-['Manrope'] text-[13px] font-semibold text-on-surface">iOS APNs Notification</span>
                  <span className="px-1 py-0.2 rounded bg-surface-container-highest font-['JetBrains_Mono'] text-[10px] text-tertiary">
                    NATIVE
                  </span>
                </div>
                <p className="font-['Manrope'] text-[11px] text-on-surface-variant truncate">
                  Thông báo đẩy tức thì trên màn hình khóa iPhone
                </p>
              </div>
            </div>
            <button
              onClick={() => setChannels(c => ({ ...c, iosPush: !c.iosPush }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors focus:outline-none ${channels.iosPush ? 'bg-secondary-container' : 'bg-surface-container-high'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-on-primary shadow-md transition duration-200 ease-in-out ${channels.iosPush ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
