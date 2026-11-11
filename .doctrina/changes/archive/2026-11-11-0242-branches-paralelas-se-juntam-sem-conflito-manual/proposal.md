# Change 0242-branches-paralelas-se-juntam-sem-conflito-manual — branches paralelas se juntam sem conflito manual

- **Status:** applied
- **Applied:** 2026-11-11
- **Date:** 2026-11-11
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** structure, authoring, scaffolding


## Why

Medido neste repositório em 90 dias: `.doctrina/index.json` mudou em 172 de 186 commits e o ledger em 158. Toda change reescreve os dois, então duas branches que fecham uma change cada se encontram nas mesmas linhas, e o git para com marcadores de conflito num arquivo derivado e numa lista. O próximo número de change era lido só do disco, então as duas branches abriam a `0001`. Reproduzido com duas branches: conflito em `index.json` e duas changes sob o mesmo número, sem aviso do `validate`.

## What

- `doctrina index merge <base> <ours> <theirs>`: driver de merge que funde o índice como listas de artefatos (`lib/index-merge.js`).
- `doctrina hooks install` escreve duas linhas no `.gitattributes` (índice pelo driver, ledger por `union`) e configura o driver no git do clone, antes do hook.
- O número de uma change nova passa das changes que outras branches adicionaram nos últimos 180 dias (`lib/change-numbers.js`).
- `validate` avisa a change aberta que divide o número com outra; `doctrina change renumber <id>` dá a ela o próximo número livre.
- Um índice com marcadores de conflito é nomeado como tal, com o `index rebuild` como saída.
- Docs EN/PT (referência, multi-agente), contagem de operações 75 → 77, CHANGELOG.

## Scope boundaries

O botão de merge de um serviço de hospedagem não roda drivers; a documentação diz para fazer o merge da base localmente. Changes arquivadas não são renumeradas. O `init` não escreve `.gitattributes`.

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
