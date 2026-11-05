# Change 0240-release-0-21-0 — release 0.21.0

- **Status:** applied
- **Applied:** 2026-11-05
- **Date:** 2026-11-05
- **Owner:** Doctrina maintainers
- **Lane:** runtime (confident; signals: workflow, tag) — opened as chore
- **Affects specs:** none


## Why

A publicação da tag `v0.20.0` falhou no `npm publish` com 403: a 0.20.0 já estava no npm desde 2026-11-03, publicada do commit `004dd50` (merge do PR #27), e a tag foi criada no merge do PR #28 (`893c8f0`), que traz as changes 0226 a 0239. O npm nunca substitui uma versão publicada. Todos os gates tinham passado; o que faltava era um número novo, e o workflow só descobriu isso depois de dois minutos de testes.

## What

- Versão 0.21.0: pela política do repositório (abaixo da 1.0, o patch é só para correção compatível), as changes 0226 a 0239 mudam superfície (flags novas, comandos do Cursor viram skills, `delivery status --json`), então é um minor.
- `package.json`, `package-lock.json`, READMEs EN e PT e o do pacote, o bloco What changed do AGENTS.md (regenerado pelo `upgrade --write`) e o índice carimbados em 0.21.0; CHANGELOG com a seção 0.21.0 e a nota de upgrade.
- `AGENT_CHANGELOG` com os cinco bullets da 0.21.0, escritos como o que o agente deve fazer agora.
- `release.yml`: um passo antes dos gates recusa uma tag que não nomeia a versão do `package.json` e uma versão que já está no npm, dizendo o que fazer.

## Scope boundaries

As tags ficam com o humano (a sessão recebe 403 ao criar tags): reposicionar `v0.20.0` em `004dd50`, que é o que o npm tem, e criar `v0.21.0` no merge deste PR.

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
