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
append-requirement ubiquitous: The system shall treat a capability as participating in intent provenance only when its `**Realizes:**` header cites at least one anchor id, so a scaffolded header that names none does not count as opting in.
append-requirement unwanted: If no intent anchor is declared, the system shall not report the trace as satisfied, because a ratio over zero anchors states nothing true about provenance.
append-criterion [verified] A scaffolded spec does not turn zero anchors into a green verdict, and `trace` and `doctor` read the empty tree the same way — verified by `packages/doctrina-cli/test/trace-does-not-approve-nothing.test.js`.
append-criterion [verified] A cited anchor with none declared is a gap that fails `--strict`, a declared and realized anchor is still green, and a project that declared nothing is still not nagged — verified by `packages/doctrina-cli/test/trace-does-not-approve-nothing.test.js`.
bump-version minor
```
