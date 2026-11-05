# Change 0237-a-sexta-auditoria-confere-o-cursor-e-o-contrato — a sexta auditoria confere o Cursor e o contrato

- **Status:** applied
- **Applied:** 2026-11-05
- **Date:** 2026-11-05
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** insight, workspace, delivery, authoring, docs


## Why

A sexta auditoria conferiu a integração com o Cursor, ferramenta do dia a dia do usuário, contra a documentação atual do Cursor, e pôs um planejador real (`claude -p`) para conduzir a SHOP-77, uma mudança de contrato entre API e front cujo critério 3 contradiz um ADR aceito. A doc mostra que o Cursor também roda os hooks do `.claude/settings.json` (importação de terceiros, ligada por padrão). Uma pasta com os dois adaptadores fazia o primer duas vezes, a segunda em texto onde o Cursor lê JSON; o pulse respondia o `beforeSubmitPrompt` em prosa; e o guard no formato Claude, sem opinião, respondia nada a um hook de permissão, onde a doc diz que uma resposta inválida bloqueia a chamada. O agente real mostrou que o cartão do executor não trazia o ADR global que governa os códigos de erro: o planejador só pegou o conflito porque leu as decisões por conta própria.

## What

- `prime --hook claude` e `prime --pulse` sob o Cursor (`CURSOR_VERSION` e `CURSOR_PROJECT_DIR`) respondem no formato dele: cedem a vez ao `sessionStart` da pasta, ou falam `additional_context`, e `{"continue": true}` no pulse.
- O `workspace guard` no formato Claude, sob o Cursor e sem opinião, responde o allow que o Cursor traduz e lê o servidor do payload do Cursor.
- O cartão leva toda decisão global e as com escopo na capability, com o começo do que cada uma decide, até oito e o resto contado, e manda parar e reportar quando a história contradiz uma delas.
- Teste que fixa os eventos de hook e os campos de regra que o Cursor documenta.
- Testes, cli-reference EN e PT, CHANGELOG.

## Scope boundaries

Sem um Cursor para rodar, a conferência é contra a documentação lida em 2026-11-05. A doc não diz como o Cursor trata a saída em texto de um hook importado do Claude, então a correção responde no formato do Cursor em vez de depender disso. Os comandos `.cursor/commands/*.md` não aparecem mais na doc, que fala em skills: eles continuam gerados; a migração fica como decisão.

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
