# AGENTS.md — URL shortener demo

Operational source of truth for AI coding agents working in this
example project. Open AGENTS.md standard.

## What this repo is

A minimal URL-shortener built with FastAPI. Example project for
the Doctrina framework. Greenfield. Not production code.

## Stack and tooling

- Runtime: Python 3.11
- Web framework: FastAPI
- Storage: SQLite (single file, no migrations)
- Test runner: pytest (not configured yet)

## Commands

```
# install
pip install fastapi 'uvicorn[standard]'

# run
uvicorn app.main:app --reload

# Doctrina checks
doctrina validate
doctrina analyze <change-id>      # before applying
doctrina clarify .doctrina/specs/<cap>/spec.md
```

## Repository structure

```
AGENTS.md                       this file
CLAUDE.md                       Claude Code adapter
app/
  __init__.py
  main.py                       FastAPI app and routes
  storage.py                    SQLite wrapper
.doctrina/                      framework artifacts
```

## Conventions and boundaries

- Routes live in `app/main.py`; storage in `app/storage.py`.
- Add a capability spec before introducing a new route.
- Do not introduce a second storage backend without an ADR.
- Specs use EARS. ADRs are immutable; supersede to change.

## How to read context efficiently

1. Read this `AGENTS.md`.
2. Read `.doctrina/product.md`.
3. Read the relevant spec under `.doctrina/specs/<cap>/spec.md`.
4. Read open changes under `.doctrina/changes/<id>/` (none today).
5. Read accepted ADRs under `.doctrina/decisions/`.
