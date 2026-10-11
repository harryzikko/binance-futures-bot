import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { panicCloseAll, getConfig, getErrorMessage, startBot, stopBot, getPinStatus } from './services/api';
import { Sidebar, TabPath } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { StrategiesView } from './views/StrategiesView';
import { BacktestView } from './views/BacktestView';
import { PositionsOrderBookView } from './views/PositionsOrderBookView';
import { PnLHistoryView } from './views/PnLHistoryView';
import { RiskManagementView } from './views/RiskManagementView';
import { ApiWebhookView } from './views/ApiWebhookView';
import { ApiKeyModal } from './components/ApiKeyModal';
import { PinModal } from './components/PinModal';
import { Capacitor } from '@capacitor/core';
import { MobileLayout } from './mobile/MobileLayout';
import type { TradeConfig } from './types';

export function App() {
  const { status, positions, stats, logs, ticker, isConnected } = useWebSocket();
  const [activeTab, setActiveTab] = useState<TabPath>('dashboard');
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);
  const [chartTimeframe, setChartTimeframe] = useState<string | null>(null);

  const selectedSymbol = chartSymbol ?? status?.symbol ?? 'BTCUSDT';
  const selectedTimeframe = chartTimeframe ?? status?.timeframe ?? '1m';

  const [config, setConfig] = useState<TradeConfig | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPanicking, setIsPanicking] = useState(false);
  const [isBotToggling, setIsBotToggling] = useState(false);
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'verify' | 'setup'>('verify');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const panicLock = useRef(false);

  const isNative = Capacitor.isNativePlatform();
  const [isMobileMode, setIsMobileMode] = useState<boolean>(() => {
    if (Capacitor.isNativePlatform()) return true;
    const saved = localStorage.getItem('app_mobile_mode');
    if (saved !== null) return saved === 'true';
    return typeof window !== 'undefined' && window.innerWidth < 1024;
  });

  const reloadAll = () => {
    getConfig().then(setConfig).catch(() => {});
    getPinStatus().then(res => setIsPinEnabled(res.enabled)).catch(() => {});
  };

  useEffect(() => {
    let active = true;
    getConfig()
      .then((value) => {
        if (active) setConfig(value);
      })
      .catch((err) => {
        if (active) setActionError(getErrorMessage(err));
      });
    getPinStatus().then(res => {
      if (active) setIsPinEnabled(res.enabled);
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handlePanic = async () => {
    if (panicLock.current) return;
    if (!window.confirm('⚠️ CẢNH BÁO KHẨN CẤP:\nĐÓNG TOÀN BỘ VỊ THẾ và DỪNG BOT ngay lập tức?')) return;
    panicLock.current = true;
    setIsPanicking(true);
    setActionError(null);
    try {
      await panicCloseAll();
      reloadAll();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      panicLock.current = false;
      setIsPanicking(false);
    }
  };

  const doToggleBot = async () => {
    if (isBotToggling) return;
    setIsBotToggling(true);
    setActionError(null);
    try {
      if (status?.is_running) {
        if (window.confirm('Tạm dừng bot thuật toán? Các vị thế đang mở vẫn tiếp tục được giám sát chốt lời/cắt lỗ an toàn.')) {
          await stopBot();
          reloadAll();
        }
      } else {
        await startBot();
        reloadAll();
      }
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setIsBotToggling(false);
    }
  };

  const handleToggleBot = () => {
    if (isPinEnabled) {
      setPinModalMode('verify');
      setPendingAction(() => doToggleBot);
      setIsPinModalOpen(true);
    } else {
      doToggleBot();
    }
  };

  const handleSymbolChange = (symbol: string) => setChartSymbol(symbol);
  const handleTimeframeChange = (timeframe: string) => setChartTimeframe(timeframe);

  if (isMobileMode) {
    return (
      <div className="min-h-screen bg-surface text-on-surface font-['Manrope'] antialiased">
        <MobileLayout
          status={status}
          positions={positions}
          ticker={ticker}
          onPanicCloseAll={handlePanic}
          onToggleBot={handleToggleBot}
          onSwitchToDesktop={!isNative ? () => {
            setIsMobileMode(false);
            localStorage.setItem('app_mobile_mode', 'false');
          } : undefined}
          isPanicking={isPanicking}
          isBotToggling={isBotToggling}
        />

        <ApiKeyModal
          isOpen={isApiModalOpen}
          onClose={() => {
            setIsApiModalOpen(false);
            reloadAll();
          }}
        />

        <PinModal
          isOpen={isPinModalOpen}
          mode={pinModalMode}
          title={pinModalMode === 'verify' ? 'Mã PIN Xác Thực An Toàn' : 'Cài Đặt Mã PIN Bảo Vệ Bot'}
          description={pinModalMode === 'verify' ? 'Nhập mã PIN để khởi động / dừng bot hoặc thay đổi cấu hình nhạy cảm.' : 'Thiết lập mã PIN 4-6 chữ số để ngăn chặn người khác bấm nhầm hoặc can thiệp bot.'}
          onSuccess={() => {
            if (pinModalMode === 'verify' && pendingAction) {
              pendingAction();
              setPendingAction(null);
            } else {
              getPinStatus().then(res => setIsPinEnabled(res.enabled)).catch(() => {});
            }
          }}
          onClose={() => {
            setIsPinModalOpen(false);
            setPendingAction(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface flex flex-col font-['Manrope'] antialiased selection:bg-primary selection:text-on-primary">
      {/* Fixed Left Navigation Sidebar (Obsidian Algorithmic Terminal) */}
      <Sidebar
        currentTab={activeTab}
        onTabChange={setActiveTab}
        latencyMs={12}
        isPinEnabled={isPinEnabled}
        onOpenPinModal={() => {
          setPinModalMode('setup');
          setIsPinModalOpen(true);
        }}
      />

      {/* Main Content Area (Offset by 64px = w-64 sidebar) */}
      <div className="pl-64 flex flex-col flex-1 min-h-screen">
        {/* Fixed Top Telemetry & Control Header */}
        <Header
          status={status}
          selectedSymbol={selectedSymbol}
          onSymbolChange={handleSymbolChange}
          onPanicClose={handlePanic}
          isPanicClosing={isPanicking}
          isConnected={isConnected}
          onToggleBot={handleToggleBot}
          isBotToggling={isBotToggling}
        />

        {/* Global Action Error Alert */}
        {actionError && (
          <div className="mt-16 mx-6 p-3 rounded-lg bg-error-container/20 border border-error/50 text-error text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-on-surface hover:text-white text-xs">
              ✕
            </button>
          </div>
        )}

        {/* Dynamic Terminal View Router */}
        <main className={`relative ${actionError ? 'pt-4' : 'pt-16'} bg-surface-container-lowest w-full px-4 sm:px-6 pb-12 flex-1`}>
          {activeTab === 'dashboard' && (
            <DashboardView
              status={status}
              config={config}
              positions={positions}
              stats={stats}
              ticker={ticker}
              logs={logs}
              selectedSymbol={selectedSymbol}
              selectedTimeframe={selectedTimeframe}
              onSymbolChange={handleSymbolChange}
              onTimeframeChange={handleTimeframeChange}
              onTabChange={setActiveTab}
              onRefresh={reloadAll}
            />
          )}

          {activeTab === 'chien-luoc' && (
            <StrategiesView
              config={config}
              onConfigSaved={setConfig}
            />
          )}

          {activeTab === 'kiem-thu-backtest' && (
            <BacktestView
              currentConfig={config}
              onConfigApplied={setConfig}
            />
          )}

          {activeTab === 'vi-the-mo-lenh' && (
            <PositionsOrderBookView
              status={status}
              config={config}
              positions={positions}
              ticker={ticker}
              selectedSymbol={selectedSymbol}
              onSymbolChange={handleSymbolChange}
              onRefresh={reloadAll}
            />
          )}

          {activeTab === 'phan-tich-pnl-lich-su' && (
            <PnLHistoryView
              status={status}
              stats={stats}
              onRefresh={reloadAll}
            />
          )}

          {activeTab === 'quan-ly-von-risk' && (
            <RiskManagementView
              status={status}
              config={config}
              positions={positions}
              onConfigSaved={setConfig}
              onRefresh={reloadAll}
            />
          )}

          {activeTab === 'cai-dat-api-binance' && (
            <ApiWebhookView
              onRefresh={reloadAll}
            />
          )}
        </main>
      </div>

      {/* Global API Key Modal if invoked */}
      <ApiKeyModal
        isOpen={isApiModalOpen}
        onClose={() => {
          setIsApiModalOpen(false);
          reloadAll();
        }}
      />

      {/* Global PIN Security Lock Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        mode={pinModalMode}
        title={pinModalMode === 'verify' ? 'Mã PIN Xác Thực An Toàn' : 'Cài Đặt Mã PIN Bảo Vệ Bot'}
        description={pinModalMode === 'verify' ? 'Nhập mã PIN để khởi động / dừng bot hoặc thay đổi cấu hình nhạy cảm.' : 'Thiết lập mã PIN 4-6 chữ số để ngăn chặn người khác bấm nhầm hoặc can thiệp bot.'}
        onSuccess={() => {
          if (pinModalMode === 'verify' && pendingAction) {
            pendingAction();
            setPendingAction(null);
          } else {
            getPinStatus().then(res => setIsPinEnabled(res.enabled)).catch(() => {});
          }
        }}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingAction(null);
        }}
      />

      {/* Floating Mobile Mode Switcher for Desktop browser preview */}
      {!isNative && (
        <button
          onClick={() => {
            setIsMobileMode(true);
            localStorage.setItem('app_mobile_mode', 'true');
          }}
          className="fixed bottom-5 right-5 z-50 px-3.5 py-2 rounded-xl bg-primary-container text-on-primary font-['Manrope'] text-[12px] font-bold shadow-2xl flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all border border-primary/20"
          title="Chuyển sang giao diện iOS Mobile App"
        >
          <span className="material-symbols-outlined text-[16px]">phone_iphone</span>
          <span>Xem Giao Diện iOS App</span>
        </button>
      )}
    </div>
  );
}

export default App;
