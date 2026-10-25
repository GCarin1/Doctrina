# Change 0203-verify-verde-nao-roda-duas-vezes — verify verde nao roda duas vezes

- **Status:** applied
- **Applied:** 2026-10-25
- **Date:** 2026-10-25
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** gates, insight


## Why

Uma review de campo da 0.17: "custo fixo alto para mudanças pequenas… o
fechamento roda a suíte inteira (de 2,5 a 4 minutos)". Neste repositório
um close leva ~2m50s, quase tudo o verify. E é comum o agente rodar
`doctrina verify` à mão logo antes do `doctrina close`: a mesma suíte, duas
vezes, sobre o mesmo código. Num close em lote ela rodava uma vez por id,
embora entre os ids só o `.doctrina/` mude.

## What

- `worktreeFingerprint` (lib/git.js): impressão do conteúdo da working tree
  (rastreados, não rastreados, edições, `.gitignore` respeitado) via índice
  de rascunho + `git write-tree`, sem tocar o índice real.
- lib/verify-cache.js: a impressão do código (menos `.doctrina/`, mais o
  verify.json e a versão do CLI) e o registro da última execução toda verde,
  guardado no diretório do git.
- `verify --reuse` pula as checagens quando a impressão bate; o `close` roda
  o verify assim. `verify` simples sempre roda.
- Teste `o-verify-verde-nao-roda-duas-vezes.test.js`; docs EN/PT; CHANGELOG.

## Scope boundaries

- Não há verify incremental por projeto afetado aqui — isso é a change
  seguinte (`--affected`).
- Fora de um repositório git nada é lembrado e tudo roda, como antes.

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

Nenhuma.
