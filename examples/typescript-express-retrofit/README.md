# Example: TypeScript Express brownfield retrofit

A minimal Express service that demonstrates **brownfield**
Doctrina adoption with all three first-class adapters installed
at once (Claude Code, OpenAI Codex CLI, Cursor).

## Framing

Pretend the `src/server.ts` file already exists in production
and that Doctrina is being introduced as a retrofit. The exercise
is what the
[brownfield doc](../../docs/en/brownfield.md) describes: spec the
capability you are touching, write retroactive ADRs for past
decisions you can recover, leave the rest alone.

## What this example shows

- A `.doctrina/` tree built **just-in-time** for the one
  capability the team needed to change (`api-quota`).
- Two **retroactive** ADRs documenting decisions the original
  authors made and the retrofit team rediscovered while reading
  code.
- An archived change folder using the **bug-spec pattern**
  (current / expected / unchanged behaviour) — typical of
  brownfield's first month, where issues are discovered by
  reading existing code.
- All three Doctrina adapters installed at once. They do not
  conflict: each agent reads its own pointer file and they all
  point at the same root `AGENTS.md`.

## What this example deliberately does not show

- A day-one spec sprint. The brownfield doc explicitly warns
  against this. Only one capability is spec'd: the one that had
  a change.
- Tests, CI, Docker, production hardening.

## Running the demo

```
cd examples/typescript-express-retrofit
npm install
npm start
```

Then `POST /quota/<api-key>` to claim a request slot.

## Running the Doctrina checks

```
cd examples/typescript-express-retrofit
doctrina validate
```

Expected output: `ok all validation checks passed`.
