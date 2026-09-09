# Change 0037-um-coletor-varias-vistas — um coletor, varias vistas

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** gates

## Why

prime, status, next, handoff e report sao renderizacoes diferentes dos mesmos tres coletores e importam funcoes uns dos outros; extrair um snapshot unico e transformar os comandos em vistas de formatacao

## What

Extrai `src/lib/snapshot.js` com um `collectSnapshot(projectRoot)` que devolve o estado
do projeto uma vez. `status`, `prime`, `handoff` e `report` passam a ser formatadores
puros sobre esse objeto, expostos como `doctrina status --view prime|handoff|report`.

- Encerra o padrão em que módulos de comando importam internals uns dos outros (`prime`→`openChanges`, `next`→`computeActions`, `status`→`collectStatus`).
- Os nomes `prime`, `handoff` e `report` seguem sendo comandos próprios, agora como
  vistas do mesmo snapshot (sem aviso de depreciação — veja Open questions).
- Delta em `specs/gates`.

Achado F7 da auditoria. Seis comandos ocupando espaço num orçamento que o próprio
projeto declara escasso: `SURFACE_LINE_BUDGET` é 40 linhas e o comentário admite que o
momento "Maintain" foi comprimido em uma linha para caber.

## Scope boundaries

- `doctor` continua separado: ele executa gates, não só lê a árvore.
- `next` sai desta change — a sua reforma é a 0032, e as duas devem aterrissar em ordem.
- Nenhum nome é removido aqui; a remoção precisa de ADR e de evidência do log de uso (change 0049).

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] As quatro vistas produzem saída byte-idêntica à dos comandos atuais.
- [x] Nenhum módulo em `src/commands/` importa de outro módulo de `src/commands/`.
- [x] Os aliases `prime`, `handoff` e `report` continuam resolvendo, com aviso de depreciação.

## Open questions

- Resolvida: nenhum dos três é depreciado aqui. Eles continuam sendo comandos
  próprios — `prime` é o que o AGENTS.md manda rodar no início de toda sessão —
  e passam a ser VISTAS do mesmo snapshot, com saída byte a byte idêntica à do
  `status --view <nome>`. Depreciar agora anteciparia a decisão que a change
  0049 precisa tomar com evidência do log de uso, e cobraria de todo agente um
  aviso no comando mais executado do fluxo. A duplicação que doía era a de
  CÓDIGO, e essa acabou.
