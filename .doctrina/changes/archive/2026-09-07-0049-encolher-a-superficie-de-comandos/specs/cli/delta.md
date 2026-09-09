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

Deprecation becomes a declared, uniform thing rather than a decision taken
per command: one record, one warning, one rule about the surface block.

```ops
append-requirement ubiquitous: The system shall declare each deprecated operation in one place with the command that replaces it, the reason, and the version from which it is deprecated, and shall keep the deprecated name working until a later release removes it.
append-requirement event: When a deprecated operation is invoked, the system shall run it and warn once on the error stream, naming the replacement, so that a caller reading standard output receives exactly what it received before.
append-requirement unwanted: The system shall not list a deprecated operation in the generated command-surface block, and shall not report its absence from that block as documentation drift.
append-criterion [verified] A deprecated command runs, warns on stderr only, and is absent from the surface block; every deprecation names a replacement that exists and is not itself deprecated — verified by `packages/doctrina-cli/test/deprecation.test.js`, `packages/doctrina-cli/test/commands.test.js`.
bump-version minor
```
