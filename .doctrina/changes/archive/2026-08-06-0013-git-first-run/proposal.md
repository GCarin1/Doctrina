# Change 0013-git-first-run — Git-dependent commands survive a repo with no commits

- **Status:** applied
- **Applied:** 2026-08-06
- **Date:** 2026-08-06
- **Owner:** audit remediation v2
- **Affects specs:** cli

## Why

Audit item C8. `git init && doctrina init && doctrina metrics` — the first
three commands anyone runs — answered:

    error: git log failed: fatal: your current branch 'master' does not
    have any commits yet

Nine call sites each ran `spawnSync("git", ...)` and decided for
themselves what a non-zero status meant. A repository with no commits is a
valid state, not a failure.

## What

- `lib/git.js`: one place that asks git a question and classifies not
  getting an answer — OK, EMPTY (no commits), NOT_A_REPO, ABSENT, FAILED.
- `metrics` reports "nothing to measure yet" and exits 0 for both first-run
  states; git missing from the machine is exit 4 (ENVIRONMENT).
- `context --diff` names the condition instead of leaking
  "fatal: bad revision 'HEAD'". It still fails, because it genuinely
  cannot compute the diff — it just explains why.
- Audited the other six call sites (`report`, `review`, `skill suggest`,
  `work --from-diff`, `docs-impact`): all already degraded correctly. The
  test now holds them to it.

**A bug found while building the helper.** The first version returned
state OK for any unclassified non-zero status, so `hasCommits()` read a
refusal as success and the empty-repo probe fooled itself. Unclassified
non-zero is now FAILED, never a successful empty result.

**Widened past the reported case.** `metrics` outside a git repository
also exited 1 while `report`, `review`, and `skill suggest` all exited 0
saying "nothing to measure". metrics was the outlier in both states, so
it now matches the family.

## Scope boundaries

- The six already-correct call sites keep their inline git calls; they are
  covered by the new test rather than rewritten, to avoid regression risk
  for no behavioural gain.
- `context --diff` still exits non-zero: unlike metrics, it cannot answer
  the question at all without history.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

None.
