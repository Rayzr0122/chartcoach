from types import SimpleNamespace

import mongomock
import pytest
from fastapi import HTTPException

from app.api.simulator import ChartLayoutUpdate, get_chart_layout, save_chart_layout


def test_chart_layouts_are_scoped_and_use_optimistic_revisions():
    database = mongomock.MongoClient().simulator
    user = SimpleNamespace(id="learner-1")
    created = save_chart_layout("NASDAQ:AAPL", ChartLayoutUpdate(revision=0, drawings=[{"name": "segment", "points": []}]), "1m", user, database)

    assert created["revision"] == 1
    assert get_chart_layout("NASDAQ:AAPL", "1m", user, database)["drawings"] == created["drawings"]
    with pytest.raises(HTTPException) as error:
        save_chart_layout("NASDAQ:AAPL", ChartLayoutUpdate(revision=0, drawings=[]), "1m", user, database)
    assert error.value.status_code == 409
