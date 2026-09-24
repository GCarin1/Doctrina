# Change 0171-ci-nao-testa-o-node-24 — CI nao testa o Node 24

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:**
- **Lane:** chore
- **Affects specs:** (none — chore)

- **Documented surface:** n/a — só a matriz do CI muda; nenhum comando, flag ou saída do CLI

## Why

A matriz de testes do `.github/workflows/ci.yml` roda Node `20.12` e `22` nos três sistemas, mas não o `24`, que é a LTS ativa desde outubro de 2025 e a versão que um usuário novo instala hoje. O Node 20 está em fim de vida desde abril de 2026 e continuava coberto em três sistemas; a versão mais usada não era testada em nenhum.

Rodei a suíte inteira aqui no Node `v24.21.0`: 972 de 972 testes passam, então o acréscimo não traz nenhuma correção junto.

## What

- `.github/workflows/ci.yml`: o eixo `node` da matriz passa a ser `["20.12", "22", "24"]` (o piso do `engines`, a LTS anterior e a LTS ativa), com um comentário dizendo por quê.

## Scope boundaries

- O `engines` continua `>=20.12`: largar o Node 20 é decisão de produto, não desta change.
- O `release.yml` continua publicando no `20.12`, o piso que o `engines` declara.
- As versões `@v4` das actions não mudam aqui.

## Verification

- [x] A suíte roda verde no Node 24 local (972/972) e o YAML da matriz carrega com os três valores.
- [x] Automated checks pass (`doctrina verify`).

## Open questions

Nenhuma.
