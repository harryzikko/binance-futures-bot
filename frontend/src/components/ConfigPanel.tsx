import React, { useState, useEffect } from 'react';
import { TradeConfig } from '../types';
import { getConfig, updateConfig, resetPaperBalance, getErrorMessage } from '../services/api';
import { Sliders, RefreshCw, Save, CheckCircle2, RotateCcw, Activity, BrainCircuit } from 'lucide-react';

interface ConfigPanelProps {
  onConfigSaved?: (config: TradeConfig) => void;
}

const hasValue = (value: number | null | undefined) => value != null && Number.isFinite(value);
export const ConfigPanel: React.FC<ConfigPanelProps> = ({ onConfigSaved }) => {
  const [config, setConfig] = useState<TradeConfig>({
    mode: 'paper',
    symbol: 'BTC/USDT',
    timeframe: '1m',
    strategy: 'trend_pullback',
    leverage: 10,
    margin_type: 'ISOLATED',
    position_size_usd: 100,
    max_open_positions: 3,
    auto_scan_all: true,
    scan_top_n: 25,
    min_volume_24h: 15000000,
    position_size_percent: null,
    risk_sizing_enabled: true,
    risk_per_trade_pct: 0.5,
    trend_filter_enabled: true,
    trend_filter_timeframes: '15m+1h',
    take_profit_pct: 1.2,
    stop_loss_pct: 0.6,
    trailing_stop_enabled: true,
    trailing_stop_activation_pct: 0.5,
    trailing_stop_callback_pct: 0.25,
    daily_max_loss_usd: 50,
    cooldown_seconds: 30,
    rsi_period: 14,
    rsi_oversold: 35,
    rsi_overbought: 65,
    ema_fast: 9,
    ema_slow: 21,
    ema_trend: 50,
    bb_period: 20,
    bb_std: 2.0,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMode, setSavedMode] = useState<TradeConfig['mode'] | null>(null);

  useEffect(() => {
    let active = true;
    getConfig().then(res => {
      if (!active) return;
      setConfig(res);
      setSavedMode(res.mode);
      setIsLoaded(true);
    }).catch(err => { if (active) setError(getErrorMessage(err)); });
    return () => { active = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || isSaving) return;
    if (config.mode === 'live' && !window.confirm('Lưu chế độ LIVE có thể khiến bot đang chạy giao dịch bằng tiền thật. Tiếp tục?')) return;
    if (!config.symbol.includes('/') || !config.timeframe ||
        ![config.leverage, config.position_size_usd, config.take_profit_pct, config.stop_loss_pct,
          config.daily_max_loss_usd, config.cooldown_seconds, config.risk_per_trade_pct ?? 0.5].every(value => hasValue(value) && value > 0)) {
      setError('Cặp coin phải có dạng BTC/USDT; các thông số vốn và rủi ro phải lớn hơn 0.');
      return;
    }
    if (config.trailing_stop_enabled && (config.trailing_stop_activation_pct <= 0 || config.trailing_stop_callback_pct <= 0)) {
      setError('Thông số trailing stop phải lớn hơn 0.');
      return;
    }
    setError(null);
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const result = await updateConfig(config);
      setConfig(result.config);
      setSavedMode(result.config.mode);
      setSaveSuccess(true);
      onConfigSaved?.(result.config);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPaper = async () => {
    if (!isLoaded || savedMode !== 'paper' || isResetting) return;
    if (!confirm('Đặt lại số dư tài khoản giả lập về $10,000 USDT?')) return;
    setIsResetting(true);
    try {
      await resetPaperBalance(10000);
      alert('Đã đặt lại số dư giả lập về 10,000 USDT!');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Sliders className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white">Cấu Hình Lướt Sóng & Quản Lý Vốn</h3>
        </div>
        {isLoaded && savedMode === 'paper' && (
          <button
            onClick={handleResetPaper}
            disabled={isResetting}
            className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-1 rounded-lg transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Số Dư ($10k)</span>
          </button>
        )}
      </div>

      {error && <p role="alert" className="text-xs text-rose-400 mb-3">{error}</p>}
      {!isLoaded && <p role="status" className="text-xs text-slate-400 mb-3">Cấu hình chưa tải được. Không thể lưu giá trị mặc định; hãy mở lại tab để thử lại.</p>}
      <form onSubmit={handleSave} className="space-y-4">
        <fieldset disabled={!isLoaded || isSaving} className="space-y-4">
        {/* Full Automation Switch Banner */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                TỰ ĐỘNG QUÉT & VÀO LỆNH TOÀN SÀN
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Tự động quét liên tục Top coin thanh khoản cao trên Binance. Khi coin nào đủ tín hiệu sẽ tự động khớp lệnh ngay!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.auto_scan_all ?? true}
                onChange={(e) => setConfig({ ...config, auto_scan_all: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>

        {/* Scan Top N Coins Setting (visible when auto_scan_all is enabled) */}
        {config.auto_scan_all && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Số cặp tối đa trong danh sách quét</label>
              <select
                value={config.scan_top_n ?? 25}
                onChange={(e) => setConfig({ ...config, scan_top_n: parseInt(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="15">Top 15 Coin thanh khoản cao nhất</option>
                <option value="25">Top 25 Coin thanh khoản cao nhất (Khuyên dùng)</option>
                <option value="35">Top 35 Coin thanh khoản cao nhất</option>
                <option value="50">Top 50 Coin thanh khoản cao nhất</option>
                <option value="100">Top 100 cặp (API chậm hơn)</option>
                <option value="150">Top 150 cặp (API chậm hơn)</option>
                <option value="200">Top 200 cặp (giới hạn cấu hình)</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Chỉ lấy cặp USDT-M đạt thanh khoản tối thiểu; xử lý theo batch, không quét đồng thời.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Số Lệnh Mở Tối Đa Cùng Lúc</label>
              <select
                value={config.max_open_positions ?? 3}
                onChange={(e) => setConfig({ ...config, max_open_positions: parseInt(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500"
              >
                <option value="1">Tối đa 1 Lệnh (An toàn tuyệt đối)</option>
                <option value="2">Tối đa 2 Lệnh cùng lúc trên 2 coin</option>
                <option value="3">Tối đa 3 Lệnh cùng lúc trên 3 coin (Khuyên dùng)</option>
                <option value="5">Tối đa 5 Lệnh cùng lúc</option>
              </select>
            </div>
          </div>
        )}

        {/* Trading Mode & Strategy Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Chế Độ Giao Dịch</label>
            <select
              value={config.mode}
              onChange={(e) => setConfig({ ...config, mode: e.target.value as TradeConfig['mode'] })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="paper">Giả Lập (Paper Trading - Không rủi ro)</option>
              <option value="testnet">Binance Futures Testnet (API Testnet)</option>
              <option value="demo">Binance Futures Demo (API Demo)</option>
              <option value="live">Binance Futures LIVE (Tài khoản thật)</option>
            </select>
          </div>

          {/* Strategy */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Chiến Thuật Lướt Sóng</label>
            <select
              value={config.strategy}
              onChange={(e) => setConfig({ ...config, strategy: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
            >
              <option value="trend_pullback">Trend Pullback (EMA Ribbon + RSI)</option>
              <option value="bb_mean_reversion">Bollinger Bands Mean Reversion</option>
              <option value="breakout">Breakout Momentum (Volume Surge)</option>
            </select>
          </div>

          {/* Timeframe */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Khung Nến (Timeframe)</label>
            <select
              value={config.timeframe}
              onChange={(e) => setConfig({ ...config, timeframe: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="1m">1 Phút (Siêu lướt sóng - Scalping)</option>
              <option value="3m">3 Phút (Cân bằng tín hiệu)</option>
              <option value="5m">5 Phút (Lướt sóng xu hướng rõ)</option>
              <option value="15m">15 Phút (Lướt sóng swing ngắn)</option>
              {!['1m', '3m', '5m', '15m'].includes(config.timeframe) && <option value={config.timeframe}>{config.timeframe}</option>}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs text-slate-300">Cặp coin (chế độ đơn coin)
            <input required value={config.symbol} onChange={e => setConfig({ ...config, symbol: e.target.value.trim().toUpperCase() })}
              className="block w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 mt-1" />
          </label>
          <label className="text-xs text-slate-300">Vốn mỗi lệnh (% số dư; để trống dùng USDT)
            <input type="number" min="0.1" max="100" step="any" value={config.position_size_percent ?? ''}
              onChange={e => setConfig({ ...config, position_size_percent: e.target.value === '' ? null : Number(e.target.value) })}
              className="block w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 mt-1" />
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-slate-950/50 border border-slate-800 p-3">
          <div>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={config.risk_sizing_enabled ?? true}
                onChange={e => setConfig({ ...config, risk_sizing_enabled: e.target.checked })} />
              Tự tính khối lượng theo rủi ro mỗi lệnh
            </label>
            <input type="number" min="0.1" max="5" step="0.1" value={config.risk_per_trade_pct ?? 0.5}
              onChange={e => setConfig({ ...config, risk_per_trade_pct: Number(e.target.value) })}
              className="block w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 mt-2 text-xs" />
            <p className="text-[10px] text-slate-500 mt-1">% vốn có thể lỗ tại SL, đã dự phòng phí/trượt giá; đòn bẩy tối đa là mức x phía dưới.</p>
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={config.trend_filter_enabled ?? true}
                onChange={e => setConfig({ ...config, trend_filter_enabled: e.target.checked })} />
              Xác nhận xu hướng nến đã đóng
            </label>
            <select value={config.trend_filter_timeframes ?? '15m+1h'}
              onChange={e => setConfig({ ...config, trend_filter_timeframes: e.target.value as '15m' | '1h' | '15m+1h' })}
              className="block w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 mt-2 text-xs">
              <option value="15m+1h">15m và 1h cùng hướng (khuyên dùng)</option>
              <option value="15m">Chỉ 15m</option>
              <option value="1h">Chỉ 1h</option>
            </select>
          </div>
        </div>
        {/* Leverage & Margin Sizing Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
          {/* Leverage */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300">Đòn Bẩy (Leverage)</label>
              <span className="text-xs font-mono font-black text-emerald-400">{config.leverage}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={config.leverage}
              onChange={(e) => setConfig({ ...config, leverage: parseInt(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>1x</span>
              <span>10x</span>
              <span>25x</span>
              <span>50x</span>
            </div>
          </div>

          {/* Position Margin Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Vốn Mỗi Lệnh (Margin USDT)</label>
            <div className="relative">
              <input
                type="number"
                min="5"
                max="50000"
                step="5"
                value={config.position_size_usd}
                onChange={(e) => setConfig({ ...config, position_size_usd: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-slate-500">USDT</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Khối lượng danh nghĩa: ${(config.position_size_usd * config.leverage).toFixed(0)} USD
            </span>
          </div>

          {/* Max Open Positions */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Số Vị Thế Tối Đa</label>
            <select
              value={config.max_open_positions}
              onChange={(e) => setConfig({ ...config, max_open_positions: parseInt(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="1">1 Lệnh (Khuyên dùng cho Scalping)</option>
              <option value="2">2 Lệnh cùng lúc</option>
              <option value="3">3 Lệnh cùng lúc</option>
              <option value="5">5 Lệnh cùng lúc</option>
              {![1, 2, 3, 5].includes(config.max_open_positions) && <option value={config.max_open_positions}>{config.max_open_positions} Lệnh</option>}
            </select>
            <span className="text-[10px] text-slate-500 mt-1 block">Giới hạn để tránh phân bổ quá nhiều vốn</span>
          </div>
        </div>

        {/* Take Profit & Stop Loss & Trailing */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
          {/* TP */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-emerald-400">Chốt Lời (Take Profit %)</label>
              <span className="text-xs font-mono font-black text-emerald-400">+{config.take_profit_pct}%</span>
            </div>
            <input
              type="number"
              min="0.1"
              max="20"
              step="0.1"
              value={config.take_profit_pct}
              onChange={(e) => setConfig({ ...config, take_profit_pct: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Lợi nhuận ROE ước tính: +{(config.take_profit_pct * config.leverage).toFixed(1)}%
            </span>
          </div>

          {/* SL */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-rose-400">Cắt Lỗ (Stop Loss %)</label>
              <span className="text-xs font-mono font-black text-rose-400">-{config.stop_loss_pct}%</span>
            </div>
            <input
              type="number"
              min="0.1"
              max="20"
              step="0.1"
              value={config.stop_loss_pct}
              onChange={(e) => setConfig({ ...config, stop_loss_pct: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-rose-400 focus:outline-none focus:border-rose-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Khoản lỗ tối đa ROE: -{(config.stop_loss_pct * config.leverage).toFixed(1)}%
            </span>
          </div>

          {/* Trailing Stop Callback */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-cyan-400">Dời Lỗ Tự Động (Trailing)</label>
              <input
                type="checkbox"
                checked={config.trailing_stop_enabled}
                onChange={(e) => setConfig({ ...config, trailing_stop_enabled: e.target.checked })}
                className="accent-cyan-500 w-4 h-4 cursor-pointer"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400">Kích hoạt:</span>
                <input
                  type="number"
                  step="0.1"
                  value={config.trailing_stop_activation_pct}
                  onChange={(e) => setConfig({ ...config, trailing_stop_activation_pct: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono text-cyan-300"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Khoảng dời:</span>
                <input
                  type="number"
                  step="0.05"
                  value={config.trailing_stop_callback_pct}
                  onChange={(e) => setConfig({ ...config, trailing_stop_callback_pct: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono text-cyan-300"
                />
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Khóa lợi nhuận theo sóng giá</span>
          </div>
        </div>

        {/* Quant Dynamic ATR Volatility Bands */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-slate-950/60 border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">Chốt Lời & Cắt Lỗ Thích Ứng ATR (Quant Volatility Bands)</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.use_atr_tp_sl ?? true}
                onChange={(e) => setConfig({ ...config, use_atr_tp_sl: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>
          <p className="text-[11px] text-slate-300">
            Tự động đo độ giãn biến động (ATR) của từng coin để đặt SL/TP động, tránh bị quét Stop Loss do nhiễu giá trên các coin biến động mạnh!
          </p>
          {(config.use_atr_tp_sl ?? true) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-emerald-400 mb-1">Hệ số TP (x ATR)</label>
                <input
                  type="number"
                  min="1.0"
                  max="10.0"
                  step="0.1"
                  value={config.atr_multiplier_tp ?? 2.5}
                  onChange={(e) => setConfig({ ...config, atr_multiplier_tp: parseFloat(e.target.value) || 2.5 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-400"
                />
                <span className="text-[10px] text-slate-500">Mặc định: 2.5x</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-rose-400 mb-1">Hệ số SL (x ATR)</label>
                <input
                  type="number"
                  min="0.5"
                  max="5.0"
                  step="0.1"
                  value={config.atr_multiplier_sl ?? 1.5}
                  onChange={(e) => setConfig({ ...config, atr_multiplier_sl: parseFloat(e.target.value) || 1.5 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-rose-400"
                />
                <span className="text-[10px] text-slate-500">Mặc định: 1.5x</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Sàn SL Min (%)</label>
                <input
                  type="number"
                  min="0.2"
                  max="2.0"
                  step="0.1"
                  value={config.atr_min_sl_pct ?? 0.4}
                  onChange={(e) => setConfig({ ...config, atr_min_sl_pct: parseFloat(e.target.value) || 0.4 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-200"
                />
                <span className="text-[10px] text-slate-500">Tránh phí sàn</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Trần SL Max (%)</label>
                <input
                  type="number"
                  min="1.0"
                  max="10.0"
                  step="0.1"
                  value={config.atr_max_sl_pct ?? 3.0}
                  onChange={(e) => setConfig({ ...config, atr_max_sl_pct: parseFloat(e.target.value) || 3.0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-200"
                />
                <span className="text-[10px] text-slate-500">Bảo toàn vốn</span>
              </div>
            </div>
          )}
        </div>

        {/* Gemini Macro AI Copilot */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-950/60 border border-purple-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-white">Google Gemini Macro AI Copilot</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.gemini_ai_enabled ?? true}
                onChange={(e) => setConfig({ ...config, gemini_ai_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
            </label>
          </div>
          <p className="text-[11px] text-slate-300">
            Gemini phân tích vĩ mô, cấu trúc đa khung thời gian và tự động điều chỉnh Hệ số rủi ro (Risk Multiplier) để bảo toàn vốn khi thị trường xấu.
          </p>
          {(config.gemini_ai_enabled ?? true) && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.gemini_auto_regime ?? true}
                  onChange={(e) => setConfig({ ...config, gemini_auto_regime: e.target.checked })}
                  className="rounded border-slate-800 text-purple-600 focus:ring-0"
                />
                <span>Tự động điều chỉnh hệ số rủi ro vốn (Auto Regime Multiplier)</span>
              </label>
              <span className="text-[11px] text-purple-400 font-mono font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                Model: {config.gemini_model || 'gemini-2.5-flash'}
              </span>
            </div>
          )}
        </div>

        {/* Protection & Cooldown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Giới Hạn Lỗ Trong Ngày (Daily Max Loss USDT)
            </label>
            <div className="relative">
              <input
                type="number"
                min="10"
                step="5"
                value={config.daily_max_loss_usd}
                onChange={(e) => setConfig({ ...config, daily_max_loss_usd: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-rose-500"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-slate-500">USDT</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Tự động dừng bot ngay khi tổng lỗ hôm nay vượt mức này để bảo toàn vốn
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Thời Gian Chờ Giữa Các Lệnh (Cooldown)</label>
            <div className="relative">
              <input
                type="number"
                min="5"
                step="5"
                value={config.cooldown_seconds}
                onChange={(e) => setConfig({ ...config, cooldown_seconds: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-slate-500">Giây</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Tránh vào lệnh liên tục (overtrading) khi thị trường giật nến
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" /> Đã lưu cấu hình thành công!
            </span>
          )}
          <button
            type="submit"
            disabled={isSaving || !isLoaded}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>LƯU CẤU HÌNH</span>
          </button>
        </div>
        </fieldset>
      </form>
    </div>
  );
};
