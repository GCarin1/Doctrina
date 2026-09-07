# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

<!--
For ADDED: include the full new spec body below. On apply, the body is
written verbatim to the target path.

For MODIFIED: prefer a fenced `ops` block — on apply the CLI executes it
against the target spec, all ops or none (ADR 0007). The verbs cover
headers, acceptance criteria, AND the EARS requirement bullets, so a
typical delta applies mechanically end to end; only free-prose rewrites
(Purpose, Maturity, ...) stay a by-hand merge. A MODIFIED delta with no
`ops` block prints a manual-merge pointer.

  ```ops
  set-header Implementation: verified — durable adapter (`src/db.ts`)
  bump-version minor
  set-criterion 1: verified
  append-criterion [unverified] new signal — verified by `test/x.test.ts`
  append-requirement event: When <trigger>, the system shall <action>.
  replace-requirement ubiquitous 2: The system shall <action>.
  ```

Requirement sections: ubiquitous | event | state | unwanted | optional.
append-* ops resolve numbering/position at APPLY time, so several open
changes appending to the same spec never collide on numbers — order of
application decides.

For REMOVED: the body may be empty; on apply, the target spec file is
deleted and the capability is recorded in the change archive only.
-->

---

<!-- delta body below -->

The delta stops being the one file the agent writes from nothing. `work`
scaffolds it whenever the CLI can NAME the capability — pinned, or ranked
with a real margin — and marks the ranked case as the guess it is.

```ops
replace-requirement event 40: When `doctrina work` opens a change and can name the affected capability — pinned with `--capability <cap>`, or ranked first by term overlap with a margin over the runner-up that the ranking's length tie-breaker alone cannot produce — the system shall scaffold `specs/<cap>/delta.md` inside the change with the `**Operation:**` header prefilled (MODIFIED when the target spec exists, ADDED when it does not), and under `--quiet` shall print a one-line confirmation instead of the playbook.
append-requirement event: When `doctrina work` scaffolds a delta from the ranking rather than from `--capability`, the system shall mark the file as a guess — naming the score it won on, the capability it beat, and the command that removes it — and shall say so in the playbook's spec-delta step, including on `--resume`, where the mark is read back from the file.
append-requirement unwanted: The system shall not scaffold a delta from a ranked capability whose lead over the runner-up is within the ranking's length tie-breaker, nor from the `--from-diff` or `--chore` paths.
append-criterion [verified] `work` scaffolds the winning capability's delta with `**Operation:** MODIFIED` and a guess mark when the prompt ranking has a real margin, writes nothing when it does not, and never marks a pinned delta a guess — verified by `packages/doctrina-cli/test/scaffolded-delta.test.js`.
bump-version minor
```
