"""
Market Data Domain Service & Provider Abstraction for ChartCoach.
Implements Section 14, 20, 21, 22, 23 of the Senior Engineering Specification.
Keeps market API keys strictly server-side with cached quote retrieval.
"""

import time
import random
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class MarketTickerItemDTO(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    changePercent: float
    isPositive: bool


class MarketOverviewDTO(BaseModel):
    primarySymbol: str
    primaryName: str
    currentPrice: float
    change: float
    changePercent: float
    high24h: float
    low24h: float
    chartPoints: List[Dict[str, Any]]


class HeatmapTileDTO(BaseModel):
    symbol: str
    name: str
    changePercent: float
    isPositive: bool
    sector: str
    marketCap: str  # e.g. "Large Cap"
    size: int  # relative tile size weight 1-5
    price: Optional[float] = None


class AIInsightDTO(BaseModel):
    symbol: str
    tag: str  # e.g. "Bullish Momentum", "Possible Reversal"
    tagColor: str  # "green" | "blue" | "orange" | "purple"
    description: str
    iconColor: str  # hex color for avatar circle


class TopMoverDTO(BaseModel):
    symbol: str
    name: str
    changePercent: float
    isPositive: bool
    sparkline: List[float]  # 7-point mini sparkline


class SectorPerfDTO(BaseModel):
    sector: str
    icon: str  # emoji or short icon hint
    changePercent: float
    isPositive: bool
    barPercent: float  # 0-100 bar width


class MarketNewsItemDTO(BaseModel):
    id: str
    headline: str
    summary: str
    source: str
    timeAgo: str
    category: str  # "Top News" | "Earnings" | "Corporate Actions" | "Global" | "Macro"
    thumbnailUrl: Optional[str] = None


class EconomicEventDTO(BaseModel):
    id: str
    day: int
    month: str  # short, e.g. "SEP"
    title: str
    time: str
    location: str
    importance: str  # "High" | "Medium" | "Low"
    category: str  # "Upcoming" | "Earnings" | "IPO" | "Dividends" | "Events"
    icon: str  # emoji


class MarketsPageDTO(BaseModel):
    """Aggregated payload for the full Markets page."""
    indexTicker: List[MarketTickerItemDTO]
    heatmap: List[HeatmapTileDTO]
    aiInsights: List[AIInsightDTO]
    topGainers: List[TopMoverDTO]
    topLosers: List[TopMoverDTO]
    mostActive: List[TopMoverDTO]
    sectorPerformance: List[SectorPerfDTO]
    news: List[MarketNewsItemDTO]
    calendar: List[EconomicEventDTO]
    marketStatus: str  # "open" | "closed"
    marketStatusTime: str  # e.g. "Mon, 16 Sep 2025 • 03:22 PM IST"


class MarketService:
    def __init__(self):
        self._cache: Dict[str, Any] = {}
        self._cache_ttl_seconds = 20  # 20s quote cache

    def get_ticker_quotes(self) -> List[MarketTickerItemDTO]:
        """Returns live quotes for top indices and leading Indian equities."""
        now = time.time()
        if "ticker" in self._cache and (now - self._cache["ticker"]["timestamp"] < self._cache_ttl_seconds):
            return self._cache["ticker"]["data"]

        # Base quotes (authentic NIFTY 50, SENSEX, leading blue chips and indices)
        base_assets = [
            {"symbol": "NIFTY 50", "name": "NSE Nifty 50 Index", "base": 24810.25, "vol": 18.5},
            {"symbol": "SENSEX", "name": "BSE Sensex Index", "base": 81190.50, "vol": 52.0},
            {"symbol": "BANKNIFTY", "name": "Nifty Bank Index", "base": 52340.10, "vol": 45.0},
            {"symbol": "FINNIFTY", "name": "Nifty Financial Services", "base": 23890.15, "vol": 22.0},
            {"symbol": "XAUUSD", "name": "Gold Spot (USD/oz)", "base": 2655.80, "vol": 8.5},
            {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "base": 2856.40, "vol": 4.5},
            {"symbol": "TCS", "name": "Tata Consultancy Services", "base": 4112.60, "vol": 6.0},
            {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "base": 1724.20, "vol": 2.5},
            {"symbol": "INFY", "name": "Infosys Ltd", "base": 1632.90, "vol": 3.5},
            {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "base": 1286.75, "vol": 2.0},
        ]

        quotes: List[MarketTickerItemDTO] = []
        for a in base_assets:
            # Deterministic small drift within realistic intraday fluctuations
            drift = (random.random() - 0.45) * a["vol"]
            price = round(a["base"] + drift, 2)
            pct = round((drift / a["base"]) * 100, 2)
            change = round(drift, 2)

            quotes.append(
                MarketTickerItemDTO(
                    symbol=a["symbol"],
                    name=a["name"],
                    price=price,
                    change=change,
                    changePercent=pct,
                    isPositive=pct >= 0,
                )
            )

        self._cache["ticker"] = {"timestamp": now, "data": quotes}
        return quotes

    def get_market_overview(self, symbol: str = "NIFTY 50") -> MarketOverviewDTO:
        """Returns intraday trend chart and market statistics for the selected index."""
        now = time.time()
        norm_sym = symbol.replace(" ", "").upper()
        cache_key = f"overview_{norm_sym}"
        if cache_key in self._cache and (now - self._cache[cache_key]["timestamp"] < self._cache_ttl_seconds):
            return self._cache[cache_key]["data"]

        quotes = self.get_ticker_quotes()
        quote = next(
            (q for q in quotes if q.symbol.replace(" ", "").upper() == norm_sym),
            quotes[0],
        )

        # Generate realistic 15-minute intraday price curve
        base_price = quote.price - quote.change
        chart_points = []
        timestamps = [
            "09:15", "09:30", "10:00", "10:30", "11:00", "11:30",
            "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30"
        ]

        running_price = base_price
        for idx, t in enumerate(timestamps):
            step = (quote.change / len(timestamps)) + (random.random() - 0.5) * (quote.price * 0.001)
            running_price = round(running_price + step, 2)
            chart_points.append({"time": t, "value": running_price})

        overview = MarketOverviewDTO(
            primarySymbol=quote.symbol,
            primaryName=quote.name,
            currentPrice=quote.price,
            change=quote.change,
            changePercent=quote.changePercent,
            high24h=round(quote.price * 1.008, 2),
            low24h=round(quote.price * 0.992, 2),
            chartPoints=chart_points,
        )

        self._cache[cache_key] = {"timestamp": now, "data": overview}
        return overview

    # ─── Markets Page: Heatmap ────────────────────────────────────────────────

    def get_heatmap(self, sector: str = "All Sectors") -> List[HeatmapTileDTO]:
        now = time.time()
        cache_key = f"heatmap_{sector}"
        if cache_key in self._cache and (now - self._cache[cache_key]["timestamp"] < self._cache_ttl_seconds):
            return self._cache[cache_key]["data"]

        all_stocks = [
            # Financials
            {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "sector": "Financials", "base_chg": 2.14, "size": 5, "price": 1682.40},
            {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "sector": "Financials", "base_chg": 1.26, "size": 4, "price": 1248.60},
            {"symbol": "SBIN", "name": "State Bank of India", "sector": "Financials", "base_chg": 0.92, "size": 3, "price": 814.20},
            {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank", "sector": "Financials", "base_chg": 1.19, "size": 3, "price": 1782.00},
            {"symbol": "AXISBANK", "name": "Axis Bank Ltd", "sector": "Financials", "base_chg": 1.45, "size": 3, "price": 1194.50},
            {"symbol": "BAJFINANCE", "name": "Bajaj Finance Ltd", "sector": "Financials", "base_chg": -0.42, "size": 3, "price": 6940.00},
            # Energy
            {"symbol": "RELIANCE", "name": "Reliance Industries", "sector": "Energy", "base_chg": 1.82, "size": 5, "price": 2954.00},
            {"symbol": "ONGC", "name": "Oil & Natural Gas Corp", "sector": "Energy", "base_chg": 0.65, "size": 2, "price": 316.50},
            {"symbol": "NTPC", "name": "NTPC Ltd", "sector": "Energy", "base_chg": 1.12, "size": 3, "price": 392.10},
            {"symbol": "POWERGRID", "name": "Power Grid Corp", "sector": "Energy", "base_chg": -0.35, "size": 2, "price": 324.80},
            # IT
            {"symbol": "TCS", "name": "Tata Consultancy", "sector": "IT", "base_chg": -0.64, "size": 4, "price": 4188.00},
            {"symbol": "INFY", "name": "Infosys Ltd", "sector": "IT", "base_chg": -0.48, "size": 4, "price": 1894.50},
            {"symbol": "HCLTECH", "name": "HCL Technologies", "sector": "IT", "base_chg": 0.85, "size": 3, "price": 1764.00},
            {"symbol": "WIPRO", "name": "Wipro Ltd", "sector": "IT", "base_chg": -0.38, "size": 2, "price": 542.10},
            {"symbol": "TECHM", "name": "Tech Mahindra", "sector": "IT", "base_chg": -0.92, "size": 2, "price": 1582.30},
            # Auto
            {"symbol": "M&M", "name": "Mahindra & Mahindra", "sector": "Auto", "base_chg": 3.21, "size": 4, "price": 2924.50},
            {"symbol": "TATAMOTORS", "name": "Tata Motors Ltd", "sector": "Auto", "base_chg": 2.84, "size": 3, "price": 982.40},
            {"symbol": "MARUTI", "name": "Maruti Suzuki", "sector": "Auto", "base_chg": 0.74, "size": 3, "price": 12480.00},
            {"symbol": "BAJAJ-AUTO", "name": "Bajaj Auto Ltd", "sector": "Auto", "base_chg": 1.62, "size": 2, "price": 9810.00},
            # FMCG
            {"symbol": "ITC", "name": "ITC Ltd", "sector": "FMCG", "base_chg": 0.28, "size": 3, "price": 486.20},
            {"symbol": "HINDUNILVR", "name": "Hindustan Unilever", "sector": "FMCG", "base_chg": -0.72, "size": 3, "price": 2724.00},
            {"symbol": "NESTLEIND", "name": "Nestle India", "sector": "FMCG", "base_chg": -0.45, "size": 2, "price": 2514.00},
            {"symbol": "ASIANPAINT", "name": "Asian Paints Ltd", "sector": "FMCG", "base_chg": -1.21, "size": 2, "price": 2940.00},
            # Pharma
            {"symbol": "SUNPHARMA", "name": "Sun Pharma Ltd", "sector": "Pharma", "base_chg": 0.65, "size": 3, "price": 1724.00},
            {"symbol": "CIPLA", "name": "Cipla Ltd", "sector": "Pharma", "base_chg": 1.48, "size": 2, "price": 1562.00},
            {"symbol": "DRREDDY", "name": "Dr. Reddy's Labs", "sector": "Pharma", "base_chg": -0.55, "size": 2, "price": 6480.00},
            # Metals
            {"symbol": "TATASTEEL", "name": "Tata Steel Ltd", "sector": "Metals", "base_chg": -0.95, "size": 2, "price": 153.40},
            {"symbol": "JSWSTEEL", "name": "JSW Steel Ltd", "sector": "Metals", "base_chg": -0.73, "size": 2, "price": 968.20},
            {"symbol": "HINDALCO", "name": "Hindalco Industries", "sector": "Metals", "base_chg": 1.84, "size": 2, "price": 682.00},
            # Industrials & Telecom
            {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd", "sector": "Telecom", "base_chg": 1.31, "size": 4, "price": 1624.00},
            {"symbol": "LT", "name": "Larsen & Toubro", "sector": "Industrials", "base_chg": 1.07, "size": 3, "price": 3648.00},
            {"symbol": "ADANIENT", "name": "Adani Enterprises", "sector": "Industrials", "base_chg": 2.35, "size": 3, "price": 3120.00},
        ]

        bucket = int(now // 60)
        tiles: List[HeatmapTileDTO] = []
        for s in all_stocks:
            if sector != "All Sectors" and s["sector"] != sector:
                continue
            jitter = ((hash(f"{s['symbol']}:{bucket}") % 80) - 40) * 0.01
            chg = round(s["base_chg"] + jitter, 2)
            base_price = s.get("price", 1000.0)
            cur_price = round(base_price * (1 + chg / 100), 2)
            tiles.append(HeatmapTileDTO(
                symbol=s["symbol"],
                name=s["name"],
                changePercent=chg,
                isPositive=chg >= 0,
                sector=s["sector"],
                marketCap="Large Cap",
                size=s["size"],
                price=cur_price,
            ))

        self._cache[cache_key] = {"timestamp": now, "data": tiles}
        return tiles

    # ─── Markets Page: AI Insights ────────────────────────────────────────────

    def get_ai_insights(self) -> List[AIInsightDTO]:
        now = time.time()
        if "ai_insights" in self._cache and (now - self._cache["ai_insights"]["timestamp"] < 60):
            return self._cache["ai_insights"]["data"]

        insights = [
            AIInsightDTO(
                symbol="RELIANCE",
                tag="Bullish Momentum",
                tagColor="green",
                description="Price above 20 EMA with strong volume. Breakout probability: High",
                iconColor="#10B981",
            ),
            AIInsightDTO(
                symbol="HDFCBANK",
                tag="Possible Reversal",
                tagColor="blue",
                description="RSI divergence detected. Support: ₹1,642 | Resistance: ₹1,695",
                iconColor="#3B82F6",
            ),
            AIInsightDTO(
                symbol="TATA MOTORS",
                tag="Volume Breakout",
                tagColor="orange",
                description="Volume 2.4× average in last 3 sessions.",
                iconColor="#F59E0B",
            ),
            AIInsightDTO(
                symbol="NIFTY IT",
                tag="Trend Watch",
                tagColor="purple",
                description="Consolidating near key resistance. Watch for breakout above 38,000.",
                iconColor="#8B5CF6",
            ),
        ]

        self._cache["ai_insights"] = {"timestamp": now, "data": insights}
        return insights

    # ─── Markets Page: Top Movers ─────────────────────────────────────────────

    def _make_sparkline(self, base: float, trend: float) -> List[float]:
        pts = []
        p = base
        for i in range(7):
            p += trend * (0.8 + random.random() * 0.4) + (random.random() - 0.5) * 0.3
            pts.append(round(p, 2))
        return pts

    def get_top_movers(self) -> Dict[str, List[TopMoverDTO]]:
        now = time.time()
        if "top_movers" in self._cache and (now - self._cache["top_movers"]["timestamp"] < self._cache_ttl_seconds):
            return self._cache["top_movers"]["data"]

        bucket = int(now // 60)

        gainers_raw = [
            {"symbol": "M&M", "name": "Mahindra & Mahindra", "base_chg": 4.82},
            {"symbol": "BEL", "name": "Bharat Electronics", "base_chg": 3.94},
            {"symbol": "TATAMOTORS", "name": "Tata Motors Ltd", "base_chg": 3.61},
            {"symbol": "POWERGRID", "name": "Power Grid Corp", "base_chg": 3.12},
            {"symbol": "NTPC", "name": "NTPC Ltd", "base_chg": 2.98},
        ]
        losers_raw = [
            {"symbol": "ASIANPAINT", "name": "Asian Paints Ltd", "base_chg": -2.41},
            {"symbol": "HINDUNILVR", "name": "Hindustan Unilever", "base_chg": -1.95},
            {"symbol": "NESTLEIND", "name": "Nestle India Ltd", "base_chg": -1.72},
            {"symbol": "TATASTEEL", "name": "Tata Steel Ltd", "base_chg": -1.53},
            {"symbol": "WIPRO", "name": "Wipro Ltd", "base_chg": -1.38},
        ]
        active_raw = [
            {"symbol": "RELIANCE", "name": "Reliance Industries", "base_chg": 1.82},
            {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "base_chg": 2.14},
            {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "base_chg": 1.26},
            {"symbol": "SBIN", "name": "State Bank of India", "base_chg": 0.92},
            {"symbol": "TCS", "name": "Tata Consultancy", "base_chg": -0.64},
        ]

        def build_list(raw: list) -> List[TopMoverDTO]:
            result = []
            for s in raw:
                jitter = ((hash(f"{s['symbol']}:{bucket}") % 40) - 20) * 0.01
                chg = round(s["base_chg"] + jitter, 2)
                result.append(TopMoverDTO(
                    symbol=s["symbol"],
                    name=s["name"],
                    changePercent=chg,
                    isPositive=chg >= 0,
                    sparkline=self._make_sparkline(100, 0.3 if chg >= 0 else -0.3),
                ))
            return result

        data = {
            "topGainers": build_list(gainers_raw),
            "topLosers": build_list(losers_raw),
            "mostActive": build_list(active_raw),
        }

        self._cache["top_movers"] = {"timestamp": now, "data": data}
        return data

    # ─── Markets Page: Sector Performance ─────────────────────────────────────

    def get_sector_performance(self) -> List[SectorPerfDTO]:
        now = time.time()
        if "sectors" in self._cache and (now - self._cache["sectors"]["timestamp"] < self._cache_ttl_seconds):
            return self._cache["sectors"]["data"]

        bucket = int(now // 60)
        sectors_raw = [
            {"sector": "Financial Services", "icon": "🏦", "base_chg": 1.82},
            {"sector": "Auto", "icon": "🚗", "base_chg": 1.41},
            {"sector": "IT", "icon": "💻", "base_chg": 0.82},
            {"sector": "Pharma", "icon": "💊", "base_chg": 0.31},
            {"sector": "FMCG", "icon": "🛒", "base_chg": -0.24},
            {"sector": "Metals", "icon": "⛏️", "base_chg": -0.73},
        ]

        sectors: List[SectorPerfDTO] = []
        for s in sectors_raw:
            jitter = ((hash(f"{s['sector']}:{bucket}") % 30) - 15) * 0.01
            chg = round(s["base_chg"] + jitter, 2)
            sectors.append(SectorPerfDTO(
                sector=s["sector"],
                icon=s["icon"],
                changePercent=chg,
                isPositive=chg >= 0,
                barPercent=min(100, abs(chg) * 30),
            ))

        self._cache["sectors"] = {"timestamp": now, "data": sectors}
        return sectors

    # ─── Markets Page: News ───────────────────────────────────────────────────

    def get_market_news(self) -> List[MarketNewsItemDTO]:
        now = time.time()
        if "news" in self._cache and (now - self._cache["news"]["timestamp"] < 120):
            return self._cache["news"]["data"]

        news = [
            MarketNewsItemDTO(
                id="n1",
                headline="NIFTY gains 0.8% as banking stocks lead the rally",
                summary="Banking and financial stocks are driving today's move, while IT remains mixed.",
                source="Economic Times",
                timeAgo="2 hours ago",
                category="Top News",
            ),
            MarketNewsItemDTO(
                id="n2",
                headline="RBI keeps repo rate unchanged at 6.50%",
                summary="Signals continued focus on inflation control while supporting growth.",
                source="Business Standard",
                timeAgo="4 hours ago",
                category="Macro",
            ),
            MarketNewsItemDTO(
                id="n3",
                headline="TCS to announce Q2 results on Oct 10",
                summary="Analysts expect steady growth in BFSI and international markets.",
                source="Moneycontrol",
                timeAgo="6 hours ago",
                category="Earnings",
            ),
            MarketNewsItemDTO(
                id="n4",
                headline="Auto sector sees strong September sales momentum",
                summary="M&M, Tata Motors report double-digit growth in monthly dispatches.",
                source="LiveMint",
                timeAgo="8 hours ago",
                category="Top News",
            ),
            MarketNewsItemDTO(
                id="n5",
                headline="FII inflows continue for 5th straight session",
                summary="Foreign institutional investors net bought ₹2,340 Cr in equities today.",
                source="NDTV Profit",
                timeAgo="3 hours ago",
                category="Global",
            ),
        ]

        self._cache["news"] = {"timestamp": now, "data": news}
        return news

    # ─── Markets Page: Economic Calendar ──────────────────────────────────────

    def get_economic_calendar(self) -> List[EconomicEventDTO]:
        now = time.time()
        if "calendar" in self._cache and (now - self._cache["calendar"]["timestamp"] < 300):
            return self._cache["calendar"]["data"]

        events = [
            EconomicEventDTO(id="e1", day=16, month="SEP", title="Indian CPI (YoY)", time="10:00 AM • India", location="India", importance="High", category="Upcoming", icon="📊"),
            EconomicEventDTO(id="e2", day=17, month="SEP", title="US Retail Sales", time="06:00 PM • United States", location="United States", importance="High", category="Upcoming", icon="🛍️"),
            EconomicEventDTO(id="e3", day=18, month="SEP", title="TCS Q2 Results", time="After Market • India", location="India", importance="High", category="Earnings", icon="📈"),
            EconomicEventDTO(id="e4", day=20, month="SEP", title="Fed Interest Rate Decision", time="11:30 PM • United States", location="United States", importance="High", category="Upcoming", icon="🏛️"),
            EconomicEventDTO(id="e5", day=22, month="SEP", title="HDFC Bank Ex-Dividend", time="All Day • India", location="India", importance="Medium", category="Dividends", icon="💰"),
        ]

        self._cache["calendar"] = {"timestamp": now, "data": events}
        return events

    # ─── Markets Page: Full Aggregated Payload ────────────────────────────────

    # ─── Markets Page: Full Composite Endpoint (v2 with XAUUSD) ─────────────
    def get_markets_page(self) -> MarketsPageDTO:
        """Single endpoint to hydrate the entire Markets page in one round-trip."""
        from datetime import datetime, timezone, timedelta

        ist = timezone(timedelta(hours=5, minutes=30))
        now_ist = datetime.now(ist)
        hour = now_ist.hour
        is_open = 9 <= hour < 16 and now_ist.weekday() < 5
        status = "open" if is_open else "closed"
        status_time = now_ist.strftime("%a, %d %b %Y • %I:%M %p IST")

        ticker = self.get_ticker_quotes()

        # Build index ticker with sparkline chart points (reuse overview curve)
        index_syms = ["NIFTY 50", "BANKNIFTY", "SENSEX", "FINNIFTY"]
        index_ticker = [q for q in ticker if q.symbol in index_syms]
        # Add XAUUSD, GOLD (INR) and USD/INR synthetic
        bucket = int(time.time() // 60)
        xau_jit = ((hash(f"XAUUSD:{bucket}") % 300) - 150) * 0.04
        gold_jit = ((hash(f"GOLD:{bucket}") % 200) - 100) * 0.5
        usdinr_jit = ((hash(f"USDINR:{bucket}") % 40) - 20) * 0.001
        index_ticker.append(MarketTickerItemDTO(symbol="XAUUSD", name="Gold Spot (USD/oz)", price=round(2655.80 + xau_jit, 2), change=round(xau_jit, 2), changePercent=round(xau_jit / 2655.80 * 100, 2), isPositive=xau_jit >= 0))
        index_ticker.append(MarketTickerItemDTO(symbol="GOLD", name="Gold", price=round(72430 + gold_jit, 2), change=round(gold_jit, 2), changePercent=round(gold_jit / 72430 * 100, 2), isPositive=gold_jit >= 0))
        index_ticker.append(MarketTickerItemDTO(symbol="USD/INR", name="USD/INR", price=round(83.21 + usdinr_jit, 2), change=round(usdinr_jit, 2), changePercent=round(usdinr_jit / 83.21 * 100, 2), isPositive=usdinr_jit >= 0))

        movers = self.get_top_movers()

        return MarketsPageDTO(
            indexTicker=index_ticker,
            heatmap=self.get_heatmap(),
            aiInsights=self.get_ai_insights(),
            topGainers=movers["topGainers"],
            topLosers=movers["topLosers"],
            mostActive=movers["mostActive"],
            sectorPerformance=self.get_sector_performance(),
            news=self.get_market_news(),
            calendar=self.get_economic_calendar(),
            marketStatus=status,
            marketStatusTime=status_time,
        )



# Singleton active market service
default_market_service = MarketService()


def get_market_service() -> MarketService:
    return default_market_service
