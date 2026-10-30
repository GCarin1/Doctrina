# Spec Delta — capability: scaffolding

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/scaffolding/spec.md`

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
append-requirement event: When `adapter add claude` or `adapter add cursor` runs, the system shall install the agent's own hooks — the primer at session start and, where the agent can take context per prompt, the pulse beside every prompt — merging them into a settings file the project already has: objects recurse, arrays gain only missing entries, a value the user set stays theirs, and `adapter remove` takes back only its own entries, deleting the file only when nothing of the user's is left.
append-criterion [verified] `adapter add claude` merges the SessionStart and UserPromptSubmit hooks into an existing `.claude/settings.json` keeping its permissions and its own hook, adds nothing on a second run, and `adapter remove claude` restores the file exactly; the cursor hook file is created and removed whole — verified by `packages/doctrina-cli/test/o-agente-recebe-o-estado-a-cada-prompt.test.js`.
bump-version minor
```
