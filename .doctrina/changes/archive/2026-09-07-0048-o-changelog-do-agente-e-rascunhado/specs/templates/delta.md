# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

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

The block that tells an arriving agent what to do differently stops being
something a releaser has to remember. It is drafted from what the archived
changes said they touched — and still written by a person, because "what an
agent must now do" is a judgement, not an extraction.

```ops
append-requirement event: When the agent-facing changelog is drafted, the system shall propose one candidate bullet per archived change in the window that touched a documented surface, newest first, capped at the block's bullet limit, and shall name the window it used and every candidate that did not fit.
append-requirement event: When an archived change in the window touched no documented surface, the system shall propose no bullet for it and shall say that it proposed none, rather than emitting an empty block.
append-requirement unwanted: The system shall not write the agent-facing changelog from the draft, and shall not raise the block's bullet cap to fit more candidates; the draft proposes and a person decides.
append-criterion [verified] A change touching a command, flag or exit code proposes exactly one bullet and one touching none proposes nothing; the draft is newest-first, capped at the block's limit, and states its window and what it truncated — verified by `packages/doctrina-cli/test/agent-changelog.test.js`.
bump-version minor
```
