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

Onboarding is one moment, so it can be one command. Both commands stay:
`intake` remains the door for a project that already exists.

```ops
append-requirement event: When `doctrina init --intake-text "<text>"` runs, the system shall store the text verbatim as the project's intake, recording that its source was inline, and shall otherwise behave exactly as `--intake <file>` does.
append-requirement event: When `doctrina init` receives both `--intake` and `--intake-text`, the system shall report a usage error naming the two as alternatives, and scaffold nothing.
append-requirement unwanted: The system shall not treat a value-taking intake flag written without a value as an absent one; it shall report a usage error and scaffold nothing, so a project is never created without the intake its operator asked for.
append-criterion [verified] Scaffolding with an intake lands in the same tree and the same intake file as scaffolding then supplying one, differing only in the description `init` can derive when it holds the intake at scaffold time; the inline and file forms differ only in the recorded source — verified by `packages/doctrina-cli/test/init-intake.test.js`.
bump-version minor
```
