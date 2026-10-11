import React, { useState, useEffect, useRef } from 'react';
import { saveApiKeys, getErrorMessage } from '../services/api';
import { X, KeyRound, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [environment, setEnvironment] = useState<'testnet' | 'demo' | 'live'>('testnet');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sessionRef = useRef(0);
  useEffect(() => {
    sessionRef.current += 1;
    return () => { sessionRef.current += 1; };
  }, [isOpen]);

  const handleClose = () => {
    sessionRef.current += 1;
    setApiKey('');
    setApiSecret('');
    setStatusMessage(null);
    onClose();
  };
  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (environment === 'live' && !window.confirm('Lưu khóa LIVE sẽ thay đổi kết nối Binance thật. Tiếp tục?')) return;
    const session = sessionRef.current;
    if (!apiKey || !apiSecret) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ API Key và Secret' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await saveApiKeys({ api_key: apiKey.trim(), api_secret: apiSecret.trim(), environment });
      if (session !== sessionRef.current) return;
      if (res.success) {
        setApiKey('');
        setApiSecret('');
        setStatusMessage({ type: 'success', text: res.message });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch (err: unknown) {
      if (session === sessionRef.current) setStatusMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={handleClose}
          disabled={isLoading}
          aria-label="Đóng cửa sổ API"
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Cấu Hình API Binance Futures</h3>
            <p className="text-xs text-slate-400">Kết nối Binance Futures Testnet, Demo hoặc Live</p>
          </div>
        </div>

        {/* Security Warning Notice */}
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Bảo Mật:</strong> Chỉ cần cấp quyền <em>Enable Futures (Đọc & Giao dịch Futures)</em>. Tuyệt đối <strong>KHÔNG</strong> bật quyền Rút tiền (Withdraw).
          </span>
        </div>

        <form onSubmit={handleTestAndSave} className="space-y-4">
          <fieldset disabled={isLoading} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Binance API Key</label>
            <input
              type="text"
              autoComplete="off"
              placeholder="Dán API Key tại đây..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Binance Secret Key</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Dán Secret Key tại đây..."
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Môi trường của API Key</label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as typeof environment)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="testnet">Binance Futures Testnet</option>
              <option value="demo">Binance Futures Demo</option>
              <option value="live">Binance Futures LIVE</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Testnet, Demo và Live dùng API Key riêng; không dùng khóa lẫn môi trường.</p>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}
            >
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-500/20"
            >
              {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Lưu & Kiểm Tra</span>
            </button>
          </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
};
