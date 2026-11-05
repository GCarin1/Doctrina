# Change 0241-o-release-recarimba-os-exemplos — o release recarimba os exemplos

- **Status:** applied
- **Applied:** 2026-11-05
- **Date:** 2026-11-05
- **Owner:** Doctrina maintainers
- **Lane:** runtime (confident; signals: workflow) — opened as chore
- **Affects specs:** none


## Why

A tag `v0.21.0` rodou todos os gates do workflow de release e parou no passo Examples validate (strict), antes do publish: os dois exemplos em `examples/` têm o próprio `index.json`, que ficou carimbado em 0.20.0, e no modo `--strict` o aviso de carimbo atrás do CLI é falha. O procedimento de release só recarimbava o índice da raiz, e a suíte que o close roda não olhava os exemplos.

## What

- `doctrina index rebuild` em cada exemplo: o `framework_version` dos dois passa a 0.21.0 (o `upgrade --write` também inseriria blocos gerados no AGENTS.md dos exemplos, que não são parte desta correção).
- Teste que falha a suíte quando o carimbo de um exemplo não é a versão do `package.json`.
- A skill `cut-a-release` manda recarimbar os exemplos; CHANGELOG da 0.21.0.

## Scope boundaries

A 0.21.0 não chegou ao npm, então continua sendo o número desta versão; a tag `v0.21.0` precisa ser reposicionada no merge desta correção.

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
