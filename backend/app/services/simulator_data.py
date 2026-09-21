"""Bounded, immutable one-minute datasets for simulator replays.

Polygon is the only production source in this boundary. ``synthetic-test`` is
deterministic fixture data and is intentionally marked test-only in metadata.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
import time
import asyncio
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import parse_qsl, urlsplit, urlunsplit

import httpx

from app.config import settings


DATASET_ROOT = Path(settings.media_root).resolve() / "datasets"
ALLOWED_HISTORY_DAYS = {7, 30, 90, 365}
POLYGON_HOST = "api.polygon.io"
ALPACA_DATA_HOST = "data.alpaca.markets"
ALPHA_VANTAGE_HOST = "www.alphavantage.co"
COINBASE_EXCHANGE_HOST = "api.exchange.coinbase.com"
MAX_PAGES = 32
MAX_BARS = 1_000_000
INSTRUMENT_RE = re.compile(r"^[A-Za-z0-9._-]{1,32}$")
CANONICAL_INSTRUMENT_RE = re.compile(r"^[A-Z][A-Z0-9 _-]{0,15}:[A-Z0-9._-]{1,32}$")
SUPPORTED_POLYGON_VENUES = {"NASDAQ", "NYSE", "AMEX", "NYSEARCA"}


class DatasetError(Exception):
    """Safe, typed error raised when a dataset cannot be loaded or read."""

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(f"{code}: {message}")


class DatasetCoverageError(DatasetError):
    """Typed failure for a source that cannot provide usable replay coverage."""


class PolygonDataError(DatasetError):
    """Typed failure for a Polygon authorization, quota, or transport problem."""


def utc_now_seconds() -> int:
    """Return the current UTC Unix timestamp; separated for deterministic tests."""

    return int(time.time())


def _decimal_string(value: object, field: str) -> str:
    """Convert provider numeric values to finite, non-exponent Decimal strings."""
    try:
        number = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise DatasetError("INVALID_BAR", f"Bar {field} is not a decimal value") from None
    if not number.is_finite():
        raise DatasetError("INVALID_BAR", f"Bar {field} is not finite")
    return format(number, "f")


def _normalize_bar(raw: dict, cutoff: int | None, requested_start: int | None = None, is_fx: bool = False) -> dict | None:
    """Validate one Polygon aggregate and discard bars at/after the cutoff."""
    try:
        timestamp_ms = Decimal(str(raw["t"]))
    except (KeyError, InvalidOperation, ValueError, TypeError):
        raise DatasetError("INVALID_BAR", "Bar timestamp is invalid") from None
    if not timestamp_ms.is_finite() or timestamp_ms != timestamp_ms.to_integral_value() or timestamp_ms % 60000 != 0:
        raise DatasetError("INVALID_BAR", "Bar timestamp is not a minute boundary")
    timestamp = int(timestamp_ms / Decimal(1000))
    if timestamp <= 0:
        raise DatasetError("INVALID_BAR", "Bar timestamp is invalid")
    if cutoff is not None and timestamp + 60 > cutoff:
        return None
    if requested_start is not None and timestamp < requested_start:
        return None

    values = {field: _decimal_string(raw.get(source), field) for field, source in {
        "open": "o", "high": "h", "low": "l", "close": "c"
    }.items()}
    values["volume"] = _decimal_string(raw.get("v", "0" if is_fx else None), "volume")
    opens = Decimal(values["open"])
    highs = Decimal(values["high"])
    lows = Decimal(values["low"])
    closes = Decimal(values["close"])
    volume = Decimal(values["volume"])
    if min(opens, highs, lows, closes) <= 0 or volume < 0:
        raise DatasetError("INVALID_BAR", "Bar prices must be positive and volume non-negative")
    if highs < max(opens, closes) or lows > min(opens, closes):
        raise DatasetError("INVALID_BAR", "Bar OHLC bounds are inconsistent")
    return {"time": timestamp, **values}


def _canonical_dataset(dataset: dict) -> bytes:
    """Serialize dataset content deterministically for its content address."""
    return json.dumps(dataset, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _store(dataset: dict) -> dict:
    """Persist content once and return the immutable dataset with its id."""
    content = _canonical_dataset(dataset)
    dataset_id = f"dataset_{hashlib.sha256(content).hexdigest()}"
    stored = {"id": dataset_id, **dataset}
    DATASET_ROOT.mkdir(parents=True, exist_ok=True)
    path = DATASET_ROOT / f"{dataset_id}.json"
    if path.exists():
        existing = _read_verified(path, dataset_id)
        if existing != stored:
            raise DatasetError("DATASET_TAMPERED", "Dataset content failed integrity verification")
        return existing
    fd, temp_name = tempfile.mkstemp(prefix=f".{dataset_id}.", suffix=".tmp", dir=DATASET_ROOT)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(stored, handle, sort_keys=True, separators=(",", ":"))
            handle.flush()
            os.fsync(handle.fileno())
        try:
            os.link(temp_name, path)
        except FileExistsError:
            existing = _read_verified(path, dataset_id)
            if existing != stored:
                raise DatasetError("DATASET_TAMPERED", "Dataset content failed integrity verification")
            return existing
    finally:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass
    return stored


def _read_verified(path: Path, dataset_id: str) -> dict:
    """Read a dataset and verify its filename address and complete content hash."""
    try:
        with path.open(encoding="utf-8") as handle:
            dataset = json.load(handle)
        if not isinstance(dataset, dict) or dataset.get("id") != dataset_id:
            raise ValueError
        content = dict(dataset)
        del content["id"]
        actual_id = f"dataset_{hashlib.sha256(_canonical_dataset(content)).hexdigest()}"
        if actual_id != dataset_id:
            raise ValueError
        return dataset
    except (OSError, ValueError, TypeError, json.JSONDecodeError, KeyError):
        raise DatasetError("DATASET_TAMPERED", "Dataset content failed integrity verification") from None


def get_dataset(dataset_id: str) -> dict:
    """Read a pinned dataset by id; stored files are never modified by reads."""

    if not re.fullmatch(r"dataset_[0-9a-f]{64}", dataset_id):
        raise DatasetError("DATASET_NOT_FOUND", "Dataset was not found")
    path = DATASET_ROOT / f"{dataset_id}.json"
    if not path.is_file():
        raise DatasetError("DATASET_NOT_FOUND", "Dataset was not found")
    return _read_verified(path, dataset_id)


def _synthetic(instrument_id: str, history_days: int) -> dict:
    """Build deterministic fixture bars, explicitly labeled as test-only."""
    end = 1_735_680_000  # fixed fixture anchor: 2025-01-01 00:00:00 UTC
    start = end - history_days * 86400
    bars = []
    for index, timestamp in enumerate(range(start, end, 60)):
        base = Decimal("100.00") + Decimal(index % 37) / Decimal("10")
        close = base + Decimal("0.05")
        bars.append({"time": timestamp, "open": format(base, "f"), "high": format(close + Decimal("0.10"), "f"), "low": format(base - Decimal("0.10"), "f"), "close": format(close, "f"), "volume": format(Decimal(1000 + index % 100), "f")})
    return {"source": "synthetic-test", "instrument_id": instrument_id, "bars": bars, "precision": "1m", "start": start, "end": end - 60, "coverage": {"requested_start": start, "requested_end": end - 60, "actual_start": start, "actual_end": end - 60, "cutoff_timestamp": end, "test_only": True}}


def _instrument_parts(instrument_id: str, source: str) -> tuple[str, str, bool]:
    """Return canonical id, provider symbol, and whether the instrument is FX."""
    canonical = instrument_id.strip().upper()
    if ":" not in canonical:
        if not INSTRUMENT_RE.fullmatch(canonical):
            raise DatasetError("INVALID_INSTRUMENT", "Instrument id is invalid")
        return canonical, canonical, False
    if not CANONICAL_INSTRUMENT_RE.fullmatch(canonical):
        raise DatasetError("INVALID_INSTRUMENT", "Instrument id is invalid")
    venue, symbol = canonical.split(":", 1)
    if venue == "FX" and symbol == "USD-INR":
        return canonical, "C:USDINR", True
    if source in {"polygon", "alpaca_iex"} and venue not in SUPPORTED_POLYGON_VENUES:
        raise DatasetError("UNSUPPORTED_VENUE", "Polygon does not support this instrument venue")
    return canonical, symbol, False


def _polygon_path(instrument_id: str, start: int, end: int) -> str:
    """Build the fixed Polygon one-minute aggregate path for a date range."""
    from_date = datetime.fromtimestamp(start, timezone.utc).date().isoformat()
    to_date = datetime.fromtimestamp(end, timezone.utc).date().isoformat()
    return f"/v2/aggs/ticker/{instrument_id}/range/1/minute/{from_date}/{to_date}"


def _safe_next_url(next_url: object, expected_path: str) -> str:
    """Accept only HTTPS pagination on Polygon's exact original endpoint path."""
    parsed = urlsplit(str(next_url))
    if parsed.scheme != "https" or parsed.hostname != POLYGON_HOST or parsed.port not in (None, 443) or parsed.username or parsed.password or parsed.path != expected_path or parsed.fragment:
        raise DatasetError("POLYGON_PAGINATION", "Polygon returned an invalid pagination cursor")
    query_keys = {key.lower() for key, _ in parse_qsl(parsed.query, keep_blank_values=True)}
    if "apikey" in query_keys or "api_key" in query_keys:
        raise DatasetError("POLYGON_PAGINATION", "Polygon returned an invalid pagination cursor")
    return urlunsplit(("https", POLYGON_HOST, parsed.path, parsed.query, ""))


