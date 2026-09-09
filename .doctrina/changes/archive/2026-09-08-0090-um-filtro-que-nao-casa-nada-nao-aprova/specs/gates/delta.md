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
append-requirement unwanted: If a scope filter names a capability that has no spec, the system shall not report a verdict; it shall report a usage error naming the value and the capabilities that exist, because a gate that measured nothing must not be indistinguishable from a gate that passed.
append-requirement ubiquitous: The system shall distinguish a tree that declares no acceptance criteria from a filtered capability that declares none of its own, so neither absence is reported in the other's words.
append-criterion [verified] A filter naming no capability is refused with the usage class and prints no verdict, a near miss is named, and one bad name in a list is enough to refuse — verified by `packages/doctrina-cli/test/a-filter-that-matches-nothing.test.js`.
append-criterion [verified] A filter naming a real capability still reports, and an empty tree and an empty capability say different things — verified by `packages/doctrina-cli/test/a-filter-that-matches-nothing.test.js`.
bump-version minor
```
