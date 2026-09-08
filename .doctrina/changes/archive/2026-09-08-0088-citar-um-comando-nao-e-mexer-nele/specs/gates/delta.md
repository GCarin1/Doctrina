# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

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

```ops
append-requirement unwanted: If a change declares the chore lane, the system shall not require documentation of a surface it named, because the lane is the author's recorded statement that no behaviour changes.
append-requirement ubiquitous: The system shall exclude a proposal's verification section when reading it for documented-surface signals, since that section names the commands the author will RUN to prove the change rather than the ones it alters.
append-criterion [verified] A chore that cites commands produces no surface signal and closes without `--force`, and the verification section leaks none — verified by `packages/doctrina-cli/test/citing-a-command-is-not-changing-it.test.js`.
append-criterion [verified] A product change naming a command in its What still signals, and the archived product changes keep their signals — verified by `packages/doctrina-cli/test/citing-a-command-is-not-changing-it.test.js`.
bump-version minor
```
