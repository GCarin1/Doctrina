# Change 0257-console-interativo — console interativo

- **Status:** applied
- **Applied:** 2026-11-13
- **Date:** 2026-11-13
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** console, cli


## Why

A CLI foi feita para um agente rodar: quarenta comandos, cada um imprimindo o próximo passo. Para o humano sobravam os mesmos quarenta comandos num terminal e nada para olhar — "feio e pouco intuitivo", nas palavras de quem usa. Um console dá um rosto à ferramenta: uma janela com os gates, a conversa, o trabalho aberto e uma linha para digitar. E a primeira coisa que uma pessoa digita numa janela assim é um pedido com as próprias palavras, que precisa de um modelo para virar trabalho. A CLI não chama modelo (ADR 0005) e a pessoa já tem um agente instalado, autenticado e configurado para o repositório; o console entrega o pedido a ele pelo modo não interativo que cada agente documenta (ADR 0032).

## What

- `doctrina ui` (e `doctrina` sem argumentos num terminal): o console em tela cheia — gates no topo, conversa, painel lido da árvore (trabalho aberto com estágio e barra de tarefas, próximo passo, fechadas há pouco), caixa de entrada; abaixo de 84 colunas o painel vira uma faixa; na raiz de um workspace mostra projetos e entregas.
- `/` roda qualquer comando do Doctrina com lista que filtra e completa; `@` menciona spec, change, skill, ADR ou contrato; `?` ajuda; `/agent`, `/new`, `/clear`, `/panel`, `/refresh`, `/quit`.
- Um pedido em texto livre vai para o agente encontrado no PATH (Claude Code, Cursor, Codex, Gemini), com a fala, as chamadas de ferramenta, as chamadas recusadas e a duração transmitidas na conversa, e a sessão retomada no pedido seguinte. `DOCTRINA_AGENT` e `DOCTRINA_AGENT_ARGS` escolhem o agente e acrescentam flags.
- `lib/console-model.js` (estado, teclas, paleta), `lib/console-view.js` (o quadro), `lib/console-state.js` (o painel), `lib/agent-bridge.js` (detecção, linha de comando e leitura do stream de cada agente), `commands/ui.js` (o terminal).
- `doctrina ui --frame [--cols --rows]` imprime um quadro; `--json` o estado do painel. Um pipe que roda `doctrina` sozinho continua recebendo a ajuda.
- ADR 0032, spec `console`, política de segurança, docs EN/PT, READMEs, CHANGELOG, checagem no teste de pacote.

## Scope boundaries

O console não digita num painel de chat já aberto na IDE: é o mesmo agente, conta e regras, numa sessão própria. Só o Claude Code foi exercitado contra o binário real; Cursor, Codex e Gemini são montados pela documentação. Nenhuma flag que pule aprovações do agente é passada. O agente não é configurado em arquivo do projeto. Não há modo shell (`!`), nem edição multilinha, nem mouse.

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

<!-- doctrina:applied-deltas specs/cli/delta.md=af2ee76a,0a157fc7,d90b5a5b specs/console/delta.md=text:be353092 -->
