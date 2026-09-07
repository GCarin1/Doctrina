# Change 0037-um-coletor-varias-vistas — um coletor, varias vistas

- **Status:** proposed
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
- Os nomes `prime`, `handoff` e `report` seguem funcionando como alias por um minor, com aviso de depreciação.
- Delta em `specs/gates`.

Achado F7 da auditoria. Seis comandos ocupando espaço num orçamento que o próprio
projeto declara escasso: `SURFACE_LINE_BUDGET` é 40 linhas e o comentário admite que o
momento "Maintain" foi comprimido em uma linha para caber.

## Scope boundaries

- `doctor` continua separado: ele executa gates, não só lê a árvore.
- `next` sai desta change — a sua reforma é a 0032, e as duas devem aterrissar em ordem.
- Nenhum nome é removido aqui; a remoção precisa de ADR e de evidência do log de uso (change 0049).

## Verification

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [ ] As quatro vistas produzem saída byte-idêntica à dos comandos atuais.
- [ ] Nenhum módulo em `src/commands/` importa de outro módulo de `src/commands/`.
- [ ] Os aliases `prime`, `handoff` e `report` continuam resolvendo, com aviso de depreciação.

## Open questions

- Depreciar os três nomes agora, ou só na 1.0? Eles estão no bloco de superfície do AGENTS.md, que é a interface de descoberta do agente.
