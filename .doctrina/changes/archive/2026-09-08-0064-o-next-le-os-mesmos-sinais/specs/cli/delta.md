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

## What changes

O `next` passa a recomendar sobre os mesmos sinais que o `doctor` reporta —
cobertura, evidência dangling, proveniência, gate de build não declarado,
spec `active` ainda `planned` — lendo a mesma coleção, não uma segunda. E o
estado vazio deixa de oferecer `change new` e `spec new`, as duas portas de
autoria manual que o `AGENTS.md` manda o agente não usar.

Os sinais de gate medem capabilities, então ficam calados enquanto não existe
nenhuma: um projeto recém-inicializado é mandado para o `intake`, não para
escrever critérios de aceitação de capabilities que ainda não têm nome.

```ops
bump-version minor
append-requirement event: When `doctrina next` runs, the system shall recommend an action for every gate signal the diagnostic reports — uncovered or dangling acceptance criteria, unrealized product intent, an undeclared build gate, and an active spec whose implementation is still planned — computed from the same collection the read-only views render.
append-requirement unwanted: The system shall not recommend a gate action for a project that declares no capability yet, and shall not offer the hand-authoring commands as the way to start work.
append-criterion [verified] On a tree where `doctor` warns, `next` recommends over the same signals; the remedy each new action names clears its own finding; a project with no capability is sent to `intake`; and the snapshot still collects the tree once — verified by `packages/doctrina-cli/test/next-reads-the-gates.test.js`.
```
