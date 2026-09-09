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
append-* ops resolve numbering/position at APPLY time, so several open
changes appending to the same spec never collide on numbers — order of
application decides.

For REMOVED: the body may be empty; on apply, the target spec file is
deleted and the capability is recorded in the change archive only.
-->

---

<!-- delta body below -->

## What changes

Sem `--title`, o id passa a ser as primeiras palavras de conteúdo do prompt em
vez do prompt inteiro slugificado, e o H1 continua carregando o prompt por
extenso. As duas metades param de ser a mesma frase, e o id volta a ser
digitável.

```ops
bump-version minor
append-requirement event: When a change is opened without an explicit title, the system shall derive the identifier from the prompt's content words rather than from the whole prompt, and shall keep the whole prompt as the proposal's title.
append-criterion [verified] A change opened on the default path has an identifier under fifty characters while its H1 still carries the whole prompt and the parse returns it whole, `--title` decides both halves as before, and the derivation is deterministic — verified by `packages/doctrina-cli/test/change-title.test.js`.
```
