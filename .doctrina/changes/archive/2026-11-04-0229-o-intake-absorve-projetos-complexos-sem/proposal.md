# Change 0229-o-intake-absorve-projetos-complexos-sem — o intake absorve projetos complexos sem distorcer

- **Status:** applied
- **Applied:** 2026-11-04
- **Date:** 2026-11-04
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain; signals: comportamento)
- **Affects specs:** authoring, gates, templates, docs


## Why

O intake é o começo de todo contexto que um agente escreve, e o `--from-code` lia só os manifestos da raiz. Rodado em projetos públicos, distorcia exatamente o que um agente absorve: um demo de onze serviços em cinco linguagens lido como ".NET", um template FastAPI + React como "sem framework" e com uma área candidata errada, um app Spring batizado com o pom pai, com áreas `src/main/` e `src/test/` e sem ponto de entrada. O `verify --init` recebia `--watch`, `--ui` e o placeholder do npm. Os playbooks não diziam como evitar requisito inventado nem mandavam checar os fatos.

## What

- `lib/code-inventory.js`: lê cada unidade do repositório (manifesto, nome, build, gerenciador de pacotes, frameworks, testes), ferramental de workspace, linguagens por extensão, áreas dentro de cada unidade (pacotes JVM inclusive), pontos de entrada, interfaces, dados, entrega em qualquer profundidade, documentação e instruções de agente existentes e o que não conseguiu ver; `.env` real citado e nunca lido.
- Comandos divididos entre semeados (com `cwd` por unidade) e não semeados com o motivo; `verify --init` grava o `cwd`.
- Playbooks de absorb e bootstrap: regras contra inventar e checagem dos fatos antes dos gates.
- Testes com reduções de cinco projetos públicos e do caso Django; golden do bootstrap recapturado.

## Scope boundaries

O modo `--text` continua guardando a descrição literalmente; a mudança nele é só o playbook. A orientação na raiz do workspace e o cartão do executor vêm nas changes seguintes.

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
