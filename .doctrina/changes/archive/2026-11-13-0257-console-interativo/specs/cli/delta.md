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
replace-requirement ubiquitous 3: The system shall print a usage summary when invoked with `--help`, `-h`, or with no arguments outside a terminal — in a terminal `doctrina` alone opens the console — opening with where to start (`doctrina init`, then `doctrina next`) and grouping one line per command — its subcommands joined — under the moment it is reached for, in the order of the AGENTS.md block, with deprecated names last, each pointing at its replacement.
replace-requirement state 2: While the current working directory does not contain `.doctrina/`, every command shall exit with the precondition class and the same message, except those that answer from the CLI itself rather than from a tree — `init`, which creates one, `onboard`, whose first step is that install, `ui`, whose panel says there is no project and names the install, `next`, which names the door, `completion` and `ci --emit`, which render from their own declarations, and `templates list`, which shows what would be resolved — along with `--help` and `--version`, which are not commands.
bump-version minor
```
