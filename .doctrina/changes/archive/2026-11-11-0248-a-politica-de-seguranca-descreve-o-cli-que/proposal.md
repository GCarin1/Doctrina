# Change 0248-a-politica-de-seguranca-descreve-o-cli-que — a politica de seguranca descreve o cli que existe

- **Status:** applied
- **Applied:** 2026-11-11
- **Date:** 2026-11-11
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain) — opened as chore
- **Affects specs:** none

- **Documented surface:** n/a — reescreve a política de segurança e corrige contagens na documentação; nenhum comando, flag ou saída do CLI muda


## Why

O `SECURITY.md` dizia que o CLI roda seis consultas git de leitura e escreve só no diretório de trabalho e em `.git/hooks/`, e classificava como falha de segurança "um caminho que o CLI escreve fora do diretório do projeto". O workspace (0.20) grava um registro na home, cria links em outros repositórios, edita o `.git/info/exclude` deles e roda `git init`; o `hooks install` de hoje escreve configuração git. Pela própria definição, o documento descrevia outra ferramenta, e nada o comparava com o código. O README dizia "Eleven capability specs" com 13 na árvore, logo abaixo de um parágrafo que promete que toda contagem é conferida.

## What

- `SECURITY.md`: fronteira de arquivos com as exceções nomeadas por comando, o que é lido fora do projeto, a lista completa de subcomandos git (leitura e escrita), e o que a guarda de MCP é e não é.
- Teste que compara a política com o código: subcomandos git nos dois sentidos, git só por `lib/git.js`, cada escrita e leitura fora do projeto, nenhum módulo de rede.
- `scripts/check-docs.js`: conta as specs de capability nos READMEs da raiz e recusa essa contagem escrita por extenso; o README do pacote entra nas contagens.
- READMEs: 13 specs; `deferred.md` EN/PT sem a contagem de docs.

## Scope boundaries

O comportamento do CLI não muda. A política continua em inglês, um arquivo só.

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

<!-- doctrina:applied-deltas none -->
