import React, { useState, useRef } from 'react';
import { Position } from '../types';
import { closePosition, getErrorMessage } from '../services/api';
import { Layers, XCircle, Radar } from 'lucide-react';

interface PositionsTableProps {
  positions: Position[];
  onRefresh?: () => void;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({ positions, onRefresh }) => {
  const [closingId, setClosingId] = useState<string | null>(null);

  const closeLock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const formatPrice = (p: number) => {
    if (!p) return '0.00';
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return p.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 });
  };

  const handleClose = async (posId: string) => {
    if (closeLock.current) return;
    const position = positions.find(pos => pos.id === posId);
    if (!window.confirm(`Đóng vị thế ${position?.side} ${position?.symbol} (${position?.mode})?`)) return;
    closeLock.current = true;
    setError(null);
    setClosingId(posId);
    try {
      await closePosition(posId);
      onRefresh?.();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      closeLock.current = false;
      setClosingId(null);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white">Vị Thế Đang Mở (Active Positions)</h3>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
          {positions.length} Vị thế
        </span>
      </div>

      {error && <p role="alert" className="text-xs text-rose-400 mb-3">{error}</p>}
      {positions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="relative mb-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Radar className="w-6 h-6 text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <div className="absolute inset-0 rounded-full border border-emerald-500/30 animate-ping" />
          </div>
          <p className="text-sm font-semibold text-slate-200">Không có vị thế mở</p>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            Bot đang liên tục quét nến và tính toán các chỉ báo để tìm điểm vào lệnh lướt sóng tối ưu...
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="pb-2.5 font-semibold">Cặp / Chiều</th>
                <th className="pb-2.5 font-semibold">Khối Lượng</th>
                <th className="pb-2.5 font-semibold">Giá Vào</th>
                <th className="pb-2.5 font-semibold">Giá Hiện Tại</th>
                <th className="pb-2.5 font-semibold">uPnL (USDT / %)</th>
                <th className="pb-2.5 font-semibold">TP / SL / Trailing</th>
                <th className="pb-2.5 font-semibold text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {positions.map((pos) => {
                const isLong = pos.side === 'LONG';
                const isProfit = pos.unrealized_pnl >= 0;
                const verified = pos.protection_status === 'verified';
                const unverified = pos.protection_status === 'unverified';
                const canShowProtection = verified || (pos.mode === 'paper' && !unverified);
                const protectionPrice = (price: number | null | undefined) => {
                  if (!canShowProtection) return 'Chưa xác minh';
                  if (price == null || !Number.isFinite(price) || price <= 0) return verified ? 'Không có lệnh' : '—';
                  return `$${formatPrice(price)}`;
                };

                return (
                  <tr key={pos.id} className="hover:bg-slate-800/30 transition">
                    {/* Symbol & Direction */}
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            isLong
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {pos.side} {pos.leverage}x
                        </span>
                        <span className="font-bold text-white text-xs">{pos.symbol}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                        {pos.entry_time?.split(/[ T]/)[1] || pos.entry_time || '—'}
                      </span>
                    </td>

                    {/* Amount & Margin */}
                    <td className="py-3">
                      <div className="font-mono text-slate-200">
                        {pos.amount} <span className="text-[10px] text-slate-400">{pos.symbol.split('/')[0]}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Vốn: ${pos.margin.toFixed(2)} (${pos.notional.toFixed(1)})
                      </div>
                    </td>

                    {/* Entry Price */}
                    <td className="py-3 font-mono font-bold text-slate-200">
                      ${formatPrice(pos.entry_price)}
                    </td>

                    {/* Current Mark Price */}
                    <td className="py-3 font-mono font-bold text-white">
                      ${formatPrice(pos.current_price)}
                    </td>

                    {/* Unrealized PnL */}
                    <td className="py-3">
                      <div className={`font-mono font-bold text-sm ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfit ? `+$${pos.unrealized_pnl.toFixed(2)}` : `-$${Math.abs(pos.unrealized_pnl).toFixed(2)}`}
                      </div>
                      <div className={`text-[11px] font-mono font-semibold ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isProfit ? `+${pos.unrealized_pnl_pct.toFixed(2)}%` : `${pos.unrealized_pnl_pct.toFixed(2)}%`}
                      </div>
                    </td>

                    {/* TP / SL / Trailing */}
                    <td className="py-3 font-mono text-[11px]">
                      <div className="text-emerald-400 font-medium">TP: {protectionPrice(pos.take_profit_price)}</div>
                      <div className="text-rose-400 font-medium">SL: {protectionPrice(pos.stop_loss_price)}</div>
                      {verified ? (
                        <div className="text-emerald-400 text-[10px] font-sans">Đã xác minh lệnh bảo vệ</div>
                      ) : (unverified || pos.mode !== 'paper') ? (
                        <div className="text-amber-300 text-[10px] font-sans max-w-52 whitespace-normal">
                          {unverified ? 'Lỗi tải lệnh bảo vệ — chưa xác minh TP/SL.' : 'Chưa có dữ liệu xác minh TP/SL.'}
                          {pos.protection_error && <span className="block break-words">{pos.protection_error}</span>}
                        </div>
                      ) : (
                        <div className="text-slate-400 text-[10px] font-sans">Mô phỏng Paper</div>
                      )}
                      {pos.trailing_stop_price != null && Number.isFinite(pos.trailing_stop_price) && pos.trailing_stop_price > 0 ? (
                        <div className="text-cyan-400 font-semibold">
                          Trail: ${formatPrice(pos.trailing_stop_price)}
                        </div>
                      ) : (
                        <div className="text-slate-500 text-[10px]">Trail: Không có dữ liệu</div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleClose(pos.id)}
                        disabled={closingId !== null}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1 ml-auto"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{closingId === pos.id ? 'Đang đóng...' : 'Đóng vị thế'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
