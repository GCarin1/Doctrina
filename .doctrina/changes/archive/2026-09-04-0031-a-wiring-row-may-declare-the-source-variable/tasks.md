# Tasks — 0031-a-wiring-row-may-declare-the-source-variable

- [x] T1. Parse `Origin` as `<origin>[:<source>]` in the wiring declaration, keeping a bare origin identical to today.
- [x] T2. RT02: compare the workflow's referenced name against the declared source when one is given, and stay silent when they agree. An origin mismatch stays an error regardless.
- [x] T3. RT01: quote the declared source in the remedy, so the suggested `env:` line is the correct one to paste.
- [x] T4. Tee the output of an `expect` check: stream to the terminal as it arrives, accumulate for the match, preserve the exit code. Checks without an expectation keep `stdio: "inherit"`.
- [x] T5. Tests: a declared source silences RT02 and a wrong one still warns; RT01's remedy quotes the source; the tee preserves both output and verdict.
- [x] T6. Contract template comment, CLI reference (EN + PT), and `verify --help` updated — the help currently states that an expect check does not stream.
- [x] T7. This repository's own `system` contract declares `secrets:NPM_TOKEN`; `contract check` and `doctor` clean.
- [x] T8. Spec delta on `gates`; `doctrina verify` green; release 0.15.1 stamped per the cut-a-release skill.
