"""Provider-neutral market-data contracts used by the practice simulator."""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Protocol

from app.config import settings


class MarketDataError(ValueError):
    """A safe validation or routing failure for market data."""


@dataclass(frozen=True)
class AdapterRoute:
    market: str
    mode: str
    provider: str
    venue: str
    event_kinds: tuple[str, ...]
    delay_seconds: int
    rights_approval_id: str | None
    fallback_for: str | None = None
    environments: frozenset[str] = frozenset({"development"})

    def compatible_with(self, primary: "AdapterRoute") -> bool:
        return (
            self.venue == primary.venue
            and self.event_kinds == primary.event_kinds
            and self.delay_seconds == primary.delay_seconds
            and bool(self.rights_approval_id)
        )


@dataclass(frozen=True)
class MarketEvent:
    kind: str
    source: str
    event_id: str
    instrument_id: str
    venue: str
    exchange_time: int
    received_time: int
    sequence: int | None = None
    bid: Decimal | None = None
    ask: Decimal | None = None
    bid_size: Decimal | None = None
    ask_size: Decimal | None = None
    price: Decimal | None = None
    size: Decimal | None = None

    @classmethod
    def quote(cls, **values) -> "MarketEvent":
        return cls(kind="quote", **values)

    @classmethod
    def trade(cls, **values) -> "MarketEvent":
        return cls(kind="trade", **values)

    def validate(self) -> "MarketEvent":
        if not self.event_id or not self.instrument_id or self.exchange_time <= 0 or self.received_time < self.exchange_time:
            raise MarketDataError("invalid market event")
        if self.kind == "quote":
            if None in {self.bid, self.ask, self.bid_size, self.ask_size} or min(self.bid, self.ask, self.bid_size, self.ask_size) <= 0:
                raise MarketDataError("invalid quote")
            if self.bid >= self.ask:
                raise MarketDataError("crossed quote")
        elif self.kind == "trade":
            if self.price is None or self.size is None or self.price <= 0 or self.size <= 0:
                raise MarketDataError("invalid trade")
        else:
            raise MarketDataError("unsupported event kind")
        return self

    def validate_after(self, previous: "MarketEvent") -> "MarketEvent":
        self.validate()
        if (self.source, self.instrument_id) != (previous.source, previous.instrument_id):
            return self
        if self.sequence is not None and previous.sequence is not None:
            ordered = self.sequence > previous.sequence
        else:
            ordered = self.exchange_time >= previous.exchange_time
        if not ordered:
            raise MarketDataError("out of order market event")
        return self


class MarketDataAdapter(Protocol):
    provider_id: str

    def capabilities(self) -> tuple[str, ...]: ...


@dataclass(frozen=True)
class StaticAdapter:
    """Minimal adapter metadata for fixtures, imports, and externally configured APIs."""

    provider_id: str
    supported_capabilities: tuple[str, ...]

    def capabilities(self) -> tuple[str, ...]:
        return self.supported_capabilities


@dataclass
class ProviderRegistry:
    routes: list[AdapterRoute] = field(default_factory=list)
    adapters: dict[str, MarketDataAdapter] = field(default_factory=dict)

    @classmethod
    def default(cls) -> "ProviderRegistry":
        registry = cls()
        registry.adapters = {
            "synthetic-test": StaticAdapter("synthetic-test", ("bars",)),
            "imported": StaticAdapter("imported", ("bars", "corporate_actions")),
            "polygon": StaticAdapter("polygon", ("bars",)),
            "alpaca_iex": StaticAdapter("alpaca_iex", ("bars", "quote", "trade", "corporate_actions")),
            "alpha_vantage": StaticAdapter("alpha_vantage", ("bars", "fx_conversion")),
            "oanda": StaticAdapter("oanda", ("quote", "financing")),
            "coinbase": StaticAdapter("coinbase", ("quote", "trade", "bars")),
        }
        for route in (
            AdapterRoute("india_equities", "replay", "imported", "NSE", ("bar",), 0, settings.simulator_imported_data_approval_id or None),
            AdapterRoute("us_equities", "replay", "alpaca_iex", "IEX", ("bar",), 0, settings.simulator_alpaca_usage_rights_record_id or None),
            AdapterRoute("us_equities", "stream", "alpaca_iex", "IEX", ("quote", "trade"), 0, settings.simulator_alpaca_usage_rights_record_id or None),
            AdapterRoute("fx", "replay", "alpha_vantage", "OTC", ("bar",), 0, settings.simulator_alpha_vantage_usage_rights_record_id or None),
            AdapterRoute("crypto", "stream", "coinbase", "COINBASE", ("quote", "trade"), 0, settings.simulator_coinbase_usage_rights_record_id or None),
            AdapterRoute("crypto", "replay", "coinbase", "COINBASE", ("bar",), 0, settings.simulator_coinbase_usage_rights_record_id or None),
            AdapterRoute("all", "replay", "synthetic-test", "SIM", ("bar",), 0, "internal-fixture"),
        ):
            registry.register_route(route)
        return registry

    def register_route(self, route: AdapterRoute) -> None:
        self.routes.append(route)

    def capabilities(self, environment: str) -> list[dict]:
        return [
            {
                "market": route.market,
                "mode": route.mode,
                "provider": route.provider,
                "venue": route.venue,
                "event_kinds": list(route.event_kinds),
                "delay_seconds": route.delay_seconds,
                "enabled": bool(route.rights_approval_id) and environment in route.environments,
                "unavailable_reason": None if route.rights_approval_id else "MARKET_DATA_RIGHTS_REQUIRED",
            }
            for route in self.routes
            if route.fallback_for is None
        ]

    def activate(self, market: str, mode: str, provider: str, environment: str) -> AdapterRoute:
        route = next((item for item in self.routes if (item.market, item.mode, item.provider) == (market, mode, provider) and not item.fallback_for), None)
        if route is None:
            raise MarketDataError("provider route not found")
        if not route.rights_approval_id or environment not in route.environments:
            raise MarketDataError("market data rights required")
        for fallback in (item for item in self.routes if item.fallback_for == provider and item.market == market and item.mode == mode):
            if not fallback.compatible_with(route):
                raise MarketDataError("fallback route is not compatible")
        return route

    def select(self, market: str, mode: str, environment: str) -> AdapterRoute:
        for candidate_market in (market, "all"):
            route = next((item for item in self.routes if item.market == candidate_market and item.mode == mode and item.fallback_for is None and item.rights_approval_id and environment in item.environments), None)
            if route:
                return route
        raise MarketDataError("no approved provider route")
