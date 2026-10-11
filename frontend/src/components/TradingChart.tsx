import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type HistogramData,
  type Time,
} from 'lightweight-charts';
import { getKlines } from '../services/api';
import { useApiResource } from '../hooks/useApiResource';
import { RefreshCw, Eye, EyeOff } from 'lucide-react';

interface TradingChartProps {
  symbol: string;
  timeframe: string;
  ticker?: {
    symbol?: string;
    price: number;
    change24h: number;
    high24h?: number;
    low24h?: number;
    volume24h?: number;
  } | null;
  onSymbolChange?: (symbol: string) => void;
  onTimeframeChange?: (timeframe: string) => void;
}

export const TradingChart: React.FC<TradingChartProps> = ({
  symbol,
  timeframe,
  ticker,
  onTimeframeChange,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const emaFastSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSlowSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaTrendSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const loader = useCallback((signal: AbortSignal) => getKlines(symbol, timeframe, 120, signal), [symbol, timeframe]);
  const { data, error, isLoading, reload } = useApiResource(loader);
  const fittedRef = useRef(false);
  const [showIndicators, setShowIndicators] = useState(true);

  const timeframes = ['1m', '3m', '5m', '15m', '1h', '4h', '1D'];

  // Current Price & 24h stats
  const currentPrice = ticker?.price || (data && data.length > 0 ? data[data.length - 1].close : 0);
  const change24h = ticker?.change24h || 0;
  const high24h = ticker?.high24h;
  const low24h = ticker?.low24h;
  const volume24h = ticker?.volume24h;

  const formatPrice = (p?: number) => {
    if (!p) return '0.00';
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return p.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 });
  };

  const formatVolume = (v?: number) => {
    if (!v) return '—';
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toFixed(2);
  };

  // 1. Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0b0e14' },
        textColor: '#d3c5ac',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#ffd87f', width: 1, style: 3 },
        horzLine: { color: '#ffd87f', width: 1, style: 3 },
      },
      timeScale: {
        borderColor: '#32353c',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#32353c',
        autoScale: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: 380,
    });

    chartRef.current = chart;

    // Candlesticks (Emerald Tertiary & Coral Error)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#59f8a9',
      downColor: '#ffb4ab',
      borderVisible: false,
      wickUpColor: '#59f8a9',
      wickDownColor: '#ffb4ab',
    });
    candleSeriesRef.current = candleSeries;

    // Volume
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '', // overlay
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // Indicators (EMA Fast, Slow, Trend, Bollinger Bands)
    // IMPORTANT: lastValueVisible: false and priceLineVisible: false prevent indicators from cluttering the price axis!
    emaFastSeriesRef.current = chart.addSeries(LineSeries, {
      color: '#acc7ff',
      lineWidth: 1,
      title: 'EMA 20',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    emaSlowSeriesRef.current = chart.addSeries(LineSeries, {
      color: '#ffd87f',
      lineWidth: 1,
      title: 'EMA 50',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    emaTrendSeriesRef.current = chart.addSeries(LineSeries, {
      color: '#32db8f',
      lineWidth: 2,
      title: 'EMA 200',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    bbUpperSeriesRef.current = chart.addSeries(LineSeries, {
      color: 'rgba(172, 199, 255, 0.35)',
      lineWidth: 1,
      lineStyle: 2,
      title: 'BB Upper',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    bbLowerSeriesRef.current = chart.addSeries(LineSeries, {
      color: 'rgba(172, 199, 255, 0.35)',
      lineWidth: 1,
      lineStyle: 2,
      title: 'BB Lower',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // 2. Feed Data to Chart
  useEffect(() => {
    if (!data || !chartRef.current) return;

    try {
      const candles: CandlestickData<Time>[] = [];
      const volumes: HistogramData<Time>[] = [];
      const emaFast: LineData<Time>[] = [];
      const emaSlow: LineData<Time>[] = [];
      const emaTrend: LineData<Time>[] = [];
      const bbUpper: LineData<Time>[] = [];
      const bbLower: LineData<Time>[] = [];

      const sorted = [...new Map(data.filter(item =>
        [item.time, item.open, item.high, item.low, item.close, item.volume].every(Number.isFinite)
      ).map(item => [item.time, item])).values()].sort((a, b) => a.time - b.time);

      sorted.forEach(item => {
        const time = item.time as Time;
        candles.push({
          time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        });

        volumes.push({
          time,
          value: item.volume,
          color: item.close >= item.open ? 'rgba(89, 248, 169, 0.3)' : 'rgba(255, 180, 171, 0.3)',
        });

        if (item.ema_fast != null && Number.isFinite(item.ema_fast)) {
          emaFast.push({ time, value: item.ema_fast });
        }
        if (item.ema_slow != null && Number.isFinite(item.ema_slow)) {
          emaSlow.push({ time, value: item.ema_slow });
        }
        if (item.ema_trend != null && Number.isFinite(item.ema_trend)) {
          emaTrend.push({ time, value: item.ema_trend });
        }
        if (item.bb_upper != null && Number.isFinite(item.bb_upper)) {
          bbUpper.push({ time, value: item.bb_upper });
        }
        if (item.bb_lower != null && Number.isFinite(item.bb_lower)) {
          bbLower.push({ time, value: item.bb_lower });
        }
      });

      candleSeriesRef.current?.setData(candles);
      volumeSeriesRef.current?.setData(volumes);

      if (showIndicators) {
        emaFastSeriesRef.current?.setData(emaFast);
        emaSlowSeriesRef.current?.setData(emaSlow);
        emaTrendSeriesRef.current?.setData(emaTrend);
        bbUpperSeriesRef.current?.setData(bbUpper);
        bbLowerSeriesRef.current?.setData(bbLower);
      } else {
        emaFastSeriesRef.current?.setData([]);
        emaSlowSeriesRef.current?.setData([]);
        emaTrendSeriesRef.current?.setData([]);
        bbUpperSeriesRef.current?.setData([]);
        bbLowerSeriesRef.current?.setData([]);
      }

      if (!fittedRef.current && candles.length) {
        chartRef.current?.timeScale().fitContent();
        fittedRef.current = true;
      }
    } catch (err) {
      console.error('Failed to render chart klines:', err);
    }
  }, [data, showIndicators]);

  useEffect(() => { fittedRef.current = false; }, [loader]);

  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(reload, 5000);
    return () => clearTimeout(timer);
  }, [isLoading, reload]);

  const cleanSymbol = symbol.replace('/', '');

  return (
    <div className="bg-surface-container-low rounded-lg p-3.5 sm:p-4 shadow-sm border border-outline-variant/30 flex flex-col font-['Manrope']">
      {/* 1. Pro Chart Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-container-highest/60">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-['Space_Grotesk'] text-lg font-bold text-on-surface tracking-tight">
                {cleanSymbol}
              </span>
              <span className="font-['JetBrains_Mono'] text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-bold">
                PERP
              </span>
              <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant font-medium">
                BINANCE FUTURES
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-['JetBrains_Mono'] text-xl sm:text-2xl text-on-surface font-bold tracking-tight">
                ${formatPrice(currentPrice)}
              </span>
              <span className={`font-['JetBrains_Mono'] text-xs font-bold px-1.5 py-0.5 rounded ${
                change24h >= 0 ? 'text-tertiary bg-tertiary/10' : 'text-error bg-error/10'
              }`}>
                {change24h >= 0 ? `+${change24h.toFixed(2)}%` : `${change24h.toFixed(2)}%`}
              </span>
            </div>
          </div>
        </div>

        {/* 24h Stats Row with generous spacing and crisp typography */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-['JetBrains_Mono'] text-xs">
          <div className="text-right">
            <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">24h Cao Nhất</div>
            <div className="text-on-surface font-semibold mt-0.5">{high24h ? `$${formatPrice(high24h)}` : '—'}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">24h Thấp Nhất</div>
            <div className="text-on-surface font-semibold mt-0.5">{low24h ? `$${formatPrice(low24h)}` : '—'}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">Khối Lượng 24h</div>
            <div className="text-on-surface font-semibold mt-0.5">{volume24h ? formatVolume(volume24h) : '—'}</div>
          </div>
          <div className="bg-surface-container-high/60 px-2.5 py-1 rounded border border-outline-variant/30 text-right">
            <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">Độ Trễ WS</div>
            <div className="text-tertiary font-bold flex items-center gap-1.5 justify-end text-[11px] mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
              12ms
            </div>
          </div>
        </div>
      </div>

      {/* 2. Toolbar: Timeframes & Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 py-2.5">
        <div className="flex items-center gap-1 bg-surface-container-lowest p-0.5 rounded border border-outline-variant/20 font-['JetBrains_Mono']">
          {timeframes.map(tf => (
            <button
              key={tf}
              type="button"
              onClick={() => onTimeframeChange?.(tf)}
              className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                timeframe === tf
                  ? 'text-primary bg-surface-container-high font-bold shadow-sm border border-primary/20'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 font-['JetBrains_Mono'] text-[11px]">
          <span className="px-2 py-1 bg-secondary/10 text-secondary rounded flex items-center gap-1.5 border border-secondary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>EMA 20
          </span>
          <span className="px-2 py-1 bg-primary/10 text-primary rounded flex items-center gap-1.5 border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>EMA 50
          </span>
          <span className="px-2 py-1 bg-tertiary/10 text-tertiary rounded flex items-center gap-1.5 border border-tertiary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>EMA 200
          </span>

          <button
            type="button"
            onClick={() => setShowIndicators(!showIndicators)}
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition border ${
              showIndicators
                ? 'bg-primary/20 text-primary font-bold border-primary/40'
                : 'bg-surface-container-high text-on-surface-variant border-outline-variant/30 hover:text-on-surface'
            }`}
            title="Bật/Tắt chỉ báo"
          >
            {showIndicators ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Chỉ Báo: {showIndicators ? 'BẬT' : 'TẮT'}</span>
          </button>

          <button
            type="button"
            onClick={reload}
            disabled={isLoading}
            className="p-1.5 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface-variant border border-outline-variant/30 transition-colors"
            title="Làm mới nến"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {error && <p role="alert" className="text-xs text-error font-['JetBrains_Mono'] mb-2">{error}</p>}
      {!isLoading && data?.length === 0 && <p className="text-xs text-on-surface-variant font-['JetBrains_Mono'] mb-2">Không có dữ liệu nến.</p>}

      {/* 3. Lightweight Chart Render Canvas */}
      <div ref={chartContainerRef} className="w-full h-[380px] rounded-lg overflow-hidden border border-surface-container-highest bg-surface-container-lowest" />
    </div>
  );
};

export default TradingChart;
