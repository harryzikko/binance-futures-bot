import React, { useState, useEffect } from 'react';
import { GeminiRegimeState } from '../types';
import { getAiRegime, triggerAiAnalyze, setGeminiKey } from '../services/api';
import {
  BrainCircuit,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  X,
} from 'lucide-react';

interface AiRegimeBannerProps {
  onRefreshTrigger?: number;
}

export const AiRegimeBanner: React.FC<AiRegimeBannerProps> = ({ onRefreshTrigger }) => {
  const [regime, setRegime] = useState<GeminiRegimeState | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [keySaveMsg, setKeySaveMsg] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void getAiRegime(controller.signal).then(res => {
      if (controller.signal.aborted) return;
      setRegime(res?.analysis ?? null);
      setHasApiKey(Boolean(res?.has_api_key));
      setLastUpdated(res?.last_run_time ?? '');
    }).catch(err => {
      if (!controller.signal.aborted) console.error('Failed to load AI regime', err);
    });
    return () => controller.abort();
  }, [onRefreshTrigger]);

  const handleTriggerAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await triggerAiAnalyze();
      if (res?.analysis) {
        setRegime(res.analysis);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to trigger AI analysis', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    try {
      await setGeminiKey({ api_key: inputKey.trim(), model: selectedModel });
      setHasApiKey(true);
      setKeySaveMsg('Đã lưu Gemini API Key thành công!');
      setTimeout(() => {
        setIsKeyModalOpen(false);
        setKeySaveMsg('');
        handleTriggerAnalysis();
      }, 1200);
    } catch (err) {
      console.error('Failed to save Gemini key', err);
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-['JetBrains_Mono'] text-[11px] font-bold uppercase bg-tertiary-container/20 text-tertiary border border-tertiary/30">
            <ShieldCheck className="w-3 h-3" />
            Rủi Ro Thấp
          </span>
        );
      case 'NORMAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-['JetBrains_Mono'] text-[11px] font-bold uppercase bg-secondary-container/20 text-secondary border border-secondary/30">
            <ShieldCheck className="w-3 h-3" />
            Bình Thường
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-['JetBrains_Mono'] text-[11px] font-bold uppercase bg-primary/20 text-primary border border-primary/30">
            <AlertTriangle className="w-3 h-3" />
            Rủi Ro Cao
          </span>
        );
      case 'EXTREME':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-['JetBrains_Mono'] text-[11px] font-bold uppercase bg-error-container/20 text-error border border-error/30 animate-pulse">
            <ShieldAlert className="w-3 h-3" />
            Bão Giá
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-['JetBrains_Mono'] text-[11px] font-bold bg-surface-container text-on-surface-variant">
            {level}
          </span>
        );
    }
  };

  return (
    <>
      <div className="bg-surface-container-low rounded-lg p-3 sm:p-3.5 border border-outline-variant/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 font-['Manrope'] shadow-xs">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <span className="flex h-2.5 w-2.5 relative flex-shrink-0 mt-1 sm:mt-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
          </span>

          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-['Space_Grotesk'] text-xs uppercase font-bold text-primary tracking-wide">
                AI SIGNAL RADAR:
              </span>
              {regime && getRiskBadge(regime.risk_level)}
              {regime?.regime_vn && (
                <span className="font-['Space_Grotesk'] text-xs font-bold text-on-surface bg-surface-container-high px-2 py-0.5 rounded border border-outline-variant/20">
                  {regime.regime_vn}
                </span>
              )}
              {regime?.risk_multiplier !== undefined && (
                <span className="font-['JetBrains_Mono'] text-xs text-on-surface-variant">
                  Hệ số vốn: <strong className="text-tertiary">{regime.risk_multiplier}x</strong>
                </span>
              )}
              {regime?.recommended_strategy && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-lowest text-[11px] font-['JetBrains_Mono'] text-on-surface-variant border border-outline-variant/20">
                  Chiến lược: <strong className="text-primary">{regime.recommended_strategy.replace(/_/g, ' ')}</strong>
                </span>
              )}
            </div>

            <div className="text-xs text-on-surface-variant flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-relaxed">
              {regime?.rationale ? (
                <>
                  <span className="text-on-surface/90 font-medium">{regime.rationale}</span>
                  {lastUpdated && (
                    <span className="text-on-surface-variant/70 font-mono text-[10px]">
                      &bull; Cập nhật: {lastUpdated}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-on-surface-variant italic">
                  Đang đồng bộ pha thị trường và kiểm định xác suất rủi ro tự động...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 self-end lg:self-center">
          <button
            onClick={handleTriggerAnalysis}
            disabled={isAnalyzing}
            className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-variant text-on-surface font-['JetBrains_Mono'] text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all border border-outline-variant/30 shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-primary' : ''}`} />
            <span>{isAnalyzing ? 'Đang phân tích...' : 'Quét Lại'}</span>
          </button>

          <button
            onClick={() => setIsKeyModalOpen(true)}
            className="px-3 py-1.5 bg-primary/15 hover:bg-primary/25 text-primary font-['JetBrains_Mono'] text-xs font-bold rounded-md transition-all border border-primary/30 flex items-center gap-1.5 shadow-xs"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{hasApiKey ? 'Cài Đặt AI' : 'Khóa Gemini'}</span>
          </button>
        </div>
      </div>

      {/* Gemini API Key Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-surface-container-low border border-outline-variant/40 p-5 shadow-2xl relative space-y-4 font-['Manrope']">
            <button
              onClick={() => setIsKeyModalOpen(false)}
              className="absolute right-4 top-4 text-on-surface-variant hover:text-on-surface p-1 rounded hover:bg-surface-container-high transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 pb-2 border-b border-surface-container-highest">
              <div className="p-2 rounded-lg bg-primary/15 text-primary border border-primary/30">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Cấu Hình Google Gemini AI</h3>
                <p className="text-[11px] text-on-surface-variant">Kết nối API Gemini 2.5 Flash làm cố vấn thị trường vĩ mô</p>
              </div>
            </div>

            <form onSubmit={handleSaveKey} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-on-surface font-semibold mb-1">
                  Gemini API Key:
                </label>
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-['JetBrains_Mono'] focus:outline-none focus:border-primary"
                  required
                />
                <span className="text-[10px] text-on-surface-variant mt-1 block">
                  Lấy API key miễn phí tại Google AI Studio (aistudio.google.com).
                </span>
              </div>

              <div>
                <label className="block text-on-surface font-semibold mb-1">
                  Mô Hình AI (Model):
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-semibold focus:outline-none focus:border-primary"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Khuyên dùng: Siêu nhanh &amp; Tối ưu)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Ổn định)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Phân tích chuyên sâu)</option>
                </select>
              </div>

              {keySaveMsg && (
                <div className="p-2.5 rounded-lg bg-tertiary/10 border border-tertiary/30 text-tertiary text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{keySaveMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface transition"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-bold transition shadow-sm font-['JetBrains_Mono'] text-xs"
                >
                  Lưu &amp; Kết Nối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
