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
To take one out: `remove-requirement <section> <n>` / `remove-criterion <n>`
(the criteria after it renumber; write removals highest number first).
append-* ops resolve numbering/position at APPLY time, so several open
changes appending to the same spec never collide on numbers — order of
application decides.

For REMOVED: the body may be empty; on apply, the target spec file is
deleted and the capability is recorded in the change archive only.
-->

---

<!-- delta body below -->

```ops
append-requirement ubiquitous: The system shall let a MODIFIED delta take a requirement or an acceptance criterion out — `remove-requirement <section> <n>` and `remove-criterion <n>`, the criteria after a removed one renumbered — and every op that replaces or removes an item shall take it whole, continuation lines included.
append-criterion [verified] `remove-requirement` and `remove-criterion` delete the whole item and renumber the criteria after it, `replace-criterion` replaces a wrapped criterion without leaving its old tail, and a removal naming nothing refuses — verified by `packages/doctrina-cli/test/uma-spec-tambem-encolhe.test.js`.
append-requirement event: When `work --consolidate <capability>` is run, the system shall open a change pinned to that capability with a MODIFIED delta scaffolded and print the spec's measured shape — lines, requirements per EARS subsection, criteria — with a consolidation playbook, leaving what is redundant for the agent to decide (ADR 0005).
append-criterion [verified] `work --consolidate auth` opens `0001-consolidate-auth` affecting `auth`, prints its measured shape and the `change delta` removal commands, and an unknown capability exits 2 — verified by `packages/doctrina-cli/test/uma-spec-tambem-encolhe.test.js`.
bump-version minor
```
