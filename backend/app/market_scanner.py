import asyncio
import logging
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any, Optional
import ccxt
import time

from .strategies import get_strategy

logger = logging.getLogger("market_scanner")

class MarketScanner:
    """
    Scans all Binance USDT-M Futures markets (800+ pairs).
    Ranks them by volume, volatility, and detects real-time scalping signals.
    """
    def __init__(self, exchange: Optional[ccxt.binanceusdm] = None):
        self.exchange = exchange or ccxt.binanceusdm({"enableRateLimit": True})
        self.scanned_markets: List[Dict[str, Any]] = []
        self.top_opportunities: List[Dict[str, Any]] = []
        self.last_scan_time: Optional[str] = None
        self.is_scanning = False

    async def scan_all_tickers(self, min_volume_usd: float = 15_000_000.0,
                               exchange: Optional[ccxt.binanceusdm] = None) -> List[Dict[str, Any]]:
        """Fetch active USDT-M perpetual swaps from the selected exchange environment."""
        source = exchange or self.exchange
        try:
            tickers = await asyncio.to_thread(source.fetch_tickers)
            results = []
            
            for symbol, t in tickers.items():
                market = (source.markets or {}).get(symbol, {})
                if not (market.get("active") and market.get("swap") and market.get("linear") and market.get("quote") == "USDT"):
                    continue
                # Filter only USDT-M active futures
                if not (symbol.endswith("/USDT") or symbol.endswith("/USDT:USDT")):
                    continue
                clean_sym = symbol.replace(":USDT", "")
                
                quote_vol = float(t.get("quoteVolume") or 0.0)
                if quote_vol < min_volume_usd:
                    continue
                    
                price = float(t.get("last") or 0.0)
                if price <= 0:
                    continue
                    
                change24h = float(t.get("percentage") or 0.0)
                high24h = float(t.get("high") or 0.0)
                low24h = float(t.get("low") or 0.0)
                volatility = ((high24h - low24h) / low24h) * 100 if low24h > 0 else 0.0

                results.append({
                    "symbol": clean_sym,
                    "raw_symbol": symbol,
                    "price": price,
                    "change24h": round(change24h, 2),
                    "volume24h": round(quote_vol, 2),
                    "volatility": round(volatility, 2),
                    "high24h": high24h,
                    "low24h": low24h,
                    "signal": "NEUTRAL",
                    "rsi": 50.0,
                    "reason": "Chờ quét nến",
                    "score": 0
                })

            # Sort by 24h volume descending
            results.sort(key=lambda x: x["volume24h"], reverse=True)
            self.scanned_markets = results
            self.last_scan_time = datetime.now().strftime("%H:%M:%S")
            return results
        except Exception as e:
            logger.error(f"Error scanning tickers: {e}")
            return []

    async def analyze_top_pairs(self, top_n: int = 15, strategy_name: str = "trend_pullback", timeframe: str = "1m", params: Optional[Dict[str, Any]] = None,
                                exchange: Optional[ccxt.binanceusdm] = None) -> List[Dict[str, Any]]:
        """Download OHLCV klines for the selected Futures environment."""
        source = exchange or self.exchange
        pairs_to_check = (await self.scan_all_tickers(exchange=source))[:top_n]
        strategy = get_strategy(strategy_name, params)
        opportunities = []

        for item in pairs_to_check:
            sym = item["symbol"]
            try:
                limit = max(202, int((params or {}).get("ema_trend", 50)) + 2, int((params or {}).get("rsi_period", 14)) + 2, int((params or {}).get("bb_period", 20)) + 2)
                ohlcv = await asyncio.to_thread(source.fetch_ohlcv, sym, timeframe, None, limit)
                if len(ohlcv) < 30:
                    continue

                df = pd.DataFrame(ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"])
                duration = source.parse_timeframe(timeframe) * 1000
                df = df[df["timestamp"] + duration <= time.time() * 1000].copy()
                if len(df) < 30:
                    continue
                for col in ["open", "high", "low", "close", "volume"]:
                    df[col] = df[col].astype(float)

                # Generate signal
                signal, reason, extra = strategy.generate_signal(df)
                rsi = extra.get("rsi", 50.0)
                item["rsi"] = round(rsi, 1)
                item["signal"] = signal
                item["reason"] = reason

                if signal in ["LONG", "SHORT"]:
                    # Opportunity scoring based on volume, RSI extremism, and volatility
                    vol_score = min(item["volume24h"] / 100_000_000, 50.0)
                    item["score"] = round(vol_score + abs(item["change24h"]), 1)
                    opportunities.append(item)

                # Short delay to prevent IP rate limit burst
                await asyncio.sleep(0.05)
            except Exception as e:
                logger.warning(f"Error analyzing klines for {sym}: {e}")

        # Sort opportunities by score descending
        opportunities.sort(key=lambda x: x["score"], reverse=True)
        self.top_opportunities = opportunities
        return opportunities

market_scanner = MarketScanner()
