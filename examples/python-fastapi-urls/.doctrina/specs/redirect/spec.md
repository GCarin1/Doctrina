# Spec — redirect

**Capability:** redirect
**Status:** active
**Last updated:** 2026-06-02
**Version:** 0.1.0
**Origin:** merged from archived change 2026-06-02-0001-add-redirect

## Purpose

Resolve a short code back to its original URL and issue an HTTP
302 redirect.

## Requirements (EARS)

### Ubiquitous

- The system shall expose a GET endpoint at `/{code}` that
  accepts a six-character path segment.

### Event-driven

- When a GET request arrives at `/{code}` and the code resolves
  to a stored URL, the system shall respond with HTTP 302 and a
  Location header containing the stored URL.
- When the code does not resolve to any stored URL, the system
  shall respond with HTTP 404 and a JSON body indicating the
  code is unknown.

### State-driven

- While the storage backend is unavailable, the system shall
  respond with HTTP 500.

### Unwanted-behavior (must-not)

- The system shall not 301 (permanent) redirect at v0; 302
  preserves the ability to change the stored URL later.
- The system shall not log the resolved URL at INFO; doing so
  leaks PII for any URL containing tokens.

## Acceptance criteria

1. GET on a known code returns HTTP 302 with the correct
   `Location` header.
2. GET on an unknown code returns HTTP 404 with a JSON body.
3. GET on a code with invalid characters returns HTTP 404 (path
   match fails).
