# Tasks — Change 0011-gate-parity

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `lib/gates.js`: GATES + TRANSITIONS + checkTransition + recordForcedGap.
- [x] `analyze`: export collectAnalysis so the gate and the report share findings.
- [x] `change apply` / `archive` / `check` consult the map; one enforcement helper.
- [x] Table-driven parity suite over every transition x gate.
- [x] ADR 0017 accepted.
- [x] Docs EN+PT: apply and archive gate semantics.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-08-06-0011-gate-parity/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
