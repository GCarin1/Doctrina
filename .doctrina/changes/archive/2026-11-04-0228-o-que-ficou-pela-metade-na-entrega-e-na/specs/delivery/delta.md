# Spec Delta — capability: delivery

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/delivery/spec.md`

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
remove-requirement event 13: moved to the insight spec, which owns prime and the pulse (change 0228)
remove-requirement event 12: moved to the authoring spec, which owns work (change 0228)
append-requirement event: When `doctrina delivery tick <id> <n>...` ticks boxes, the system shall count only the boxes this call turned from open to ticked — a box already ticked or named twice is not counted again — and write nothing when there is none.
append-requirement ubiquitous: The system shall read a delivery's `## Release` boxes through one reader, the document model's checklist, so every box `delivery check` holds open — whatever its bullet marker — is one `delivery tick` lists and ticks, and a box inside a comment is neither.
append-criterion [verified] `delivery tick` keeps a CRLF delivery CRLF and counts only fresh ticks; the header writer adds a line in the file's own ending; `delivery check` names a `+ [ ]` Release box that `tick` lists — verified by `packages/doctrina-cli/test/um-arquivo-crlf-continua-crlf.test.js`.
bump-version minor
```
