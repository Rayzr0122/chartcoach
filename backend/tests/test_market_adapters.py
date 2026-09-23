from decimal import Decimal

import pytest

from app.simulator.market_data import (
    AdapterRoute,
    MarketEvent,
    MarketDataError,
    ProviderRegistry,
)
from app.config import settings


def test_registry_exposes_provider_neutral_capabilities_without_enabling_unapproved_routes(monkeypatch):
    monkeypatch.setattr(settings, "simulator_alpaca_usage_rights_record_id", "")
    registry = ProviderRegistry.default()

    capabilities = registry.capabilities("development")

    us_replay = next(item for item in capabilities if item["market"] == "us_equities" and item["mode"] == "replay")
    india_replay = next(item for item in capabilities if item["market"] == "india_equities" and item["mode"] == "replay")
    assert us_replay["provider"] == "alpaca_iex"
    assert us_replay["enabled"] is False
    assert india_replay["provider"] == "imported"
    assert india_replay["enabled"] is False


def test_registry_rejects_a_fallback_with_different_venue_or_event_semantics():
    registry = ProviderRegistry()
    registry.register_route(AdapterRoute(
        market="us_equities", mode="stream", provider="primary", venue="IEX",
        event_kinds=("quote", "trade"), delay_seconds=0, rights_approval_id="approved",
    ))
    registry.register_route(AdapterRoute(
        market="us_equities", mode="stream", provider="backup", venue="NASDAQ",
        event_kinds=("quote", "trade"), delay_seconds=0, rights_approval_id="approved",
        fallback_for="primary",
    ))

    with pytest.raises(MarketDataError, match="compatible"):
        registry.activate("us_equities", "stream", "primary", "development")


def test_registry_selects_only_routes_with_an_explicit_usage_rights_record(monkeypatch):
    monkeypatch.setattr(settings, "simulator_alpaca_usage_rights_record_id", "rights-123")
    registry = ProviderRegistry.default()

    assert registry.select("us_equities", "replay", "development").provider == "alpaca_iex"


def test_normalized_event_rejects_crossed_or_out_of_order_quotes():
    event = MarketEvent.quote(
        source="fixture", event_id="q-1", instrument_id="NASDAQ:AAPL", venue="NASDAQ",
        exchange_time=100, received_time=101, bid=Decimal("101"), ask=Decimal("100"),
        bid_size=Decimal("1"), ask_size=Decimal("1"),
    )
    with pytest.raises(MarketDataError, match="crossed"):
        event.validate()

    first = MarketEvent.trade(
        source="fixture", event_id="t-2", instrument_id="NASDAQ:AAPL", venue="NASDAQ",
        exchange_time=200, received_time=201, price=Decimal("100"), size=Decimal("1"), sequence=2,
    )
    second = MarketEvent.trade(
        source="fixture", event_id="t-1", instrument_id="NASDAQ:AAPL", venue="NASDAQ",
        exchange_time=199, received_time=202, price=Decimal("100"), size=Decimal("1"), sequence=1,
    )
    first.validate()
    with pytest.raises(MarketDataError, match="out of order"):
        second.validate_after(first)
