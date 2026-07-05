import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("APP_VERSION", "test-version")

from app.api.routes.health import health, version
from app.main import training_process_payload


def test_health_endpoint_payload():
    assert health() == {"status": "ok"}


def test_version_endpoint_payload():
    assert version() == {"version": "test-version"}


def test_training_process_business_endpoint_payload():
    payload = training_process_payload()
    assert payload["company"] == "Betcloud"
    assert payload["status"] == "available"
    assert "mandatory trainings" in payload["modules"]
