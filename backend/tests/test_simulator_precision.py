from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.api.simulator import _profile_version, _validate_order_precision


def test_crypto_precision_and_profile_are_explicit():
    assert _profile_version({"asset_class": "spot_crypto"}) == "crypto_spot_dev_v1"
    _validate_order_precision("CRYPTO:BTC-USD", Decimal("0.00000001"), Decimal("100.01"))
    with pytest.raises(HTTPException, match="increment"):
        _validate_order_precision("CRYPTO:BTC-USD", Decimal("0.000000001"), Decimal("100.01"))


def test_cash_equity_rejects_fractional_lots_and_off_tick_prices():
    with pytest.raises(HTTPException, match="increment"):
        _validate_order_precision("NASDAQ:AAPL", Decimal("1.5"), Decimal("100.01"))
    with pytest.raises(HTTPException, match="tick"):
        _validate_order_precision("NASDAQ:AAPL", Decimal("1"), Decimal("100.001"))
