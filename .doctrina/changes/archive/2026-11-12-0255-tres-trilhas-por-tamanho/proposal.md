# Change 0255-tres-trilhas-por-tamanho — tres trilhas por tamanho

- **Status:** applied
- **Applied:** 2026-11-12
- **Date:** 2026-11-12
- **Owner:** Doctrina maintainers
- **Lane:** chore (uncertain; signals: typo, formatacao, comentario)
- **Affects specs:** triage, authoring


## Why

"Corrigir o typo do README" abria uma proposta, três tarefas e um close de treze passos. A regra de que isso não precisava existir estava numa nota de rodapé do `metrics` ("a one-line fix may rightly need none") e em nenhuma instrução que o agente lê. O BMAD nomeia três trilhas pelo tamanho do trabalho; aqui a medida é outra — se uma frase de uma spec fica falsa ou falta — e ela precisa estar dita onde a decisão é tomada: no `work`, no `triage` e nas regras permanentes. A spec `authoring` estava em 399 das 400 linhas, então a leitura do pedido ganha a capability própria que o Purpose dela já nomeava.

## What

- `lib/triage-model.js`: as três trilhas (`direct`, `chore`, `change`), os sinais de edição direta em inglês e português, `directSignals`, `trackOf`, `trackLines`.
- `doctrina work`: um prompt cujas palavras só podem significar edição direta, sem sinal de produto nem de runtime, não abre nada — imprime as três trilhas e sai 0. `--force`, `--chore`, `--from-diff`, `--capability`, `--delivery` e `--id` abrem como antes.
- `doctrina triage`: imprime a trilha `DIRECT` no lugar da raia; `--json` traz `track`.
- Regras permanentes: `AGENTS.md` e seu template, a regra do Cursor e seu template, o pulso do hook de prompt e o `work --help`.
- Spec `triage` (nova): recebe da `authoring` os requisitos e critérios de raia e ganha os de trilha; a `authoring` perde `triage.js` e `triage-model.js` do Source.
- Docs EN/PT (referência, adapters), READMEs (14 specs), CHANGELOG.

## Scope boundaries

A lista de palavras só decide o que não pode significar comportamento; uma correção que restaura o que a spec já diz é direta por julgamento do agente, não da CLI. O `metrics` continua contando commits de código sem change sem distinguir os diretos. Não há chave de configuração para desligar a trilha direta: `--force` e `--chore` abrem a change.

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

<!-- doctrina:applied-deltas specs/authoring/delta.md=20df4655,cffd9529,8e1547c4,543f6b33,95b8cc86,76fa2981,fe06c862,b92259bb,c8d10743,dfa0c53f,c568ca92,febc7b9a,af92623d,cbae20fe,e71ee9c6,d90b5a5b specs/triage/delta.md=text:6d16d88e -->
