"""
Gemini Macro Market Regime Agent (AI Copilot).
Analyzes macro crypto market structure, funding rates, market breadth, and volatility
to dynamically classify the Market Regime and output a Quantitative Risk Multiplier.
"""
import os
import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
import aiohttp

from .database import get_setting, save_setting, add_log, init_db

logger = logging.getLogger("gemini_agent")


class GeminiRegimeAgent:
    def __init__(self):
        init_db()
        self.api_key: Optional[str] = os.environ.get("GEMINI_API_KEY") or get_setting("gemini_api_key", "")
        self.model_name: str = get_setting("gemini_model", "gemini-1.5-flash")
        self.last_analysis: Optional[Dict[str, Any]] = get_setting("gemini_last_analysis", None)
        self.last_run_time: Optional[str] = get_setting("gemini_last_run_time", None)
        self.is_analyzing: bool = False

    def set_api_key(self, key: str):
        self.api_key = key.strip()
        save_setting("gemini_api_key", self.api_key)

    def set_model(self, model: str):
        self.model_name = model.strip()
        save_setting("gemini_model", self.model_name)

    def has_api_key(self) -> bool:
        return bool(self.api_key and len(self.api_key) > 5)

    async def analyze_market(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze current market context and return structured Quant Regime decision.
        Uses Gemini LLM if API Key is configured, otherwise uses Algorithmic Heuristics.
        """
        self.is_analyzing = True
        try:
            btc_price = market_data.get("btc_price", 0.0)
            btc_change = market_data.get("btc_change_24h", 0.0)
            btc_htf = market_data.get("btc_htf_trend", "HOLD")
            funding_rate = market_data.get("funding_rate", 0.0001)
            gainers = market_data.get("gainers_count", 0)
            losers = market_data.get("losers_count", 0)
            total_scanned = market_data.get("total_scanned", 25)
            avg_change = market_data.get("avg_market_change", 0.0)

            # 1. If Gemini API Key exists, call Google Gemini 2.5 Flash
            if self.has_api_key():
                ai_result = await self._call_gemini_api(market_data)
                if ai_result:
                    self.last_analysis = ai_result
                    self.last_run_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    save_setting("gemini_last_analysis", self.last_analysis)
                    save_setting("gemini_last_run_time", self.last_run_time)
                    add_log(
                        "INFO",
                        "GEMINI_AI",
                        f"🤖 Gemini AI Regime: {ai_result.get('regime_vn')} | Rủi ro: {ai_result.get('risk_level')} | Hệ số vốn: {ai_result.get('risk_multiplier')}x"
                    )
                    return ai_result

            # 2. Seamless Fallback: Algorithmic Quant Heuristic Engine
            fallback_result = self._algorithmic_heuristic(market_data)
            self.last_analysis = fallback_result
            self.last_run_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            save_setting("gemini_last_analysis", self.last_analysis)
            save_setting("gemini_last_run_time", self.last_run_time)
            return fallback_result

        except Exception as e:
            logger.error(f"Error in Gemini Regime Agent: {e}", exc_info=True)
            return self._algorithmic_heuristic(market_data)
        finally:
            self.is_analyzing = False

    async def _call_gemini_api(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Call Google Gemini REST API directly with structured output."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"

        prompt = f"""
Bạn là Trưởng bộ phận Quản trị Rủi ro Định lượng (Chief Quantitative Risk Officer - CRO) của quỹ phòng hộ tiền mã hóa.
Dưới đây là dữ liệu thời gian thực của thị trường Binance Futures:
- Giá BTC: ${data.get('btc_price', 0):,.2f} (Biến động 24h: {data.get('btc_change_24h', 0):+.2f}%)
- Xu hướng đa khung thời gian BTC (HTF EMA 50 vs EMA 200): {data.get('btc_htf_trend', 'NEUTRAL')}
- Tỷ lệ Funding Rate BTC: {data.get('funding_rate', 0.0001):.5f}
- Độ rộng thị trường (Market Breadth): {data.get('gainers_count', 0)} coin tăng / {data.get('losers_count', 0)} coin giảm (Tổng quét: {data.get('total_scanned', 25)} coin)
- Biến động trung bình toàn sàn: {data.get('avg_market_change', 0):+.2f}%
- Trạng thái PnL bot hôm nay: ${data.get('daily_pnl', 0):+.2f} (Số lệnh mở: {data.get('open_positions_count', 0)})

Nhiệm vụ:
Phân tích trạng thái thị trường và trả về kết quả ĐÚNG ĐỊNH DẠNG JSON sau:
{{
  "regime": "TRENDING_BULL" | "TRENDING_BEAR" | "RANGING_CHOPPY" | "HIGH_VOLATILITY_EVENT",
  "regime_vn": "Tên chế độ thị trường bằng tiếng Việt ngắn gọn",
  "risk_level": "LOW" | "NORMAL" | "HIGH" | "EXTREME",
  "risk_multiplier": <float từ 0.4 đến 1.3, dùng để nhân với quy mô vốn>,
  "recommended_strategy": "trend_pullback" | "bb_mean_reversion" | "breakout",
  "recommended_leverage": <int từ 5 đến 15>,
  "pause_trading": <true nếu bão giá cực đoan cần đứng ngoài, false nếu an toàn>,
  "rationale": "Nhận định định lượng súc tích bằng tiếng Việt trong 2-3 câu",
  "confidence": <float từ 0.6 đến 0.98>
}}

Lưu ý: Chỉ trả về duy nhất chuỗi JSON hợp lệ, không bọc markdown ```json.
"""

        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 600,
                "responseMimeType": "application/json"
            }
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=8.0)) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    logger.warning(f"Gemini API returned status {resp.status}: {text[:200]}")
                    return None

                res_json = await resp.json()
                candidates = res_json.get("candidates", [])
                if not candidates:
                    return None

                raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                raw_text = raw_text.strip()
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]

                parsed = json.loads(raw_text.strip())
                parsed["source"] = "Gemini AI LLM"
                parsed["model"] = self.model_name
                parsed["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                return parsed

    def _algorithmic_heuristic(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Algorithmic Quantitative Heuristic fallback when Gemini API key is absent.
        100% deterministic mathematical evaluation of market breadth, trend, and funding.
        """
        btc_change = float(data.get("btc_change_24h") or 0.0)
        btc_htf = str(data.get("btc_htf_trend") or "HOLD")
        funding = float(data.get("funding_rate") or 0.0001)
        gainers = int(data.get("gainers_count") or 0)
        losers = int(data.get("losers_count") or 0)
        total = max(1, gainers + losers)
        gainer_ratio = gainers / total

        # Extreme Volatility or Funding Overheat
        if abs(btc_change) >= 6.0 or abs(funding) >= 0.001:
            return {
                "regime": "HIGH_VOLATILITY_EVENT",
                "regime_vn": "Biến Động Cực Đại (Bão Giá)",
                "risk_level": "EXTREME",
                "risk_multiplier": 0.5,
                "recommended_strategy": "trend_pullback",
                "recommended_leverage": 5,
                "pause_trading": False,
                "rationale": "Biến động mạnh đột biến hoặc Funding Rate quá nóng. Hệ thống tự động giảm quy mô vị thế xuống 50% để bảo toàn vốn.",
                "confidence": 0.88,
                "source": "Algorithmic Quant Heuristic",
                "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

        # Strong Bullish Trend
        if btc_change >= 1.5 and btc_htf == "LONG" and gainer_ratio >= 0.65:
            return {
                "regime": "TRENDING_BULL",
                "regime_vn": "Xu Hướng Tăng Trưởng (Bullish)",
                "risk_level": "LOW",
                "risk_multiplier": 1.15,
                "recommended_strategy": "trend_pullback",
                "recommended_leverage": 12,
                "pause_trading": False,
                "rationale": "BTC xác nhận cấu trúc tăng trưởng trên khung lớn và hơn 65% thị trường giữ sắc xanh. Thuận lợi cho chiến lược Trend Scalper Pullback.",
                "confidence": 0.85,
                "source": "Algorithmic Quant Heuristic",
                "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

        # Strong Bearish Trend
        if btc_change <= -1.5 and btc_htf == "SHORT" and gainer_ratio <= 0.35:
            return {
                "regime": "TRENDING_BEAR",
                "regime_vn": "Xu Hướng Giảm Giá (Bearish)",
                "risk_level": "NORMAL",
                "risk_multiplier": 0.9,
                "recommended_strategy": "trend_pullback",
                "recommended_leverage": 10,
                "pause_trading": False,
                "rationale": "Áp lực bán chiếm ưu thế toàn thị trường. Bot ưu tiên săn tín hiệu SHORT khi giá hồi kỹ thuật về kháng cự EMA.",
                "confidence": 0.82,
                "source": "Algorithmic Quant Heuristic",
                "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

        # Sideway / Choppy Range
        return {
            "regime": "RANGING_CHOPPY",
            "regime_vn": "Đi Ngang Tích Lũy (Choppy Range)",
            "risk_level": "NORMAL",
            "risk_multiplier": 0.8,
            "recommended_strategy": "bb_mean_reversion",
            "recommended_leverage": 8,
            "pause_trading": False,
            "rationale": "Biến động biên hẹp không rõ xu hướng. Bot tự động hạ hệ số rủi ro xuống 0.8x để tránh bị bào mòn phí trong vùng giằng co.",
            "confidence": 0.78,
            "source": "Algorithmic Quant Heuristic",
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }


# Global Singleton Instance
gemini_agent = GeminiRegimeAgent()
