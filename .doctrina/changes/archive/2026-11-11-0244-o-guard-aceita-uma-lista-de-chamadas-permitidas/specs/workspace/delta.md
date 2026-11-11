# Spec Delta — capability: workspace

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/workspace/spec.md`

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
append-requirement optional: Where a tool of the workspace declares the list of calls it may make (`doctrina workspace tool <name> --only "<names>"`, `*` for any run of characters, `none` to clear it), the guard shall deny every call through that tool's server that no list on that server names, naming the lists and the command that adds the call, and shall judge a named call by access as before.
append-criterion [verified] With `--only "getJiraIssue,search*"` a call the guard knows no verb for is denied and a named one allowed, in the Cursor and the Claude Code format; a named write through a read-only tool is still denied; the lists of two tools on one server add up; `--only none` restores the judgment by name; a pattern with a space exits 2; and the list is printed by `workspace list` and written into the planner hub — verified by `packages/doctrina-cli/test/o-guard-aceita-uma-lista-de-chamadas.test.js`.
bump-version minor
```
