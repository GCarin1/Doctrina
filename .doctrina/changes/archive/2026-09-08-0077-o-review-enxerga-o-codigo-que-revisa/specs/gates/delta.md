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
append-requirement ubiquitous: The system shall determine which capability owns a source file from the `**Source:**` globs the capability spec declares, falling back to path and citation inference only for a project that declares none, and shall never infer ownership over a declaration (ADR 0027).
append-requirement event: When `doctrina review` runs, the system shall name each changed file that belongs to no capability, one by one, rather than reporting the absence only when the whole diff matches nothing.
append-requirement unwanted: If a spec declares a `**Source:**` pattern that matches no file on disk, the system shall report it as a finding, because a claim over code that is not there reads as coverage and provides none.
append-criterion [verified] A declared glob claims its file and outranks every inference, and every tracked source file in this repository has an owning capability — verified by `packages/doctrina-cli/test/code-has-an-owner.test.js`.
append-criterion [verified] The orphan note fires per file even when another changed file matched, and `validate` reports a pattern that matches nothing — verified by `packages/doctrina-cli/test/code-has-an-owner.test.js`.
bump-version minor
```
