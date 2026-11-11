# Change 0249-o-validate-nao-varre-o-repositorio-inteiro-por — o validate nao varre o repositorio inteiro por padrao

- **Status:** applied
- **Applied:** 2026-11-11
- **Date:** 2026-11-11
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** structure

- **Documented surface:** n/a — desempenho e uma correção de casamento de padrão; nenhum comando, flag ou saída muda


## Why

Perfilado neste repositório: o `validate` gastava 411 de 654 ms resolvendo os padrões `**Source:**` das specs. Sete deles nomeiam um arquivo da raiz (`tsconfig.json`, `CHANGELOG.md`) e cada um percorria a árvore inteira para achá-lo, `node_modules` e `.git` incluídos, com duas chamadas de `stat` por entrada. O `prime`, que roda no início de toda sessão de agente, lia e varria o mesmo arquivo de teste uma vez por critério que o cita. E um padrão com segmento literal depois de um curinga (`pkg/*/src/main.js`) não casava nada quando existia um diretório `pkg/src`, porque a busca partia dele.

## What

- `filesMatching`: o prefixo termina no primeiro segmento que é padrão, e a varredura não desce além do que o padrão nomeia (sem `**` e sem `/` final).
- `walk`: usa o tipo que a listagem do diretório já informa (um `stat` só para link simbólico) e aceita um limite de profundidade.
- `coverage`: cada arquivo de evidência é lido uma vez por passada.
- Teste dos casamentos e do limite; CHANGELOG.

## Scope boundaries

Nenhuma saída muda. Não há cache entre comandos nem entre passos do `close`.

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

<!-- doctrina:applied-deltas specs/structure/delta.md=9bf5c7db,8e4153bd,e7c38c12 -->
