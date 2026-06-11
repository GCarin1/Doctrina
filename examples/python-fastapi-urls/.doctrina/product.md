# URL shortener demo — Product

## Vision

A minimal URL-shortener service that demonstrates Doctrina
greenfield adoption end-to-end. Not a production tool.

## Problem

The Doctrina docs argue that `.doctrina/` artifacts pay for
themselves in real projects. New adopters need to see them in
context to evaluate the framework.

## Target users

- Developers evaluating Doctrina for a new Python backend.
- Readers of the Doctrina docs who want to see specs, ADRs, and
  an archived change in a real (small) project.

## Scope

In scope:

- A POST /shorten endpoint that stores a URL and returns a code.
- A GET /{code} endpoint that 302-redirects to the stored URL.
- SQLite storage for the v0.

Out of scope:

- Authentication, rate limiting, abuse prevention.
- Custom code aliases.
- Analytics, click-tracking.
- Production deployment artifacts (Docker, CI, infra).

## Non-goals

This example is not a starting template for a production URL
shortener. It is a Doctrina demo that happens to be a URL
shortener.

## Success criteria

The example succeeds when a reader can navigate AGENTS.md, the
two specs, the two ADRs, and the archived change folder and
understand how Doctrina coordinates the four.
