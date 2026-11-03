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
append-requirement ubiquitous: The system shall print, with `prime --pulse`, one factual line naming the open changes by id — or stating that a request changing behaviour is opened as a change with `doctrina work` — reading only the open changes, and, with `prime --hook <agent>`, the primer and that line in the format the agent's session hook reads, without colour codes and within 9,000 characters.
append-criterion [verified] `prime --pulse` is one line naming `0001-login` once it is open and the work command before, `prime --hook claude` is plain text without colour codes, `prime --hook cursor` is JSON whose `additional_context` stays within 9,000 characters, and an unknown agent exits 2 — verified by `packages/doctrina-cli/test/o-agente-recebe-o-estado-a-cada-prompt.test.js`.
bump-version minor
```
