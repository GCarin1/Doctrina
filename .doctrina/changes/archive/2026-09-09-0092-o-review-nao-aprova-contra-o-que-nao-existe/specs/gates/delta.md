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
append-requirement unwanted: If a review is asked to diff against a ref the repository cannot resolve, the system shall not report an empty diff; it shall report a usage error naming the ref, because a filter that matches nothing is not a tree with no changes.
append-criterion [verified] A ref the repository cannot resolve is refused with the usage class while a valid ref reports exactly what it reported, and a valid ref with no difference is still an empty diff — verified by `packages/doctrina-cli/test/a-ref-that-resolves-to-nothing.test.js`.
append-criterion [verified] Outside a git repository the command stays silent, and the ref probe tells a missing ref apart from a repository with no commits, which git words identically — verified by `packages/doctrina-cli/test/a-ref-that-resolves-to-nothing.test.js`.
bump-version minor
```
