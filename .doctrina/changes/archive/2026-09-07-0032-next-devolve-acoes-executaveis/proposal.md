# Change 0032-next-devolve-acoes-executaveis — next devolve acoes executaveis

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** cli

## Why

computeActions devolve strings de prosa que o agente precisa reinterpretar para reemitir o comando que o CLI acabou de montar; passar a devolver acoes estruturadas com command, args, gate e severity, e oferecer next --run

## What

`computeActions()` sai de `src/commands/next.js` para `src/lib/actions.js` e passa a
devolver ações tipadas — `{ id, command, args, why, gate, severity }` — em vez das
strings de prosa que monta hoje. `next`, `prime`, `handoff` e `watch` formatam a partir
do objeto, então a frase impressa continua idêntica e deixa de ser a fonte.

- `next --json` emite as ações estruturadas dentro do envelope versionado.
- `next --run` executa a primeira ação bloqueante in-process e recusa as destrutivas.
- Delta em `specs/cli`: o requisito event-driven do `next` e o payload JSON.

Achado F9 da auditoria. É o ponto onde a cadeia determinística vaza: o CLI monta o
comando caractere por caractere e devolve uma frase que o agente reinterpreta para
reemitir o mesmo comando.

## Scope boundaries

- Não muda a ordem de prioridade das ações — só o formato em que saem.
- Não toca `doctor`, que executa em vez de só listar (ver change 0045).
- `--run` só executa uma ação `runnable`: mecânica, idempotente, e que seja TUDO o que a ação pede. Aceitar uma ADR, completar uma task ou escrever uma proposta nunca é runnable, por mais mecânica que seja a edição.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] `next --json` emite ações com `command`/`args` e um teste reemite uma delas sem parsing de prosa.
- [x] `next --run` recusa uma ação que exige uma pessoa (aceitar uma ADR, completar uma task) e a nomeia.
- [x] A saída em texto de `next`, `prime` e `handoff` é byte-idêntica à anterior.

## Open questions

- ~~`--run` deve encadear ações até a fila esvaziar, ou executar apenas a primeira e parar?~~ **Resolvido: apenas a primeira.** A lista é recalculada a partir da árvore depois de cada mudança nela, então encadear agiria sobre uma fila cuja segunda metade foi calculada antes da primeira rodar. `close` continua sendo o comando que roda uma sequência inteira.
- O termo "destrutiva" do plano original estava errado e virou `runnable`: nenhuma ação da fila destrói nada, e o que de fato importa é se rodá-la sem supervisão substitui uma decisão humana.
