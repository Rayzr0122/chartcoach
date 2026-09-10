"""
Standard Library Unittest Suite for Polygon Service Google-Grade Resilience
Tests:
  1. Strict Bar Deduplication & Ascending Monotonicity Invariants
  2. Single-Flight Request Coalescing (Zero Redundant Network Requests)
  3. Token-Bucket Rate Governor & Circuit Breaker
  4. Graceful Fallback Generation
"""

import asyncio
import unittest
from app.services.polygon_service import (
    PolygonService,
    RateGovernor,
    CircuitState,
    TradingViewBarDTO,
)


class TestPolygonResilience(unittest.IsolatedAsyncioTestCase):
    def test_sanitize_and_sort_bars_invariants(self):
        service = PolygonService()

        # Create unordered, duplicate, and dirty bars
        raw_bars = [
            TradingViewBarDTO(time=1700000100, open=100.0, high=105.0, low=99.0, close=102.0, value=102.0),
            TradingViewBarDTO(time=1700000000, open=98.0, high=97.0, low=101.0, close=99.0, value=99.0),
            TradingViewBarDTO(time=1700000100, open=100.0, high=106.0, low=99.0, close=104.0, value=104.0),
            TradingViewBarDTO(time=1700000050, open=99.0, high=101.0, low=98.0, close=100.0, value=100.0),
        ]

        sanitized = service._sanitize_and_sort_bars(raw_bars)

        # Invariant 1: Strictly sorted by time
        timestamps = [b.time for b in sanitized]
        self.assertEqual(timestamps, [1700000000, 1700000050, 1700000100])

        # Invariant 2: No duplicates (duplicate 1700000100 replaced by latest)
        self.assertEqual(len(sanitized), 3)
        self.assertEqual(sanitized[-1].close, 104.0)

        # Invariant 3: High >= Max(Open, Close) and Low <= Min(Open, Close)
        first_bar = sanitized[0]
        self.assertGreaterEqual(first_bar.high, max(first_bar.open, first_bar.close))
        self.assertLessEqual(first_bar.low, min(first_bar.open, first_bar.close))

    async def test_rate_governor_token_bucket(self):
        governor = RateGovernor(capacity=2.0, refill_rate=0.1)

        # 1. Consume available tokens
        self.assertTrue(await governor.can_consume())
        self.assertTrue(await governor.can_consume())

        # 2. Token depleted
        self.assertFalse(await governor.can_consume())

        # 3. Trip circuit breaker
        await governor.record_rate_limit(retry_after=1.0)
        self.assertEqual(governor.circuit_state, CircuitState.OPEN)
        self.assertFalse(await governor.can_consume())

    async def test_single_flight_coalescing(self):
        service = PolygonService()

        # Mock _execute_fetch_quote with a delay to verify coalescing
        call_count = 0

        async def mock_fetch(clean_sym, meta):
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.05)
            return service._generate_fallback_quote(clean_sym, meta["name"])

        service._execute_fetch_quote = mock_fetch

        # Fire 5 concurrent requests for "NVDA" simultaneously
        tasks = [service.get_quote("NVDA") for _ in range(5)]
        results = await asyncio.gather(*tasks)

        # Invariant: exactly 1 network call executed, all 5 got the result
        self.assertEqual(call_count, 1)
        self.assertEqual(len(results), 5)
        self.assertEqual(results[0].symbol, "NVDA")

    async def test_fallback_history_generation(self):
        service = PolygonService()
        hist = service._generate_fallback_history("AAPL", "Apple Inc.", "1D")

        self.assertEqual(hist.symbol, "AAPL")
        self.assertGreaterEqual(len(hist.bars), 20)
        self.assertEqual(hist.source, "calibrated_fallback")

        # Verify time strictly ascending
        times = [b.time for b in hist.bars]
        self.assertEqual(times, sorted(times))


if __name__ == "__main__":
    unittest.main()
