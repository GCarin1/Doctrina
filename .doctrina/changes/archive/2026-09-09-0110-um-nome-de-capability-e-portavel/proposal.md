# Change 0110-um-nome-de-capability-e-portavel — um nome de capability e portavel

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product
- **Affects specs:** authoring

## Why

spec new aceita nul, con e outros nomes reservados do Windows, 120 caracteres, hífen final e hífen duplo; o git não enxerga nem remove a pasta

## What

A gramática de nome (`/^[a-z][a-z0-9-]*$/`) vivia em três cópias — `spec
new`, `contract new`, `skill new` — e nenhuma sabia de sistema de arquivos.
Medido no Windows:

```
spec new nul   → created .doctrina/specs/nul/spec.md
git status     → warning: could not open directory '.doctrina/specs/nul/'
git clean      → warning: failed to remove .doctrina/specs/nul/
spec new xxxx…(120) → created; git: Filename too long
spec new trail- / a--b → created
```

`nul`, `con`, `prn`, `aux`, `com1`–`com9`, `lpt1`–`lpt9` são nomes de
dispositivo no Windows: a pasta existe para o Node e não existe para o
git, e só sai com `\\?\`. Esta árvore é Windows/CRLF.

Uma gramática, num só lugar (`lib/names.js`), lida pelos três comandos:
minúsculas, dígitos e hífens; começa por letra; sem hífen final nem duplo;
até 64 caracteres; nunca um nome reservado. A mensagem diz qual regra
falhou.

## Scope boundaries

- Não renomeia nada existente: nenhuma spec, contrato ou skill deste
  repositório viola a gramática.
- Não toca na gramática de id de change (change 0094, `lib/project.js`).

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] `spec new nul`, `con`, `com1`, `trail-`, `a--b` e um nome de 65+ caracteres saem 2 sem criar nada, nos três comandos.
- [x] Todos os nomes existentes neste repositório passam.

## Open questions

- Nenhuma.
