import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  ShieldCheck,
  BellRing,
  HelpCircle
} from 'lucide-react';
import {
  configureTelegram,
  getTelegramStatus,
  testTelegram,
  deleteTelegramConfig,
  getErrorMessage
} from '../services/api';
import type { TelegramStatus } from '../types';

export function TelegramPanel() {
  const tokenInput = useRef<HTMLInputElement>(null);
  const [chatId, setChatId] = useState('');
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [busy, setBusy] = useState<'refresh' | 'configure' | 'test' | 'delete' | null>('refresh');
  const [isEditing, setIsEditing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const mounted = useRef(false);
  const actionLock = useRef(false);

  const fetchStatus = async () => {
    try {
      const val = await getTelegramStatus();
      if (mounted.current) {
        setStatus(val);
        setChatId(val.chat_id ?? '');
      }
    } catch (err) {
      if (mounted.current) setError(getErrorMessage(err));
    }
  };

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void getTelegramStatus(controller.signal).then(val => {
      if (controller.signal.aborted) return;
      setStatus(val);
      setChatId(val.chat_id ?? '');
    }).catch(err => {
      if (!controller.signal.aborted) setError(getErrorMessage(err));
    }).finally(() => {
      if (!controller.signal.aborted) setBusy(null);
    });
    return () => {
      mounted.current = false;
      controller.abort();
    };
  }, []);

  const handleConfigure = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = tokenInput.current?.value.trim() ?? '';
    const chat = chatId.trim();

    if (!token || !chat) {
      setError('Vui lòng nhập đầy đủ Telegram Bot Token và Chat ID.');
      return;
    }

    if (actionLock.current) return;
    actionLock.current = true;
    setBusy('configure');
    setError(null);
    setMessage(null);

    try {
      const res = await configureTelegram({ bot_token: token, chat_id: chat });
      if (mounted.current) {
        setStatus(res.status);
        setMessage(res.message);
        setIsEditing(false);
        if (tokenInput.current) tokenInput.current.value = '';
      }
    } catch (err) {
      if (mounted.current) setError(getErrorMessage(err));
    } finally {
      actionLock.current = false;
      if (mounted.current) setBusy(null);
    }
  };

  const handleTest = async () => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy('test');
    setError(null);
    setMessage(null);

    try {
      const res = await testTelegram();
      if (mounted.current) {
        setStatus(res.status);
        setMessage(res.message);
      }
    } catch (err) {
      if (mounted.current) setError(getErrorMessage(err));
    } finally {
      actionLock.current = false;
      if (mounted.current) setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa cấu hình Telegram khỏi máy chủ không?')) return;
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy('delete');
    setError(null);
    setMessage(null);

    try {
      const res = await deleteTelegramConfig();
      if (mounted.current) {
        setStatus(res.status);
        setMessage(res.message);
        setChatId('');
        setIsEditing(true);
      }
    } catch (err) {
      if (mounted.current) setError(getErrorMessage(err));
    } finally {
      actionLock.current = false;
      if (mounted.current) setBusy(null);
    }
  };

  const isConfigured = Boolean(status?.configured);
  const lastSent = status?.last_sent_at;
  const lastSentDate = lastSent ? new Date(lastSent) : null;
  const lastSentLabel =
    lastSentDate && !Number.isNaN(lastSentDate.getTime())
      ? lastSentDate.toLocaleString('vi-VN')
      : lastSent || 'Chưa gửi';

  return (
    <section
      aria-labelledby="telegram-heading"
      className="rounded-lg bg-surface-container-low border border-outline-variant/30 p-3.5 sm:p-4 shadow-sm font-['Manrope'] space-y-3"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2.5 border-b border-surface-container-highest/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Send className="w-4 h-4" />
          </div>
          <div>
            <h3 id="telegram-heading" className="font-['Space_Grotesk'] text-sm font-bold text-on-surface">
              THÔNG BÁO TELEGRAM TỰ ĐỘNG
            </h3>
            <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">
              Lưu vĩnh viễn trên máy chủ &bull; Báo cáo chi tiết khi khớp lệnh
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition"
            title="Hướng dẫn lấy Token và Chat ID"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setBusy('refresh');
              setError(null);
              fetchStatus().finally(() => { if (mounted.current) setBusy(null); });
            }}
            disabled={busy !== null}
            className="p-1 rounded text-on-surface-variant hover:text-white hover:bg-surface-container-high transition disabled:opacity-50"
            title="Làm mới trạng thái"
          >
            <RefreshCw className={`w-4 h-4 ${busy === 'refresh' ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Guide Dropdown if user clicks Help */}
      {showGuide && (
        <div className="p-3 rounded bg-surface-container-highest/40 border border-primary/30 text-xs text-on-surface space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-primary font-['Space_Grotesk']">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Hướng Dẫn Kết Nối Bot Telegram:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-on-surface-variant leading-relaxed">
            <li>
              Mở Telegram, tìm <strong>@BotFather</strong> và gõ <code className="text-primary font-mono">/newbot</code> để tạo bot và nhận <strong>Bot Token</strong>.
            </li>
            <li>
              Tìm bot vừa tạo trên Telegram và nhấn <strong>/start</strong> để bắt đầu trò chuyện.
            </li>
            <li>
              Tìm bot <strong>@userinfobot</strong> hoặc <strong>@RawDataBot</strong> để lấy <strong>Chat ID</strong> của bạn (dạng số, ví dụ: <code className="text-primary font-mono">123456789</code>).
            </li>
          </ol>
        </div>
      )}

      {/* Status Overview Card */}
      <div className="p-3 rounded bg-surface-container-lowest border border-outline-variant/20 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isConfigured ? 'bg-tertiary shadow-[0_0_8px_rgba(89,248,169,0.8)]' : 'bg-slate-600'
              }`}
            />
            <span className={`font-bold font-['Space_Grotesk'] ${isConfigured ? 'text-tertiary' : 'text-on-surface-variant'}`}>
              {isConfigured ? 'ĐÃ KẾT NỐI & ĐANG HOẠT ĐỘNG' : 'CHƯA CẤU HÌNH TELEGRAM'}
            </span>
          </div>

          {isConfigured && (
            <span className="font-label-code text-[10px] px-2 py-0.5 rounded bg-tertiary-container/15 text-tertiary border border-tertiary/20">
              LƯU VĨNH VIỄN
            </span>
          )}
        </div>

        {isConfigured && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-surface-container-highest/60 text-[11px] font-['JetBrains_Mono']">
            <div>
              <span className="text-on-surface-variant block text-[10px]">Chat ID Nhận Tin:</span>
              <span className="text-on-surface font-bold">{status?.chat_id || status?.masked_chat_id || '—'}</span>
            </div>
            <div>
              <span className="text-on-surface-variant block text-[10px]">Gửi Gần Nhất:</span>
              <span className="text-on-surface">{lastSentLabel}</span>
            </div>
          </div>
        )}

        {status?.last_error && (
          <div className="flex items-start gap-1.5 text-error text-[11px] pt-1 border-t border-surface-container-highest/60 font-['JetBrains_Mono']">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Lỗi gần nhất: {status.last_error}</span>
          </div>
        )}
      </div>

      {/* Active Mode: Buttons & Quick Test */}
      {isConfigured && !isEditing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={handleTest}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-xs font-['JetBrains_Mono'] font-bold transition disabled:opacity-50"
            >
              <BellRing className={`w-3.5 h-3.5 ${busy === 'test' ? 'animate-bounce' : ''}`} />
              <span>{busy === 'test' ? 'Đang gửi...' : 'Gửi Tin Thử Nghiệm'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="py-2 px-3 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold transition border border-outline-variant/30"
              title="Đổi Token hoặc Chat ID"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              disabled={busy !== null}
              onClick={handleDelete}
              className="py-2 px-3 rounded bg-error-container/20 hover:bg-error-container/30 text-error text-xs font-semibold transition border border-error/30 disabled:opacity-50"
              title="Xóa cấu hình Telegram"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Edit/Configure Form */
        <form onSubmit={handleConfigure} className="space-y-2.5">
          <div>
            <label htmlFor="telegram-token" className="block text-[11px] font-semibold text-on-surface mb-1">
              Bot Token
            </label>
            <input
              ref={tokenInput}
              id="telegram-token"
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              required
              placeholder="Ví dụ: 7123456789:AAHk..."
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-3 py-2 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition font-['JetBrains_Mono']"
            />
          </div>

          <div>
            <label htmlFor="telegram-chat-id" className="block text-[11px] font-semibold text-on-surface mb-1">
              Chat ID
            </label>
            <input
              id="telegram-chat-id"
              type="text"
              autoComplete="off"
              spellCheck={false}
              required
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="Ví dụ: 123456789 hoặc -100123456789"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-3 py-2 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition font-['JetBrains_Mono']"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={busy !== null}
              className="flex-1 py-2 rounded bg-primary text-on-primary font-['JetBrains_Mono'] text-xs font-bold transition disabled:opacity-50 shadow-sm hover:bg-primary-fixed"
            >
              {busy === 'configure' ? 'Đang xác thực & lưu...' : 'Lưu Vĩnh Viễn & Gửi Thử'}
            </button>

            {isConfigured && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="py-2 px-3 rounded bg-surface-container-high hover:bg-surface-variant text-on-surface-variant text-xs transition border border-outline-variant/30"
              >
                Hủy
              </button>
            )}
          </div>
        </form>
      )}

      {/* Messages */}
      {message && (
        <div className="p-2.5 rounded bg-tertiary-container/15 border border-tertiary/30 text-xs text-tertiary flex items-start gap-1.5 font-['JetBrains_Mono']">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded bg-error-container/15 border border-error/30 text-xs text-error flex items-start gap-1.5 font-['JetBrains_Mono']">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Reassuring Persistent Notice */}
      <div className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant/20 text-[11px] text-on-surface-variant space-y-1">
        <div className="flex items-center gap-1.5 text-on-surface font-semibold font-['Space_Grotesk']">
          <ShieldCheck className="w-3.5 h-3.5 text-tertiary" />
          <span>BẢO TOÀN CẤU HÌNH KHI KHỞI ĐỘNG LẠI:</span>
        </div>
        <p className="leading-snug text-on-surface-variant">
          Token và Chat ID được lưu trữ an toàn trong cơ sở dữ liệu SQLite của bot. Bạn chỉ cần cấu hình một lần duy nhất, bot sẽ tự động gửi thông báo liên tục qua các phiên làm việc.
        </p>
      </div>
    </section>
  );
}
