import React, { useState } from 'react';
import { TradeConfig } from '../types';
import { saveConfig, getErrorMessage } from '../services/api';

interface StrategiesViewProps {
  config: TradeConfig | null;
  onConfigSaved: (cfg: TradeConfig) => void;
}

export const StrategiesView: React.FC<StrategiesViewProps> = ({ config, onConfigSaved }) => {
  const [draft, setDraft] = useState<Partial<TradeConfig>>({});
  const formData = config ? { ...config, ...draft } : null;
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);


  if (!formData) {
    return <div className="p-8 text-center text-on-surface-variant">Đang tải cấu hình chiến lược...</div>;
  }

  const handleChange = (key: keyof TradeConfig, val: any) => {
    setDraft(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setMsg(null);
    try {
      const saved = await saveConfig(formData);
      onConfigSaved(saved.config);
      setDraft(prev => prev === draft ? {} : prev);
      setMsg({ text: '✅ Đã lưu cấu hình chiến lược & định lượng thành công!', type: 'success' });
    } catch (err) {
      setMsg({ text: getErrorMessage(err), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-4 pb-12 select-none">
      {/* Sub-Header & Breadcrumb */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 p-4 bg-surface-container-low rounded-lg border border-outline-variant/30">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs font-['Manrope'] text-on-surface-variant">
            <span>Chiến Lược Bots</span>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <span className="text-primary font-bold">Quản Lý Thuật Toán & Dynamic ATR</span>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <span className="bg-surface-container-high px-1.5 py-0.5 rounded text-tertiary font-mono text-[10px]">
              REV_ID #8942b
            </span>
          </div>
          <h1 className="font-['Space_Grotesk'] text-xl font-bold text-on-surface tracking-tight">
            Cấu Hình Chiến Lược & Engine Định Lượng
          </h1>
        </div>

        {/* Live / Sim Mode Switcher & Save Button */}
        <div className="flex items-center flex-wrap gap-2 w-full xl:w-auto justify-end">
          <div className="flex items-center bg-surface-container-lowest p-1 rounded-lg border border-outline-variant/30 text-xs font-['Manrope']">
            <button
              type="button"
              onClick={() => handleChange('mode', 'live')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                formData.mode === 'live'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-300"></span>
              LIVE FUTURES
            </button>
            <button
              type="button"
              onClick={() => handleChange('mode', 'testnet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                formData.mode === 'testnet'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">science</span>
              TESTNET
            </button>
            <button
              type="button"
              onClick={() => handleChange('mode', 'paper')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                formData.mode === 'paper'
                  ? 'bg-surface-container-high text-primary font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              GIẢ LẬP PAPER
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-primary text-on-primary-container font-['Manrope'] text-xs font-bold rounded shadow-md transition disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>{isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình (F5)'}</span>
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-lg text-xs font-medium border ${
            msg.type === 'success'
              ? 'bg-tertiary-container/15 text-tertiary border-tertiary-container/30'
              : 'bg-error-container/20 text-error border-error-container/40'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Main 2-Column Architecture */}
      <form onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* CỘT TRÁI: THUẬT TOÁN, ATR & CHỈ BÁO (8 COLS) */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          {/* Section 1: Lựa chọn Thuật Toán Scalping */}
          <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/30 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-container-highest">
              <span className="material-symbols-outlined text-primary text-[18px]">smart_toy</span>
              <h3 className="font-['Space_Grotesk'] text-sm font-bold text-on-surface uppercase tracking-wide">
                1. Lựa Chọn Thuật Toán Scalping Cốt Lõi
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  id: 'trend_pullback',
                  title: 'Trend Pullback Scalper',
                  desc: 'Bắt điểm hồi nến về EMA 21 trong xu hướng mạnh EMA 50, kiểm tra động lượng RSI và Volume.',
                  tag: 'Khuyên Dùng',
                },
                {
                  id: 'bb_scalper',
                  title: 'Bollinger Bands Mean Reversion',
                  desc: 'Bắt đỉnh đáy nến rút râu ngoài dải Bands khi thị trường Sideway hoặc đảo chiều nhanh.',
                  tag: 'Sideway / Choppy',
                },
                {
                  id: 'breakout_scalper',
                  title: 'Breakout Volume Surge',
                  desc: 'Đánh phá vỡ đỉnh/đáy kèm khối lượng đột biến x1.5 trung bình để đón sóng bùng nổ.',
                  tag: 'High Volatility',
                },
              ].map((strat) => {
                const isSelected = formData.strategy === strat.id;
                return (
                  <button
                    key={strat.id}
                    type="button"
                    onClick={() => handleChange('strategy', strat.id)}
                    className={`p-3 rounded-lg text-left transition border flex flex-col justify-between ${
                      isSelected
                        ? 'bg-surface-container-high border-primary text-on-surface shadow-md'
                        : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-['Space_Grotesk'] text-xs font-bold text-on-surface">
                          {strat.title}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            isSelected
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container-highest text-on-surface-variant'
                          }`}
                        >
                          {strat.tag}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-80">{strat.desc}</p>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-primary font-semibold">
                      <span className="material-symbols-outlined text-[14px]">
                        {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>{isSelected ? 'Đang Sử Dụng' : 'Chọn Chiến Lược'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Hạt Nhân Định Lượng Quant: Dynamic ATR Volatility Bands */}
          <div className="p-4 bg-surface-container-low rounded-lg border border-primary/30 space-y-3 bg-gradient-to-br from-surface-container-low to-primary/5">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-highest">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
                <div>
                  <h3 className="font-['Space_Grotesk'] text-sm font-bold text-on-surface uppercase tracking-wide">
                    2. Hạt Nhân Định Lượng: Dynamic ATR Volatility Bands
                  </h3>
                  <span className="text-[11px] text-on-surface-variant">
                    Tự động co giãn Stop Loss / Take Profit theo độ biến động thực tế của từng coin
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.use_atr_tp_sl)}
                  onChange={(e) => handleChange('use_atr_tp_sl', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container"></div>
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-['JetBrains_Mono'] text-xs">
              <div className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant/30">
                <span className="text-[10px] text-on-surface-variant uppercase block mb-1">
                  Hệ Số Chốt Lời (TP)
                </span>
                <input
                  type="number"
                  step="0.1"
                  value={formData.atr_multiplier_tp || 2.5}
                  onChange={(e) => handleChange('atr_multiplier_tp', parseFloat(e.target.value))}
                  className="w-full bg-transparent font-bold text-tertiary text-sm focus:outline-none"
                />
                <span className="text-[10px] text-on-surface-variant">Mặc định: 2.5x ATR</span>
              </div>

              <div className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant/30">
                <span className="text-[10px] text-on-surface-variant uppercase block mb-1">
                  Hệ Số Cắt Lỗ (SL)
                </span>
                <input
                  type="number"
                  step="0.1"
                  value={formData.atr_multiplier_sl || 1.5}
                  onChange={(e) => handleChange('atr_multiplier_sl', parseFloat(e.target.value))}
                  className="w-full bg-transparent font-bold text-error text-sm focus:outline-none"
                />
                <span className="text-[10px] text-on-surface-variant">Mặc định: 1.5x ATR</span>
              </div>

              <div className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant/30">
                <span className="text-[10px] text-on-surface-variant uppercase block mb-1">
                  Min SL Bảo Vệ (%)
                </span>
                <input
                  type="number"
                  step="0.1"
                  value={formData.atr_min_sl_pct || 0.4}
                  onChange={(e) => handleChange('atr_min_sl_pct', parseFloat(e.target.value))}
                  className="w-full bg-transparent font-bold text-on-surface text-sm focus:outline-none"
                />
                <span className="text-[10px] text-on-surface-variant">Tránh giãn phí sàn</span>
              </div>

              <div className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant/30">
                <span className="text-[10px] text-on-surface-variant uppercase block mb-1">
                  Max SL An Toàn (%)
                </span>
                <input
                  type="number"
                  step="0.1"
                  value={formData.atr_max_sl_pct || 3.0}
                  onChange={(e) => handleChange('atr_max_sl_pct', parseFloat(e.target.value))}
                  className="w-full bg-transparent font-bold text-on-surface text-sm focus:outline-none"
                />
                <span className="text-[10px] text-on-surface-variant">Tránh quét sập flash</span>
              </div>
            </div>
          </div>

          {/* Section 3: Trí Tuệ Nhân Tạo: Gemini AI Copilot & Tự Động Học Hỏi (AI Self-Learning) */}
          <div className="p-4 bg-surface-container-low rounded-lg border border-purple-500/30 space-y-3 bg-gradient-to-br from-surface-container-low to-purple-500/5">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-highest">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400 text-[20px]">psychology</span>
                <div>
                  <h3 className="font-['Space_Grotesk'] text-sm font-bold text-on-surface uppercase tracking-wide">
                    3. Trí Tuệ Nhân Tạo: Gemini AI Copilot & Tự Học Chiến Thuật
                  </h3>
                  <span className="text-[11px] text-on-surface-variant">
                    Tự học theo chế độ thị trường (Regime), tự đổi chiến thuật và feedback loop từ lệnh lỗ
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.gemini_ai_enabled)}
                  onChange={(e) => handleChange('gemini_ai_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-['Manrope']">
              <label className="flex items-center gap-2 p-2.5 rounded bg-surface-container-lowest border border-outline-variant/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.ai_auto_strategy_switch ?? true)}
                  onChange={(e) => handleChange('ai_auto_strategy_switch', e.target.checked)}
                  className="accent-purple-500 rounded"
                />
                <div>
                  <span className="font-bold text-on-surface block">AI Tự Đổi Chiến Thuật Theo Thị Trường</span>
                  <span className="text-[11px] text-on-surface-variant">
                    Sideways ➔ Bollinger Bands; Có Trend ➔ Trend Pullback; Bão giá ➔ Đứng ngoài
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded bg-surface-container-lowest border border-outline-variant/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.ai_post_trade_learning ?? true)}
                  onChange={(e) => handleChange('ai_post_trade_learning', e.target.checked)}
                  className="accent-purple-500 rounded"
                />
                <div>
                  <span className="font-bold text-on-surface block">AI Tự Học Từ Lệnh Lỗ (Feedback Loop)</span>
                  <span className="text-[11px] text-on-surface-variant">
                    Nếu coin dính 2 SL liên tiếp ➔ Tự động Cooldown 30 phút chống quét nhiễu whipsaw
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded bg-surface-container-lowest border border-outline-variant/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.ai_auto_leverage ?? true)}
                  onChange={(e) => handleChange('ai_auto_leverage', e.target.checked)}
                  className="accent-purple-500 rounded"
                />
                <div>
                  <span className="font-bold text-on-surface block">AI Tự Động Hạ Đòn Bẩy Khi Biến Động Cao</span>
                  <span className="text-[11px] text-on-surface-variant">
                    Điều chỉnh linh hoạt trong khoảng 5x - 15x theo mức độ rủi ro đo đạc được
                  </span>
                </div>
              </label>

              <div className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <span className="font-bold text-on-surface block">Mô Hình Trí Tuệ Nhân Tạo</span>
                  <span className="text-[11px] text-on-surface-variant">Mô hình phân tích vĩ mô Google DeepMind</span>
                </div>
                <span className="font-mono text-xs text-purple-300 font-bold bg-purple-500/15 px-2 py-1 rounded border border-purple-500/30">
                  {formData.gemini_model || 'gemini-1.5-flash'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Chốt Lời Từng Phần & Khóa Hòa Vốn Risk-Free */}
          <div className="p-4 bg-surface-container-low rounded-lg border border-emerald-500/30 space-y-3 bg-gradient-to-br from-surface-container-low to-emerald-500/5">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-highest">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-[20px]">pie_chart</span>
                <div>
                  <h3 className="font-['Space_Grotesk'] text-sm font-bold text-on-surface uppercase tracking-wide">
                    4. Chốt Lời Từng Phần (Scale-Out) & Khóa Hòa Vốn (Break-Even)
                  </h3>
                  <span className="text-[11px] text-on-surface-variant">
                    Chốt 50% lợi nhuận tại TP1 và tự động dời SL về điểm vào lệnh để vị thế 100% Risk-Free
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.partial_tp_enabled ?? true)}
                  onChange={(e) => handleChange('partial_tp_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-['Manrope']">
              <div className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <span className="font-bold text-on-surface block">Tỷ Lệ Chốt Tại TP1</span>
                  <span className="text-[11px] text-on-surface-variant">Đóng bớt vị thế để bảo toàn lợi nhuận</span>
                </div>
                <div className="flex items-center gap-1 font-mono">
                  <input
                    type="number"
                    min="10"
                    max="90"
                    step="5"
                    value={formData.partial_tp_level1_pct || 50}
                    onChange={(e) => handleChange('partial_tp_level1_pct', parseFloat(e.target.value))}
                    className="w-16 bg-surface-container-high border border-outline-variant/40 rounded px-2 py-1 text-center font-bold text-emerald-400"
                  />
                  <span className="text-on-surface-variant">%</span>
                </div>
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded bg-surface-container-lowest border border-outline-variant/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.break_even_enabled ?? true)}
                  onChange={(e) => handleChange('break_even_enabled', e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <div>
                  <span className="font-bold text-on-surface block">Tự Động Dời SL Về Hòa Vốn (Break-Even)</span>
                  <span className="text-[11px] text-on-surface-variant">
                    Sau khi chạm TP1, dời SL về entry + 0.08% bù phí để triệt tiêu hoàn toàn rủi ro lỗ
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Section 5: Bộ Lọc Chi Phí & Bảo Vệ Vốn (Safeguards) */}
          <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/30 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-highest">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">security</span>
                <div>
                  <h3 className="font-['Space_Grotesk'] text-sm font-bold text-on-surface uppercase tracking-wide">
                    5. Bộ Lọc Chi Phí Sàn & Bảo Vệ Vốn (Safeguards)
                  </h3>
                  <span className="text-[11px] text-on-surface-variant">
                    Lọc rủi ro Funding Rate bất lợi, kiểm tra ngưỡng bù phí sàn và lọc sốc biến động flash
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-['Manrope']">
              <label className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant/30 flex flex-col justify-between cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.funding_rate_guard_enabled ?? true)}
                    onChange={(e) => handleChange('funding_rate_guard_enabled', e.target.checked)}
                    className="accent-primary rounded"
                  />
                  <span className="font-bold text-on-surface">Lọc Funding Rate</span>
                </div>
                <span className="text-[10px] text-on-surface-variant block mb-2">
                  Bỏ qua coin có Funding Rate vượt ngưỡng bất lợi
                </span>
                <div className="flex items-center gap-1 font-mono">
                  <span className="text-[10px] text-on-surface-variant">Max:</span>
                  <input
                    type="number"
                    step="0.005"
                    value={formData.max_funding_rate_pct || 0.03}
                    onChange={(e) => handleChange('max_funding_rate_pct', parseFloat(e.target.value))}
                    className="w-16 bg-surface-container-high border border-outline-variant/40 rounded px-1.5 py-0.5 text-center font-bold text-on-surface text-[11px]"
                  />
                  <span className="text-on-surface-variant">%</span>
                </div>
              </label>

              <div className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant/30 flex flex-col justify-between">
                <span className="font-bold text-on-surface block mb-1">Ngưỡng Bù Phí Sàn (Hurdle Rate)</span>
                <span className="text-[10px] text-on-surface-variant block mb-2">
                  TP tối thiểu phải lớn hơn phí giao dịch round-trip
                </span>
                <div className="flex items-center gap-1 font-mono">
                  <span className="text-[10px] text-on-surface-variant">Min TP:</span>
                  <input
                    type="number"
                    step="0.05"
                    value={formData.fee_hurdle_rate_pct || 0.15}
                    onChange={(e) => handleChange('fee_hurdle_rate_pct', parseFloat(e.target.value))}
                    className="w-16 bg-surface-container-high border border-outline-variant/40 rounded px-1.5 py-0.5 text-center font-bold text-on-surface text-[11px]"
                  />
                  <span className="text-on-surface-variant">%</span>
                </div>
              </div>

              <label className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant/30 flex flex-col justify-between cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.macro_news_filter_enabled ?? true)}
                    onChange={(e) => handleChange('macro_news_filter_enabled', e.target.checked)}
                    className="accent-primary rounded"
                  />
                  <span className="font-bold text-on-surface">Flash Shock Filter</span>
                </div>
                <span className="text-[10px] text-on-surface-variant">
                  Tạm ngưng mở lệnh mới khi BTC hoặc toàn sàn xuất hiện biến động giật giá cực đoan
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: QUẢN LÝ VỐN & THAM SỐ CHỈ BÁO (4 COLS) */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          {/* Cấu Hình Quản Trị Vốn & Ký Quỹ */}
          <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/30 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-container-highest">
              <span className="material-symbols-outlined text-primary text-[18px]">account_balance_wallet</span>
              <h3 className="font-['Space_Grotesk'] text-xs font-bold uppercase text-on-surface tracking-wider">
                Quản Trị Vốn & Ký Quỹ
              </h3>
            </div>

            <div className="space-y-2.5 text-xs font-['JetBrains_Mono']">
              <div>
                <span className="text-on-surface-variant block mb-1">Mức Đòn Bẩy (Leverage):</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={formData.leverage || 10}
                    onChange={(e) => handleChange('leverage', parseInt(e.target.value))}
                    className="flex-1 accent-primary h-1.5 bg-surface-container-highest rounded"
                  />
                  <span className="font-bold text-primary w-12 text-right">{formData.leverage}x</span>
                </div>
              </div>

              <div>
                <span className="text-on-surface-variant block mb-1">Quy Mô Ký Quỹ Mỗi Lệnh ($USD):</span>
                <input
                  type="number"
                  value={formData.position_size_usd || 20}
                  onChange={(e) => handleChange('position_size_usd', parseFloat(e.target.value))}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-2 text-on-surface font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <span className="text-on-surface-variant block mb-1">Số Vị Thế Mở Tối Đa Đồng Thời:</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.max_open_positions || 3}
                  onChange={(e) => handleChange('max_open_positions', parseInt(e.target.value))}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-2 text-on-surface font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <span className="text-on-surface-variant block mb-1">Thời Gian Chờ Giữa Các Lệnh (Giây):</span>
                <input
                  type="number"
                  value={formData.cooldown_seconds || 120}
                  onChange={(e) => handleChange('cooldown_seconds', parseInt(e.target.value))}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-2 text-on-surface font-bold focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 bg-primary hover:bg-primary-fixed text-on-primary font-['Manrope'] text-xs font-bold uppercase rounded shadow-md transition disabled:opacity-50"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu Toàn Bộ Cấu Hình (F5)'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
