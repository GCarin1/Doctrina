# Change 0232-o-change-check-ve-o-que-o-clarify-vera — o change check ve o que o clarify vera

- **Status:** applied
- **Applied:** 2026-11-04
- **Date:** 2026-11-04
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** authoring, gates, docs


## Why

Uma palavra vaga escrita num delta só aparecia depois que o close aplicava o delta: na 0229, o `could` de um requisito deixou vermelho o teste de documentos vivos no meio do close, e foi preciso corrigir a spec já aplicada. O `change check` existe para mostrar antes do close tudo o que o close vai recusar, e não olhava o texto que o delta grava.

## What

- O scanner do clarify (léxicos, idioma, varredura linha a linha) sai de `commands/clarify.js` para `lib/clarify-scan.js`; o comando passa a importá-lo.
- `change check` aplica as ops em memória, como já fazia, e avisa de cada palavra vaga que a spec resultante tem e a atual não.
- Teste, cli-reference EN e PT, CHANGELOG.

## Scope boundaries

O aviso é consultivo: o clarify não é gate do close.

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
