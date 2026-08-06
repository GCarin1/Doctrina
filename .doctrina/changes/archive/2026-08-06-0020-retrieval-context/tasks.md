# Tasks — Change 0020-retrieval-context

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `decisions[].scope` + `decisions[].summary`, derived in ONE place.
- [x] Budget resolution (flag > config > default) that survives `index rebuild`.
- [x] The degradation ladder: degrade everything before dropping anything.
- [x] `--for "<task>"`: coverage-and-density ranking, not document length.
- [x] `doctrina decision scope` — propose from the ledger, write under --write.
- [x] Backfill the 21 existing ADRs; keep four deliberately global.
- [x] Tests: scope, budget, determinism, retrieval, pre-change tree.
- [x] ADR 0022 accepted.
- [x] Docs EN + PT, and the default pack budget wired into CI.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-08-06-0020-retrieval-context/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
