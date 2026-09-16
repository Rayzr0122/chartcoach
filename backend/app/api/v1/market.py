"""
Market Domain Version 1 API Routes — Google-Grade Failproof Endpoints.
Complies with Section 20, 21, 22 of the Senior Engineering Specification.
"""

from typing import List
from fastapi import APIRouter, Query, Response
from fastapi.responses import StreamingResponse

from app.services.market_service import (
    get_market_service,
    MarketTickerItemDTO,
    MarketOverviewDTO,
    MarketsPageDTO,
)
from app.services.polygon_service import (
    polygon_service,
    PolygonHistoryResponse,
    PolygonQuoteDTO,
    LiveTickDTO,
)

router = APIRouter(prefix="/api/v1/market", tags=["market-v1"])


@router.get("/page", response_model=MarketsPageDTO)
def get_markets_page(response: Response):
    """Returns the full aggregated Markets page payload in a single round-trip."""
    response.headers["Cache-Control"] = "public, max-age=15, stale-while-revalidate=45"
    service = get_market_service()
    return service.get_markets_page()


@router.get("/ticker", response_model=List[MarketTickerItemDTO])
def get_market_ticker(response: Response):
    """Returns live cached quotes for top indices and market leaders."""
    response.headers["Cache-Control"] = "public, max-age=15, stale-while-revalidate=45"
    service = get_market_service()
    return service.get_ticker_quotes()


@router.get("/overview", response_model=MarketOverviewDTO)
def get_market_overview(
    response: Response,
    symbol: str = Query(default="NIFTY 50", min_length=1, max_length=15, regex=r"^[A-Z0-9 .\-_]+$"),
):
    """Returns intraday trend curve and 24h range for the selected asset."""
    response.headers["Cache-Control"] = "public, max-age=15, stale-while-revalidate=45"
    service = get_market_service()
    return service.get_market_overview(symbol)


# ─── Polygon.io Live Data & TradingView Lightweight Charts Endpoints ──────────

@router.get("/polygon/history", response_model=PolygonHistoryResponse)
async def get_polygon_history(
    response: Response,
    symbol: str = Query(default="NVDA", min_length=1, max_length=15, regex=r"^[A-Z0-9.\-_]+$"),
    timeframe: str = Query(default="1D", regex=r"^(1D|1W|1M|1Y|ALL)$"),
):
    """Returns TradingView Lightweight Charts formatted OHLCV series powered by Polygon.io."""
    response.headers["Cache-Control"] = "public, max-age=20, stale-while-revalidate=60"
    return await polygon_service.get_history(symbol=symbol, timeframe=timeframe)


@router.get("/polygon/quote", response_model=PolygonQuoteDTO)
async def get_polygon_quote(
    response: Response,
    symbol: str = Query(default="NVDA", min_length=1, max_length=15, regex=r"^[A-Z0-9.\-_]+$"),
):
    """Returns real-time Polygon quote with high, low, volume, and percentage change."""
    response.headers["Cache-Control"] = "public, max-age=15, stale-while-revalidate=45"
    return await polygon_service.get_quote(symbol=symbol)


@router.get("/polygon/watchlist", response_model=List[PolygonQuoteDTO])
async def get_polygon_watchlist(response: Response):
    """Returns live Polygon.io quotes for the user watchlist."""
    response.headers["Cache-Control"] = "public, max-age=15, stale-while-revalidate=45"
    return await polygon_service.get_watchlist()


@router.get("/polygon/ticker", response_model=List[PolygonQuoteDTO])
async def get_polygon_ticker(response: Response):
    """Returns live Polygon.io quotes for the marquee market ticker strip."""
    response.headers["Cache-Control"] = "public, max-age=15, stale-while-revalidate=45"
    return await polygon_service.get_ticker()


@router.get("/polygon/stream")
async def stream_polygon_ticks(
    symbols: str = Query(default="NVDA,AAPL,TSLA,SPY,MSFT,AMZN,INFY"),
):
    """Server-Sent Events (SSE) live tick stream for real-time continuous market data."""
    sym_list = [s.strip() for s in symbols.split(",") if s.strip()]
    return StreamingResponse(
        polygon_service.stream_market_ticks(sym_list),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/polygon/tick", response_model=LiveTickDTO)
async def get_polygon_tick(
    symbol: str = Query(default="NVDA", min_length=1, max_length=15, regex=r"^[A-Z0-9.\-_]+$"),
):
    """Returns a single real-time live tick with micro-movements."""
    return await polygon_service.get_live_tick(symbol=symbol)
