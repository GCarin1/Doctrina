# Change 0253-um-preset-leva-a-casa-da-organizacao-para-o — um preset leva a casa da organizacao para o projeto

- **Status:** applied
- **Applied:** 2026-11-12
- **Date:** 2026-11-12
- **Owner:** Doctrina maintainers
- **Lane:** chore (confident; signals: upgrade)
- **Affects specs:** scaffolding


## Why

Todo repositório de uma mesma empresa parte das mesmas coisas — o idioma, as regras que nenhum repositório pode quebrar, as decisões que valem para todos, os templates, os checks do pipeline — e cada `doctrina init` partia dos padrões do CLI, então a casa era redigitada, ou esquecida, repositório a repositório. O Spec Kit responde a isso com catálogos de presets que uma organização pode hospedar; a parte que vale ter primeiro é a menor: uma pasta, aplicada sobre um projeto, de forma aditiva.

## What

- `lib/preset.js`: lê `preset.json` (`name`, `description`, `config`) e as pastas `templates/`, `decisions/`, `skills/` e o `verify.json`; planeja e aplica sem sobrescrever.
- `doctrina init --preset <dir>` e `doctrina upgrade --preset <dir> [--write]`.
- O plano nomeia cada arquivo copiado ou mantido e cada chave definida ou mantida; os comandos de um `verify.json` copiado são impressos.
- A config ganha a chave informativa `preset`.
- Docs EN/PT (templates, referência), `SECURITY.md`, CHANGELOG.

## Scope boundaries

O preset é uma pasta em disco: a CLI não busca nada pela rede, e não há catálogo. Um arquivo que o preset mudou depois de copiado não é atualizado (o do projeto vence). Ferramentas de workspace não fazem parte do preset.

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

<!-- doctrina:applied-deltas specs/scaffolding/delta.md=7dd4d2bd,8ab965de,8afd4902,d90b5a5b -->
