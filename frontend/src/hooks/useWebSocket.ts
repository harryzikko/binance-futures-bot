import { useState, useEffect, useRef } from 'react';
import { BotStatus, Position, TradeStats, LogEntry } from '../types';

interface WebSocketData {
  status: BotStatus | null;
  positions: Position[];
  stats: TradeStats | null;
  logs: LogEntry[];
  ticker: {
    symbol: string;
    price: number;
    change24h: number;
    high24h?: number;
    low24h?: number;
    volume24h?: number;
  } | null;
  isConnected: boolean;
}

export function useWebSocket(): WebSocketData {
  const [data, setData] = useState<WebSocketData>({
    status: null,
    positions: [],
    stats: null,
    logs: [],
    ticker: null,
    isConnected: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In dev mode with Vite proxy or production mode served from FastAPI
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          // A connected transport alone does not mean the retained bot state is current.
          setData(prev => ({ ...prev, isConnected: false }));
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const parsed = JSON.parse(event.data);
            if (!parsed || typeof parsed !== 'object') return;
            if (parsed.type === 'state_update') {
              setData(prev => ({
                ...prev,
                status: parsed.status === undefined ? prev.status : parsed.status,
                positions: Array.isArray(parsed.positions) ? parsed.positions : prev.positions,
                stats: parsed.stats === undefined ? prev.stats : parsed.stats,
                logs: Array.isArray(parsed.logs) ? parsed.logs : prev.logs,
                ticker: parsed.ticker === undefined ? prev.ticker : parsed.ticker,
                isConnected: true,
              }));
            }
          } catch (e) {
            console.error('Failed to parse WS payload', e);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setData(prev => ({ ...prev, isConnected: false }));
          // Reconnect after 2 seconds
          reconnectTimeoutRef.current = window.setTimeout(connect, 2000);
        };

        ws.onerror = () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
        reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return data;
}
