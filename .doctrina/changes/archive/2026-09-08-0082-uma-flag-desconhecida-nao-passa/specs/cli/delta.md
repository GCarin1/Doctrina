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
append-* ops resolve numbering/position at APPLY time, so several open
changes appending to the same spec never collide on numbers — order of
application decides.

For REMOVED: the body may be empty; on apply, the target spec file is
deleted and the capability is recorded in the change archive only.
-->

---

<!-- delta body below -->

```ops
append-requirement unwanted: The system shall not silently ignore a flag a command has not declared; it shall refuse the invocation, name the flag, and exit with the usage class, so a gate can never report a verdict for a mode it was not asked to run in.
append-requirement event: When a refused flag is a near miss for one the command declares, the system shall name the declared flag as a suggestion, and shall still print the command's help when the help flag is present alongside it.
append-criterion [verified] On a tree where `coverage --strict` exits 1, `coverage --stricts` exits with the usage class and prints no verdict, naming the flag and suggesting the declared one — verified by `packages/doctrina-cli/test/an-unknown-flag-is-refused.test.js`.
append-criterion [verified] Every flag every command declares is still accepted, an undeclared one is refused on every command, and a flag's VALUE is never mistaken for a flag — verified by `packages/doctrina-cli/test/an-unknown-flag-is-refused.test.js`.
bump-version minor
```
