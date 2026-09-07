# Spec Delta — capability: validation

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/validation/spec.md`

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

The H1 of a change proposal is on-disk grammar, and it had four parsers. Two
of them read it wrong, in two different ways, which is what four copies of
one fact buys.

```ops
append-requirement ubiquitous: The system shall read a change proposal's title through the document model, treating the separator between the change id and the title as a dash surrounded by whitespace — never a bare hyphen, which an id contains — and returning the whole heading when it carries no `Change <id>` prefix.
append-criterion [verified] A multi-word change id no longer leaks into the title, an id with no hyphen and a heading with no prefix are unchanged, a heading with no separator is returned whole, and no module outside the document model carries the parse — verified by `packages/doctrina-cli/test/change-title.test.js`.
bump-version minor
```
