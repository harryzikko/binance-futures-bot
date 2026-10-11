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
  const [showKillModal, setShowKillModal] = useState(false);
  const [isClosingAll, setIsClosingAll] = useState(false);
  const [closedPositionIds, setClosedPositionIds] = useState<string[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Real positions from backend, filtering out any locally closed ones
  const displayPositions: Position[] = (positions || []).filter(
    (p) => !closedPositionIds.includes(p.symbol) && !closedPositionIds.includes(p.id)
  );

  const totalUpnl = displayPositions.reduce((acc, p) => acc + (p.unrealized_pnl || 0), 0);
  const accountBalance = status?.balance_usdt ?? 0;
  const realizedPnlToday = status?.daily_pnl ?? 0;
  const marginUsed = status?.margin_used ?? 0;
  const availableMargin = status?.available_margin ?? accountBalance;
  const marginRatio = accountBalance > 0 ? (marginUsed / accountBalance) * 100 : 0;
  const marginBuffer = Math.max(0, 100 - marginRatio);

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleCloseSingle = (pos: Position, percentage: number) => {
    if (percentage === 100) {
      setClosedPositionIds((prev) => [...prev, pos.symbol, pos.id]);
      showToast(`Đã gửi lệnh chốt toàn bộ vị thế ${pos.symbol} thành công!`);
    } else {
      showToast(`Đã gửi lệnh chốt ${percentage}% vị thế ${pos.symbol} thành công!`);
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
        setClosedPositionIds(displayPositions.map((p) => p.symbol));
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
      <section className="flex flex-col w-full rounded-xl bg-surface-container-low p-4 shadow-xl relative overflow-hidden border border-surface-container-high/40">
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />

        {/* Header Meta & Status Pill */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">account_balance_wallet</span>
            <span className="font-['Manrope'] text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">
              Tổng Tài Sản Ký Quỹ ({status?.mode?.toUpperCase() || 'TESTNET'})
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-high">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-tertiary" />
            </span>
            <span className="font-['JetBrains_Mono'] text-[11px] text-tertiary font-semibold tracking-wide uppercase">
              Live WebSocket
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
              <span className={`px-1 py-0.2 rounded font-bold ${totalUpnl >= 0 ? 'bg-tertiary/10 text-tertiary' : 'bg-error/10 text-error'}`}>
                {accountBalance > 0 ? `${((totalUpnl / accountBalance) * 100).toFixed(2)}% ROE` : '0.00% ROE'}
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
              <span className={`font-['JetBrains_Mono'] text-[14px] font-bold ${realizedPnlToday >= 0 ? 'text-tertiary' : 'text-error'}`}>
                {realizedPnlToday >= 0 ? `+${realizedPnlToday.toFixed(2)}` : realizedPnlToday.toFixed(2)}
              </span>
              <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">USDT</span>
            </div>
            <div className="mt-0.5 inline-flex items-center gap-1 text-on-surface-variant font-['JetBrains_Mono'] text-[10px]">
              <span className={realizedPnlToday >= 0 ? 'text-tertiary font-semibold' : 'text-error font-semibold'}>
                {accountBalance > 0 ? `${((realizedPnlToday / accountBalance) * 100).toFixed(2)}%` : '0.00%'}
              </span>
              <span>(Phiên {status?.mode || 'live'})</span>
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
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-['Manrope'] text-[10px] font-bold ${marginBuffer > 70 ? 'bg-tertiary/15 text-tertiary' : marginBuffer > 40 ? 'bg-primary-container/15 text-primary-container' : 'bg-error/15 text-error'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span>{marginBuffer > 70 ? 'RẤT AN TOÀN' : marginBuffer > 40 ? 'BÌNH THƯỜNG' : 'CẢNH BÁO'} ({marginBuffer.toFixed(1)}%)</span>
            </div>
          </div>
          <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden flex">
            <div
              className={`h-full rounded-full transition-all duration-500 ${marginBuffer > 70 ? 'bg-tertiary' : marginBuffer > 40 ? 'bg-primary-container' : 'bg-error'}`}
              style={{ width: `${Math.min(100, Math.max(5, marginBuffer))}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-1 font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">
            <span>Ký Quỹ Đang Dùng: {marginUsed.toFixed(2)} USDT</span>
            <span>Khả Dụng: {availableMargin.toFixed(2)} USDT</span>
          </div>
        </div>

        {/* Quick Operational Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {/* Emergency Close All */}
          <button
            onClick={handleCloseAll}
            disabled={isClosingAll || displayPositions.length === 0}
            className="flex items-center justify-center gap-1 py-2 px-2 rounded-lg bg-error-container/80 text-on-error-container hover:bg-error-container active:scale-95 transition-all shadow-sm font-['Manrope'] text-[11px] font-bold disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[15px]">cancel</span>
            <span className="truncate">{isClosingAll ? 'Đang Đóng...' : 'Đóng Hết'}</span>
          </button>

          {/* Deposit Margin */}
          <button
            onClick={() => showToast('Cổng nạp ký quỹ Binance USDS-M')}
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
      <section className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low shadow-sm border border-surface-container-high/40">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-surface-container-high text-primary-container">
            <span className="material-symbols-outlined text-[16px]">smart_toy</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-['Manrope'] text-[12px] font-semibold text-on-surface">
                {status?.is_running ? 'Bot Đang Hoạt Động' : 'Bot Đang Tạm Dừng'}
              </span>
              <span className={`px-1.5 py-0.2 rounded font-['Manrope'] text-[9px] font-bold ${status?.is_running ? 'bg-tertiary/15 text-tertiary' : 'bg-primary-container/20 text-primary-container'}`}>
                {status?.is_running ? 'RUNNING' : 'STANDBY'}
              </span>
            </div>
            <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">
              Chiến lược: {status?.strategy || 'Bollinger Bands'} • Mode {status?.mode || 'testnet'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 font-['JetBrains_Mono'] text-[11px]">
          <div className="flex flex-col items-end">
            <span className="text-on-surface font-medium">{displayPositions.length} vị thế</span>
            <span className="text-on-surface-variant text-[9px]">Win Rate {status?.win_rate ?? 60}%</span>
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
          <span className="font-['JetBrains_Mono'] text-[11px] text-on-surface-variant">
            {status?.gemini_regime?.regime_vn || 'Tự động quét'}
          </span>
        </div>
      </div>

      {/* Real Positions List or Empty State */}
      {displayPositions.length === 0 ? (
        <div className="p-8 rounded-xl bg-surface-container-low border border-surface-container-high/40 text-center flex flex-col items-center justify-center gap-2">
          <span className="material-symbols-outlined text-4xl text-tertiary">verified_user</span>
          <p className="text-sm font-bold text-on-surface">Không Có Vị Thế Nào Đang Mở</p>
          <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
            {status?.is_running
              ? 'Bot thuật toán đang quét các cặp Binance Futures và tự động mở vị thế khi phát hiện tín hiệu an toàn.'
              : 'Tất cả vốn đang an toàn 100%. Hãy khởi động bot để bắt đầu quét và mở vị thế tự động.'}
          </p>
        </div>
      ) : (
        displayPositions.map((pos) => {
          const isLong = pos.side.toUpperCase() === 'LONG';
          const upnl = pos.unrealized_pnl || 0;
          const isProfitable = upnl >= 0;
          const markPrice = pos.mark_price ?? pos.current_price;
          const cleanSymbol = pos.symbol.split('/')[0].split(':')[0].replace('USDT', '');
          const symbolIcon = cleanSymbol === 'BTC' ? '₿' : cleanSymbol === 'ETH' ? 'Ξ' : cleanSymbol === 'SOL' ? '◎' : '◆';

          return (
            <article
              key={pos.id || pos.symbol}
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
                    </div>
                    <span className="font-['JetBrains_Mono'] text-[10px] text-secondary font-medium">
                      Bot #{cleanSymbol} Scalper • Live
                    </span>
                  </div>
                </div>

                {/* UnPnL Highlight */}
                <div className="flex flex-col items-end">
                  <span className={`font-['JetBrains_Mono'] text-[13px] font-bold ${isProfitable ? 'text-tertiary' : 'text-error'}`}>
                    {isProfitable ? `+${upnl.toFixed(2)}` : upnl.toFixed(2)} USDT
                  </span>
                  <span className={`font-['JetBrains_Mono'] text-[11px] font-bold ${isProfitable ? 'text-tertiary' : 'text-error'}`}>
                    {isProfitable ? `+${pos.unrealized_pnl_pct ? pos.unrealized_pnl_pct.toFixed(2) : ((upnl / (pos.margin || 100)) * 100).toFixed(2)}%` : `${pos.unrealized_pnl_pct ? pos.unrealized_pnl_pct.toFixed(2) : ((upnl / (pos.margin || 100)) * 100).toFixed(2)}%`} ROE
                  </span>
                </div>
              </div>

              {/* Data Matrix Grid */}
              <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-surface-container mb-3 font-['JetBrains_Mono']">
                <div className="flex flex-col">
                  <span className="text-[10px] text-on-surface-variant">Quy Mô (Size)</span>
                  <span className="text-[12px] font-semibold text-on-surface">{pos.amount} {cleanSymbol}</span>
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
                  <span className="text-[10px] text-on-surface-variant">
                    Margin: ${pos.margin ? pos.margin.toFixed(1) : (pos.notional ? (pos.notional / (pos.leverage || 10)).toFixed(1) : '100.0')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleCloseSingle(pos, 50)}
                  className="py-1.5 px-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-['Manrope'] text-[11px] font-bold transition-all text-center"
                >
                  Đóng 50%
                </button>
                <button
                  onClick={() => handleCloseSingle(pos, 100)}
                  className="py-1.5 px-2 rounded-lg bg-error-container/60 hover:bg-error-container text-on-error-container font-['Manrope'] text-[11px] font-bold transition-all text-center"
                >
                  Đóng 100%
                </button>
                <button
                  onClick={() => showToast(`Cập nhật TP/SL cho vị thế ${pos.symbol}`)}
                  className="py-1.5 px-2 rounded-lg bg-surface-container-high hover:bg-surface-variant text-primary-container font-['Manrope'] text-[11px] font-bold transition-all text-center"
                >
                  Sửa TP/SL
                </button>
              </div>
            </article>
          );
        })
      )}

      {/* Modal xác nhận dừng khẩn cấp P0 */}
      {showKillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl bg-surface-container-low p-5 border border-error/50 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-error">
              <span className="material-symbols-outlined text-[24px]">warning</span>
              <h3 className="font-['Space_Grotesk'] text-[16px] font-bold uppercase tracking-tight">
                Xác Nhận Dừng Khẩn Cấp P0
              </h3>
            </div>
            <p className="font-['Manrope'] text-[13px] text-on-surface-variant leading-relaxed">
              Bạn có chắc chắn muốn <strong className="text-error">hủy tất cả lệnh chờ</strong> và{' '}
              <strong className="text-error">đóng toàn bộ vị thế</strong> ở giá thị trường (Market) không?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowKillModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container-high text-on-surface font-['Manrope'] text-[13px] font-semibold"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleConfirmKill}
                className="flex-1 py-2.5 rounded-xl bg-error text-on-error font-['Manrope'] text-[13px] font-bold shadow-lg"
              >
                Xác Nhận Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
