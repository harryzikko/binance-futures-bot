import React, { useState } from 'react';
import type { MobileTicker } from '../MobileLayout';

interface MobileOrderBookChartTabProps {
  currentSymbol?: string;
  ticker?: MobileTicker | null;
  onSymbolChange?: (symbol: string) => void;
}

interface OrderItem {
  id: string;
  type: 'BUY' | 'SELL' | 'TP';
  label: string;
  price: number;
  size: number;
  time: string;
}

export const MobileOrderBookChartTab: React.FC<MobileOrderBookChartTabProps> = ({
  currentSymbol = 'BTCUSDT',
  ticker,
  onSymbolChange,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState(currentSymbol);
  const [selectedTf, setSelectedTf] = useState('1m');
  const [showPairMenu, setShowPairMenu] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'buy' | 'sell' | 'tp'>('all');
  const [orders, setOrders] = useState<OrderItem[]>([
    { id: '1', type: 'BUY', label: 'GRID BUY #1', price: 95650.00, size: 0.250, time: '14:22:05' },
    { id: '2', type: 'BUY', label: 'GRID BUY #2', price: 95520.00, size: 0.300, time: '14:21:50' },
    { id: '3', type: 'SELL', label: 'GRID SELL #1', price: 95720.00, size: 0.250, time: '14:20:12' },
    { id: '4', type: 'SELL', label: 'GRID SELL #2', price: 95850.00, size: 0.350, time: '14:19:40' },
    { id: '5', type: 'TP', label: 'TAKE PROFIT', price: 96400.00, size: 0.400, time: '13:58:30' },
  ]);
  const [notice, setNotice] = useState<string | null>(null);

  const availableSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];

  const basePrice = ticker?.price
    ? ticker.price
    : selectedSymbol === 'BTCUSDT' ? 95680.50 : selectedSymbol === 'ETHUSDT' ? 3422.50 : selectedSymbol === 'SOLUSDT' ? 194.20 : 656.20;

  const priceChangePercent = ticker?.change24h
    ? ticker.change24h
    : 2.45;

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  };

  const handleSelectSymbol = (sym: string) => {
    setSelectedSymbol(sym);
    setShowPairMenu(false);
    if (onSymbolChange) onSymbolChange(sym);
  };

  const handleCancelOrder = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    showToast(`Đã hủy lệnh chờ #${id} trên Binance`);
  };

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'buy') return o.type === 'BUY';
    if (orderFilter === 'sell') return o.type === 'SELL';
    if (orderFilter === 'tp') return o.type === 'TP';
    return true;
  });

  return (
    <div className="flex flex-col w-full space-y-3 pb-8">
      {/* Toast Notice */}
      {notice && (
        <div className="fixed top-20 left-4 right-4 z-50 p-3 rounded-xl bg-primary-container/20 border border-primary-container/40 backdrop-blur-md shadow-2xl flex items-center gap-2 text-primary-container">
          <span className="material-symbols-outlined text-[20px]">info</span>
          <span className="font-['JetBrains_Mono'] text-[12px] font-semibold">{notice}</span>
        </div>
      )}

      {/* Ticker Selector & Real-Time Stats */}
      <div className="flex flex-col rounded-xl bg-surface-container-low p-3 shadow-md space-y-3 relative">
        {/* Pair Selector & Mark Price */}
        <div className="flex items-center justify-between">
          <div className="relative">
            <button
              onClick={() => setShowPairMenu(!showPairMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-primary-container" />
              <span className="font-['Space_Grotesk'] text-[16px] font-bold tracking-tight text-on-surface">
                {selectedSymbol}
              </span>
              <span className="font-['Manrope'] text-[10px] text-primary-container bg-primary-container/10 px-1.5 py-0.5 rounded font-bold">
                PERP
              </span>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">expand_more</span>
            </button>

            {/* Dropdown Menu */}
            {showPairMenu && (
              <div className="absolute top-12 left-0 z-50 w-44 rounded-xl bg-surface-container-high border border-surface-container-highest shadow-2xl p-1">
                {availableSymbols.map(sym => (
                  <button
                    key={sym}
                    onClick={() => handleSelectSymbol(sym)}
                    className={`w-full text-left px-3 py-2 rounded-lg font-['Space_Grotesk'] text-[13px] font-bold flex items-center justify-between ${selectedSymbol === sym ? 'bg-primary-container text-on-primary' : 'text-on-surface hover:bg-surface-container'}`}
                  >
                    <span>{sym}</span>
                    <span className="font-['JetBrains_Mono'] text-[10px]">USDS-M</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`font-['JetBrains_Mono'] text-[11px] px-1.5 py-0.5 rounded font-semibold ${priceChangePercent >= 0 ? 'text-tertiary bg-tertiary/10' : 'text-error bg-error/10'}`}>
              {priceChangePercent >= 0 ? `+${priceChangePercent.toFixed(2)}%` : `${priceChangePercent.toFixed(2)}%`}
            </span>
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-surface-container">
              <span className="font-['Manrope'] text-[10px] text-on-surface-variant font-bold">FUNDING:</span>
              <span className="font-['JetBrains_Mono'] text-[10px] text-tertiary font-medium">+0.0100%</span>
            </div>
          </div>
        </div>

        {/* Live Ticker Row */}
        <div className="flex items-end justify-between pt-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
              </span>
              <span className="font-['JetBrains_Mono'] text-[24px] font-bold tracking-tight text-tertiary">
                ${basePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="font-['JetBrains_Mono'] text-[11px] text-on-surface-variant">
              Index ${(basePrice * 0.9998).toFixed(2)} • 24h Vol 42,912 {selectedSymbol.replace('USDT', '')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-right font-['JetBrains_Mono'] text-[11px]">
            <span className="text-on-surface-variant font-['Manrope'] text-[10px] font-bold">24H HIGH</span>
            <span className="text-on-surface font-semibold">${(basePrice * 1.015).toFixed(2)}</span>
            <span className="text-on-surface-variant font-['Manrope'] text-[10px] font-bold">24H LOW</span>
            <span className="text-on-surface font-semibold">${(basePrice * 0.982).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Interactive Candlestick Chart Module */}
      <div className="flex flex-col rounded-xl bg-surface-container-low p-3 shadow-md space-y-2.5">
        {/* Chart Controls Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-surface-container p-0.5 rounded-lg">
            {['1s', '1m', '5m', '15m', '1H'].map(tf => (
              <button
                key={tf}
                onClick={() => setSelectedTf(tf)}
                className={`px-2 py-1 rounded font-['JetBrains_Mono'] text-[11px] transition-colors ${selectedTf === tf ? 'bg-primary-container text-on-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                {tf}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button className="flex items-center gap-1 px-2 py-1 rounded bg-surface-container text-on-surface-variant font-['Manrope'] text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              EMA(7/25)
            </button>
            <button className="flex items-center gap-1 px-2 py-1 rounded bg-secondary-container/30 text-secondary font-['Manrope'] text-[10px] font-bold">
              <span className="material-symbols-outlined text-[13px]">grid_4x4</span>
              GRID
            </button>
          </div>
        </div>

        {/* Live Signals Pill Row */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 font-['JetBrains_Mono'] text-[11px] bg-surface-container px-2 py-0.5 rounded text-on-surface">
              <span className="text-on-surface-variant">RSI(14):</span>
              <span className="text-tertiary font-semibold">58.4</span>
              <span className="text-on-surface-variant text-[10px]">(Bullish)</span>
            </div>
            <div className="flex items-center gap-1 font-['JetBrains_Mono'] text-[11px] bg-surface-container px-2 py-0.5 rounded text-on-surface">
              <span className="text-on-surface-variant">OFI:</span>
              <span className="text-tertiary font-semibold">+18.4%</span>
            </div>
          </div>
          <div className="font-['JetBrains_Mono'] text-[10px] text-tertiary flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
            STREAM SYNC
          </div>
        </div>

        {/* Precision SVG Chart with Bot Order Overlays */}
        <div className="relative w-full h-56 bg-surface-container-lowest rounded-lg p-1 overflow-hidden select-none">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 360 210">
            <defs>
              <linearGradient id="volGreen" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#3be194" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#3be194" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="volRed" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#ffb4ab" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#ffb4ab" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Background Grid Ticks */}
            <line stroke="#1d2026" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="360" y1="40" y2="40" />
            <line stroke="#1d2026" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="360" y1="90" y2="90" />
            <line stroke="#1d2026" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="360" y1="140" y2="140" />
            <line stroke="#1d2026" strokeDasharray="3 3" strokeWidth="1" x1="90" x2="90" y1="0" y2="170" />
            <line stroke="#1d2026" strokeDasharray="3 3" strokeWidth="1" x1="180" x2="180" y1="0" y2="170" />
            <line stroke="#1d2026" strokeDasharray="3 3" strokeWidth="1" x1="270" x2="270" y1="0" y2="170" />

            {/* Volume Histogram (Bottom) */}
            <rect fill="url(#volRed)" height="20" width="8" x="15" y="185" />
            <rect fill="url(#volGreen)" height="30" width="8" x="35" y="175" />
            <rect fill="url(#volGreen)" height="25" width="8" x="55" y="180" />
            <rect fill="url(#volRed)" height="15" width="8" x="75" y="190" />
            <rect fill="url(#volGreen)" height="35" width="8" x="95" y="170" />
            <rect fill="url(#volRed)" height="23" width="8" x="115" y="182" />
            <rect fill="url(#volGreen)" height="27" width="8" x="135" y="178" />
            <rect fill="url(#volRed)" height="20" width="8" x="155" y="185" />
            <rect fill="url(#volGreen)" height="33" width="8" x="175" y="172" />
            <rect fill="url(#volGreen)" height="37" width="8" x="195" y="168" />
            <rect fill="url(#volRed)" height="26" width="8" x="215" y="179" />
            <rect fill="url(#volGreen)" height="40" width="8" x="235" y="165" />
            <rect fill="url(#volGreen)" height="45" width="8" x="255" y="160" />
            <rect fill="url(#volRed)" height="31" width="8" x="275" y="174" />
            <rect fill="url(#volGreen)" height="53" width="8" x="295" y="152" />
            <rect fill="url(#volGreen)" height="47" width="8" x="315" y="158" />
            <rect fill="url(#volGreen)" height="55" width="8" x="335" y="150" />

            {/* Candlesticks */}
            <line stroke="#ffb4ab" strokeWidth="1.2" x1="19" x2="19" y1="110" y2="148" />
            <rect fill="#93000a" height="22" width="8" x="15" y="120" />

            <line stroke="#3be194" strokeWidth="1.2" x1="39" x2="39" y1="95" y2="135" />
            <rect fill="#005b37" height="25" width="8" x="35" y="105" />

            <line stroke="#3be194" strokeWidth="1.2" x1="59" x2="59" y1="92" y2="128" />
            <rect fill="#005b37" height="20" width="8" x="55" y="98" />

            <line stroke="#ffb4ab" strokeWidth="1.2" x1="79" x2="79" y1="96" y2="132" />
            <rect fill="#93000a" height="24" width="8" x="75" y="100" />

            <line stroke="#3be194" strokeWidth="1.2" x1="99" x2="99" y1="85" y2="125" />
            <rect fill="#005b37" height="25" width="8" x="95" y="92" />

            <line stroke="#ffb4ab" strokeWidth="1.2" x1="119" x2="119" y1="88" y2="114" />
            <rect fill="#93000a" height="12" width="8" x="115" y="94" />

            <line stroke="#3be194" strokeWidth="1.2" x1="139" x2="139" y1="80" y2="110" />
            <rect fill="#005b37" height="20" width="8" x="135" y="84" />

            <line stroke="#ffb4ab" strokeWidth="1.2" x1="159" x2="159" y1="82" y2="116" />
            <rect fill="#93000a" height="18" width="8" x="155" y="87" />

            <line stroke="#3be194" strokeWidth="1.2" x1="179" x2="179" y1="68" y2="98" />
            <rect fill="#005b37" height="20" width="8" x="175" y="74" />

            <line stroke="#3be194" strokeWidth="1.2" x1="199" x2="199" y1="60" y2="92" />
            <rect fill="#005b37" height="22" width="8" x="195" y="65" />

            <line stroke="#ffb4ab" strokeWidth="1.2" x1="219" x2="219" y1="62" y2="88" />
            <rect fill="#93000a" height="14" width="8" x="215" y="66" />

            <line stroke="#3be194" strokeWidth="1.2" x1="239" x2="239" y1="48" y2="76" />
            <rect fill="#005b37" height="18" width="8" x="235" y="52" />

            <line stroke="#3be194" strokeWidth="1.2" x1="259" x2="259" y1="42" y2="70" />
            <rect fill="#005b37" height="16" width="8" x="255" y="46" />

            <line stroke="#ffb4ab" strokeWidth="1.2" x1="279" x2="279" y1="44" y2="68" />
            <rect fill="#93000a" height="12" width="8" x="275" y="48" />

            <line stroke="#3be194" strokeWidth="1.2" x1="299" x2="299" y1="32" y2="62" />
            <rect fill="#005b37" height="22" width="8" x="295" y="36" />

            <line stroke="#3be194" strokeWidth="1.2" x1="319" x2="319" y1="28" y2="56" />
            <rect fill="#005b37" height="20" width="8" x="315" y="32" />

            <line stroke="#3be194" strokeWidth="1.2" x1="339" x2="339" y1="20" y2="50" />
            <rect fill="#005b37" height="18" width="8" x="335" y="24" />

            {/* EMA Lines */}
            <path d="M19 135 Q 99 105 179 80 T 339 28" fill="none" stroke="#f0b90b" strokeWidth="1.5" />
            <path d="M19 142 Q 99 118 179 92 T 339 38" fill="none" stroke="#acc7ff" strokeOpacity="0.8" strokeWidth="1.2" />

            {/* Bot Grid Overlays */}
            <line stroke="#f6be16" strokeDasharray="4 3" strokeWidth="1.2" x1="0" x2="360" y1="36" y2="36" />
            <line stroke="#32db8f" strokeDasharray="4 3" strokeWidth="1.2" x1="0" x2="360" y1="102" y2="102" />
          </svg>

          {/* Grid Overlays Pill Labels */}
          <div className="absolute top-[30px] right-2 flex items-center gap-1 bg-surface-container-high/90 backdrop-blur px-2 py-0.5 rounded shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
            <span className="font-['JetBrains_Mono'] text-[10px] text-primary-container font-bold">
              Grid Sell Limit #1 (${(basePrice * 1.001).toFixed(2)})
            </span>
          </div>
          <div className="absolute top-[96px] right-2 flex items-center gap-1 bg-surface-container-high/90 backdrop-blur px-2 py-0.5 rounded shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
            <span className="font-['JetBrains_Mono'] text-[10px] text-tertiary font-bold">
              Grid Buy Limit #1 (${(basePrice * 0.998).toFixed(2)})
            </span>
          </div>

          {/* Current Price Cursor Beacon */}
          <div className="absolute top-[21px] left-1 bg-surface-container-high/90 px-1.5 py-0.5 rounded shadow">
            <span className="font-['JetBrains_Mono'] text-[11px] text-tertiary font-bold">
              ${basePrice.toFixed(2)} ◀
            </span>
          </div>
        </div>
      </div>

      {/* Compact L2 Order Book & Whale Depth Module */}
      <div className="flex flex-col rounded-xl bg-surface-container-low p-3 shadow-md space-y-2">
        {/* Depth Balance Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-['Manrope'] text-[11px] text-on-surface uppercase tracking-wider font-bold">
              Sổ Lệnh L2
            </span>
            <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
              Tick 0.5
            </span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container">
            <span className="font-['Manrope'] text-[10px] text-on-surface-variant font-bold">BBO SPREAD:</span>
            <span className="font-['JetBrains_Mono'] text-[10px] text-primary-container font-semibold">$0.10</span>
            <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">(0.0001%)</span>
          </div>
        </div>

        {/* Bid/Ask Pressure Meter */}
        <div className="flex flex-col space-y-1">
          <div className="flex justify-between font-['JetBrains_Mono'] text-[11px]">
            <span className="text-tertiary font-semibold">Bids 54.2%</span>
            <span className="text-error font-semibold">Asks 45.8%</span>
          </div>
          <div className="w-full h-1.5 rounded bg-surface-container-high flex overflow-hidden">
            <div className="h-full bg-tertiary transition-all" style={{ width: '54.2%' }} />
            <div className="h-full bg-error transition-all" style={{ width: '45.8%' }} />
          </div>
        </div>

        {/* Dual Column Order Depth Feed */}
        <div className="grid grid-cols-2 gap-2 pt-1 font-['JetBrains_Mono'] text-[12px]">
          {/* Bids (Buy Side) */}
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between font-['Manrope'] text-[10px] text-on-surface-variant pb-0.5 font-bold">
              <span>GIÁ (USDT)</span>
              <span>SIZE</span>
            </div>
            <div className="relative flex justify-between items-center px-1.5 py-1 rounded bg-surface-container-high/40 overflow-hidden">
              <div className="absolute inset-y-0 right-0 bg-tertiary/10" style={{ width: '85%' }} />
              <span className="relative text-tertiary font-semibold">{(basePrice - 0.5).toFixed(2)}</span>
              <span className="relative text-on-surface">1.842</span>
            </div>
            {/* Whale Wall Detected Item */}
            <div className="relative flex justify-between items-center px-1.5 py-1 rounded bg-surface-container-high overflow-hidden shadow-sm">
              <div className="absolute inset-y-0 right-0 bg-tertiary/20" style={{ width: '100%' }} />
              <div className="relative flex items-center gap-1">
                <span className="text-tertiary font-bold">{(basePrice - 1.0).toFixed(2)}</span>
                <span className="font-['Manrope'] text-[9px] bg-primary-container text-on-primary px-1 rounded font-bold">
                  WALL
                </span>
              </div>
              <span className="relative text-on-surface font-bold">4.120</span>
            </div>
            <div className="relative flex justify-between items-center px-1.5 py-1 rounded bg-surface-container-high/40 overflow-hidden">
              <div className="absolute inset-y-0 right-0 bg-tertiary/10" style={{ width: '45%' }} />
              <span className="relative text-tertiary font-semibold">{(basePrice - 1.5).toFixed(2)}</span>
              <span className="relative text-on-surface">0.950</span>
            </div>
            <div className="relative flex justify-between items-center px-1.5 py-1 rounded bg-surface-container-high/40 overflow-hidden">
              <div className="absolute inset-y-0 right-0 bg-tertiary/10" style={{ width: '60%' }} />
              <span className="relative text-tertiary font-semibold">{(basePrice - 2.0).toFixed(2)}</span>
              <span className="relative text-on-surface">1.320</span>
            </div>
          </div>

          {/* Asks (Sell Side) */}
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between font-['Manrope'] text-[10px] text-on-surface-variant pb-0.5 font-bold">
              <span>GIÁ (USDT)</span>
              <span>SIZE</span>
            </div>
            <div className="relative flex justify-between items-center px-1.5 py-1 rounded bg-surface-container-high/40 overflow-hidden">
              <div className="absolute inset-y-0 right-0 bg-error/10" style={{ width: '35%' }} />
              <span className="relative text-error font-semibold">{(basePrice + 0.5).toFixed(2)}</span>
              <span className="relative text-on-surface">0.785</span>
            </div>
            <div className="relative flex justify-between items-center px-1.5 py-1 rounded bg-surface-container-high/40 overflow-hidden">
              <div className="absolute inset-y-0 right-0 bg-error/10" style={{ width: '58%' }} />
              <span className="relative text-error font-semibold">{(basePrice + 1.0).toFixed(2)}</span>
              <span className="relative text-on-surface">1.250</span>
            </div>
            <div className="relative flex justify-between items-center px-1.5 py-1 rounded bg-surface-container-high/40 overflow-hidden">
              <div className="absolute inset-y-0 right-0 bg-error/10" style={{ width: '78%' }} />
              <span className="relative text-error font-semibold">{(basePrice + 1.5).toFixed(2)}</span>
              <span className="relative text-on-surface">2.140</span>
            </div>
            <div className="relative flex justify-between items-center px-1.5 py-1 rounded bg-surface-container-high/40 overflow-hidden">
              <div className="absolute inset-y-0 right-0 bg-error/10" style={{ width: '40%' }} />
              <span className="relative text-error font-semibold">{(basePrice + 2.0).toFixed(2)}</span>
              <span className="relative text-on-surface">0.890</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bot Active Orders Manager (Lệnh Chờ Bot) */}
      <div className="flex flex-col rounded-xl bg-surface-container-low p-3 shadow-md space-y-3">
        {/* Header with Orders Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-[20px]">smart_toy</span>
            <span className="font-['Space_Grotesk'] text-[15px] text-on-surface font-bold">Lệnh Chờ Bot</span>
            <span className="font-['JetBrains_Mono'] text-[11px] bg-surface-container px-2 py-0.5 rounded-full text-primary font-bold">
              {filteredOrders.length}
            </span>
          </div>
          <div className="flex items-center gap-1 font-['Manrope'] text-[10px] text-tertiary bg-tertiary/10 px-2 py-0.5 rounded font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
            LƯỚI HOẠT ĐỘNG
          </div>
        </div>

        {/* Quick Filter Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            onClick={() => setOrderFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-['JetBrains_Mono'] text-[11px] font-bold shrink-0 transition-colors ${orderFilter === 'all' ? 'bg-surface-container-high text-primary' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}`}
          >
            Tất cả ({orders.length})
          </button>
          <button
            onClick={() => setOrderFilter('buy')}
            className={`px-2.5 py-1 rounded-lg font-['JetBrains_Mono'] text-[11px] shrink-0 transition-colors ${orderFilter === 'buy' ? 'bg-surface-container-high text-tertiary font-bold' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}`}
          >
            Grid Buy ({orders.filter(o => o.type === 'BUY').length})
          </button>
          <button
            onClick={() => setOrderFilter('sell')}
            className={`px-2.5 py-1 rounded-lg font-['JetBrains_Mono'] text-[11px] shrink-0 transition-colors ${orderFilter === 'sell' ? 'bg-surface-container-high text-error font-bold' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}`}
          >
            Grid Sell ({orders.filter(o => o.type === 'SELL').length})
          </button>
          <button
            onClick={() => setOrderFilter('tp')}
            className={`px-2.5 py-1 rounded-lg font-['JetBrains_Mono'] text-[11px] shrink-0 transition-colors ${orderFilter === 'tp' ? 'bg-surface-container-high text-primary-container font-bold' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}`}
          >
            Take Profit ({orders.filter(o => o.type === 'TP').length})
          </button>
        </div>

        {/* Orders Stack */}
        <div className="flex flex-col space-y-2">
          {filteredOrders.length === 0 ? (
            <p className="text-center py-4 font-['Manrope'] text-[12px] text-on-surface-variant">Không có lệnh chờ trong danh mục này</p>
          ) : (
            filteredOrders.map(ord => (
              <div
                key={ord.id}
                className="flex flex-col p-2.5 rounded-lg bg-surface-container space-y-1.5 transition-colors hover:bg-surface-container-high"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded font-['Manrope'] text-[10px] font-bold ${ord.type === 'BUY' ? 'bg-tertiary/15 text-tertiary' : ord.type === 'SELL' ? 'bg-error/15 text-error' : 'bg-primary-container/15 text-primary-container'}`}>
                      {ord.label}
                    </span>
                    <span className="font-['JetBrains_Mono'] text-[11px] text-on-surface font-medium">Limit Maker</span>
                  </div>
                  <button
                    onClick={() => handleCancelOrder(ord.id)}
                    className="text-on-surface-variant hover:text-error text-[11px] font-['Manrope'] font-semibold"
                  >
                    Hủy
                  </button>
                </div>
                <div className="flex items-center justify-between font-['JetBrains_Mono'] text-[11px]">
                  <span className="text-on-surface font-semibold">${ord.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <span className="text-on-surface-variant">{ord.size} BTC • {ord.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
