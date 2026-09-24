# Change 0174-ajuda-sem-agrupamento-por-momento — ajuda sem agrupamento por momento

- **Status:** applied
- **Applied:** 2026-09-24
- **Date:** 2026-09-24
- **Owner:**
- **Lane:** product
- **Affects specs:** cli


## Why

`doctrina --help`, e `doctrina` sozinho, imprimia 77 linhas: as 61 operações numa lista corrida, na ordem do catálogo, com as depreciadas misturadas às vivas. Para quem acabou de instalar, a pergunta "por onde começo?" recebia o catálogo inteiro como resposta. O bloco do AGENTS.md já agrupava os comandos pelo momento em que são usados (Bootstrap, Orient, Change, Gate, Maintain); a ajuda do terminal, que é o que um humano lê, não.

## What

- `packages/doctrina-cli/src/lib/commands.js`: `surfaceHelp()` abre com "Start here" (`doctrina init`, `doctrina next`), agrupa por momento na ordem de `MOMENTS`, dá uma linha por comando com os subcomandos juntos (`change new|apply|…`; o nome longo leva a descrição para a linha de baixo, alinhada), e põe as depreciadas por último com a seta para o substituto. O propósito do `change` e do `templates` no catálogo foi reescrito para caber nesse formato; o bloco do AGENTS.md foi regenerado.
- `index.js`: a linha de uso aponta `doctrina <command> --help` para o detalhe.
- Teste do catálogo aceita a forma `cmd a|b|c`; docs EN/PT descrevem a ajuda na tabela de flags globais.

## Scope boundaries

- A ajuda de cada comando (`doctrina <cmd> --help`) não muda.
- Nenhum comando entra ou sai aqui; as fusões são das changes 0175–0178.

## Verification

- [x] `packages/doctrina-cli/test/a-ajuda-comeca-pelo-comeco.test.js` passa (3 testes) e falha 3/3 no código anterior; a ajuda tem 70 linhas contra 77.
- [x] Automated checks pass (`doctrina verify`).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.
