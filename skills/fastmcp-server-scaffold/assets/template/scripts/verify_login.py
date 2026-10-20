#!/usr/bin/env python3
"""Verification probe for the deployed OAuth proxy (HTTP proxy mode).

A startup guard only catches *malformed* credentials. A well-formed but wrong client id
fails only after the user signs in, on the upstream's own error page, where the server
never sees it. This probe drives the deployed proxy up to the last hop before the
upstream login page and prints the upstream authorize URL, the one place the effective
client id is observable. Run it after every credential change, before telling anyone to
sign in.

It shares client_id_looks_valid() with the startup guard so the two cannot disagree.

Exit codes: 0 looks right, 1 mismatch or malformed, 2 probe failed.
"""

import argparse
import sys
import urllib.parse

import httpx

from scaffold_server.config import client_id_looks_valid


def upstream_authorize_location(base_url: str) -> str:
    """Register a throwaway client, start an authorization, return the upstream redirect."""
    redirect = "http://127.0.0.1:9/callback"
    with httpx.Client(base_url=base_url, timeout=15.0, follow_redirects=False) as http:
        reg = http.post("/register", json={"redirect_uris": [redirect], "client_name": "verify_login"})
        reg.raise_for_status()
        client_id = reg.json()["client_id"]
        resp = http.get("/authorize", params={
            "response_type": "code", "client_id": client_id, "redirect_uri": redirect,
            "state": "probe", "code_challenge": "x" * 43, "code_challenge_method": "S256",
        })
        # With consent enabled the proxy shows its own consent page first; the upstream
        # URL is then embedded in that page rather than in a Location header.
        return resp.headers.get("location") or resp.text


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("base_url", help="deployed server URL, e.g. https://mcp.example.com")
    parser.add_argument("--expect-client-id", help="the client id you believe is configured")
    args = parser.parse_args(argv)
    try:
        location = upstream_authorize_location(args.base_url)
    except httpx.HTTPError as exc:
        print(f"Probe failed: {exc}", file=sys.stderr)
        return 2
    query = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(location).query))
    effective = query.get("client_id", "")
    print(f"upstream authorize URL: {location[:300]}", file=sys.stderr)
    if not effective or not client_id_looks_valid(effective):
        print("Effective client_id is missing or malformed.", file=sys.stderr)
        return 1
    if args.expect_client_id and effective != args.expect_client_id:
        print(f"Mismatch: proxy sends {effective!r}, expected {args.expect_client_id!r}.", file=sys.stderr)
        return 1
    print("Effective client_id looks right.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
