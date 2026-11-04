# Change 0233-a-segunda-auditoria-fecha-os-furos-do-fluxo — a segunda auditoria fecha os furos do fluxo multi-repo

- **Status:** applied
- **Applied:** 2026-11-04
- **Date:** 2026-11-04
- **Owner:** Doctrina maintainers
- **Lane:** product (confident; signals: spec, requisito)
- **Affects specs:** authoring, workspace, delivery, insight, cli, docs


## Why

A segunda auditoria percorreu um workspace de quatro repositórios (biblioteca front compartilhada, loja web que a importa, API e app mobile) do absorb ao fechamento da entrega, rodando cada comando como o playbook imprime. Dez pontos deram errado: o inventário semeava scripts que nunca terminam e afirmava um README inexistente; o `intake` sem flag reimprimia o playbook de bootstrap para um inventário; o workspace mandava refazer `--from-code`; o recorte de spec contava comentários do template como requisitos; o cartão cortava o requisito do próprio delta; o `work --delivery` ignorava a história; o `next` do repositório perdia a entrega; e uma dependência entre repositórios declarada no package.json não chegava ao roteamento.

## What

- Inventário: `scriptLongRunning` reconhece `--watchAll`, `-w`, `nodemon`, `ng test`, `react-scripts test` e `karma start`, e aceita `--watch=false`, `--no-watch`, `--single-run` e `CI=true`; sem README não afirma que existe um; singular em commit e arquivo.
- `intake` sem fonte imprime o playbook de absorb para um inventário; o passo do workspace é o 10.
- `absorbCommand` em `lib/workspace.js` diz `doctrina intake` para um absorb em andamento, em next, hub, route e delivery new.
- `sliceSpec` lê a spec sem comentários; o cartão consulta também o título e os requisitos do delta, e não leva comentários.
- `work --delivery` ranqueia pela história da entrega também.
- `next` num repositório nomeia a entrega roteada para ele e, depois do fechamento da parte dele, aponta o `next` do workspace.
- `validate` na raiz avisa de dependência de package.json não declarada; `workspace attach --depends-on` define a aresta.
- Teste novo, cli-reference EN e PT, CHANGELOG.

## Scope boundaries

A detecção de dependência entre repositórios lê só o package.json da raiz de cada projeto. O idioma da história contra o da spec continua sem tradução: um termo comum é o que ranqueia.

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
