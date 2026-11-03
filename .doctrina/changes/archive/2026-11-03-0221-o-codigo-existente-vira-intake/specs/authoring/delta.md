# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

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
append-requirement event: When `doctrina intake --from-code` runs, the system shall store the code inventory of the current directory as `.doctrina/intake.md` with `Status: pending` — stack and frameworks read from manifests, file and test counts, CI and runtime manifests, candidate areas under the conventional source roots, the build and test commands it can see, and the variable NAMES of env example files, never their values — and print the absorb playbook, which asks the agent to describe what the code does today and to leave what the code cannot tell as open questions for the human.
append-requirement unwanted: If `doctrina intake --from-code` meets a converted intake, then the system shall not replace it — it refuses with the precondition class — and over a pending one it shall not replace it unless `--force` is given.
append-criterion [verified] `intake --from-code` stores the inventory — stack, test count, candidate areas, build command, env names without values — prints the absorb playbook naming the workspace when there is one, refuses a converted intake with exit 3 and a pending one without `--force` — verified by `packages/doctrina-cli/test/o-codigo-existente-vira-intake.test.js`.
bump-version minor
```
