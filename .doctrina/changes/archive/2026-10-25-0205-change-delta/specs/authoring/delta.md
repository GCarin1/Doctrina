# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

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
append-requirement event: When `change delta <id> <capability>` is given a requirement, a criterion, a bump or an op line, the system shall write them into the change's MODIFIED delta for that capability — creating it from the template when absent — parsed by the grammar `apply` reads, with a later bump replacing an earlier one, and shall write nothing unless the whole block applies to the spec.
append-criterion [verified] `change delta` turns --requirement, --criterion, --bump and a raw op line into one block that `change check` applies cleanly, replaces a second bump, writes nothing for a block that would not apply (exit 1), refuses a malformed op, an unknown change or a capability with no spec (exit 2) and an ADDED delta (exit 3), and never writes into an example block inside a comment — verified by `packages/doctrina-cli/test/o-change-delta-escreve-as-ops.test.js`.
bump-version minor
```
