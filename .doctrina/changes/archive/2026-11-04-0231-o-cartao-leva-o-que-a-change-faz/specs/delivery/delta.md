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
append-criterion [verified] The card carries the requirement and the criterion the delta adds verbatim, the delivery's story, the decisions scoped to or citing the capability and not one scoped elsewhere, and a spec whole when nothing matched; a change with none of them gets the card it had — verified by `packages/doctrina-cli/test/o-cartao-leva-o-que-a-change-faz.test.js`.
replace-requirement event 7: When `doctrina change card <id> [<n>]` runs, the system shall print task `<n>` — or the first open task — with the lines indented under it, the change's Why, the story of the delivery the change belongs to, what the change does to each spec (every requirement and criterion its delta adds, replaces or removes, verbatim), the delta capabilities' specs as they stand cut to the task — whole when nothing in one matches — the accepted decisions that bind those capabilities, the card's `Verify:` command or `doctrina verify`, the tick command, and the instruction to leave opening, closing and `.doctrina/` to the planner.
bump-version minor
```
