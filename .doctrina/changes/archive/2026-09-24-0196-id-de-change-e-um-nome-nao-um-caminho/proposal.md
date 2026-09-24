# Change 0196-id-de-change-e-um-nome-nao-um-caminho — id de change é um nome, não um caminho

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:** Doctrina maintainers
- **Lane:** product
- **Affects specs:** authoring


## Why

Na auditoria de segurança pós-0.17, `doctrina change archive
../../victim --force` moveu o diretório `victim/` da raiz do projeto (com
um arquivo dentro) para `.doctrina/changes/archive/` e o registrou no
LEDGER e no índice. `change new` valida o id desde a terceira auditoria,
mas todo comando que recebe uma change EXISTENTE só juntava o argumento a
`.doctrina/changes/` e perguntava se algo existia ali. Um agente que erre
o id pode mover dados do usuário. `change archive archive` também
tentaria arquivar a própria pasta de archive.

## What

- `isChangeRef`/`refuseChangeRef` em `lib/project.js`: uma referência é
  um nome de pasta (sem separador, `.`, `..` ou `archive`); ids antigos
  fora do formato `NNNN-slug` seguem aceitos.
- Aplicado em `change apply|archive|check|tick|abandon`, `close`,
  `analyze` e `work --resume`, antes de qualquer acesso ao disco (exit 2).
- Teste `um-id-de-change-e-um-nome.test.js`.

## Scope boundaries

- `change new` mantém a gramática `NNNN-slug`, mais estrita.

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

## Open questions

