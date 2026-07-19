# Change 0002-operator-review-follow-ups-and-upgrade-surface — operator review follow-ups and upgrade surface refresh

- **Status:** applied
- **Applied:** 2026-07-19
- **Date:** 2026-07-19
- **Owner:** agent session 2026-07-19
- **Affects specs:** cli

## Why

Operator-review follow-ups: EARS ops verbs, work delta scaffold + --quiet, change check/tick/batch, ADR checkpoint and skill-suggest in close, clarify --lang, CLI-owned AGENTS.md surface block refreshed by upgrade

An external operator review (AVALIACAO-DOCTRINA.md, 2026-07-19, ~35
changes of end-to-end use) named two structural failures: the MODIFIED
delta merge stayed manual for the dominant case (EARS bullets), and the
AGENTS.md hub never surfaced ~15 commands, so agents never discovered
them. The user additionally reported that `doctrina upgrade` only bumps
the index stamp and never rebuilds AGENTS.md.

## What

- `spec-ops`: `append-requirement` / `replace-requirement` verbs; ops
  fences inside HTML comments are ignored.
- `work`: `--capability` scaffolds a prefilled delta; `--quiet` backlog
  registration; playbook documents the new verbs and a contract nudge.
- `change`: new `check` (pre-close dry-run) and `tick` (bulk checkbox)
  subcommands; `apply`/`archive`/`check` accept multiple ids.
- `close`: multiple ids; advisory ADR checkpoint after analyze; advisory
  `skill suggest` after validate.
- `clarify`: `--lang pt|en` lexicon override.
- `validate`: early warning for a malformed delta `**Operation:**` header.
- AGENTS.md surface: CLI-owned marker-delimited block generated from the
  command catalog; `init` writes it fresh, `templates check/update`
  report/regenerate it, `upgrade --write` inherits the refresh (ADR 0015).
- Docs: cli-reference EN/PT, flow EN/PT, READMEs, CHANGELOG 0.13.0;
  version bump to 0.13.0; templates synced to `packages/` copy.

## Scope boundaries

- No new top-level command; `check`/`tick` are `change` subcommands.
- Ops verbs still never rewrite free prose (Purpose, Maturity) — the
  semantic-fidelity ceiling of ADR 0005/0007 stands.
- The additive-only guarantee of `templates update` stands everywhere
  outside the doctrina:surface markers (the one sanctioned exception,
  ADR 0015).
- The evaluation items already shipped in 0.12.0 (clarify PT lexicon,
  skill-sync indexing, archive status stamp, change diff/abandon,
  intent add, prime/handoff/doctor/show/report) are confirmed present,
  not reimplemented.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

None.
