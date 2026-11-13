# Change 0252-o-kiro-entra-na-lista-de-agentes — o kiro entra na lista de agentes

- **Status:** applied
- **Applied:** 2026-11-12
- **Date:** 2026-11-12
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** templates, scaffolding


## Why

O Kiro (IDE e CLI da AWS, sucessor do Amazon Q Developer) lê um `AGENTS.md` na raiz do workspace nativamente e sempre o inclui, segundo a documentação dele. O Doctrina não o aceitava em `--agent`, e quem usa Kiro ficava sem saber se funciona. O OpenSpec já acrescentou suporte ao Kiro CLI. A contagem de agentes estava escrita por extenso ("twelve", "doze") em vinte lugares, que nada conferia.

## What

- `kiro` em `--agent`, no inventário de templates (README, sem arquivo instalado, como `amp`/`devin`/`factory`/`jules`) e no teste do pacote instalado.
- O README do adapter diz para manter os requisitos em `.doctrina/specs/` e não em `.kiro/specs/`.
- Docs EN/PT, READMEs e specs passam a 13 agentes, em algarismos; o gate de docs confere a contagem contra as pastas de adapter.
- A linha `kiro` da tabela de adapters na spec `templates` foi escrita à mão: nenhuma op edita tabela.

## Scope boundaries

Nenhum arquivo de steering nem hook do Kiro é gerado: o `AGENTS.md` já é carregado, e o formato dos hooks do Kiro não foi verificado.

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

<!-- doctrina:applied-deltas specs/scaffolding/delta.md=ce33a013,e7c38c12 specs/templates/delta.md=d9149160,d90b5a5b -->
