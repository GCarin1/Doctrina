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

## What changes

O hub que o `init` instala passa a declarar um gatilho que o `init` de fato
deixa em disco — nenhuma capability em `.doctrina/specs/` — em vez de um
`intake.md` que ele nunca cria. E o caminho de leitura ganha a ação
correspondente, simétrica à de intake pendente.

```ops
bump-version minor
append-requirement event: When a project declares no capability spec and has no intake awaiting conversion, the system shall recommend the bootstrap command, naming the code-first alternative for a project adopting an existing codebase.
append-requirement unwanted: The system shall not instruct an agent to check a condition that `init` does not leave on disk.
append-criterion [verified] Immediately after `init`, `next` and `prime` name the bootstrap command, the hub's stated trigger matches what `init` writes, the action closes as soon as a capability exists, and a pending or converted intake never fires it — verified by `packages/doctrina-cli/test/bootstrap-door.test.js`.
```
