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
append-* ops resolve numbering/position at APPLY time, so several open
changes appending to the same spec never collide on numbers — order of
application decides.

For REMOVED: the body may be empty; on apply, the target spec file is
deleted and the capability is recorded in the change archive only.
-->

---

<!-- delta body below -->

Configuration gets a declared home and a readout. The old homes stay
readable — removal is announced, not performed here — and every value now
carries where it came from, because "what is this project configured to do?"
had no answer short of reading the CLI's source.

```ops
append-requirement ubiquitous: The system shall read every project configuration option — the language, the context budget, and the project rules — through one reader, resolving each option from `.doctrina/config.json` first, then from the legacy location for that option, then from the built-in default, and shall report which of the three each effective value came from.
append-requirement event: When `doctrina init` scaffolds a project, the system shall create `.doctrina/config.json` documenting every option and its default while declaring none of them, so that the first key a project adds is the first choice it has made.
append-requirement event: When `doctrina doctor` runs, the system shall print one row per configuration option with its effective value and its source, and shall never fail on account of an option sitting at its default.
append-requirement unwanted: The system shall not fail to assemble a context pack, run a command, or scaffold a project because a configuration file is malformed; it shall fall back to the default for the affected option, keep working, and report the malformation through the structural gate.
append-criterion [verified] A project configured the legacy way and one configured in `config.json` resolve to the same effective values, the declared home wins per option, and the source of each value is reported — verified by `packages/doctrina-cli/test/config-surface.test.js`.
append-criterion [verified] `init` scaffolds a config that declares nothing, `doctor` prints every option with its value and origin, and a malformed file is reported by `validate` without stopping `context` — verified by `packages/doctrina-cli/test/config-surface.test.js`.
bump-version minor
```
