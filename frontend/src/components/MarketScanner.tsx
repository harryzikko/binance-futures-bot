import React, { useState, useCallback, useRef, useEffect } from 'react';
import { api, getErrorMessage } from '../services/api';
import { useApiResource } from '../hooks/useApiResource';
import { RefreshCw, Flame, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';

interface MarketItem {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  volatility: number;
  signal: 'LONG' | 'SHORT' | 'NEUTRAL';
  rsi: number;
  reason: string;
}

interface MarketScannerProps {
  onSelectSymbol: (symbol: string) => void;
}

export const MarketScanner: React.FC<MarketScannerProps> = ({ onSelectSymbol }) => {
  const loader = useCallback((signal: AbortSignal) => api.get<{ markets: MarketItem[]; last_scan: string }>('/scanner/markets', { signal }).then(res => res.data), []);
  const { data, error, isLoading, reload } = useApiResource(loader);
  const [signals, setSignals] = useState<MarketItem[]>([]);
  const [isScanningSignals, setIsScanningSignals] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanController = useRef<AbortController | null>(null);
  const lastScan = data?.last_scan;
  const markets = (data?.markets ?? []).map(m => {
    const match = signals.find(o => o.symbol === m.symbol);
    return { ...m, signal: match?.signal ?? 'NEUTRAL', rsi: match?.rsi ?? 0, reason: match?.reason ?? '' };
  });

  const fetchMarkets = () => {
    scanController.current?.abort();
    setIsScanningSignals(false);
    setSignals([]);
    setScanError(null);
    reload();
  };

  const scanOpportunities = async () => {
    scanController.current?.abort();
    const controller = new AbortController();
    scanController.current = controller;
    setIsScanningSignals(true);
    setSignals([]);
    setScanError(null);
    try {
      const res = await api.get<{ opportunities: MarketItem[] }>('/scanner/opportunities', {
        params: { top_n: 15 }, signal: controller.signal, timeout: 120000,
      });
      if (!controller.signal.aborted) setSignals(res.data.opportunities);
    } catch (e) {
      if (!controller.signal.aborted) setScanError(getErrorMessage(e));
    } finally {
      if (!controller.signal.aborted) setIsScanningSignals(false);
    }
  };

  useEffect(() => () => scanController.current?.abort(), []);

  const formatPrice = (p: number) => {
    if (!p) return '0.00';
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return p.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 });
  };

  const formatVolume = (v: number) => {
    if (!v) return '$0.00';
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(2)}`;
  };

  return (
    <div className="bg-surface-container-low rounded-lg p-3.5 sm:p-4 border border-outline-variant/30 shadow-sm font-['Manrope']">
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-surface-container-highest/60 gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-['Space_Grotesk'] text-sm font-bold text-on-surface">QUÉT THỊ TRƯỜNG &amp; TÍN HIỆU REALTIME</h3>
            <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">
              Lọc theo volume &gt; $15M &bull; Cập nhật: {lastScan || 'Vừa xong'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={scanOpportunities}
            disabled={isScanningSignals || isLoading || !data?.markets.length}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary font-['JetBrains_Mono'] text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${isScanningSignals ? 'animate-bounce text-primary' : ''}`} />
            <span>{isScanningSignals ? 'Đang phân tích...' : 'Quét Tín Hiệu Nóng'}</span>
          </button>

          <button
            onClick={fetchMarkets}
            disabled={isLoading || isScanningSignals}
            className="p-1.5 rounded-md bg-surface-container-high hover:bg-surface-variant border border-outline-variant/30 text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50"
            title="Quét lại toàn sàn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {(error || scanError) && <p role="alert" className="text-xs text-error font-['JetBrains_Mono'] mb-3">{error || scanError}</p>}
      {!isLoading && markets.length === 0 && <p className="text-xs text-on-surface-variant font-['JetBrains_Mono']">Không có thị trường phù hợp.</p>}
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-surface-container-low z-10">
            <tr className="border-b border-surface-container-highest/60 text-on-surface-variant uppercase font-['Manrope'] text-[10px] font-bold">
              <th className="pb-2.5 font-bold">Cặp Coin</th>
              <th className="pb-2.5 font-bold">Giá Hiện Tại</th>
              <th className="pb-2.5 font-bold">Biến Động 24h</th>
              <th className="pb-2.5 font-bold">Volume 24h</th>
              <th className="pb-2.5 font-bold">Tín Hiệu Radar</th>
              <th className="pb-2.5 font-bold text-right">Chọn Coin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-highest/30 font-['Manrope']">
            {markets.map((m) => {
              const isGain = m.change24h >= 0;
              const hasSignal = m.signal === 'LONG' || m.signal === 'SHORT';

              return (
                <tr
                  key={m.symbol}
                  onClick={() => onSelectSymbol(m.symbol)}
                  className="hover:bg-surface-container-high/60 transition-colors cursor-pointer group"
                >
                  {/* Symbol */}
                  <td className="py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-['Space_Grotesk'] font-bold text-on-surface text-xs group-hover:text-primary transition-colors">
                        {m.symbol}
                      </span>
                      <span className="font-['JetBrains_Mono'] text-[9px] px-1 py-0.2 rounded bg-surface-container-highest text-on-surface-variant font-semibold">
                        PERP
                      </span>
                    </div>
                    <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">Biên độ: {m.volatility}%</span>
                  </td>

                  {/* Price */}
                  <td className="py-2.5 font-['JetBrains_Mono'] font-bold text-on-surface">
                    ${formatPrice(m.price)}
                  </td>

                  {/* 24h Change */}
                  <td className="py-2.5">
                    <div
                      className={`inline-flex items-center px-1.5 py-0.5 rounded font-['JetBrains_Mono'] text-[11px] font-bold ${
                        isGain ? 'text-tertiary bg-tertiary/10 border border-tertiary/20' : 'text-error bg-error/10 border border-error/20'
                      }`}
                    >
                      {isGain ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                      {isGain ? `+${m.change24h}%` : `${m.change24h}%`}
                    </div>
                  </td>

                  {/* Volume */}
                  <td className="py-2.5 font-['JetBrains_Mono'] text-on-surface font-semibold text-[11px]">
                    {formatVolume(m.volume24h)}
                  </td>

                  {/* Signal */}
                  <td className="py-2.5">
                    {hasSignal ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-wider ${
                          m.signal === 'LONG'
                            ? 'bg-tertiary/15 text-tertiary border border-tertiary/30 animate-pulse'
                            : 'bg-error/15 text-error border border-error/30 animate-pulse'
                        }`}
                        title={m.reason}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${m.signal === 'LONG' ? 'bg-tertiary' : 'bg-error'}`}></span>
                        {m.signal} (RSI {m.rsi})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-['JetBrains_Mono'] text-[10px] text-on-surface-variant bg-surface-container-high/60 border border-outline-variant/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                        Theo Dõi
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSymbol(m.symbol);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface font-['JetBrains_Mono'] text-[11px] font-semibold transition-all border border-outline-variant/30 hover:border-primary shadow-xs"
                      title={`Xem biểu đồ ${m.symbol}`}
                    >
                      <span className="material-symbols-outlined text-[13px]">candlestick_chart</span>
                      <span>Chọn</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
