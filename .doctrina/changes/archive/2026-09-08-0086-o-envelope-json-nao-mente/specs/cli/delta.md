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

```ops
append-requirement ubiquitous: The system shall emit a JSON envelope whose `ok` and `exit_code` are derived from the code the command actually returns, so a consumer branching on the payload reaches the same verdict as one branching on the process.
append-requirement unwanted: The system shall not write a JSON envelope before the command's exit code is known, because a call site that emits ahead of its own return can only guess the verdict.
append-criterion [verified] A failing gate reports `ok: false` and the process's own code in its payload, and a passing one still reports success — verified by `packages/doctrina-cli/test/the-envelope-tells-the-truth.test.js`.
append-criterion [verified] The captured path is unchanged and every payload keeps its own data fields and schema version — verified by `packages/doctrina-cli/test/the-envelope-tells-the-truth.test.js`.
bump-version minor
```
