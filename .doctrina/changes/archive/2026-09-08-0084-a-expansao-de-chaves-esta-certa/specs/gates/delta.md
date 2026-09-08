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
append-requirement ubiquitous: The system shall expand a glob's brace groups against their matching close and split alternatives only at the group's own depth, and shall compile the pattern from that expansion rather than from the unexpanded text.
append-requirement unwanted: If a glob carries a brace with no matching close, the system shall not expand it into a partial set of alternatives; the pattern shall match nothing so the malformed declaration is reported rather than silently covering less than it claims.
append-criterion [verified] A one-element group and a nested group each match exactly the files they name, and an unmatched brace matches nothing — verified by `packages/doctrina-cli/test/brace-expansion-is-exact.test.js`.
append-criterion [verified] A nested `**Source:**` declaration claims every file it names and is not reported as a dead pattern, and the `*`, `**` and `?` patterns behave exactly as before — verified by `packages/doctrina-cli/test/brace-expansion-is-exact.test.js`.
bump-version patch
```
