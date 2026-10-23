"""scripts/ is real code: linted, type-checked and tested like src/."""

from scripts import bump_version


def test_next_version():
    assert bump_version.next_version("1.2.3", "patch") == "1.2.4"
    assert bump_version.next_version("1.2.3", "minor") == "1.3.0"
    assert bump_version.next_version("1.2.3", "major") == "2.0.0"


def test_changelog_buckets_conventional_commits():
    entry = bump_version.changelog_entry(
        "1.3.0", ["feat: add holds", "fix(auth): refresh", "tidy up"]
    )
    assert "### Added\n\n- add holds" in entry
    assert "### Fixed\n\n- refresh" in entry
    assert "### Changed\n\n- tidy up" in entry
    assert "<!-- generated -->" in entry


# scaffold:if auth=proxy|auth=resource-server
def test_login_uses_pkce_and_state(monkeypatch, tmp_path):
    from scaffold_server.config import load_config
    from scripts import oauth_login
    from tests.unit.helpers import configure_stdio

    configure_stdio(monkeypatch, tmp_path)
    authorize = "https://idp.example.test/authorize"
    monkeypatch.setenv("SCAFFOLD_OAUTH_AUTHORIZE_URL", authorize)
    verifier, challenge = oauth_login.pkce_pair()
    url = oauth_login.authorize_url(load_config(env_file=None), "st4te", challenge)
    assert "code_challenge_method=S256" in url and "state=st4te" in url
    assert verifier != challenge


# scaffold:end
