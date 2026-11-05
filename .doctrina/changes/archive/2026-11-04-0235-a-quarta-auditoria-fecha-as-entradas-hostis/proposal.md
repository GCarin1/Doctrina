# Change 0235-a-quarta-auditoria-fecha-as-entradas-hostis — a quarta auditoria fecha as entradas hostis

- **Status:** applied
- **Applied:** 2026-11-04
- **Date:** 2026-11-04
- **Owner:** Doctrina maintainers
- **Lane:** runtime (uncertain; signals: config) — opened anyway (--force)
- **Affects specs:** cli, workspace, delivery, insight, gates, scaffolding, authoring, templates, docs


## Why

A quarta auditoria alimentou o fluxo multi-repo com entrada hostil e estranha. O título de uma história vem do tracker, texto que o playbook da entrega chama de dado e nunca de instrução, e o CLI o colava entre aspas duplas nas linhas de comando que imprime para o agente colar no shell: um título com `$( )` virava um comando executado. Um caminho com espaço quebrava todo `cd`. O guard das ferramentas MCP lia SQL em apenas quatro chaves, tratava `CALL`, `EXEC` e `COPY` como leitura, ignorava um argumento `action` ou `method` e uma `mutation` GraphQL, não via o verbo num nome sem separador e ficava sem efeito quando a chave do servidor declarado não batia com nenhuma configuração MCP. Na raiz do workspace, `doctor` e `metrics` ainda mandavam `doctrina init`, e uma sombra cuja pasta sumiu quebrava o `attach`.

## What

- `lib/shell.js` (`qarg`, `qpath`, `cdThen`) e todo comando impresso com caminho ou título passa por ele: next, delivery status e route, playbook da entrega (`{{DELIVERY_TITLE_ARG}}`), context na raiz, hints de attach; o `forQuery` tira `$` e `\`.
- O guard lê SQL em qualquer chave, lista ou objeto aninhado; `CALL`, `EXEC`, `COPY`, `SELECT … INTO` e outros contam como escrita; argumento `action`/`operation`/`method`, `mutation` GraphQL e verbo dentro de nome sem separador também; mais verbos de escrita.
- `workspace tool` e `validate` na raiz avisam de servidor declarado que nenhuma configuração MCP nomeia, inclusive diferença só de caixa.
- `doctor` e `metrics` respondem na raiz do workspace.
- Sombra com pasta perdida: `next` e `validate` nomeiam `workspace attach`, que a recria; repositório sombra sem links é mandado ao `attach`, nunca ao `init`.
- Testes, cli-reference EN e PT, README de templates, CHANGELOG.

## Scope boundaries

A guarda continua heurística: uma chamada que muda estado sem SQL, sem argumento de ação e sem verbo de escrita no nome (por exemplo, uma função SQL com efeito colateral num SELECT) ainda passa como leitura. A aspa simples no Windows segue a regra do PowerShell; o cmd.exe não é coberto.

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
