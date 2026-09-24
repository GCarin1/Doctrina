# Change 0194-intake-converte-so-com-validate-limpo — intake converte só com validate limpo

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:** Doctrina maintainers
- **Lane:** product
- **Affects specs:** authoring


## Why

Na auditoria que percorreu o bootstrap como um usuário novo, uma spec
editada à mão deixou o índice defasado (erro no `validate`), e o
`intake --converted` converteu mesmo assim. O playbook de bootstrap manda
corrigir tudo o que os gates reportam no passo 6 antes de converter no
passo 7, mas nada verificava. Converter torna as specs a fonte da verdade;
com um erro dizendo que elas ainda não estão bem-formadas, a afirmação é
falsa.

## What

- `intake --converted` roda o `validate` em processo e recusa (exit 1)
  enquanto houver erro, listando-os e nomeando `validate --fix`;
  `--force` converte mesmo assim.
- Passo 7 do playbook de bootstrap (golden regravado), ajuda do `intake`
  e cli-reference EN/PT; a tabela PT ganhou a linha `--converted` que
  faltava.
- Teste em `o-status-do-intake-tem-dono.test.js`.

## Scope boundaries

- Avisos do `validate` não bloqueiam a conversão.

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

