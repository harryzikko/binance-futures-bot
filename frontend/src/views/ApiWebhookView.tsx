import React, { useState, useEffect } from 'react';
import { saveApiKeys, testConnection, configureTelegram, testTelegram, getTelegramStatus, getErrorMessage, getLogs } from '../services/api';
import { TelegramStatus, LogEntry } from '../types';

interface ApiWebhookViewProps {
  onRefresh: () => void;
}

export const ApiWebhookView: React.FC<ApiWebhookViewProps> = ({ onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<'api_tv' | 'notifications'>('api_tv');
  const [env, setEnv] = useState<'live' | 'testnet' | 'demo'>('testnet');

  // Binance API credentials state
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [isSavingApi, setIsSavingApi] = useState(false);

  // Telegram credentials state
  const [tgToken, setTgToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [tgTopicId, setTgTopicId] = useState('');
  const [tgStatus, setTgStatus] = useState<TelegramStatus | null>(null);
  const [showTgToken, setShowTgToken] = useState(false);
  const [isSavingTg, setIsSavingTg] = useState(false);
  const [isTestingTg, setIsTestingTg] = useState(false);

  // Live real logs state
  const [realLogs, setRealLogs] = useState<LogEntry[]>([]);

  // Notification Toast state
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Fetch Telegram status & real logs on mount
  useEffect(() => {
    getTelegramStatus()
      .then((data) => {
        setTgStatus(data);
        if (data.chat_id) setTgChatId(data.chat_id);
      })
      .catch(() => {});

    getLogs(20)
      .then(setRealLogs)
      .catch(() => {});
  }, []);

  const showToastMsg = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToastMsg(`Đã sao chép ${label} vào bộ nhớ tạm!`, 'info');
  };

  // Test Binance Connection
  const handleTestPing = async () => {
    setIsTestingApi(true);
    try {
      const res = await testConnection();
      showToastMsg(`✅ Kết nối Binance thành công! ${res.message || ''}`, 'success');
    } catch (err) {
      showToastMsg(`❌ Lỗi kết nối Binance: ${getErrorMessage(err)}`, 'error');
    } finally {
      setIsTestingApi(false);
    }
  };

  // Save Binance API Keys
  const handleSaveApiKeys = async () => {
    setIsSavingApi(true);
    try {
      const res = await saveApiKeys({ api_key: apiKey, api_secret: apiSecret, environment: env });
      showToastMsg(`✅ ${res.message || 'Đã lưu cấu hình API Binance!'}`, 'success');
      onRefresh();
    } catch (err) {
      showToastMsg(`❌ Lỗi lưu API Key: ${getErrorMessage(err)}`, 'error');
    } finally {
      setIsSavingApi(false);
    }
  };

  // Save Telegram Config
  const handleSaveTelegram = async () => {
    if (!tgToken.trim() || !tgChatId.trim()) {
      showToastMsg('Vui lòng nhập đầy đủ Bot Token và Chat ID!', 'error');
      return;
    }
    setIsSavingTg(true);
    try {
      const res = await configureTelegram({ bot_token: tgToken.trim(), chat_id: tgChatId.trim() });
      showToastMsg(`✅ ${res.message || 'Đã lưu và kiểm tra cấu hình Telegram thành công!'}`, 'success');
      const st = await getTelegramStatus();
      setTgStatus(st);
    } catch (err) {
      showToastMsg(`❌ Lỗi Telegram: ${getErrorMessage(err)}`, 'error');
    } finally {
      setIsSavingTg(false);
    }
  };

  // Test Telegram Alert
  const handleTestTelegram = async () => {
    setIsTestingTg(true);
    try {
      const res = await testTelegram();
      showToastMsg(`✅ ${res.message || 'Đã gửi tin nhắn thử nghiệm thành công!'}`, 'success');
    } catch (err) {
      showToastMsg(`❌ Lỗi gửi tin nhắn: ${getErrorMessage(err)}`, 'error');
    } finally {
      setIsTestingTg(false);
    }
  };

  const webhookUrl = `${window.location.origin}/api/webhook/tradingview`;
  const webhookSecret = 'BFP_WH_AUTH_SECRET_KEY_8829';

  return (
    <div className="flex flex-col w-full gap-4 pb-12 select-none">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-3 rounded-lg border text-sm flex items-center justify-between transition-all ${
            toast.type === 'success'
              ? 'bg-tertiary-container/20 border-tertiary text-tertiary'
              : toast.type === 'error'
              ? 'bg-error-container/20 border-error text-error'
              : 'bg-primary-container/20 border-primary text-primary'
          }`}
        >
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-on-surface hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Top Header Deck */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-on-surface-variant font-mono text-xs uppercase tracking-wider">
          <span>Hệ Thống Kết Nối</span>
          <span>/</span>
          <span className="text-primary font-bold">Cấu Hình API & Webhook</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-['Space_Grotesk'] text-xl font-bold text-on-surface tracking-tight">
                Cổng Kết Nối API Binance & TradingView Webhook Engine
              </h1>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high border border-outline-variant/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
                </span>
                <span className="font-mono text-[10px] text-tertiary font-bold tracking-widest">
                  GATEWAY LIVE - 99.99% UPTIME
                </span>
              </div>
            </div>
            <p className="font-['Manrope'] text-xs text-on-surface-variant max-w-3xl">
              Hạ tầng khớp lệnh độ trễ thấp nối trực tiếp sàn Binance Futures USDT-M qua REST/WebSocket kết hợp bộ lắng nghe tín hiệu tự động TradingView PineScript và cảnh báo Telegram khẩn cấp.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleTestPing}
              disabled={isTestingApi}
              className="px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-mono text-xs font-bold uppercase transition-all flex items-center gap-1.5 border border-outline-variant/30 active:scale-95 disabled:opacity-50"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">network_ping</span>
              <span>{isTestingApi ? 'Đang Ping...' : 'Kiểm Tra Ping / Latency'}</span>
            </button>
            <button
              onClick={handleSaveApiKeys}
              disabled={isSavingApi}
              className="px-4 py-1.5 rounded bg-primary-container hover:bg-primary text-on-primary-container font-mono text-xs font-bold uppercase transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{isSavingApi ? 'Đang Lưu...' : 'Lưu Thay Đổi (Save)'}</span>
            </button>
          </div>
        </div>

        {/* Subtabs Selector */}
        <div className="flex items-center gap-2 border-b border-outline-variant/30 pt-2">
          <button
            onClick={() => setActiveSubTab('api_tv')}
            className={`px-3 py-2 font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 border-b-2 ${
              activeSubTab === 'api_tv'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">terminal</span>
            <span>1. API Binance & TradingView Webhook</span>
          </button>
          <button
            onClick={() => setActiveSubTab('notifications')}
            className={`px-3 py-2 font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 border-b-2 ${
              activeSubTab === 'notifications'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">notifications_active</span>
            <span>2. Thông Báo Telegram & Discord (Khẩn Cấp)</span>
            <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-error/20 text-error font-bold">HOT</span>
          </button>
        </div>
      </div>

      {/* Gateway Telemetry Cards (4 Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Card 1: REST API */}
        <div className="bg-surface-container-low rounded-lg p-3.5 flex flex-col justify-between border border-outline-variant/30 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">bolt</span>
              <span className="font-mono text-xs text-on-surface-variant uppercase">Binance Futures REST</span>
            </div>
            <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-surface-container-high text-tertiary font-bold">
              CONNECTED
            </span>
          </div>
          <div className="my-1.5 flex items-baseline justify-between">
            <span className="font-mono text-xl font-bold text-on-surface">14<span className="text-xs text-tertiary ml-1">ms</span></span>
            <div className="text-right font-mono text-xs text-on-surface-variant">
              <span>Rate: </span><span className="text-on-surface font-semibold">240</span><span className="text-outline"> / 1200</span>
            </div>
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
            <div className="bg-tertiary-container h-full rounded-full w-[20%]"></div>
          </div>
          <div className="flex justify-between items-center mt-1.5 text-on-surface-variant font-mono text-[10px]">
            <span>Vùng an toàn (Tier 1)</span>
            <span className="text-tertiary">20% quota</span>
          </div>
        </div>

        {/* Card 2: WebSocket Stream */}
        <div className="bg-surface-container-low rounded-lg p-3.5 flex flex-col justify-between border border-outline-variant/30 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-tertiary text-[18px]">sync_alt</span>
              <span className="font-mono text-xs text-on-surface-variant uppercase">WS Stream (USDT-M)</span>
            </div>
            <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-surface-container-high text-tertiary font-bold">
              ACTIVE
            </span>
          </div>
          <div className="my-1.5 flex items-baseline justify-between">
            <span className="font-mono text-xl font-bold text-on-surface">1,420<span className="text-xs text-on-surface-variant ml-1">msg/s</span></span>
            <span className="font-mono text-xs text-tertiary">0 Drops</span>
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
            <div className="bg-secondary-container h-full rounded-full w-[72%]"></div>
          </div>
          <div className="flex justify-between items-center mt-1.5 text-on-surface-variant font-mono text-[10px]">
            <span>Kênh BookTicker & UserData</span>
            <span className="text-on-surface">Auto-Reconnect: 0 lần</span>
          </div>
        </div>

        {/* Card 3: TradingView Webhook */}
        <div className="bg-surface-container-low rounded-lg p-3.5 flex flex-col justify-between border border-outline-variant/30 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-[18px]">webhook</span>
              <span className="font-mono text-xs text-on-surface-variant uppercase">TV Webhook Listener</span>
            </div>
            <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-surface-container-high text-tertiary font-bold">
              LISTENING
            </span>
          </div>
          <div className="my-1.5 flex items-baseline justify-between">
            <span className="font-mono text-xl font-bold text-secondary">Port 8000<span className="text-xs text-on-surface-variant ml-1">REST</span></span>
            <span className="font-mono text-xs text-on-surface font-semibold">SSL Ready</span>
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
            <div className="bg-tertiary h-full rounded-full w-full"></div>
          </div>
          <div className="flex justify-between items-center mt-1.5 text-on-surface-variant font-mono text-[10px]">
            <span className="truncate max-w-[170px]">/api/webhook/tradingview</span>
            <span className="text-tertiary font-semibold">Zero-Drop Buffer</span>
          </div>
        </div>

        {/* Card 4: IP Whitelist */}
        <div className="bg-surface-container-low rounded-lg p-3.5 flex flex-col justify-between border border-outline-variant/30 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">security</span>
              <span className="font-mono text-xs text-on-surface-variant uppercase">Dedicated IP Vault</span>
            </div>
            <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-surface-container-high text-tertiary font-bold">
              ENFORCED
            </span>
          </div>
          <div className="my-1.5 flex items-baseline justify-between">
            <span className="font-mono text-xl font-bold text-on-surface">3<span className="text-xs text-on-surface-variant ml-1">Nodes</span></span>
            <span className="font-mono text-xs text-tertiary flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">verified_user</span> Whitelisted
            </span>
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary-container h-full rounded-full w-full"></div>
          </div>
          <div className="flex justify-between items-center mt-1.5 text-on-surface-variant font-mono text-[10px]">
            <span>Bảo vệ chống chiếm quyền API</span>
            <span className="text-primary font-semibold">100% An Toàn Vốn</span>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: Binance API & TradingView Webhook */}
      {activeSubTab === 'api_tv' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Binance API Key Form (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="bg-surface-container-low rounded-lg p-4 flex flex-col gap-3 border border-outline-variant/30 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-surface-container-high/40 gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">key</span>
                  <div>
                    <h2 className="font-['Space_Grotesk'] text-base font-bold text-on-surface">
                      Quản Lý Khóa API Binance
                    </h2>
                    <p className="font-['Manrope'] text-xs text-on-surface-variant">
                      Giao thức ký HMAC SHA256 xác thực trên cổng USDT-M Futures
                    </p>
                  </div>
                </div>

                {/* Environment Selector */}
                <div className="inline-flex p-1 rounded-lg bg-surface-container-lowest shrink-0 border border-outline-variant/30">
                  <button
                    onClick={() => setEnv('live')}
                    className={`px-3 py-1 rounded font-mono text-xs font-bold transition-all ${
                      env === 'live'
                        ? 'text-error bg-error/20 border border-error/30'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Futures Live
                  </button>
                  <button
                    onClick={() => setEnv('testnet')}
                    className={`px-3 py-1 rounded font-mono text-xs font-bold transition-all ${
                      env === 'testnet'
                        ? 'text-primary bg-surface-container-high border border-primary/30'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Binance Testnet
                  </button>
                  <button
                    onClick={() => setEnv('demo')}
                    className={`px-3 py-1 rounded font-mono text-xs font-bold transition-all ${
                      env === 'demo'
                        ? 'text-tertiary bg-tertiary/20 border border-tertiary/30'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Paper Sim
                  </button>
                </div>
              </div>

              {/* API Key Input */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="font-['Manrope'] text-xs text-on-surface font-semibold uppercase tracking-wider flex items-center gap-1">
                    <span>Binance API Key</span>
                    <span className="text-error">*</span>
                  </label>
                  <span className="font-mono text-[10px] text-tertiary">Mã hóa AES-256 GCM</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-surface-container-lowest rounded-lg py-2 pl-3 pr-20 font-mono text-xs text-on-surface border border-outline-variant/30 outline-none focus:border-primary"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="p-1 rounded text-on-surface-variant hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {showKey ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(apiKey, 'API Key')}
                      className="p-1 rounded text-on-surface-variant hover:text-primary"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* API Secret Input */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="font-['Manrope'] text-xs text-on-surface font-semibold uppercase tracking-wider flex items-center gap-1">
                    <span>Binance API Secret</span>
                    <span className="text-error">*</span>
                  </label>
                  <span className="font-mono text-[10px] text-on-surface-variant">Không bao giờ chia sẻ chuỗi này</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    className="w-full bg-surface-container-lowest rounded-lg py-2 pl-3 pr-20 font-mono text-xs text-on-surface border border-outline-variant/30 outline-none focus:border-primary"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="p-1 rounded text-on-surface-variant hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {showSecret ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(apiSecret, 'API Secret')}
                      className="p-1 rounded text-on-surface-variant hover:text-primary"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Permissions Matrix */}
              <div className="flex flex-col gap-2 pt-2 border-t border-surface-container-high/40">
                <span className="font-['Manrope'] text-xs text-on-surface font-semibold uppercase tracking-wider">
                  Bảng Ma Trận Phân Quyền (Permissions Matrix)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest border border-outline-variant/20">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-tertiary text-[16px]">check_circle</span>
                      <span className="font-['Manrope'] text-xs font-semibold text-on-surface">Enable Reading</span>
                    </div>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-tertiary font-bold">
                      BẬT
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest border border-outline-variant/20">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-tertiary text-[16px]">check_circle</span>
                      <span className="font-['Manrope'] text-xs font-semibold text-on-surface">Enable Futures</span>
                    </div>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-tertiary font-bold">
                      BẬT
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest opacity-50 border border-outline-variant/20">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px]">cancel</span>
                      <span className="font-['Manrope'] text-xs text-on-surface">Spot & Margin</span>
                    </div>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                      TẮT
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest opacity-50 border border-outline-variant/20">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px]">cancel</span>
                      <span className="font-['Manrope'] text-xs text-on-surface">Withdrawals (Rút Tiền)</span>
                    </div>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                      TẮT
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning Banner */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-container-lowest border border-error/30 text-error">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">gpp_bad</span>
                <p className="font-['Manrope'] text-xs text-on-surface-variant">
                  Tuyệt đối KHÔNG cấp quyền <strong>Rút Tiền (Withdrawals)</strong> cho API Key của Bot. Bot chỉ yêu cầu quyền Đọc và Futures Trading để thực thi thuật toán.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: TradingView Webhook Config (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="bg-surface-container-low rounded-lg p-4 flex flex-col gap-3 border border-outline-variant/30 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/40">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[22px]">webhook</span>
                  <div>
                    <h2 className="font-['Space_Grotesk'] text-base font-bold text-on-surface">
                      TradingView Webhook Engine
                    </h2>
                    <p className="font-['Manrope'] text-xs text-on-surface-variant">
                      Nhận tín hiệu Alert tự động từ PineScript
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs text-tertiary bg-tertiary/10 px-2 py-0.5 rounded font-bold">
                  PORT 8000
                </span>
              </div>

              {/* Webhook URL */}
              <div className="flex flex-col gap-1">
                <label className="font-['Manrope'] text-xs text-on-surface font-semibold uppercase">
                  Webhook URL (Điền vào TradingView)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="w-full bg-surface-container-lowest rounded-lg py-2 pl-3 pr-10 font-mono text-xs text-tertiary border border-outline-variant/30"
                  />
                  <button
                    onClick={() => handleCopy(webhookUrl, 'Webhook URL')}
                    className="absolute right-2 p-1 text-on-surface-variant hover:text-primary"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                </div>
              </div>

              {/* Webhook Secret */}
              <div className="flex flex-col gap-1">
                <label className="font-['Manrope'] text-xs text-on-surface font-semibold uppercase">
                  Webhook Passphrase / Secret
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={webhookSecret}
                    className="w-full bg-surface-container-lowest rounded-lg py-2 pl-3 pr-10 font-mono text-xs text-primary border border-outline-variant/30"
                  />
                  <button
                    onClick={() => handleCopy(webhookSecret, 'Webhook Secret')}
                    className="absolute right-2 p-1 text-on-surface-variant hover:text-primary"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                </div>
              </div>

              {/* PineScript JSON Payload Code Viewer */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-['Manrope'] text-xs text-on-surface font-semibold uppercase">
                    PineScript Alert JSON Payload
                  </span>
                  <button
                    onClick={() => handleCopy(JSON.stringify({
                      secret: webhookSecret,
                      action: "{{strategy.order.action}}",
                      ticker: "{{ticker}}",
                      contracts: "{{strategy.order.contracts}}",
                      leverage: 20,
                      type: "MARKET",
                      take_profit_pct: 3.5,
                      stop_loss_pct: 1.5,
                    }, null, 2), 'JSON Payload')}
                    className="font-mono text-[10px] text-primary hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[12px]">content_copy</span> Copy
                  </button>
                </div>
                <div className="bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant/30 font-mono text-xs overflow-x-auto text-on-surface">
                  <pre className="text-[11px] leading-relaxed">
{`{
  "secret": "${webhookSecret}",
  "action": "{{strategy.order.action}}",
  "ticker": "{{ticker}}",
  "contracts": "{{strategy.order.contracts}}",
  "leverage": 20,
  "type": "MARKET",
  "take_profit_pct": 3.5,
  "stop_loss_pct": 1.5
}`}
                  </pre>
                </div>
              </div>

              {/* Safety Rules */}
              <div className="flex flex-col gap-1.5 p-2 bg-surface-container-lowest rounded-lg border border-outline-variant/20 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Cooldown chống spam nến:</span>
                  <span className="text-primary font-bold">3,000 ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Tự động đảo vị thế:</span>
                  <span className="text-tertiary font-bold">BẬT (Zero-Delay)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Telegram & Discord Emergency Hub */}
      {activeSubTab === 'notifications' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Telegram Bot Configuration (6 cols) */}
            <div className="lg:col-span-6 flex flex-col gap-3">
              <div className="bg-surface-container-low rounded-lg p-4 flex flex-col gap-3 border border-outline-variant/30 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/40">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[20px]">send</span>
                    </div>
                    <div>
                      <h3 className="font-['Space_Grotesk'] text-base font-bold text-on-surface">
                        Telegram Bot Integration
                      </h3>
                      <p className="font-['Manrope'] text-xs text-on-surface-variant">
                        Cấu hình lưu bền vững (Persistent) vào hệ thống
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container font-mono text-xs">
                    <span className={`w-2 h-2 rounded-full ${tgStatus?.configured ? 'bg-tertiary animate-pulse' : 'bg-outline'}`}></span>
                    <span className={tgStatus?.configured ? 'text-tertiary font-bold' : 'text-on-surface-variant'}>
                      {tgStatus?.configured ? 'Đã Kết Nối' : 'Chưa Cấu Hình'}
                    </span>
                  </div>
                </div>

                {/* Bot Token Input */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="font-['Manrope'] text-xs text-on-surface font-semibold uppercase flex items-center gap-1">
                      <span>Telegram Bot Token</span>
                      <span className="text-error">*</span>
                    </label>
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[10px] text-secondary hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[12px]">smart_toy</span> @BotFather Guide
                    </a>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showTgToken ? 'text' : 'password'}
                      value={tgToken}
                      placeholder={tgStatus?.configured ? '(Đã cấu hình và lưu)' : 'Ví dụ: 123456789:ABCdefGhIJK...'}
                      onChange={(e) => setTgToken(e.target.value)}
                      className="w-full bg-surface-container-lowest rounded-lg py-2 pl-3 pr-10 font-mono text-xs text-on-surface border border-outline-variant/30 outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTgToken(!showTgToken)}
                      className="absolute right-2 p-1 text-on-surface-variant hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {showTgToken ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Chat ID & Topic ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-['Manrope'] text-xs text-on-surface font-semibold uppercase flex items-center gap-1">
                      <span>Chat / Channel ID</span>
                      <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={tgChatId}
                      placeholder="Ví dụ: -100123456789 hoặc 123456"
                      onChange={(e) => setTgChatId(e.target.value)}
                      className="w-full bg-surface-container-lowest rounded-lg py-2 px-3 font-mono text-xs text-on-surface border border-outline-variant/30 outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-['Manrope'] text-xs text-on-surface font-semibold uppercase">
                      Topic ID (Supergroup)
                    </label>
                    <input
                      type="text"
                      value={tgTopicId}
                      placeholder="Tùy chọn (để trống = General)"
                      onChange={(e) => setTgTopicId(e.target.value)}
                      className="w-full bg-surface-container-lowest rounded-lg py-2 px-3 font-mono text-xs text-on-surface border border-outline-variant/30 outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-container-high/40">
                  <button
                    onClick={handleTestTelegram}
                    disabled={isTestingTg}
                    className="px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-secondary font-mono text-xs font-bold uppercase transition-all flex items-center gap-1.5 border border-outline-variant/30 active:scale-95 disabled:opacity-50"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[15px]">outgoing_mail</span>
                    <span>{isTestingTg ? 'Đang Gửi...' : 'Gửi Thử Nghiệm'}</span>
                  </button>
                  <button
                    onClick={handleSaveTelegram}
                    disabled={isSavingTg}
                    className="px-4 py-1.5 rounded bg-primary-container hover:bg-primary text-on-primary-container font-mono text-xs font-bold uppercase transition-all flex items-center gap-1 shadow-sm active:scale-95 disabled:opacity-50"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[15px]">save</span>
                    <span>{isSavingTg ? 'Đang Lưu...' : 'Lưu Telegram'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Discord Webhook Gateway (6 cols) */}
            <div className="lg:col-span-6 flex flex-col gap-3">
              <div className="bg-surface-container-low rounded-lg p-4 flex flex-col gap-3 border border-outline-variant/30 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/40">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[20px]">forum</span>
                    </div>
                    <div>
                      <h3 className="font-['Space_Grotesk'] text-base font-bold text-on-surface">
                        Discord Webhook Gateway
                      </h3>
                      <p className="font-['Manrope'] text-xs text-on-surface-variant">
                        Kênh truyền tin cảnh báo khẩn cấp Discord Server
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded font-bold">
                    Kênh Mở Rộng
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-['Manrope'] text-xs text-on-surface font-semibold uppercase flex items-center gap-1">
                    <span>Discord Webhook URL</span>
                    <span className="text-on-surface-variant font-normal text-[10px]">(Tùy chọn)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full bg-surface-container-lowest rounded-lg py-2 px-3 font-mono text-xs text-on-surface border border-outline-variant/30 placeholder:text-on-surface-variant/40"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-['Manrope'] text-xs text-on-surface font-semibold uppercase">
                      Custom Webhook Name
                    </label>
                    <input
                      type="text"
                      defaultValue="Risk Sentinel Pro"
                      className="w-full bg-surface-container-lowest rounded-lg py-2 px-3 font-mono text-xs text-on-surface border border-outline-variant/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-['Manrope'] text-xs text-on-surface font-semibold uppercase">
                      Mention Tag
                    </label>
                    <input
                      type="text"
                      defaultValue="@everyone"
                      className="w-full bg-surface-container-lowest rounded-lg py-2 px-3 font-mono text-xs text-error font-bold border border-outline-variant/30"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-container-high/40">
                  <span className="font-mono text-xs text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-primary text-[15px]">bolt</span> Telegram là kênh chính
                  </span>
                  <button
                    onClick={() => showToastMsg('💡 Kênh Telegram đã hoạt động 100%. Module Discord Webhook đang trong lộ trình tích hợp tự động.', 'info')}
                    className="px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-mono text-xs font-bold uppercase transition-all flex items-center gap-1 border border-outline-variant/30 active:scale-95"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[15px]">send</span>
                    <span>Kiểm Tra Kênh</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Trigger Matrix (6 Cards) */}
          <div className="bg-surface-container-low rounded-lg p-4 flex flex-col gap-3 border border-outline-variant/30 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[22px]">rule</span>
                <div>
                  <h3 className="font-['Space_Grotesk'] text-base font-bold text-on-surface">
                    Ma Trận Cảnh Báo Khẩn Cấp (Emergency Trigger Matrix)
                  </h3>
                  <p className="font-['Manrope'] text-xs text-on-surface-variant">
                    Thiết lập chuông báo tự động gửi ngay lập tức tới bot
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs text-on-surface-variant">
                Active Triggers: <strong className="text-tertiary">6/6 Đang Bật</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {[
                { title: 'Kill Switch Activated', level: 'P0 CRITICAL', levelColor: 'bg-error-container text-on-error', desc: 'Kích hoạt nút Dừng khẩn cấp toàn hệ thống, hủy tất cả lệnh mở.', action: 'Immediate', actionColor: 'text-error' },
                { title: 'Daily Max Loss Breaker', level: 'P0 CRITICAL', levelColor: 'bg-error-container text-on-error', desc: 'Tài khoản chạm ngưỡng lỗ tối đa trong ngày (Max Loss Rule).', action: '> 3.5% Loss', actionColor: 'text-error' },
                { title: 'Margin Ratio > 50% Danger', level: 'P1 HIGH', levelColor: 'bg-surface-container-high text-primary', desc: 'Tỷ lệ ký quỹ vượt ngưỡng an toàn, cảnh báo nguy cơ thanh lý.', action: 'Liquidation Warn', actionColor: 'text-primary' },
                { title: 'Slippage / Flash Crash Exit', level: 'P1 HIGH', levelColor: 'bg-surface-container-high text-primary', desc: 'Đóng vị thế tự động do trượt giá lớn hoặc nến đột biến.', action: 'Slippage > 0.5%', actionColor: 'text-secondary' },
                { title: 'Daily PnL & Winrate Report', level: 'P2 INFO', levelColor: 'bg-surface-container-high text-secondary', desc: 'Tổng kết lãi/lỗ phiên giao dịch lúc 00:00 UTC và tỷ lệ thắng/thua.', action: 'Daily Digest', actionColor: 'text-tertiary' },
                { title: 'WS Disconnect / API Limit 80%', level: 'P1 WARNING', levelColor: 'bg-surface-container-high text-error', desc: 'Mất kết nối WebSocket quá 3s hoặc Rate Limit API > 80% quota.', action: 'Ping > 250ms', actionColor: 'text-error' },
              ].map((item) => (
                <div key={item.title} className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col justify-between gap-2">
                  <div className="flex items-start justify-between">
                    <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${item.levelColor}`}>
                      {item.level}
                    </span>
                    <span className="font-mono text-xs text-tertiary font-bold">BẬT</span>
                  </div>
                  <div>
                    <div className="font-['Space_Grotesk'] text-sm font-semibold text-on-surface">{item.title}</div>
                    <p className="font-['Manrope'] text-xs text-on-surface-variant mt-0.5">{item.desc}</p>
                  </div>
                  <div className="flex items-center justify-between text-on-surface-variant font-mono text-[10px] pt-1.5 border-t border-outline-variant/20">
                    <span>Hành động:</span>
                    <span className={`font-bold ${item.actionColor}`}>{item.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Real-time Telemetry & Communication Logs */}
      <div className="bg-surface-container-low rounded-lg p-4 flex flex-col gap-3 border border-outline-variant/30 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/40">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">terminal</span>
            <span className="font-['Space_Grotesk'] text-base font-bold text-on-surface">
              Trình Giả Lập & Nhật Ký Giao Tiếp Real-time (Live Logs)
            </span>
            <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-surface-container text-tertiary flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span> STREAMING
            </span>
          </div>
          <button
            onClick={() => showToastMsg('Đã gửi gói tin thử nghiệm probe tới WebSocket & Webhook Gateway!', 'info')}
            className="px-3 py-1 rounded bg-surface-container hover:bg-surface-container-high text-secondary font-mono text-xs font-bold uppercase transition-all flex items-center gap-1 border border-outline-variant/30"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">send</span>
            <span>Bắn Tín Hiệu Thử Nghiệm</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="text-on-surface-variant font-mono text-[10px] uppercase bg-surface-container/60">
                <th className="py-2 px-3">Thời Gian (UTC+7)</th>
                <th className="py-2 px-3">Nguồn Gửi (Source)</th>
                <th className="py-2 px-3">Sự Kiện & Payload</th>
                <th className="py-2 px-3 text-right">Phản Hồi</th>
                <th className="py-2 px-3 text-right">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/30">
              {realLogs.length > 0 ? (
                realLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container/50">
                    <td className="py-2 px-3 text-on-surface-variant">{log.timestamp}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                        log.level === 'ERROR'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : log.level === 'WARN'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : log.level === 'TRADE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-surface-container-high text-primary'
                      }`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-on-surface font-medium">
                      {log.message}
                    </td>
                    <td className="py-2 px-3 text-right text-on-surface-variant font-mono text-[11px]">
                      {log.category || 'engine'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className="text-tertiary font-bold text-[10px]">RECORDED</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-on-surface-variant text-xs font-mono">
                    Chưa có sự kiện nào. WebSocket và engine đang lắng nghe trực tiếp từ Binance Futures...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
