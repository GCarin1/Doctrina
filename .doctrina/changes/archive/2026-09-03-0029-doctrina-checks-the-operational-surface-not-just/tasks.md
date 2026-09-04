# Tasks — 0029-doctrina-checks-the-operational-surface-not-just

## Runtime declaration model

- [x] T1. `lib/runtime.js`: parse the contract's extended Environment columns (Origin, Consumer, Values) plus the Wiring, Selectors and Budgets sections into one declaration object; every finding carries a code, level, file and remedy.
- [x] T2. Wiring check (A): a variable declared with origin `vars`/`secrets` must appear in the `env:` mapping of the workflow/step the Wiring row names, and the reference must name the same variable.
- [x] T3. Empty-as-unset check (B): for a variable CI can inject empty, lint the declared consumer for default-arg getenv patterns (`getenv(X, d)`, `environ.get(X, d)`, `process.env.X || d`) and report the footgun with its remedy.
- [x] T4. Enum check: a `Values` set must agree between contract, `.env.example`, and any literal set found in the declared consumer.
- [x] T5. Selector inventory (D): extract selectors from the declared glob with the declared pattern; a selector used but never extracted is an error ("0 targets would match").
- [x] T6. Budgets (G): parse the Budgets table into input/output ceilings for `analyze` to enforce.

## Commands

- [x] T7. `contract check`: run the runtime checks, grouped per contract, with per-finding remedies; keep the existing port/env/spec checks intact.
- [x] T8. `contract new` template: add Wiring, Selectors and Budgets sections and the Origin/Consumer/Values columns.
- [x] T9. New `doctrina triage` command: with a prompt, classify the lane (product / runtime / chore) and print that lane's playbook; with none, run the runtime recipe set. Exit codes follow the five-class contract.
- [x] T10. `work` consults the classifier: a runtime-shaped prompt is named as such and pointed at `triage` before a change is scaffolded (`--force` proceeds).
- [x] T11. `next` is lane-aware: runtime findings outrank "open a change".
- [x] T12. `doctor`: one `runtime` row driving the same collector, plus `--env` (names and enum membership only, never values).
- [x] T13. `verify`: per-check `expect` (`fail_if_output_matches` / `require_output_matches`) so a check that executed nothing fails the gate (E).
- [x] T14. `validate`: ordered Pipeline requirements — a step requiring an artifact no earlier step produces is an error (7); a skill `when:` with no detectable trigger warns (H).
- [x] T15. `validate --runtime`: delegate to the runtime checks so one gate call covers structure and wiring (3).
- [x] T16. `context`: rank on-demand skills by query relevance and hoist them above generic specs for runtime-shaped queries (4).
- [x] T17. `skill suggest --from-error`: draft a skill from an error text or file with a detectable `when:` (keywords + paths) (5, H).
- [x] T18. `analyze`: refuse a change whose delta raises a declared output ceiling to resolve an overflow (G).
- [x] T19. `coverage`/`close`: orchestration criteria — a criterion marked `[orchestration]` requires evidence from a verify check that declares an `expect` guard (8).
- [x] T20. Spec template: `### Pipeline` section under Requirements.

## Surface, docs and proof

- [x] T21. Catalog: register `triage` in `COMMAND_NAMES`, `OPERATIONS` and `COMMAND_META`; refresh the contract/verify/validate summaries.
- [x] T22. Tests: one suite per runtime check with fixtures that fail before and pass after; command tests for `triage`, `verify` expectations, pipeline validation and skill ranking.
- [x] T23. Docs (en + pt), README, CLI reference and the regenerated AGENTS.md surface block.
- [x] T24. Spec deltas for cli, gates, templates, validation, skills and docs; ADRs for the runtime-declaration boundary and the lane classifier.
- [x] T25. `doctrina verify` green; `doctrina close 0029` clean.
