# Change 0239-o-gate-de-docs-distingue-variavel-de-ambiente-de — o gate de docs distingue variavel de ambiente de constante

- **Status:** applied
- **Applied:** 2026-11-05
- **Date:** 2026-11-05
- **Owner:** Doctrina maintainers
- **Lane:** runtime (confident; signals: vars, variavel de ambiente) — opened anyway (--force)
- **Affects specs:** gates, docs


## Why

Corrigindo o login num projeto cujos códigos de erro seguem MAIUSCULAS_SNAKE por um ADR aceito, o close parou no gate de docs: a change alteraria a superfície documentada, com `environment:` e os dois códigos de erro como se fossem variáveis de ambiente. O gate contava como variável de ambiente todo nome em MAIUSCULAS_SNAKE citado entre crases na change, então citar um código de erro ou uma constante exigia documentar um ambiente que a change nunca tocou, e o agente teve que declarar a superfície como n/a.

## What

- `looksLikeEnv` em `lib/docs-impact.js`: um nome em MAIUSCULAS_SNAKE conta quando o texto o lê como variável (`process.env.X`, `$X`, `X=`, `getenv`, `os.environ`), quando a linha fala de ambiente (inclusive em português), quando tem sufixo de configuração (`_URL`, `_TOKEN`, `_PORT`…) ou quando o `.env.example` do projeto o declara.
- Teste, cli-reference EN e PT, CHANGELOG.

## Scope boundaries

A detecção segue heurística (ADR 0005): uma variável nova sem sufixo de configuração, citada sem contexto nenhum, passa a não disparar o gate; o contrato declarado continua sendo a fonte exata da superfície.

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
