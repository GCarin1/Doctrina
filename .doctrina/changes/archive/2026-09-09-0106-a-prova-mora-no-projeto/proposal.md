# Change 0106-a-prova-mora-no-projeto — a prova mora no projeto

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product
- **Affects specs:** gates, cli

## Why

coverage aceita como prova um caminho fora do projeto, um caminho absoluto do sistema e um diretório, e não menciona a citação ausente quando outra resolve

## What

O `coverage` resolvia uma citação com `path.resolve(projectRoot, token)` e
aceitava tudo a que `exists` dissesse sim. Medido num projeto limpo:

```
verified by `../adopt/app.py`                        → linked
verified by `C:/Windows/notepad.exe`                 → linked
verified by `tests/`                                 → linked (um diretório)
verified by `tests/nope.py` and `tests/test_x.py`    → covered; nope.py nunca mencionado
```

Evidência é um arquivo dentro do projeto. Um caminho que resolve fora da
raiz, ou para um diretório, é reportado como dangling com o motivo; um
diretório citado ao lado de uma prova real é uma menção em prosa («every
file under `src/`») e fica em silêncio; e um critério que cita um caminho
que resolve e um que não resolve está coberto, com o que não resolve
nomeado.

A spec `cli` tinha um critério provado só por diretórios (#16, «zero errors
under `packages/doctrina-cli/src/` and `scripts/`»); passa a citar o teste
que roda o typecheck.

## Scope boundaries

- Não muda a resolução relativa à pasta da spec (segundo candidato).
- Não muda a classificação de testes pulados (`conditional`).
- Não toca em citações `verify:<check>` dos critérios `[orchestration]`.

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
- [x] Um caminho fora do projeto, um absoluto e um diretório contam como dangling, com o motivo.
- [x] Um critério com uma citação que resolve e outra que não está coberto e o relatório nomeia a que não resolve.
- [x] `coverage --strict` do próprio repositório continua verde.

## Open questions

- Nenhuma.
