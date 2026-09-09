# Change 0034-um-unico-mapa-de-gates — um unico mapa de gates

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** gates

## Why

a ADR 0017 promete um mapa unico de gates mas lib/gates.js cobre so apply e archive enquanto close, doctor, action.yml e verify.json mantem quatro listas divergentes; declarar todas as sequencias num lugar e gerar a action a partir dela

## What

Estende `src/lib/gates.js` de duas transições (`apply`, `archive`) para a declaração
única de todas as sequências de gate: `close`, `doctor` e `ci`. Cada passo declara
nome, gate, nível (bloqueante/consultivo/forçável) e o comando de reexecução.

- `close.js` e `doctor.js` deixam de carregar listas literais e viram laços sobre a declaração.
- Novo `doctrina ci --emit github` gera o `action.yml` a partir da mesma tabela.
- Um teste de drift prova que as três sequências vêm da declaração — o padrão que `OPERATIONS` já usa para o `--help`.
- Delta em `specs/gates`.

Achado F1 da auditoria. A ADR 0017 promete um mapa único e `lib/gates.js` cobre só
duas transições, enquanto `close` (array de 10 passos), `doctor` (8 linhas), `action.yml`
(5 passos YAML) e `verify.json` (7 checks) mantêm quatro listas que divergem.

## Scope boundaries

- Não decide QUAIS gates existem em cada sequência: isso é das changes 0033 e 0041.
- Não muda o contrato de códigos de saída (ADR 0018).
- `verify.json` continua sendo do projeto adotante — a declaração descreve os gates do framework, não os checks de build.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] `close`, `doctor` e o YAML emitido derivam da mesma declaração, provado por teste de drift.
- [x] Adicionar um gate à declaração aparece nas três superfícies sem edição adicional.
- [x] `doctrina ci --emit github` reproduz o `action.yml` versionado byte a byte.

## Open questions

- Resolvida: o `action.yml` é gerado E versionado, como o bloco de superfície
  do AGENTS.md. Um projeto que escreve `uses: <owner>/<repo>@v1` não tem CLI
  para gerá-lo, então a action precisa existir no repositório; o teste de
  drift compara o arquivo versionado com a saída do emissor byte a byte,
  então um arquivo velho quebra a suíte em vez de ir para produção calado.
