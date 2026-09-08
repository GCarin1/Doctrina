# Change 0081-o-work-nao-deixa-specs-vazio — o work nao deixa specs vazio

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** authoring

## Why

o doctrina work cria o diretorio specs da change mesmo quando nao resolve capability nenhuma, deixando um diretorio vazio que nao significa nada

## What

Quando o `work` não resolve capability nenhuma — prompt novo, projeto sem spec
que case — ele ainda cria o diretório da change com um `specs/` dentro, vazio:

```
$ doctrina work "importar nota de corretagem em PDF"
$ find .doctrina/changes/0001-.../ -type d
.doctrina/changes/0001-.../
.doctrina/changes/0001-.../specs
```

O `analyze` lê isso corretamente como «0 spec deltas (metadata-only change)»,
então nada quebra. Mas o diretório afirma alguma coisa que não é verdade: que
há deltas ali, ou que houve. É o mesmo princípio que a change 0073 aplicou ao
`adapter remove` — um diretório vazio não é uma ausência, é uma presença sem
conteúdo, e o próximo leitor gasta atenção conferindo.

## Scope boundaries

- Não muda quando o delta É scaffoldado (change 0044): com capability
  resolvida, o `specs/<cap>/delta.md` continua saindo pronto.
- Chore-shaped na superfície, mas a spec `authoring` descreve o que o `work`
  deixa em disco, então o delta ajusta essa descrição.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [ ] Uma change sem capability resolvida não deixa diretório vazio.
- [ ] Uma change com capability resolvida continua com o delta no lugar.

## Open questions

- Nenhuma.
