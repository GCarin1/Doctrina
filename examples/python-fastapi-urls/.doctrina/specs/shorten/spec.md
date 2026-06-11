# Spec — shorten

**Capability:** shorten
**Status:** active
**Last updated:** 2026-06-01
**Version:** 0.1.0

## Purpose

Accept a long URL and return a short, opaque code that the
service can later resolve back to the original URL.

## Requirements (EARS)

### Ubiquitous

- The system shall expose a POST endpoint at `/shorten` that
  accepts a JSON body with a single field `url`.
- The system shall validate that `url` is a syntactically valid
  HTTP or HTTPS URL.
- The system shall persist the URL and its generated code in
  SQLite.

### Event-driven

- When a valid POST request arrives at `/shorten`, the system
  shall generate a six-character URL-safe code, store the
  mapping, and respond with the code and the relative short URL.

### State-driven

- While the storage backend is unavailable, the system shall
  return HTTP 500 with a body indicating storage failure.

### Unwanted-behavior (must-not)

- The system shall not accept non-HTTP(S) URLs.
- The system shall not return an existing code for a new URL;
  every POST allocates a new code.

### Optional

- Where the URL is already shortened (the stored URL is a
  shortened result), the system may either accept or reject; the
  v0 accepts.

## Acceptance criteria

1. POST /shorten with body `{"url": "https://example.com"}` returns
   HTTP 200 and a JSON body containing `code` and `short_url`.
2. POST /shorten with a malformed URL returns HTTP 422.
3. Two consecutive POSTs with the same URL return distinct codes.
