# Change 0045-doctor-para-de-se-auto-spawnar — doctor para de se auto-spawnar

- **Status:** proposed
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** gates

## Why

doctor chama alguns coletores em processo e roda outros gates por subprocesso do proprio binario fazendo parsing do proprio JSON, misturando dois estilos de integracao num comando so; expor coletores puros e rodar tudo em processo

## What

`doctrina doctor` deixa de rodar parte dos seus gates por subprocesso do próprio
binário. Hoje ele chama `collectStatus()` e `collectFindings()` em processo, mas roda
`validate`, `index rebuild --check` e `verify --clean` via
`spawnSync(process.execPath, [cliEntry, ...])` e faz parsing do próprio JSON.

- `validate`, `index rebuild` e `verify --clean` passam a expor coletores puros.
- `doctor` roda tudo em processo, como o `close` já faz.
- Some o caminho de falha "did not produce a report", que só existe por causa da escolha.
- Delta em `specs/gates`.

Achado F4 da auditoria: dois estilos de integração dentro de um comando só, e três
processos Node a mais por execução.

## Scope boundaries

- Não muda o que o `doctor` reporta nem a ordem das linhas.
- Não muda os códigos de saída de nenhum dos gates envolvidos.
- Depende dos coletores que a change 0034 também precisa; se ela aterrissar antes, reusar.

## Verification

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [ ] `doctor` não cria nenhum processo filho, provado por teste.
- [ ] A saída de `doctor` é byte-idêntica à anterior nos casos verde, amarelo e vermelho.
- [ ] O caminho de erro "did not produce a report" deixa de existir.

## Open questions

- Nenhuma.
