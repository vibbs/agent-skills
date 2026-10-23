import pytest

from scaffold_server.tools.ids import safe_date, safe_id, safe_subject
from scaffold_server.tools.picker import MORE_ID, picker


@pytest.mark.parametrize("value", ["A1", "item_9", "a.b-c=d"])
def test_safe_id_accepts(value):
    assert safe_id(value)


@pytest.mark.parametrize("value", ["", "../etc", "a/b", "a b", "x" * 81, 5, None, "a..b"])
def test_safe_id_rejects(value):
    assert not safe_id(value)


def test_safe_subject_and_date():
    assert safe_subject("me") and safe_subject("u1") and not safe_subject("u/1")
    assert safe_date("2026-10-20") and not safe_date("2026-13-01") and not safe_date("20261020")


def test_picker_pages_and_adds_more_sentinel():
    items = [{"label": f"L{i}", "id": f"id{i}"} for i in range(6)]
    out = picker("Which?", items)
    assert [o["id"] for o in out["options"]] == ["id0", "id1", "id2", MORE_ID]


def test_picker_skips_incomplete_and_refuses_degenerate_question():
    assert picker("Which?", [{"label": "only", "id": "1"}, {"label": "", "id": "2"}]) == {}
