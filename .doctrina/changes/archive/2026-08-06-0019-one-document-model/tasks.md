# Tasks — Change 0019-one-document-model

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `lib/doc-model.js`: header grammar, kinds/styles, sections, conformance, repair.
- [x] Migrate the six section helpers and decision.js's Status literals.
- [x] `validate`: report non-canonical headers; `--fix` repairs them.
- [x] Round-trip property test over the repo and the shipped examples.
- [x] ADR 0021 accepted.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-08-06-0019-one-document-model/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
