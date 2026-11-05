# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

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
append-requirement ubiquitous: The system shall keep every value of a string flag given more than once, in order, for a command that takes it repeatedly, while a single reading of the flag still returns the last value.
append-requirement ubiquitous: The system shall name, in a Usage line that enumerates a command's subcommands, every subcommand that command dispatches, and shall describe each one in the help body.
append-criterion [verified] A repeated `--op` keeps every value in order while a single reading returns the last — verified by `packages/doctrina-cli/test/args.test.js`.
append-criterion [verified] Every command whose Usage line enumerates its subcommands names all it dispatches and describes each — verified by `packages/doctrina-cli/test/o-help-lista-todo-subcomando.test.js`.
append-criterion [verified] Every flag a command declares is described in that command's help — verified by `packages/doctrina-cli/test/o-help-lista-todo-subcomando.test.js`.
bump-version minor
```
