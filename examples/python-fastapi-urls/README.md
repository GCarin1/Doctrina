# Example: Python FastAPI URL shortener (greenfield)

A minimal URL-shortener service in FastAPI, demonstrating
greenfield Doctrina adoption with the Claude Code adapter.

## What this example shows

- A clean `.doctrina/` tree built from the framework's `init`
  defaults.
- Two capability specs scaffolded in EARS form
  (`shorten`, `redirect`).
- Two early ADRs typical of a greenfield decision moment
  (adopt FastAPI; use SQLite for v0).
- One archived change folder demonstrating the
  propose → apply → archive workflow that introduced the
  `redirect` capability after the initial `shorten` spec
  landed.
- A Claude Code adapter pointing at `AGENTS.md`.

## What this example deliberately does not show

- Production hardening (no auth, no rate limit, no migrations).
- Test suite, CI workflow, Docker setup.
- Multi-agent adapter coverage — that lives in the brownfield
  example.

The application code is intentionally small. Read the
`.doctrina/` tree first.

## Running the demo

```
cd examples/python-fastapi-urls
pip install fastapi 'uvicorn[standard]'
uvicorn app.main:app --reload
```

Then `POST /shorten` with a JSON body `{"url": "https://example.com"}`
and `GET /<code>` to follow the redirect.

## Running the Doctrina checks

```
cd examples/python-fastapi-urls
doctrina validate
```

Expected output: `ok all validation checks passed`.
