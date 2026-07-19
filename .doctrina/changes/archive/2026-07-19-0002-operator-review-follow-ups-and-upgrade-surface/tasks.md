# Tasks — Change 0002-operator-review-follow-ups-and-upgrade-surface

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] spec-ops: add `append-requirement` / `replace-requirement` verbs; ignore ops fences inside HTML comments.
- [x] work: scaffold a prefilled `delta.md` under `--capability`; add `--quiet`; document the verbs + contract nudge in the playbook.
- [x] change: add `check` (pre-close dry-run) and `tick` (bulk checkboxes); accept multiple ids on apply/archive/check.
- [x] close: accept multiple ids; advisory ADR checkpoint (lib/adr-guard.js); advisory skill-suggest at the end.
- [x] clarify: `--lang pt|en` override.
- [x] validate: warn on a missing/malformed delta `**Operation:**` header in open changes.
- [x] surface block: generator in lib/commands.js (markers, groups, hints); init regenerates at scaffold; templates check/update manage it; upgrade inherits.
- [x] templates: AGENTS.md.template (canonical `.doctrina/templates/` + synced `packages/` copy) with markers, prime/handoff bookends; spec-delta template documents the verbs and apply-time numbering.
- [x] tests: spec-ops verbs; catalog↔block parity + template freshness; integration (delta scaffold, quiet, tick, check, batch close + advisories, surface init/update/upgrade, index-sync invariant, clarify --lang, validate delta warning).
- [x] docs: cli-reference EN/PT (change check/tick sections + updated apply/archive/close/clarify/templates/upgrade/work), flow EN/PT, README EN/PT, CHANGELOG 0.13.0, version bump 0.13.0.
- [x] ADR 0015 recorded and accepted; root AGENTS.md self-hosts the generated surface block via `doctrina upgrade --write`.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-07-19-0002-operator-review-follow-ups-and-upgrade-surface/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
