from __future__ import annotations

from datetime import datetime, timezone


def utcnow() -> datetime:
    """Timezone-aware UTC now.

    SQLAlchemy DateTime(timezone=True) columns should receive tz-aware values.
    Passing naive datetimes may cause the DB/driver to assume local time
    (and shift values), which then renders incorrectly in the UI.
    """

    return datetime.now(timezone.utc)


def ensure_utc(dt: datetime | None) -> datetime | None:
    """Ensure datetime is timezone-aware UTC.

    If the value is naive, we assume it already represents a UTC moment
    (common when DB columns are timestamp without timezone) and attach UTC.
    """

    if dt is None:
        return None

    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)

    return dt.astimezone(timezone.utc)
