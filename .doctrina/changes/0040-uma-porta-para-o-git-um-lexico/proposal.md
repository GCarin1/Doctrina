# Change 0040-uma-porta-para-o-git-um-lexico — uma porta para o git, um lexico

- **Status:** proposed
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** cli

## Why

lib/git.js foi escrito para ser a unica porta do git e so dois modulos o usam enquanto quatro implementam arquivos alterados por conta propria, e work e context ranqueiam o mesmo prompt com lexicos diferentes; adotar a porta unica e extrair um lexico compartilhado

## What

Adota duas abstrações que já foram construídas e não foram usadas.

- `src/lib/git.js` ganha `changedFiles(root, opts)` e vira a única porta do git. Hoje só `context` e `metrics` o importam, enquanto `work.js`, `review.js`, `docs-impact.js` e o próprio `context.js` têm cada um a sua versão de "arquivos alterados", e `coverage`, `skill`, `report` e `verify` chamam `spawnSync` direto.
- Novo `src/lib/lexicon.js` com `fold`, `terms`, `relevance`, as stopwords EN+PT e a regex `FIX_SHAPED` — consumido por `work`, `context`, `search`, `triage` e `skill`.
- Delta em `specs/cli`.

Achados F5, F6 e F8 da auditoria. Hoje `work` e `context` ranqueiam o mesmo prompt com
léxicos diferentes, e o playbook do `work` manda rodar `context` logo em seguida — dois
rankers que podem discordar, em sequência, sobre o mesmo texto. E `FIX_SHAPED` aparece
byte a byte em `next.js` e `skill.js`.

## Scope boundaries

- Não muda os pesos do classificador de lane do `triage`: ele passa a usar o léxico compartilhado para normalizar texto, não para pontuar.
- Mudanças de ranking são esperadas e aceitas; os testes de retrieval são reescritos junto.
- Não unifica a semântica onde ela diverge de propósito (o `docs-impact` inclui o merge-base): isso vira parâmetro.

## Verification

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [ ] Nenhum `spawnSync("git", ...)` fora de `src/lib/git.js`, provado por teste estrutural.
- [ ] Nenhuma lista de stopwords nem `FIX_SHAPED` duplicada fora de `src/lib/lexicon.js`.
- [ ] `work "<prompt>"` e `context --for "<prompt>"` concordam sobre a capacidade mais relevante.

## Open questions

- O `relevance` do `context` devolve uma tupla de três componentes e o `rankCapabilities` do `work` devolve um escalar. Unificar na tupla (mais expressiva) ou manter as duas saídas sobre o mesmo cálculo?
