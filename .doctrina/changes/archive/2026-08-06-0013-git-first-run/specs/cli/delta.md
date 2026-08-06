# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

Audit item C8. `doctrina metrics` on a brand-new project answered with raw
git plumbing — "fatal: your current branch 'master' does not have any
commits yet". A repository with no commits is a valid state, and the most
common one in which someone explores the CLI.

```ops
bump-version patch
set-header Last updated: 2026-08-06
append-requirement ubiquitous: The system shall interpret git availability in one module, distinguishing a repository with no commits, a directory that is not a repository, and git being absent from the machine.
append-requirement event: When a history-reading command runs where there is no history, the system shall report that there is nothing to measure and exit successfully, rather than surfacing a git plumbing error.
append-requirement unwanted: The system shall not report a git invocation that exited non-zero as a successful empty result.
append-criterion [verified] Every history-reading command runs cleanly on a repository with no commits and on a directory that is not a repository, leaking no git plumbing — verified by `packages/doctrina-cli/test/integration.test.js`.
```
