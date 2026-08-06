# Tasks — Change 0022-typecheck-the-cli-with-checkjs-no-build-step

<!--
Each task is a single checkable item. Keep tasks small (under a few hours
of work). The change is done when every box is checked, including the
three closing steps at the bottom.
-->

- [x] `tsconfig.json`: allowJs + checkJs + noEmit, TypeScript as a devDependency.
- [x] `types/doctrina.d.ts`: the shapes that cross module boundaries.
- [x] Resolve all 23 findings; drop the dead indent argument in `analyze.js`.
- [x] `// @ts-check` on every file under `src/` (shebang stays at byte 0).
- [x] Wire `tsc --noEmit` into `verify.json` and CI, ahead of the tests.
- [x] A test that the pragma cannot silently lapse from a file.

## Closing steps

- [x] Apply the change: merge each delta into the corresponding spec.
- [x] Archive the change folder to `.doctrina/changes/archive/2026-08-06-0022-typecheck-the-cli-with-checkjs-no-build-step/`.
- [x] Update `.doctrina/index.json` with new or modified artifacts.
