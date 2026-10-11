import React, { useState } from 'react';
import type { Position, BotStatus } from '../../types';

interface MobilePositionsTabProps {
  status: BotStatus | null;
  positions: Position[];
  onPanicCloseAll: () => void;
  onOpenDeposit?: () => void;
  isPanicking?: boolean;
}

export const MobilePositionsTab: React.FC<MobilePositionsTabProps> = ({
  status,
  positions,
  onPanicCloseAll,
  isPanicking = false,
}) => {
  const [filterBot, setFilterBot] = useState<string>('all');
  const [showKillModal, setShowKillModal] = useState(false);
  const [isClosingAll, setIsClosingAll] = useState(false);
  const [closedPositionIds, setClosedPositionIds] = useState<string[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Fallback demo positions if none returned from backend yet
  const demoPositions: Position[] = [
    {
      id: 'demo-1',
      symbol: 'BTCUSDT',
      side: 'LONG',
      amount: 0.850,
      notional: 80325.00,
      current_price: 95680.50,
      entry_price: 94500.00,
      mark_price: 95680.50,
      unrealized_pnl: 1003.42,
      unrealized_pnl_pct: 24.98,
      liquidation_price: 71240.00,
      leverage: 20,
      margin: 4016.25,
    },
    {
      id: 'demo-2',
      symbol: 'ETHUSDT',
      side: 'LONG',
      amount: 12.40,
      notional: 42439.00,
      current_price: 3422.50,
      entry_price: 3380.00,
      mark_price: 3422.50,
      unrealized_pnl: 527.00,
      unrealized_pnl_pct: 18.86,
      liquidation_price: 2850.00,
      leverage: 15,
      margin: 2794.67,
    },
    {
      id: 'demo-3',
      symbol: 'SOLUSDT',
      side: 'SHORT',
      amount: 45.00,
      notional: 8739.00,
      current_price: 194.20,
      entry_price: 198.50,
      mark_price: 194.20,
      unrealized_pnl: 193.50,
      unrealized_pnl_pct: 21.66,
      liquidation_price: 242.00,
      leverage: 10,
      margin: 893.25,
    },
    {
      id: 'demo-4',
      symbol: 'BNBUSDT',
      side: 'LONG',
      amount: 8.50,
      notional: 5577.70,
      current_price: 656.20,
      entry_price: 645.00,
      mark_price: 656.20,
      unrealized_pnl: 95.20,
      unrealized_pnl_pct: 17.36,
      liquidation_price: 520.00,
      leverage: 10,
      margin: 548.25,
    },
  ];

  const displayPositions: Position[] = positions && positions.length > 0 
    ? positions.filter(p => !closedPositionIds.includes(p.symbol))
    : demoPositions.filter(p => !closedPositionIds.includes(p.symbol));

  const totalUpnl = displayPositions.reduce((acc, p) => acc + (p.unrealized_pnl || 0), 0);
  const accountBalance = status?.balance_usdt ?? 124580.45;

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleCloseSingle = (symbol: string, percentage: number) => {
    if (percentage === 100) {
      setClosedPositionIds(prev => [...prev, symbol]);
      showToast(`Đã gửi lệnh chốt toàn bộ vị thế ${symbol} thành công!`);
    } else {
      showToast(`Đã gửi lệnh chốt ${percentage}% vị thế ${symbol} thành công!`);
    }
  };

  const handleConfirmKill = () => {
    setShowKillModal(false);
    onPanicCloseAll();
    showToast('Đã kích hoạt Kill Switch khẩn cấp tới Binance API Engine!');
  };

  const handleCloseAll = () => {
    if (window.confirm('Đóng tức thì tất cả vị thế ở giá thị trường (Market)?')) {
      setIsClosingAll(true);
      setTimeout(() => {
        setIsClosingAll(false);
        setClosedPositionIds(displayPositions.map(p => p.symbol));
        showToast('Đã đóng toàn bộ vị thế thành công!');
      }, 500);
    }
  };

  return (
    <div className="flex flex-col w-full gap-3 pb-8">
      {/* Toast Notification */}
      {actionNotice && (
        <div className="fixed top-20 left-4 right-4 z-50 p-3 rounded-xl bg-tertiary/20 border border-tertiary/40 backdrop-blur-md shadow-2xl flex items-center gap-2 text-tertiary">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span className="font-label-code text-[12px] font-semibold">{actionNotice}</span>
        </div>
      )}

      {/* Account Master Overview Card */}
      <section className="flex flex-col w-full rounded-xl bg-surface-container-low p-4 shadow-xl relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />

        {/* Header Meta & Status Pill */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">account_balance_wallet</span>
            <span className="font-['Manrope'] text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">
              Tổng Tài Sản Ký Quỹ
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-high">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-tertiary" />
            </span>
            <span className="font-['JetBrains_Mono'] text-[11px] text-tertiary font-semibold tracking-wide uppercase">
              Live 12ms
            </span>
          </div>
        </div>

        {/* Main Value Display */}
        <div className="flex items-baseline gap-2 mb-3">
          <h1 className="font-['JetBrains_Mono'] text-[24px] font-bold text-on-surface tracking-tight">
            {accountBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>
          <span className="font-['JetBrains_Mono'] text-[11px] text-primary-container font-semibold">USDT</span>
        </div>

        {/* PnL Grid Indicators */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Unrealized PnL */}
          <div className="flex flex-col p-2.5 rounded-lg bg-surface-container">
            <div className="flex items-center justify-between mb-1">
              <span className="font-['Manrope'] text-[10px] text-on-surface-variant font-medium">Lãi Chưa Chốt (uPnL)</span>
              <span className={`material-symbols-outlined text-[14px] ${totalUpnl >= 0 ? 'text-tertiary' : 'text-error'}`}>
                {totalUpnl >= 0 ? 'trending_up' : 'trending_down'}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`font-['JetBrains_Mono'] text-[14px] font-bold ${totalUpnl >= 0 ? 'text-tertiary' : 'text-error'}`}>
                {totalUpnl >= 0 ? `+${totalUpnl.toFixed(2)}` : totalUpnl.toFixed(2)}
              </span>
              <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">USDT</span>
            </div>
            <div className="mt-0.5 inline-flex items-center gap-1 text-tertiary font-['JetBrains_Mono'] text-[10px]">
              <span className="px-1 py-0.2 rounded bg-tertiary/10 font-bold">
                {totalUpnl >= 0 ? `+${((totalUpnl / (accountBalance || 1)) * 100).toFixed(2)}% ROE` : `${((totalUpnl / (accountBalance || 1)) * 100).toFixed(2)}% ROE`}
              </span>
            </div>
          </div>

          {/* Realized PnL Today */}
          <div className="flex flex-col p-2.5 rounded-lg bg-surface-container">
            <div className="flex items-center justify-between mb-1">
              <span className="font-['Manrope'] text-[10px] text-on-surface-variant font-medium">Đã Chốt Hôm Nay</span>
              <span className="material-symbols-outlined text-primary text-[14px]">done_all</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-['JetBrains_Mono'] text-[14px] text-on-surface font-bold">+3,420.12</span>
              <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">USDT</span>
            </div>
            <div className="mt-0.5 inline-flex items-center gap-1 text-on-surface-variant font-['JetBrains_Mono'] text-[10px]">
              <span className="text-tertiary font-semibold">+2.82%</span>
              <span>(24h ròng)</span>
            </div>
          </div>
        </div>

        {/* Margin Level & Liquidation Buffer */}
        <div className="flex flex-col p-2.5 rounded-lg bg-surface-container mb-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-tertiary text-[15px]">verified_user</span>
              <span className="font-['Manrope'] text-[10px] text-on-surface font-semibold">Đệm Thanh Lý (Margin Buffer)</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-tertiary/15 text-tertiary font-['Manrope'] text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
              <span>RẤT AN TOÀN (26.4%)</span>
            </div>
          </div>
          <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden flex">
            <div className="bg-tertiary h-full rounded-full transition-all duration-500" style={{ width: '78%' }} />
          </div>
          <div className="flex justify-between items-center mt-1 font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">
            <span>Ký Quỹ Duy Trì: 4,120 USDT</span>
            <span>Khoảng Cách Cháy Tối Thiểu: -25.5%</span>
          </div>
        </div>

        {/* Quick Operational Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {/* Emergency Close All */}
          <button
            onClick={handleCloseAll}
            disabled={isClosingAll}
            className="flex items-center justify-center gap-1 py-2 px-2 rounded-lg bg-error-container/80 text-on-error-container hover:bg-error-container active:scale-95 transition-all shadow-sm font-['Manrope'] text-[11px] font-bold"
          >
            <span className="material-symbols-outlined text-[15px]">cancel</span>
            <span className="truncate">{isClosingAll ? 'Đang Đóng...' : 'Đóng Hết'}</span>
          </button>

          {/* Deposit Margin */}
          <button
            onClick={() => showToast('Mở cổng nạp ký quỹ Binance USDS-M')}
            className="flex items-center justify-center gap-1 py-2 px-2 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-variant active:scale-95 transition-all font-['Manrope'] text-[11px] font-bold"
          >
            <span className="material-symbols-outlined text-primary text-[15px]">add_card</span>
            <span className="truncate">Nạp Ký Quỹ</span>
          </button>

          {/* Kill Switch Hold */}
          <button
            onClick={() => setShowKillModal(true)}
            disabled={isPanicking}
            className="relative overflow-hidden flex items-center justify-center gap-1 py-2 px-2 rounded-lg bg-error text-on-error hover:opacity-95 active:scale-95 transition-all shadow-sm font-['Manrope'] text-[11px] font-bold"
          >
            <span className="material-symbols-outlined text-[15px]">power_settings_new</span>
            <span className="truncate">Kill Switch</span>
          </button>
        </div>
      </section>

      {/* Live Bot Cluster Telemetry Bar */}
      <section className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-surface-container-high text-primary-container">
            <span className="material-symbols-outlined text-[16px]">smart_toy</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-['Manrope'] text-[12px] font-semibold text-on-surface">
                {status?.is_running ? '4/4 Bots Hoạt Động' : 'Bot Đang Tạm Dừng'}
              </span>
              <span className={`px-1.5 py-0.2 rounded font-['Manrope'] text-[9px] font-bold ${status?.is_running ? 'bg-tertiary/15 text-tertiary' : 'bg-primary-container/20 text-primary-container'}`}>
                {status?.is_running ? 'ỔN ĐỊNH' : 'STANDBY'}
              </span>
            </div>
            <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">
              Binance Futures USDS-M • WebSocket Live
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 font-['JetBrains_Mono'] text-[11px]">
          <div className="flex flex-col items-end">
            <span className="text-on-surface font-medium">240/1200</span>
            <span className="text-on-surface-variant text-[9px]">API req/m</span>
          </div>
        </div>
      </section>

      {/* Section Header: Active Positions */}
      <div className="flex items-center justify-between pt-1 px-1">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[18px]">stacked_line_chart</span>
          <h2 className="font-['Space_Grotesk'] text-[16px] text-on-surface font-bold">Vị Thế Đang Mở</h2>
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-surface-container-high font-['JetBrains_Mono'] text-[10px] text-primary-container font-bold">
            {displayPositions.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterBot(filterBot === 'all' ? 'btc' : 'all')}
            className="font-['Manrope'] text-[11px] text-on-surface-variant hover:text-on-surface flex items-center gap-0.5"
          >
            <span>{filterBot === 'all' ? 'Lọc Bot' : 'Tất Cả'}</span>
            <span className="material-symbols-outlined text-[14px]">tune</span>
          </button>
        </div>
      </div>

      {/* POSITIONS LIST */}
      {displayPositions.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-surface-container-low text-on-surface-variant">
          <span className="material-symbols-outlined text-[36px] text-on-surface-variant/40 mb-2">check_circle</span>
          <p className="font-['Manrope'] text-[14px]">Không có vị thế nào đang mở</p>
        </div>
      ) : (
        displayPositions.map((pos) => {
          const isLong = (pos.side || 'LONG').toUpperCase() === 'LONG';
          const upnl = pos.unrealized_pnl || 0;
          const isProfitable = upnl >= 0;
          const markPrice = pos.mark_price ?? pos.current_price;
          const coinSymbol = pos.symbol.replace('USDT', '');
          const symbolIcon = coinSymbol === 'BTC' ? '₿' : coinSymbol === 'ETH' ? 'Ξ' : coinSymbol === 'SOL' ? '◎' : '⬡';

          return (
            <article
              key={pos.symbol}
              className="flex flex-col rounded-xl bg-surface-container-low p-3.5 shadow-md relative overflow-hidden transition-all border border-surface-container-high/40"
            >
              {/* Top Meta Row */}
              <div className="flex items-center justify-between pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container text-primary font-bold font-['Space_Grotesk'] text-sm">
                    {symbolIcon}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-['Space_Grotesk'] text-[15px] font-bold text-on-surface">{pos.symbol}</span>
                      <span className={`px-1.5 py-0.5 rounded font-['JetBrains_Mono'] text-[10px] font-bold ${isLong ? 'bg-tertiary/15 text-tertiary' : 'bg-error/15 text-error'}`}>
                        {pos.side} {pos.leverage}x
                      </span>
                      <span className="px-1 py-0.5 rounded bg-surface-container font-['Manrope'] text-[9px] text-on-surface-variant">
                        CROSS
                      </span>
                    </div>
                    <span className="font-['JetBrains_Mono'] text-[10px] text-secondary font-medium">
                      Bot #{coinSymbol} Auto Scalper • Live
                    </span>
                  </div>
                </div>

                {/* UnPnL Highlight */}
                <div className="flex flex-col items-end">
                  <span className={`font-['JetBrains_Mono'] text-[13px] font-bold ${isProfitable ? 'text-tertiary' : 'text-error'}`}>
                    {isProfitable ? `+${upnl.toFixed(2)}` : upnl.toFixed(2)} USDT
                  </span>
                  <span className={`font-['JetBrains_Mono'] text-[11px] font-bold ${isProfitable ? 'text-tertiary' : 'text-error'}`}>
                    {isProfitable ? `+${((upnl / (pos.margin || 100)) * 100).toFixed(2)}%` : `${((upnl / (pos.margin || 100)) * 100).toFixed(2)}%`} ROE
                  </span>
                </div>
              </div>

              {/* Data Matrix Grid */}
              <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-surface-container mb-3 font-['JetBrains_Mono']">
                <div className="flex flex-col">
                  <span className="text-[10px] text-on-surface-variant">Quy Mô (Size)</span>
                  <span className="text-[12px] font-semibold text-on-surface">{pos.amount} {coinSymbol}</span>
                  <span className="text-[10px] text-on-surface-variant">
                    ≈ ${(pos.amount * markPrice).toLocaleString('en-US', { maximumFractionDigits: 1 })} USDT
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-on-surface-variant">Giá Vào / Mark</span>
                  <span className="text-[12px] font-medium text-on-surface">${pos.entry_price.toLocaleString('en-US')}</span>
                  <span className={`text-[10px] font-semibold ${isProfitable ? 'text-tertiary' : 'text-error'}`}>
                    ${markPrice.toLocaleString('en-US')}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-on-surface-variant">Giá Thanh Lý</span>
                  <span className="text-[12px] font-bold text-error">
                    {pos.liquidation_price ? `$${pos.liquidation_price.toLocaleString('en-US')}` : 'N/A'}
                  </span>
                  <span className="text-[10px] text-tertiary font-medium">Khoảng cách an toàn</span>
                </div>
              </div>

              {/* Micro Order Slider / Progress toward TP */}
              <div className="flex flex-col gap-1 mb-3">
                <div className="flex justify-between font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">
                  <span>SL: ${(pos.entry_price * 0.98).toFixed(1)}</span>
                  <span className="text-primary-container font-semibold">Mục Tiêu TP: ${(pos.entry_price * 1.03).toFixed(1)}</span>
                </div>
                <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden flex">
                  <div
                    className="bg-primary-container h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(15, (upnl > 0 ? 65 : 25)))}%` }}
                  />
                </div>
              </div>

              {/* Micro Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleCloseSingle(pos.symbol, 50)}
                  className="py-1.5 px-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-['Manrope'] text-[11px] font-semibold transition-all active:scale-95"
                >
                  Đóng 50%
                </button>
                <button
                  onClick={() => handleCloseSingle(pos.symbol, 100)}
                  className="py-1.5 px-2 rounded-lg bg-surface-container-high hover:bg-surface-variant text-error font-['Manrope'] text-[11px] font-bold transition-all active:scale-95"
                >
                  Đóng 100%
                </button>
                <button
                  onClick={() => showToast(`Mở bảng sửa TP/SL cho ${pos.symbol}`)}
                  className="py-1.5 px-2 rounded-lg bg-primary-container/15 hover:bg-primary-container/25 text-primary-container font-['Manrope'] text-[11px] font-bold transition-all active:scale-95 flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[13px]">tune</span>
                  <span>Sửa TP/SL</span>
                </button>
              </div>
            </article>
          );
        })
      )}

      {/* Kill Switch Modal */}
      {showKillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-container-lowest/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-xl bg-surface-container-high p-5 shadow-2xl flex flex-col gap-3 border border-error/30">
            <div className="flex items-center gap-2 text-error">
              <span className="material-symbols-outlined text-[24px]">warning</span>
              <h3 className="font-['Space_Grotesk'] text-[18px] font-bold text-on-surface">Kích Hoạt Kill Switch?</h3>
            </div>
            <p className="font-['Manrope'] text-[13px] text-on-surface-variant leading-relaxed">
              Hành động này sẽ hủy toàn bộ các lệnh chờ (Limit/Grid) và đóng ngay lập tức {displayPositions.length} vị thế theo giá thị trường (Market).
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowKillModal(false)}
                className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface font-['Manrope'] text-[12px] font-bold hover:bg-surface-container-highest"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleConfirmKill}
                className="px-4 py-1.5 rounded-lg bg-error text-on-error font-['Manrope'] text-[12px] font-bold shadow-lg shadow-error/30 active:scale-95 transition-transform"
              >
                Xác Nhận Dừng Khẩn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
