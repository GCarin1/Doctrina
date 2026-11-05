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
append-requirement event: When `doctrina next` runs at a workspace root, the system shall list the workspace's next actions in the order they unblock work — re-link a missing repository, absorb a pending one, route a delivery, open its change in each routed repository, hand the next card, close a change whose tasks are ticked, clear the delivery's record gap with the command that clears it, close the delivery, or open one — and shall never name `doctrina init` there.
append-requirement event: When `doctrina handoff`, `doctrina status` or `doctrina validate` runs at a workspace root, the system shall describe the workspace — projects with their state, open deliveries with each routed repository's changes, the next actions; the validate checks the registry, every shadow's links and every delivery's status and routed projects, exiting 1 on an error.
append-requirement event: When `doctrina context` runs at a workspace root, the system shall rank the registered projects against the task and print, for each, the command that reads its pack inside the repository.
append-requirement event: When `doctrina prime` runs in a repository that a workspace registers, the system shall name the workspace and every open delivery routed to the repository with this repository's change for it.
append-criterion [verified] At the workspace root `next` walks absorb, open, card, close, story, release tick, observability and delivery close, never naming init, and still names init outside any workspace — verified by `packages/doctrina-cli/test/a-orientacao-funciona-na-raiz-do-workspace.test.js`.
append-criterion [verified] `handoff`, `status` (and `--json`), `validate` and `context --for` answer at the root, validate finding a missing shadow link and a delivery routed to an unregistered project, `prime` in a repository names its workspace and open delivery, and the generated hub names `next` and `handoff` — verified by `packages/doctrina-cli/test/a-orientacao-funciona-na-raiz-do-workspace.test.js`.
set-header Source: `packages/doctrina-cli/src/lib/workspace.js`, `packages/doctrina-cli/src/lib/workspace-tools.js`, `packages/doctrina-cli/src/lib/workspace-agents.js`, `packages/doctrina-cli/src/lib/workspace-view.js`, `packages/doctrina-cli/src/commands/workspace.js`
bump-version minor
```