async def _polygon(canonical_id: str, provider_symbol: str, history_days: int, is_fx: bool = False) -> dict:
    """Fetch bounded Polygon pages and validate the complete replay snapshot."""
    now = utc_now_seconds()
    cutoff = ((now - 15 * 60) // 60) * 60
    requested_start = cutoff - history_days * 86400
    path = _polygon_path(provider_symbol, requested_start, cutoff)
    url = f"https://{POLYGON_HOST}{path}"
    params = {"adjusted": "true", "sort": "asc", "limit": 50000, "apiKey": settings.polygon_api_key}
    normalized: dict[int, dict] = {}
    seen_urls = {url}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for _ in range(MAX_PAGES):
                response = await client.get(url, params=params)
                if response.status_code == 403:
                    raise PolygonDataError("POLYGON_FORBIDDEN", "Polygon access is not authorized")
                if response.status_code == 429:
                    raise PolygonDataError("POLYGON_RATE_LIMIT", "Polygon rate limit reached; try again later")
                if response.status_code != 200:
                    raise PolygonDataError("POLYGON_UNAVAILABLE", "Polygon historical data is unavailable")
                payload = response.json()
                for raw in payload.get("results", []):
                    bar = _normalize_bar(raw, cutoff, requested_start, is_fx)
                    if bar is not None:
                        normalized[bar["time"]] = bar
                if len(normalized) > MAX_BARS:
                    raise DatasetCoverageError("POLYGON_BOUNDS", "Requested historical data exceeds the replay bound")
                next_url = payload.get("next_url")
                if not next_url:
                    break
                url = _safe_next_url(next_url, path)
                if url in seen_urls:
                    raise DatasetError("POLYGON_PAGINATION", "Polygon returned a repeated pagination cursor")
                seen_urls.add(url)
                params = {"apiKey": settings.polygon_api_key}
            else:
                raise DatasetCoverageError("POLYGON_BOUNDS", "Polygon pagination exceeded the replay bound")
    except DatasetError:
        raise
    except (httpx.HTTPError, ValueError, TypeError, KeyError):
        raise PolygonDataError("POLYGON_UNAVAILABLE", "Polygon historical data is unavailable") from None

    bars = [normalized[timestamp] for timestamp in sorted(normalized)]
    if not bars:
        raise DatasetCoverageError("COVERAGE_INSUFFICIENT", "Polygon returned no completed one-minute bars")
    return {"source": "polygon", "instrument_id": canonical_id, "bars": bars, "precision": "1m", "start": bars[0]["time"], "end": bars[-1]["time"], "coverage": {"requested_start": requested_start, "requested_end": cutoff - 60, "actual_start": bars[0]["time"], "actual_end": bars[-1]["time"], "cutoff_timestamp": cutoff, "test_only": False}}


async def _alpaca_iex(canonical_id: str, provider_symbol: str, history_days: int) -> dict:
    if not settings.alpaca_api_key or not settings.alpaca_api_secret:
        raise DatasetError("ALPACA_CREDENTIALS_REQUIRED", "Alpaca credentials are not configured")
    cutoff = (utc_now_seconds() // 60) * 60
    start = cutoff - history_days * 86400
    path = f"/v2/stocks/{provider_symbol}/bars"
    bars: dict[int, dict] = {}
    page_token = None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for _ in range(MAX_PAGES):
                params = {"timeframe": "1Min", "start": datetime.fromtimestamp(start, timezone.utc).isoformat(), "end": datetime.fromtimestamp(cutoff, timezone.utc).isoformat(), "feed": "iex", "limit": 10000}
                if page_token:
                    params["page_token"] = page_token
                response = await client.get(f"https://{ALPACA_DATA_HOST}{path}", params=params, headers={"APCA-API-KEY-ID": settings.alpaca_api_key, "APCA-API-SECRET-KEY": settings.alpaca_api_secret})
                if response.status_code == 401:
                    raise PolygonDataError("ALPACA_FORBIDDEN", "Alpaca access is not authorized")
                if response.status_code == 429:
                    raise PolygonDataError("ALPACA_RATE_LIMIT", "Alpaca rate limit reached; try again later")
                if response.status_code != 200:
                    raise PolygonDataError("ALPACA_UNAVAILABLE", "Alpaca historical data is unavailable")
                payload = response.json()
                for raw in payload.get("bars", []):
                    timestamp = int(datetime.fromisoformat(str(raw["t"]).replace("Z", "+00:00")).timestamp())
                    bar = _normalize_bar({"t": timestamp * 1000, "o": raw.get("o"), "h": raw.get("h"), "l": raw.get("l"), "c": raw.get("c"), "v": raw.get("v")}, cutoff, start)
                    if bar:
                        bars[bar["time"]] = bar
                page_token = payload.get("next_page_token")
                if not page_token:
                    break
            else:
                raise DatasetCoverageError("ALPACA_BOUNDS", "Alpaca pagination exceeded the replay bound")
    except DatasetError:
        raise
    except (httpx.HTTPError, ValueError, TypeError, KeyError):
        raise PolygonDataError("ALPACA_UNAVAILABLE", "Alpaca historical data is unavailable") from None
    result = [bars[timestamp] for timestamp in sorted(bars)]
    if not result:
        raise DatasetCoverageError("COVERAGE_INSUFFICIENT", "Alpaca returned no completed one-minute bars")
    return {"source": "alpaca_iex", "instrument_id": canonical_id, "bars": result, "precision": "1m", "start": result[0]["time"], "end": result[-1]["time"], "coverage": {"requested_start": start, "requested_end": cutoff - 60, "actual_start": result[0]["time"], "actual_end": result[-1]["time"], "cutoff_timestamp": cutoff, "test_only": False}}


async def _alpha_vantage_fx(canonical_id: str, history_days: int) -> dict:
    if not settings.alpha_vantage_api_key:
        raise DatasetError("ALPHA_VANTAGE_CREDENTIALS_REQUIRED", "Alpha Vantage credentials are not configured")
    if not canonical_id.startswith("FX:") or "-" not in canonical_id:
        raise DatasetError("UNSUPPORTED_INSTRUMENT", "Alpha Vantage replay requires an FX instrument")
    base, quote = canonical_id.removeprefix("FX:").split("-", 1)
    cutoff = (utc_now_seconds() // 86400) * 86400
    start = cutoff - history_days * 86400
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"https://{ALPHA_VANTAGE_HOST}/query", params={"function": "FX_DAILY", "from_symbol": base, "to_symbol": quote, "outputsize": "full", "apikey": settings.alpha_vantage_api_key})
            if response.status_code != 200:
                raise PolygonDataError("ALPHA_VANTAGE_UNAVAILABLE", "Alpha Vantage FX data is unavailable")
            payload = response.json()
    except DatasetError:
        raise
    except (httpx.HTTPError, ValueError, TypeError):
        raise PolygonDataError("ALPHA_VANTAGE_UNAVAILABLE", "Alpha Vantage FX data is unavailable") from None
    if payload.get("Note") or payload.get("Information"):
        raise PolygonDataError("ALPHA_VANTAGE_RATE_LIMIT", "Alpha Vantage request limit reached; try again later")
    series = payload.get("Time Series FX (Daily)")
    if not isinstance(series, dict):
        raise PolygonDataError("ALPHA_VANTAGE_UNAVAILABLE", "Alpha Vantage FX data is unavailable")
    bars = []
    for stamp, raw in series.items():
        timestamp = int(datetime.strptime(stamp, "%Y-%m-%d").replace(tzinfo=timezone.utc).timestamp())
        bar = _normalize_bar({"t": timestamp * 1000, "o": raw.get("1. open"), "h": raw.get("2. high"), "l": raw.get("3. low"), "c": raw.get("4. close"), "v": "0"}, cutoff, start, is_fx=True)
        if bar:
            bars.append(bar)
    bars.sort(key=lambda item: item["time"])
    if not bars:
        raise DatasetCoverageError("COVERAGE_INSUFFICIENT", "Alpha Vantage returned no completed one-minute FX bars")
    return {"source": "alpha_vantage", "instrument_id": canonical_id, "bars": bars, "precision": "1d", "start": bars[0]["time"], "end": bars[-1]["time"], "coverage": {"requested_start": start, "requested_end": cutoff - 86400, "actual_start": bars[0]["time"], "actual_end": bars[-1]["time"], "cutoff_timestamp": cutoff, "test_only": False, "fidelity": "daily_fx_replay"}}


async def _coinbase(canonical_id: str, history_days: int) -> dict:
    if not canonical_id.startswith("CRYPTO:"):
        raise DatasetError("UNSUPPORTED_INSTRUMENT", "Coinbase replay requires a crypto instrument")
    product = canonical_id.removeprefix("CRYPTO:")
    cutoff = (utc_now_seconds() // 60) * 60
    start = cutoff - history_days * 86400
    bars = {}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            async def fetch(window_start: int, window_end: int) -> list:
                response = await client.get(f"https://{COINBASE_EXCHANGE_HOST}/products/{product}/candles", params={"granularity": 60, "start": datetime.fromtimestamp(window_start, timezone.utc).isoformat(), "end": datetime.fromtimestamp(window_end, timezone.utc).isoformat()})
                if response.status_code == 429:
                    raise PolygonDataError("COINBASE_RATE_LIMIT", "Coinbase rate limit reached; try again later")
                if response.status_code != 200:
                    raise PolygonDataError("COINBASE_UNAVAILABLE", "Coinbase historical data is unavailable")
                payload = response.json()
                if not isinstance(payload, list):
                    raise PolygonDataError("COINBASE_UNAVAILABLE", "Coinbase historical data is unavailable")
                return payload

            windows = [(window_start, min(window_start + 300 * 60, cutoff)) for window_start in range(start, cutoff, 300 * 60)]
            first = await fetch(*windows[0])
            pages = [first]
            if len(first) >= 300:
                for offset in range(1, len(windows), 4):
                    pages.extend(await asyncio.gather(*(fetch(*window) for window in windows[offset:offset + 4])))
            for payload in pages:
                for raw in payload:
                    if not isinstance(raw, list) or len(raw) != 6:
                        raise DatasetError("INVALID_BAR", "Coinbase returned an invalid candle")
                    bar = _normalize_bar({"t": raw[0] * 1000, "l": raw[1], "h": raw[2], "o": raw[3], "c": raw[4], "v": raw[5]}, cutoff, start)
                    if bar:
                        bars[bar["time"]] = bar
    except DatasetError:
        raise
    except (httpx.HTTPError, ValueError, TypeError, KeyError):
        raise PolygonDataError("COINBASE_UNAVAILABLE", "Coinbase historical data is unavailable") from None
    result = [bars[timestamp] for timestamp in sorted(bars)]
    if not result:
        raise DatasetCoverageError("COVERAGE_INSUFFICIENT", "Coinbase returned no completed one-minute candles")
    return {"source": "coinbase", "instrument_id": canonical_id, "bars": result, "precision": "1m", "start": result[0]["time"], "end": result[-1]["time"], "coverage": {"requested_start": start, "requested_end": cutoff - 60, "actual_start": result[0]["time"], "actual_end": result[-1]["time"], "cutoff_timestamp": cutoff, "test_only": False}}


async def load_dataset(instrument_id: str, source: str, history_days: int = 30) -> dict:
    """Load and pin a replay dataset through an approved source adapter."""

    if history_days not in ALLOWED_HISTORY_DAYS:
        raise DatasetError("INVALID_HISTORY_DAYS", "History must be 7, 30, 90, or 365 days")
    canonical_id, provider_symbol, is_fx = _instrument_parts(instrument_id, source)
    if source == "synthetic-test":
        return _store(_synthetic(canonical_id, history_days))
    if source == "polygon":
        return _store(await _polygon(canonical_id, provider_symbol, history_days, is_fx))
    if source == "alpaca_iex":
        return _store(await _alpaca_iex(canonical_id, provider_symbol, history_days))
    if source == "alpha_vantage":
        return _store(await _alpha_vantage_fx(canonical_id, history_days))
    if source == "coinbase":
        return _store(await _coinbase(canonical_id, history_days))
    raise DatasetError("INVALID_SOURCE", "Dataset source is not supported")


async def refresh_dataset(instrument_id: str, source: str, history_days: int = 30) -> dict:
    """Fetch a new immutable snapshot; existing pinned dataset files are untouched."""

    return await load_dataset(instrument_id, source, history_days)
