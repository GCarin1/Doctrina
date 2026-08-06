# Tasks — Change 0015-packed-install-harness

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `scripts/e2e-packed.mjs`: pack, install outside the repo, drive the full lifecycle.
- [x] Assert validate / templates check / doctor at each step; per-adapter sweep.
- [x] `--repo <path>` so the harness can run against another checkout.
- [x] Prove it: run against the pre-fix commit and reproduce C1, C2, C5, C6, C8.
- [x] CI job on Linux and Windows; `npm run test:e2e`.
- [x] Docs EN+PT in ci.md.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-08-06-0015-packed-install-harness/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
