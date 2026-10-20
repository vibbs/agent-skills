import pytest

from scaffold_server import feature_flags
from tests.unit.helpers import clean_env


def test_new_capabilities_ship_off(monkeypatch):
    clean_env(monkeypatch)
    assert feature_flags.active_flags() == {"writes": False}


def test_flag_turns_on(monkeypatch):
    clean_env(monkeypatch)
    monkeypatch.setenv("SCAFFOLD_FEATURE_WRITES", "true")
    assert feature_flags.is_enabled("writes")


def test_malformed_flag_raises(monkeypatch):
    monkeypatch.setenv("SCAFFOLD_FEATURE_WRITES", "yes please")
    with pytest.raises(ValueError):
        feature_flags.is_enabled("writes")


def test_unregistered_flag_is_a_code_bug():
    with pytest.raises(KeyError):
        feature_flags.is_enabled("nope")
