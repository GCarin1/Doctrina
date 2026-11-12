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
append-requirement optional: Where `.doctrina/config.json` declares `"surface": "core"`, the system shall generate the command block of `AGENTS.md` with the session loop only — `prime`, `work`, `context`, `close`, `next`, `validate`, `doctor`, `handoff` — and a line that defers every other command to `doctrina --help`; a project that declares no surface shall keep the full block, and `doctrina init` shall write `core` unless `--surface full` is given.
append-criterion [verified] The core block names eight real commands with their triggers in at most 14 lines; a new project stores `"surface": "core"`, validates with no omitted-command warning and needs no upgrade; switching the key and running `upgrade --write` regenerates the block either way; a project with no key keeps the full block; an unknown value is reported by `validate` and refused by `init` with exit 2 — verified by `packages/doctrina-cli/test/o-hub-lista-so-o-ciclo-basico.test.js`.
bump-version minor
```
