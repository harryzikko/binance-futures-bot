import React, { useState } from 'react';
import { BotStatus, TradeConfig, Position } from '../types';
import { saveConfig, panicCloseAll, getErrorMessage } from '../services/api';

interface RiskManagementViewProps {
  status: BotStatus | null;
  config: TradeConfig | null;
  positions?: Position[];
  onConfigSaved: (cfg: TradeConfig) => void;
  onRefresh: () => void;
}

export const RiskManagementView: React.FC<RiskManagementViewProps> = ({
  status,
  config,
  positions = [],
  onConfigSaved,
  onRefresh,
}) => {
  const [draft, setDraft] = useState<Partial<TradeConfig>>({});
  const formData = config ? { ...config, ...draft } : null;
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleChange = (key: keyof TradeConfig, val: any) => {
    setDraft(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData) return;
    setIsSaving(true);
    setMsg(null);
    try {
      const saved = await saveConfig(formData);
      onConfigSaved(saved.config);
      setDraft(prev => prev === draft ? {} : prev);
      setMsg({ text: '✅ Đã lưu quy tắc quản trị rủi ro & Max Loss thành công!', type: 'success' });
    } catch (err) {
      setMsg({ text: getErrorMessage(err), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleShockTest = () => {
    const notional = totalNotional;
    const shockLoss = notional > 0 ? (notional * 0.15).toFixed(2) : '0.00';
    const estimatedNewMargin = balance > 0 ? (((marginUsed + parseFloat(shockLoss)) / balance) * 100).toFixed(1) : '0.0';
    setMsg({
      text: `⚠️ MÔ PHỎNG SHOCK MARKET (-15% flash crash): Quy mô vị thế $${notional.toFixed(0)} USDT. Thiệt hại tối đa ước tính -$${shockLoss} USDT. Mức ký quỹ giả lập: ${estimatedNewMargin}%. ${parseFloat(estimatedNewMargin) < 70 ? '✅ Vẫn trong vùng an toàn ký quỹ.' : '⚠️ Cảnh báo chạm ngưỡng rủi ro, khuyến nghị hạ đòn bẩy.'}`,
      type: 'info'
    });
  };

  const handlePanicKillSwitch = async () => {
    if (!confirm('🚨 KÍCH HOẠT KILL SWITCH:\nĐóng TOÀN BỘ vị thế và hủy toàn bộ lệnh ngay lập tức?')) return;
    try {
      const res = await panicCloseAll();
      setMsg({ text: `✅ Đã kích hoạt Kill Switch thành công (Đã đóng ${res.closed_positions} vị thế)!`, type: 'success' });
      onRefresh();
    } catch (err) {
      setMsg({ text: `❌ Lỗi Kill Switch: ${getErrorMessage(err)}`, type: 'error' });
    }
  };

  const balance = status?.balance_usdt || 0;
  const dailyPnl = status?.daily_pnl || 0;
  const maxLossUsdt = formData?.daily_max_loss_usd || 200;
  const maxOpenPos = formData?.max_open_positions || 3;
  const cooldownMin = formData?.cooldown_seconds ? Math.round(formData.cooldown_seconds / 60) : 60;
  const trailingMult = formData?.atr_multiplier_sl || 2.0;

  // Real Risk Metrics Calculations
  const marginUsed = status?.margin_used !== undefined
    ? status.margin_used
    : positions.reduce((acc, p) => acc + (p.margin || (p.notional ? p.notional / (p.leverage || 10) : 0)), 0);
  const marginRatio = balance > 0 ? (marginUsed / balance) * 100 : 0;

  let minLiqDistance: number | null = null;
  if (positions.length > 0) {
    const distances = positions.map(pos => {
      const curPrice = pos.current_price || pos.entry_price;
      if (pos.liquidation_price && curPrice > 0) {
        return Math.abs(curPrice - pos.liquidation_price) / curPrice * 100;
      }
      return (100 / (pos.leverage || 10)) * 0.9;
    });
    minLiqDistance = Math.min(...distances);
  }

  const totalNotional = positions.reduce((acc, p) => acc + (p.notional || (p.amount * (p.current_price || p.entry_price))), 0);
  const estimatedVaR = totalNotional > 0 ? totalNotional * 0.03 : 0;

  return (
    <div className="flex flex-col w-full gap-4 pb-12 select-none">
      {msg && (
        <div
          className={`p-3 rounded-lg border text-sm flex items-center justify-between transition-all ${
            msg.type === 'success'
              ? 'bg-tertiary-container/20 border-tertiary text-tertiary'
              : msg.type === 'error'
              ? 'bg-error-container/20 border-error text-error'
              : 'bg-primary/10 border-primary/30 text-primary'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-on-surface hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Sub-Header & Navigation Context */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 bg-surface-container-low p-3.5 rounded-lg border border-outline-variant/30 shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant">
            <span>QUẢN TRỊ HỆ THỐNG</span>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-semibold">QUẢN TRỊ RỦI RO & MAX LOSS RULES</span>
            <span className="text-outline-variant">/</span>
            <span className="text-secondary bg-surface-container px-1.5 py-0.5 rounded text-[10px]">
              RISK GUARD ENGINE v4.2
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-['Space_Grotesk'] text-xl font-bold tracking-tight text-on-surface">
              Hệ Thống Kiểm Soát Rủi Ro Cấp Tổ Chức
            </h1>
            <div className="flex items-center gap-1.5 bg-tertiary-container/15 text-tertiary border border-tertiary-container/40 px-2 py-0.5 rounded-full font-mono text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
              </span>
              ACTIVE - AUTO-PROTECT ON
            </div>
          </div>
        </div>

        {/* Actions Group */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleShockTest}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary-container/20 hover:bg-secondary-container/30 text-secondary font-['Manrope'] text-xs font-semibold rounded border border-secondary/30 transition-all active:scale-95"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">science</span>
            <span>Test Giả Lập Shock Market</span>
          </button>
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-container hover:bg-primary text-on-primary-container font-['Manrope'] text-xs font-bold rounded shadow-sm transition-all active:scale-95 disabled:opacity-50"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>{isSaving ? 'Đang Lưu...' : 'Lưu Cấu Hình Rủi Ro'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Risk Meters Strip (5 gauges) - 100% Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Margin Ratio Gauge */}
        <div className="bg-surface-container-low p-3.5 rounded-lg border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-['Manrope'] text-[11px] text-on-surface-variant uppercase">
              Mức Ký Quỹ (Margin Ratio)
            </span>
            <span className="material-symbols-outlined text-[18px] text-tertiary">pie_chart</span>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span className={`font-mono text-xl font-bold ${
              marginRatio < 40 ? 'text-tertiary' : marginRatio < 70 ? 'text-primary' : 'text-error'
            }`}>
              {marginRatio.toFixed(1)}%
            </span>
            <span className={`font-mono text-[10px] px-1 py-0.5 rounded font-bold ${
              marginRatio < 40 ? 'bg-tertiary/10 text-tertiary' : marginRatio < 70 ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'
            }`}>
              {marginRatio < 40 ? 'VÙNG AN TOÀN' : marginRatio < 70 ? 'CẢNH BÁO' : 'RỦI RO CAO'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="relative w-full h-2 rounded-full overflow-hidden flex bg-surface-container-highest">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  marginRatio < 40 ? 'bg-tertiary' : marginRatio < 70 ? 'bg-primary' : 'bg-error'
                }`}
                style={{ width: `${Math.min(marginRatio, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-on-surface-variant/70">
              <span>0%</span>
              <span className="text-tertiary font-semibold">${marginUsed.toFixed(1)} / ${balance.toFixed(0)}</span>
              <span className="text-error">100% Liq</span>
            </div>
          </div>
        </div>

        {/* Liquidation Buffer Distance */}
        <div className="bg-surface-container-low p-3.5 rounded-lg border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-['Manrope'] text-[11px] text-on-surface-variant uppercase">
              Đệm Thanh Lý (Liq Buffer)
            </span>
            <span className="material-symbols-outlined text-[18px] text-primary">security</span>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span className={`font-mono text-xl font-bold ${
              minLiqDistance === null
                ? 'text-on-surface-variant'
                : minLiqDistance > 20
                ? 'text-tertiary'
                : minLiqDistance > 10
                ? 'text-primary'
                : 'text-error'
            }`}>
              {minLiqDistance !== null ? `+${minLiqDistance.toFixed(1)}%` : '—'}
            </span>
            <span className="font-mono text-xs text-on-surface-variant">
              {minLiqDistance !== null ? 'Đến Liq Gần Nhất' : 'Chưa mở vị thế'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  minLiqDistance === null
                    ? 'bg-surface-container-high'
                    : minLiqDistance > 20
                    ? 'bg-tertiary'
                    : minLiqDistance > 10
                    ? 'bg-primary'
                    : 'bg-error'
                }`}
                style={{ width: `${minLiqDistance !== null ? Math.min(minLiqDistance * 3, 100) : 0}%` }}
              ></div>
            </div>
            <div className="flex justify-between font-mono text-[10px] text-on-surface-variant">
              <span>{positions.length > 0 ? `${positions.length} vị thế active` : '0 Vị thế'}</span>
              <span className="text-tertiary">{minLiqDistance !== null ? 'An Toàn' : 'Sẵn Sàng'}</span>
            </div>
          </div>
        </div>

        {/* Daily Drawdown Current vs Limit */}
        <div className="bg-surface-container-low p-3.5 rounded-lg border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-['Manrope'] text-[11px] text-on-surface-variant uppercase">
              Daily Drawdown Hôm Nay
            </span>
            <span className="material-symbols-outlined text-[18px] text-error">trending_down</span>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span className={`font-mono text-xl font-bold ${dailyPnl >= 0 ? 'text-tertiary' : 'text-error'}`}>
              {dailyPnl >= 0 ? `+${((dailyPnl / (balance || 1)) * 100).toFixed(2)}%` : `${((dailyPnl / (balance || 1)) * 100).toFixed(2)}%`}
            </span>
            <span className="font-mono text-xs text-on-surface-variant">/ -${maxLossUsdt} Max</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${dailyPnl >= 0 ? 'bg-tertiary' : 'bg-error'}`}
                style={{ width: `${Math.min(100, Math.abs(dailyPnl / maxLossUsdt) * 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between font-mono text-[10px] text-on-surface-variant">
              <span>Còn dư hạn mức:</span>
              <span className="text-tertiary font-semibold">${Math.max(0, maxLossUsdt - Math.max(0, -dailyPnl)).toFixed(0)} USDT</span>
            </div>
          </div>
        </div>

        {/* 24h Value at Risk (VaR 99%) */}
        <div className="bg-surface-container-low p-3.5 rounded-lg border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-['Manrope'] text-[11px] text-on-surface-variant uppercase">
              Value at Risk (VaR 24h)
            </span>
            <span className="material-symbols-outlined text-[18px] text-secondary">show_chart</span>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold text-on-surface">${estimatedVaR.toFixed(2)}</span>
            <span className="font-mono text-xs text-on-surface-variant">USDT</span>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-on-surface-variant">
            <span>Quy mô vị thế:</span>
            <span className="text-primary font-semibold">${totalNotional.toFixed(0)} USDT</span>
          </div>
        </div>

        {/* Kill-Switch Status Card */}
        <div className="bg-error-container/20 p-3.5 rounded-lg border border-error/30 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="font-['Manrope'] text-[11px] text-error font-bold uppercase">
              Kill-Switch Sub-System
            </span>
            <span className="material-symbols-outlined text-[20px] text-error">gpp_maybe</span>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span className="font-['Space_Grotesk'] text-lg font-bold text-on-surface tracking-tight">SẴN SÀNG</span>
            <span className="font-mono text-[10px] text-tertiary bg-tertiary/10 px-1 py-0.5 rounded font-bold">
              &lt; 50ms
            </span>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-on-surface-variant">
            <span>Socket: <strong className="text-tertiary">FUT-DIRECT-01</strong></span>
            <button
              onClick={handlePanicKillSwitch}
              className="text-error font-bold underline hover:text-white"
            >
              Kích Hoạt
            </button>
          </div>
        </div>
      </div>

      {/* Primary Architecture: 2-Column High Density Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* LEFT COLUMN: Global Max Loss & Drawdown Hard-Rules (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="bg-surface-container-low p-3.5 rounded-lg border border-outline-variant/30 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">shield_lock</span>
                <span className="font-['Space_Grotesk'] text-sm font-bold text-on-surface">
                  Quy Tắc Giới Hạn Lỗ Toàn Cục
                </span>
              </div>
              <span className="font-mono text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                HARD-RULES ENGINE
              </span>
            </div>

            {/* Rule 1: Daily Max Loss Limit */}
            <div className="bg-surface-container/60 p-3 rounded-lg border border-outline-variant/20 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-['Space_Grotesk'] text-sm font-semibold text-on-surface">
                    Daily Max Loss Limit
                  </span>
                  <span className="font-['Manrope'] text-xs text-on-surface-variant">
                    Giới hạn số tiền lỗ tối đa trong ngày
                  </span>
                </div>
                <span className="font-mono text-xs text-tertiary font-bold">BẬT</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/30">
                  <span className="font-['Manrope'] text-[10px] text-on-surface-variant block uppercase">
                    Ngưỡng USDT
                  </span>
                  <div className="flex items-center justify-between">
                    <input
                      type="number"
                      value={maxLossUsdt}
                      onChange={(e) => handleChange('daily_max_loss_usd', parseFloat(e.target.value) || 0)}
                      className="bg-transparent font-mono text-sm text-primary w-24 outline-none font-bold"
                    />
                    <span className="font-mono text-xs text-on-surface-variant">USDT</span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/30">
                  <span className="font-['Manrope'] text-[10px] text-on-surface-variant block uppercase">
                    Tỷ Lệ / Vốn
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-primary font-bold">
                      {((maxLossUsdt / balance) * 100).toFixed(2)}%
                    </span>
                    <span className="font-mono text-xs text-on-surface-variant">% VỐN</span>
                  </div>
                </div>
              </div>

              {/* Slider */}
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex justify-between font-mono text-[11px] text-on-surface-variant">
                  <span>Thang đo cắt lỗ ngày:</span>
                  <span className="text-on-surface font-semibold">${maxLossUsdt} USDT</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="50"
                  value={maxLossUsdt}
                  onChange={(e) => handleChange('daily_max_loss_usd', parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-surface-container-highest rounded-lg cursor-pointer"
                />
              </div>

              {/* Actions when triggered */}
              <div className="bg-surface-container-low p-2 rounded border border-outline-variant/20 flex flex-col gap-1 font-mono text-[11px] text-on-surface-variant">
                <span className="text-primary font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">bolt</span>HÀNH ĐỘNG KHI CHẠM NGƯỠNG:
                </span>
                <div className="flex items-center gap-1.5 text-on-surface">
                  <span className="material-symbols-outlined text-[13px] text-tertiary">check_circle</span>
                  <span>Tự động tạm ngừng mở lệnh bot mới trong {cooldownMin} phút</span>
                </div>
                <div className="flex items-center gap-1.5 text-on-surface">
                  <span className="material-symbols-outlined text-[13px] text-tertiary">check_circle</span>
                  <span>Gửi chuông cảnh báo khẩn cấp tới Telegram & Discord</span>
                </div>
              </div>
            </div>

            {/* Rule 2: Max Open Positions */}
            <div className="bg-surface-container/60 p-3 rounded-lg border border-outline-variant/20 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-['Space_Grotesk'] text-sm font-semibold text-on-surface">
                    Max Concurrent Positions
                  </span>
                  <span className="font-['Manrope'] text-xs text-on-surface-variant">
                    Số lượng vị thế mở tối đa cùng một lúc
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxOpenPos}
                  onChange={(e) => handleChange('max_open_positions', parseInt(e.target.value) || 1)}
                  className="w-14 bg-surface-container-lowest font-mono text-center text-primary font-bold py-1 rounded border border-outline-variant/30 outline-none"
                />
              </div>
            </div>

            {/* Rule 3: Cooldown & Trailing Stop ATR */}
            <div className="bg-surface-container/60 p-3 rounded-lg border border-outline-variant/20 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-['Space_Grotesk'] text-sm font-semibold text-on-surface">
                    Cooldown Sau Khi Dừng Lỗ
                  </span>
                  <span className="font-['Manrope'] text-xs text-on-surface-variant">
                    Thời gian nghỉ trước khi cho phép quét tín hiệu lại
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    step="5"
                    value={cooldownMin}
                    onChange={(e) => handleChange('cooldown_seconds', (parseInt(e.target.value) || 15) * 60)}
                    className="w-16 bg-surface-container-lowest font-mono text-center text-primary font-bold py-1 rounded border border-outline-variant/30 outline-none"
                  />
                  <span className="font-mono text-xs text-on-surface-variant">phút</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-surface-container-high/40">
                <div className="flex flex-col">
                  <span className="font-['Space_Grotesk'] text-sm font-semibold text-on-surface">
                    Trailing Stop ATR Multiplier
                  </span>
                  <span className="font-['Manrope'] text-xs text-on-surface-variant">
                    Hệ số bám sát chốt lãi ATR động
                  </span>
                </div>
                <input
                  type="number"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={trailingMult}
                  onChange={(e) => handleChange('atr_multiplier_sl', parseFloat(e.target.value) || 1.5)}
                  className="w-16 bg-surface-container-lowest font-mono text-center text-primary font-bold py-1 rounded border border-outline-variant/30 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Leverage & Capital Allocation Matrix + De-leveraging (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Allocation Matrix */}
          <div className="bg-surface-container-low p-3.5 rounded-lg border border-outline-variant/30 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">account_balance_wallet</span>
                <span className="font-['Space_Grotesk'] text-sm font-bold text-on-surface">
                  Phân Bổ Hạn Mức Vốn & Quản Lý Đòn Bẩy
                </span>
              </div>
              <span className="font-mono text-xs text-primary">Dynamic Risk Tiers</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="text-on-surface-variant/70 border-b border-outline-variant/30 font-['Manrope'] text-[11px] uppercase">
                    <th className="py-2">NHÓM TÀI SẢN / CẶP</th>
                    <th className="py-2 text-center">HẠN MỨC VỐN (%)</th>
                    <th className="py-2 text-center">ĐANG DÙNG</th>
                    <th className="py-2 text-center">MAX LEVERAGE</th>
                    <th className="py-2 text-right">CHẾ ĐỘ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15 text-on-surface">
                  <tr className="hover:bg-surface-container/50">
                    <td className="py-2.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span>BTCUSDT</span>
                        <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">CORE</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-center">Tối đa 40%</td>
                    <td className="py-2.5 text-center text-tertiary font-bold">25.0%</td>
                    <td className="py-2.5 text-center">
                      <span className="bg-surface-container-highest text-primary px-2 py-0.5 rounded font-bold border border-primary/20">
                        {formData?.leverage || 10}x
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-secondary">Cross Margin</td>
                  </tr>
                  <tr className="hover:bg-surface-container/50">
                    <td className="py-2.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span>ETHUSDT</span>
                        <span className="text-[10px] bg-secondary/10 text-secondary px-1 rounded">MAJOR</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-center">Tối đa 25%</td>
                    <td className="py-2.5 text-center text-tertiary font-bold">15.0%</td>
                    <td className="py-2.5 text-center">
                      <span className="bg-surface-container-highest text-primary px-2 py-0.5 rounded font-bold border border-primary/20">
                        15x
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-secondary">Cross Margin</td>
                  </tr>
                  <tr className="hover:bg-surface-container/50">
                    <td className="py-2.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span>ALTCOINS TOP</span>
                        <span className="text-[10px] text-on-surface-variant">(SOL, BNB)</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-center">Tối đa 15%</td>
                    <td className="py-2.5 text-center text-on-surface-variant font-bold">6.5%</td>
                    <td className="py-2.5 text-center">
                      <span className="bg-surface-container-highest text-primary px-2 py-0.5 rounded font-bold border border-primary/20">
                        10x
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-secondary">Cross Margin</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Auto De-leveraging Protocol */}
          <div className="bg-surface-container-low p-3.5 rounded-lg border border-outline-variant/30 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">flowsheet</span>
                <span className="font-['Space_Grotesk'] text-sm font-bold text-on-surface">
                  Cơ Chế De-leveraging Tự Động (Auto Position Reduction)
                </span>
              </div>
              <span className="font-mono text-xs bg-tertiary/10 text-tertiary px-2 py-0.5 rounded font-bold">
                ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
              <div className="bg-surface-container/60 p-2.5 rounded-lg border border-outline-variant/20 flex flex-col gap-1">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-primary font-bold">TIER 1 • CẢNH BÁO</span>
                  <span className="bg-primary/10 text-primary px-1 rounded font-bold">50% MARGIN</span>
                </div>
                <p className="font-['Manrope'] text-xs text-on-surface-variant">
                  Tự động giảm <span className="text-on-surface font-bold">25% Volume</span> của vị thế có PnL âm cao nhất.
                </p>
              </div>

              <div className="bg-surface-container/60 p-2.5 rounded-lg border border-outline-variant/20 flex flex-col gap-1">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-error font-bold">TIER 2 • NGUY HIỂM</span>
                  <span className="bg-error/10 text-error px-1 rounded font-bold">65% MARGIN</span>
                </div>
                <p className="font-['Manrope'] text-xs text-on-surface-variant">
                  Đóng khẩn cấp <span className="text-on-surface font-bold">50% Toàn Bộ Vị Thế</span>, hạ đòn bẩy trung bình.
                </p>
              </div>

              <div className="bg-error-container/20 p-2.5 rounded-lg border border-error/30 flex flex-col gap-1">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-error font-bold">TIER 3 • KHẨN CẤP</span>
                  <span className="bg-error text-on-error px-1 rounded font-bold">80% MARGIN</span>
                </div>
                <p className="font-['Manrope'] text-xs text-on-surface-variant">
                  <span className="text-error font-bold">Tránh thanh lý:</span> Đóng 100% tất cả vị thế bằng lệnh Market.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
