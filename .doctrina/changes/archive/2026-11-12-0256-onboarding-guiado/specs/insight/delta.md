# Spec Delta — capability: insight

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/insight/spec.md`

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
append-requirement event: When `doctrina onboard` runs, the system shall print the six steps of the cycle — install, describe the project, pick a first task and open it, write the delta and the tasks, implement and prove, close — mark each one done when the tree shows it, and for the first step not done print what to tell the human, where to ask, and the commands to run, exiting 0 and writing nothing.
append-requirement event: When `doctrina onboard` runs in a directory with no `.doctrina/`, the system shall name `doctrina init` as the first step instead of failing.
append-requirement event: When the current onboarding step is the first task, the system shall list up to six candidates read from the repository: acceptance criteria that cite no proof or a missing one, then a to-do marker left in a tracked code file.
append-requirement event: When all six onboarding steps are done, the system shall print the tour for a newcomer: the commands to read the project with and the path of the last archived change.
append-requirement unwanted: The system shall not store onboarding progress; each run reads it from the tree.
append-criterion [verified] Before `init`, `onboard` exits 0 naming the install and writes nothing; after it, the description step names `intake --text` in an empty repository and `intake --from-code` where code exists — verified by `packages/doctrina-cli/test/o-onboarding-conduz-o-ciclo-uma-vez.test.js`.
append-criterion [verified] The first-task step lists an unproven criterion and a to-do marker from a code file, never prose or a proven criterion, in text and in `--json`; each later step is ticked as the change is opened, planned, ticked and closed, and the closed project prints the newcomer's tour with the archive path — verified by `packages/doctrina-cli/test/o-onboarding-conduz-o-ciclo-uma-vez.test.js`.
set-header Source: `packages/doctrina-cli/src/commands/{context,search,show,status,prime,handoff,report,why,onboard}.js`, `packages/doctrina-cli/src/lib/{snapshot,views,constitution-model,ledger,git,diff,context-slice,onboard}.js`
bump-version minor
```
