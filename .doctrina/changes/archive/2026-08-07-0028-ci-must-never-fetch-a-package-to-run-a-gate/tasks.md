# Tasks — Change 0028-ci-must-never-fetch-a-package-to-run-a-gate

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] npm run typecheck in ci.yml, release.yml and verify.json.
- [x] npm ci in both workflows so the gate has its tool.
- [x] The test resolves tsc locally and skips when absent.
- [x] Rebuild the stale index.json found while fixing this.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-08-07-0028-ci-must-never-fetch-a-package-to-run-a-gate/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
