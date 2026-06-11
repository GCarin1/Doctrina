# Change 0001 — Add redirect capability

- **Status:** applied
- **Applied:** 2026-06-02
- **Date:** 2026-06-01
- **Owner:** project owner
- **Affects specs:** redirect (new capability — ADDED)
- **Materialised spec:** `.doctrina/specs/redirect/spec.md`

## Why

The v0 of the example shipped a `shorten` capability that stores
a URL and returns a code. A user-facing demo is incomplete
without a way to actually follow the short link back to the
original URL.

## What

Add a `redirect` capability that exposes a GET `/{code}` route,
resolves the code against SQLite, and returns a 302 redirect to
the stored URL. Add an integration with FastAPI's
`RedirectResponse`.

## Scope boundaries

- No 301 (permanent) redirect at v0. 302 preserves the ability
  to evolve the storage shape later.
- No analytics, no click-tracking. Out of scope for the demo.
- No special handling for codes that point to other short URLs.

## Verification

- POST /shorten then GET /{returned code} returns HTTP 302 with
  the original URL in the Location header.
- GET on an unknown code returns HTTP 404.

## Open questions

None.
