"""HTTP resource-server mode: the identity provider issues JWTs for *this server*.

FastMCP validates them (signature via JWKS, issuer, audience) and serves RFC 9728
protected-resource metadata pointing clients at the authorization server. Upstream calls
then exchange the validated token for an upstream one (token_exchange.py); the inbound
token is never forwarded.
"""

from fastmcp.server.auth import RemoteAuthProvider
from fastmcp.server.auth.providers.jwt import JWTVerifier
from pydantic import AnyHttpUrl

from ..config import AppConfig


def build_resource_server(cfg: AppConfig) -> RemoteAuthProvider:
    assert cfg.jwks_uri and cfg.issuer and cfg.audience and cfg.authorization_server
    assert cfg.public_url
    verifier = JWTVerifier(
        jwks_uri=cfg.jwks_uri,
        issuer=cfg.issuer,
        # Audience validation is what makes a token "for this server". Never disable it:
        # without it, a token minted for another service would be accepted here.
        audience=cfg.audience,
        required_scopes=cfg.oauth_scopes or None,
    )
    return RemoteAuthProvider(
        token_verifier=verifier,
        authorization_servers=[AnyHttpUrl(cfg.authorization_server)],
        base_url=cfg.public_url,
        scopes_supported=cfg.oauth_scopes or None,
    )
