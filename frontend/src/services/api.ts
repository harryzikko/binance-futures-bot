import axios from 'axios';
import {
  TradeConfig, Position, TradeRecord, BotStatus, TradeStats, LogEntry, KlinePoint,
  TelegramStatus, TelegramResult, GeminiRegimeState, BacktestRequest, BacktestResult,
  PinStatusResponse, PinVerifyRequest, PinSetRequest
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (typeof error.response?.data?.message === 'string') return error.response.data.message;
    if (Array.isArray(detail)) return detail.map(item => item.msg).join('; ');
    return error.message;
  }
  return error instanceof Error ? error.message : 'Yêu cầu thất bại. Vui lòng thử lại.';
}

// Several endpoints return HTTP 200 with success:false; do not show success.
api.interceptors.response.use(response => {
  if (response.data?.success === false) {
    throw new Error(response.data.message || 'Thao tác không thành công.');
  }
  return response;
});

export { api };

export const getStatus = () => api.get<BotStatus>('/status').then(r => r.data);
export const startBot = () => api.post<{ success: boolean; message: string }>('/bot/start').then(r => r.data);
export const stopBot = () => api.post<{ success: boolean; message: string }>('/bot/stop').then(r => r.data);
export const panicCloseAll = () => api.post<{ success: boolean; closed_positions: number }>('/bot/panic').then(r => r.data);

export const getConfig = () => api.get<TradeConfig>('/config').then(r => r.data);
export const updateConfig = (config: TradeConfig) => api.post<{ success: boolean; config: TradeConfig }>('/config', config).then(r => r.data);
export const saveConfig = updateConfig;

export const saveApiKeys = (data: { api_key: string; api_secret: string; environment: 'testnet' | 'demo' | 'live' }) =>
  api.post<{ success: boolean; message: string; balance?: number }>('/api-keys', data).then(r => r.data);
export const testConnection = () => api.get<{ success: boolean; message: string; balance?: number }>('/test-connection').then(r => r.data);

export const getTelegramStatus = (signal?: AbortSignal) =>
  api.get<TelegramStatus>('/telegram/status', { signal }).then(r => r.data);
export const configureTelegram = (data: { bot_token: string; chat_id: string }) =>
  api.post<TelegramResult>('/telegram/config', data).then(r => r.data);
export const testTelegram = () => api.post<TelegramResult>('/telegram/test').then(r => r.data);
export const deleteTelegramConfig = () => api.delete<TelegramResult>('/telegram/config').then(r => r.data);

export const getPositions = () => api.get<Position[]>('/positions').then(r => r.data);
export const closePosition = (posId: string) => api.post<{ success: boolean; message?: string }>(`/positions/${encodeURIComponent(posId)}/close`).then(r => r.data);

export const getBalance = () => api.get<{ total_usdt: number; free_usdt: number; used_usdt: number }>('/balance').then(r => r.data);
export const resetPaperBalance = (amount = 10000) => api.post<{ success: boolean; message: string }>(`/paper/reset?amount=${amount}`).then(r => r.data);

export const getTrades = (limit = 50, mode?: string, signal?: AbortSignal) =>
  api.get<TradeRecord[]>('/trades', { params: { limit, mode }, signal }).then(r => r.data);
export const clearTrades = (mode?: string) =>
  api.delete<{ success: boolean; deleted_count: number }>('/trades', { params: { mode } }).then(r => r.data);
export const getStats = (mode?: string) => api.get<TradeStats>('/stats', { params: { mode } }).then(r => r.data);
export const getLogs = (limit = 50) => api.get<LogEntry[]>('/logs', { params: { limit } }).then(r => r.data);

export const getKlines = (symbol?: string, timeframe?: string, limit = 100, signal?: AbortSignal) =>
  api.get<KlinePoint[]>('/klines', { params: { symbol, timeframe, limit }, signal }).then(r => r.data);

export const getAiRegime = (signal?: AbortSignal) =>
  api.get<{
    analysis: GeminiRegimeState | null;
    last_run_time: string | null;
    is_analyzing: boolean;
    has_api_key: boolean;
    model: string;
  }>('/ai/regime', { signal }).then(r => r.data);

export const triggerAiAnalyze = () =>
  api.post<{ success: boolean; analysis: GeminiRegimeState }>('/ai/analyze').then(r => r.data);

export const setGeminiKey = (data: { api_key: string; model?: string }) =>
  api.post<{ success: boolean; message: string }>('/ai/key', data).then(r => r.data);

export const getGeminiKeyStatus = () =>
  api.get<{ configured: boolean; model: string }>('/ai/key').then(r => r.data);

// Visual Backtesting API
export const runBacktest = (data: BacktestRequest) =>
  api.post<BacktestResult>('/backtest/run', data).then(r => r.data);

// Dashboard PIN Security Lock API
export const getPinStatus = () =>
  api.get<PinStatusResponse>('/security/pin/status').then(r => r.data);

export const verifyPin = (data: PinVerifyRequest) =>
  api.post<{ success: boolean; message: string }>('/security/pin/verify', data).then(r => r.data);

export const setPin = (data: PinSetRequest) =>
  api.post<{ success: boolean; message: string }>('/security/pin/set', data).then(r => r.data);


