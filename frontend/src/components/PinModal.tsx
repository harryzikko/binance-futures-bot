import React, { useState } from 'react';
import { verifyPin, setPin } from '../services/api';

interface PinModalProps {
  isOpen: boolean;
  mode?: 'verify' | 'setup';
  title?: string;
  description?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  mode = 'verify',
  title = 'Xác Thực Mã PIN Bảo Mật',
  description = 'Vui lòng nhập mã PIN bảo vệ bảng điều khiển để tiếp tục thực hiện hành động.',
  onSuccess,
  onClose,
}) => {
  const [pin, setPinValue] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPinValue(prev => prev + digit);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPinValue(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPinValue('');
    setError(null);
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError('Mã PIN phải có ít nhất 4 số');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'verify') {
        const res = await verifyPin({ pin });
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setError(res.message || 'Mã PIN không đúng');
          setPinValue('');
        }
      } else {
        const res = await setPin({ old_pin: oldPin || undefined, new_pin: pin, enabled: true });
        if (res.success) {
          onSuccess();
          onClose();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi xác thực mã PIN';
      setError(msg);
      setPinValue('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-sm rounded-2xl bg-surface-container-low border border-outline-variant/40 shadow-2xl p-6 flex flex-col items-center">
        {/* Header Icon */}
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mb-3 shadow-inner">
          <span className="material-symbols-outlined text-2xl">lock</span>
        </div>

        <h3 className="font-['Space_Grotesk'] text-lg font-bold text-on-surface text-center">
          {title}
        </h3>
        <p className="font-['Manrope'] text-xs text-on-surface-variant text-center mt-1 mb-6">
          {description}
        </p>

        {mode === 'setup' && (
          <div className="w-full mb-4">
            <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1">
              Mã PIN cũ (nếu có):
            </label>
            <input
              type="password"
              maxLength={6}
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value)}
              placeholder="Để trống nếu lần đầu đặt"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-center text-on-surface font-mono tracking-widest focus:outline-none focus:border-primary"
            />
          </div>
        )}

        {/* PIN Dots Display */}
        <div className="flex items-center justify-center gap-3 mb-6 h-8">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                idx < pin.length
                  ? 'bg-primary shadow-[0_0_8px_rgba(240,185,11,0.6)] scale-110'
                  : 'border border-outline-variant/60 bg-surface-container-high'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full mb-4 p-2 rounded-lg bg-error-container/20 border border-error/40 text-error text-xs text-center font-['Manrope']">
            {error}
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[240px] mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-12 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface font-['Space_Grotesk'] text-lg font-bold transition-all active:scale-95 shadow-sm"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-xl bg-surface-container/60 hover:bg-surface-container text-on-surface-variant text-xs font-bold transition-all active:scale-95 border border-outline-variant/20"
          >
            XÓA
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface font-['Space_Grotesk'] text-lg font-bold transition-all active:scale-95 shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-surface-container/60 hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-all active:scale-95 border border-outline-variant/20"
          >
            <span className="material-symbols-outlined text-lg">backspace</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || pin.length < 4}
            className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-on-primary text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-sm">verified_user</span>
            )}
            <span>{mode === 'verify' ? 'Mở Khóa' : 'Lưu PIN'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
