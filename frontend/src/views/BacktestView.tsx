import React, { useState } from 'react';
import { runBacktest, saveConfig, getErrorMessage } from '../services/api';
import type { BacktestRequest, BacktestResult, TradeConfig } from '../types';

interface BacktestViewProps {
  currentConfig?: TradeConfig | null;
  onConfigApplied?: (newConfig: TradeConfig) => void;
}

export const BacktestView: React.FC<BacktestViewProps> = ({ currentConfig, onConfigApplied }) => {
  const [symbol, setSymbol] = useState(currentConfig?.symbol || 'BTC/USDT');
  const [timeframe, setTimeframe] = useState(currentConfig?.timeframe || '15m');
  const [strategy, setStrategy] = useState<'trend_pullback' | 'bb_mean_reversion' | 'breakout'>(
    (currentConfig?.strategy as 'trend_pullback' | 'bb_mean_reversion' | 'breakout') || 'trend_pullback'
  );
  const [days, setDays] = useState(14);
  const [initialBalance, setInitialBalance] = useState(1000);
  const [leverage, setLeverage] = useState(currentConfig?.leverage || 10);
  const [positionSizeUsd, setPositionSizeUsd] = useState(currentConfig?.position_size_usd || 100);
  const [takeProfitPct, setTakeProfitPct] = useState(currentConfig?.take_profit_pct || 1.5);
  const [stopLossPct, setStopLossPct] = useState(currentConfig?.stop_loss_pct || 0.8);
  const [partialTpEnabled, setPartialTpEnabled] = useState(currentConfig?.partial_tp_enabled ?? true);
  const [breakEvenEnabled, setBreakEvenEnabled] = useState(currentConfig?.break_even_enabled ?? true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);

  const handleRunBacktest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setApplySuccess(false);

    const payload: BacktestRequest = {
      symbol,
      timeframe,
      strategy,
      days,
      initial_balance: initialBalance,
      leverage,
      position_size_usd: positionSizeUsd,
      take_profit_pct: takeProfitPct,
      stop_loss_pct: stopLossPct,
      use_atr_tp_sl: true,
      partial_tp_enabled: partialTpEnabled,
      break_even_enabled: breakEvenEnabled,
      fee_pct: 0.05,
    };

    try {
      const data = await runBacktest(payload);
      setResult(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToBot = async () => {
    if (!currentConfig) return;
    try {
      const updated: TradeConfig = {
        ...currentConfig,
        symbol,
        timeframe,
        strategy,
        leverage,
        position_size_usd: positionSizeUsd,
        take_profit_pct: takeProfitPct,
        stop_loss_pct: stopLossPct,
        partial_tp_enabled: partialTpEnabled,
        break_even_enabled: breakEvenEnabled,
      };
      const res = await saveConfig(updated);
      if (res.success) {
        setApplySuccess(true);
        if (onConfigApplied) onConfigApplied(res.config);
        setTimeout(() => setApplySuccess(false), 4000);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // Generate SVG path for Equity Curve chart
  const renderEquityChart = () => {
    if (!result || !result.equity_curve || result.equity_curve.length < 2) return null;

    const points = result.equity_curve;
    const equities = points.map(p => p.equity);
    const minEq = Math.min(...equities) * 0.998;
    const maxEq = Math.max(...equities) * 1.002;
    const range = maxEq - minEq || 1;

    const width = 800;
    const height = 220;
    const padX = 20;
    const padY = 20;
    const chartW = width - padX * 2;
    const chartH = height - padY * 2;

    const coords = points.map((p, idx) => {
      const x = padX + (idx / (points.length - 1)) * chartW;
      const y = height - padY - ((p.equity - minEq) / range) * chartH;
      return { x, y, equity: p.equity, timestamp: p.timestamp };
    });

    const pathD = coords.reduce((acc, c, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`, '');
    const fillD = `${pathD} L ${coords[coords.length - 1].x.toFixed(1)} ${height - padY} L ${coords[0].x.toFixed(1)} ${height - padY} Z`;

    const isProfitable = result.total_net_pnl_usd >= 0;
    const strokeColor = isProfitable ? '#10b981' : '#f43f5e';

    return (
      <div className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">show_chart</span>
            <h4 className="font-['Space_Grotesk'] text-sm font-bold text-on-surface">
              Đường Cong Tăng Trưởng Vốn (Equity Curve)
            </h4>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-on-surface-variant">Min: ${minEq.toFixed(2)}</span>
            <span className="text-on-surface-variant">Max: ${maxEq.toFixed(2)}</span>
            <span className={`font-bold ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
              Cuối kỳ: ${result.final_balance.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 drop-shadow-md">
            <defs>
              <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Horizontal Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = padY + pct * chartH;
              return (
                <line
                  key={pct}
                  x1={padX}
                  y1={y}
                  x2={width - padX}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Area Fill */}
            <path d={fillD} fill="url(#eqGradient)" />

            {/* Stroke Line */}
            <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* End Point Circle */}
            {coords.length > 0 && (
              <circle
                cx={coords[coords.length - 1].x}
                cy={coords[coords.length - 1].y}
                r="4"
                fill={strokeColor}
                stroke="#0b0e14"
                strokeWidth="2"
              />
            )}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-['Manrope']">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-2xl">science</span>
            <h2 className="font-['Space_Grotesk'] text-xl font-bold text-on-surface">
              Kiểm Thử Chiến Thuật Trực Quan (Visual Backtester)
            </h2>
          </div>
          <p className="text-xs text-on-surface-variant max-w-2xl leading-relaxed">
            Mô phỏng 100% thuật toán trên dữ liệu nến lịch sử thực tế của Binance Futures: tính toán phí Taker (0.05%),
            Chốt lời từng phần TP1 (Scale-Out 50%) và Tự động dời SL về Hòa Vốn (Risk-Free).
          </p>
        </div>

        {result && (
          <button
            onClick={handleApplyToBot}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs transition-all shadow-md active:scale-95 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>Áp Dụng Cho Bot Live</span>
          </button>
        )}
      </div>

      {applySuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-lg">verified</span>
          <span>Đã áp dụng toàn bộ thông số chiến thuật kiểm thử thành công vào cấu hình Bot!</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-on-surface hover:text-white">✕</button>
        </div>
      )}

      {/* Simulator Parameters Form */}
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-outline-variant/20">
          <span className="material-symbols-outlined text-primary text-lg">tune</span>
          <h3 className="font-['Space_Grotesk'] text-sm font-bold text-on-surface">
            Cấu Hình Thông Số Kiểm Thử
          </h3>
        </div>

        <form onSubmit={handleRunBacktest} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Symbol */}
          <div>
            <label className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">
              Cặp Giao Dịch
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="BTC/USDT"
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:border-primary font-mono"
            />
          </div>

          {/* Timeframe */}
          <div>
            <label className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">
              Khung Thời Gian (Timeframe)
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="1m">1 Phút (1m - Scalping Cực Nhanh)</option>
              <option value="5m">5 Phút (5m - Phổ Biến)</option>
              <option value="15m">15 Phút (15m - Chuẩn Định Lượng)</option>
              <option value="1h">1 Giờ (1h - Swing / Trend Vững)</option>
              <option value="4h">4 Giờ (4h - Trung Hạn)</option>
            </select>
          </div>

          {/* Strategy */}
          <div>
            <label className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">
              Chiến Thuật
            </label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as 'trend_pullback' | 'bb_mean_reversion' | 'breakout')}
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="trend_pullback">Trend Pullback (EMA Ribbon + RSI)</option>
              <option value="bb_mean_reversion">Bollinger Bands (Mean Reversion)</option>
              <option value="breakout">Breakout Scalper (Kênh Giá Phá Vỡ)</option>
            </select>
          </div>

          {/* Simulation Days */}
          <div>
            <label className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">
              Số Ngày Mô Phỏng
            </label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="3">3 Ngày Gần Nhất</option>
              <option value="7">7 Ngày (1 Tuần)</option>
              <option value="14">14 Ngày (2 Tuần)</option>
              <option value="30">30 Ngày (1 Tháng)</option>
            </select>
          </div>

          {/* Initial Capital & Leverage */}
          <div>
            <label className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">
              Vốn Giả Lập Ban Đầu (USDT)
            </label>
            <input
              type="number"
              min={50}
              value={initialBalance}
              onChange={(e) => setInitialBalance(Number(e.target.value))}
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">
              Đòn Bẩy (Leverage)
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">
              Quy Mô Mỗi Lệnh (Margin USD)
            </label>
            <input
              type="number"
              min={10}
              value={positionSizeUsd}
              onChange={(e) => setPositionSizeUsd(Number(e.target.value))}
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">
              Chốt Lời / Cắt Lỗ (% Base)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                min="0.2"
                value={takeProfitPct}
                onChange={(e) => setTakeProfitPct(Number(e.target.value))}
                placeholder="TP %"
                className="w-1/2 bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-2 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-primary font-mono text-center"
              />
              <input
                type="number"
                step="0.1"
                min="0.2"
                value={stopLossPct}
                onChange={(e) => setStopLossPct(Number(e.target.value))}
                placeholder="SL %"
                className="w-1/2 bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-2 py-2 text-xs font-bold text-rose-400 focus:outline-none focus:border-primary font-mono text-center"
              />
            </div>
          </div>

          {/* Advanced Toggles */}
          <div className="md:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={partialTpEnabled}
                onChange={(e) => setPartialTpEnabled(e.target.checked)}
                className="rounded text-primary focus:ring-0 bg-surface-container-lowest border-outline-variant/50 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-bold text-on-surface">Chốt Lời Từng Phần TP1 (50% Scale-Out)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={breakEvenEnabled}
                onChange={(e) => setBreakEvenEnabled(e.target.checked)}
                className="rounded text-primary focus:ring-0 bg-surface-container-lowest border-outline-variant/50 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-bold text-on-surface">Khóa Hòa Vốn (Break-Even Stop Loss) sau TP1</span>
            </label>
          </div>

          {/* Run Button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
            >
              {loading ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                  <span>Đang Mô Phỏng...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">play_arrow</span>
                  <span>Chạy Kiểm Thử Ngay</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results Dashboard */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Net PnL */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Lợi Nhuận Ròng</span>
              <div className="my-1">
                <span className={`font-['Space_Grotesk'] text-lg font-bold font-mono ${result.total_net_pnl_usd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {result.total_net_pnl_usd >= 0 ? '+' : ''}${result.total_net_pnl_usd.toFixed(2)}
                </span>
                <span className={`block text-[10px] font-bold ${result.total_net_pnl_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {result.total_net_pnl_pct >= 0 ? '+' : ''}{result.total_net_pnl_pct.toFixed(2)}%
                </span>
              </div>
              <span className="text-[9px] text-on-surface-variant/70">Đã trừ toàn bộ phí sàn</span>
            </div>

            {/* Win Rate */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Tỷ Lệ Thắng</span>
              <div className="my-1">
                <span className="font-['Space_Grotesk'] text-lg font-bold font-mono text-primary">
                  {result.win_rate.toFixed(1)}%
                </span>
                <span className="block text-[10px] text-on-surface-variant font-bold">
                  {result.win_trades} thắng / {result.loss_trades} thua
                </span>
              </div>
              <span className="text-[9px] text-on-surface-variant/70">Tổng {result.total_trades} lệnh</span>
            </div>

            {/* Profit Factor */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Profit Factor</span>
              <div className="my-1">
                <span className="font-['Space_Grotesk'] text-lg font-bold font-mono text-on-surface">
                  {result.profit_factor.toFixed(2)}
                </span>
                <span className="block text-[10px] text-on-surface-variant">
                  {result.profit_factor >= 1.5 ? '⭐ Rất Tốt' : result.profit_factor >= 1.0 ? 'Khả quan' : 'Cần tối ưu'}
                </span>
              </div>
              <span className="text-[9px] text-on-surface-variant/70">Tổng Lời / Tổng Lỗ</span>
            </div>

            {/* Max Drawdown */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Sụt Giảm Vốn (DD)</span>
              <div className="my-1">
                <span className="font-['Space_Grotesk'] text-lg font-bold font-mono text-rose-400">
                  -{result.max_drawdown_pct.toFixed(2)}%
                </span>
                <span className="block text-[10px] text-rose-400/80 font-mono">
                  -${result.max_drawdown_usd.toFixed(2)}
                </span>
              </div>
              <span className="text-[9px] text-on-surface-variant/70">Mức rủi ro tối đa</span>
            </div>

            {/* Final Balance */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Số Dư Cuối Kỳ</span>
              <div className="my-1">
                <span className="font-['Space_Grotesk'] text-lg font-bold font-mono text-on-surface">
                  ${result.final_balance.toFixed(2)}
                </span>
                <span className="block text-[10px] text-on-surface-variant font-mono">
                  Vốn gốc: ${result.initial_balance.toFixed(2)}
                </span>
              </div>
              <span className="text-[9px] text-on-surface-variant/70">{result.days} ngày mô phỏng</span>
            </div>

            {/* Sharpe Ratio */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Sharpe Ratio</span>
              <div className="my-1">
                <span className="font-['Space_Grotesk'] text-lg font-bold font-mono text-cyan-400">
                  {result.sharpe_ratio.toFixed(2)}
                </span>
                <span className="block text-[10px] text-on-surface-variant">
                  {result.sharpe_ratio >= 2.0 ? 'Xuất sắc' : result.sharpe_ratio >= 1.0 ? 'Chấp nhận được' : 'Bình thường'}
                </span>
              </div>
              <span className="text-[9px] text-on-surface-variant/70">Hiệu suất rủi ro</span>
            </div>
          </div>

          {/* Equity Curve SVG Chart */}
          {renderEquityChart()}

          {/* Simulated Trades Table */}
          <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">receipt_long</span>
                <h4 className="font-['Space_Grotesk'] text-sm font-bold text-on-surface">
                  Nhật Ký Khớp Lệnh Mô Phỏng ({result.trades.length} lệnh)
                </h4>
              </div>
              <span className="text-xs text-on-surface-variant font-mono">
                {result.symbol} | {result.timeframe} | {result.strategy}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-['Manrope']">
                <thead>
                  <tr className="border-b border-outline-variant/20 text-[10px] text-on-surface-variant uppercase tracking-wider">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Thời Gian</th>
                    <th className="py-2.5 px-3">Hướng Lệnh</th>
                    <th className="py-2.5 px-3 text-right">Giá Vào</th>
                    <th className="py-2.5 px-3 text-right">Giá Thoát</th>
                    <th className="py-2.5 px-3 text-right">PnL Ròng</th>
                    <th className="py-2.5 px-3 text-right">PnL %</th>
                    <th className="py-2.5 px-3 text-right">Phí Sàn</th>
                    <th className="py-2.5 px-3">Lý Do Đóng</th>
                    <th className="py-2.5 px-3 text-right">Thời Gian Giữ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 font-mono">
                  {result.trades.map((t) => {
                    const isWin = t.pnl_usd > 0;
                    return (
                      <tr key={t.id} className="hover:bg-surface-container-high/40 transition-colors">
                        <td className="py-2.5 px-3 text-on-surface-variant">{t.id}</td>
                        <td className="py-2.5 px-3 text-[11px] text-on-surface-variant font-sans">
                          {t.entry_time.slice(5, 16)}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.side === 'LONG'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            {t.side}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-on-surface font-mono">${t.entry_price.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-on-surface font-mono">${t.exit_price.toLocaleString()}</td>
                        <td className={`py-2.5 px-3 text-right font-bold font-mono ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isWin ? '+' : ''}${t.pnl_usd.toFixed(2)}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-bold font-mono ${t.pnl_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.pnl_pct >= 0 ? '+' : ''}{t.pnl_pct.toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-3 text-right text-on-surface-variant/80 font-mono">${t.fee_usd.toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.exit_reason === 'TAKE_PROFIT'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : t.exit_reason === 'BREAK_EVEN'
                              ? 'bg-cyan-500/15 text-cyan-300'
                              : 'bg-rose-500/15 text-rose-300'
                          }`}>
                            {t.exit_reason === 'TAKE_PROFIT' ? 'Chốt Lời' : t.exit_reason === 'BREAK_EVEN' ? 'Hòa Vốn' : 'Cắt Lỗ'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-on-surface-variant text-[11px] font-sans">
                          {t.duration_minutes} phút
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
