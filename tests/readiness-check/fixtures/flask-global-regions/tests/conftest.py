import os

os.environ.setdefault("SECRET_KEY", "test-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest  # noqa: E402

from app import create_app, db  # noqa: E402


@pytest.fixture
def client():
    app = create_app({
        "TESTING": True,
        "WTF_CSRF_ENABLED": False,
        "SQLALCHEMY_ENGINE_OPTIONS": {},
    })
    with app.app_context():
        db.create_all()
        yield app.test_client()
