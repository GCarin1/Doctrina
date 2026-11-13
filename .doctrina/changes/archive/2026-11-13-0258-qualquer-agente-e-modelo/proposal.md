# Change 0258-qualquer-agente-e-modelo — qualquer agente e modelo

- **Status:** applied
- **Applied:** 2026-11-13
- **Date:** 2026-11-13
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** console


## Why

A caixa de entrada dizia "to claude" e o catálogo só conhecia quatro agentes, mostrando apenas os instalados. Quem trabalha com Cursor num lugar, VS Code com Copilot em outro e Gemini em casa precisa do mesmo console em todos, precisa ver o que existe além do que está instalado, e precisa escolher o modelo — que até aqui só entrava por variável de ambiente.

## What

- Catálogo: GitHub Copilot CLI (`copilot`, o agente do VS Code) e opencode entram ao lado de Claude Code, Cursor, Codex e Gemini; cada agente declara como nomeia um modelo e onde lista os da conta.
- Agente próprio: `$DOCTRINA_HOME/agents.json` declara qualquer outro agente de linha de comando (`{prompt}`, `{model}`, `{session}`); declaração errada é nomeada e ignorada.
- `/agent` lista todos os agentes conhecidos, instalados ou não, com o binário procurado, e completa o nome; `/model <nome>` passa o modelo na linha de comando do agente em uso, guardado por agente; `/model default` volta; `/model` mostra o escolhido ou o que o agente relatou.
- A escolha de agente e modelo fica em `$DOCTRINA_HOME/console.json`, por diretório.
- O cabeçalho e a caixa de entrada mostram o agente e o modelo em uso (`to Cursor · gpt-5`).
- Docs EN/PT, ajuda do comando, política de segurança, CHANGELOG.

## Scope boundaries

Copilot, Cursor, Codex, Gemini e opencode continuam montados pela documentação, sem execução contra o binário real. O console não lista os modelos de uma conta: mostra onde o agente os lista. O aider não entra no catálogo embutido, porque só roda sem perguntas com uma flag que pula confirmações; pode ser declarado como agente próprio. O opencode não recebe flag de modelo, que a página lida não documenta.

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

<!-- doctrina:applied-deltas specs/console/delta.md=3840d231,76a346d3,b6dc7cde,6a247560,2539f12b,eb094f09,9c368279,64340273,298a5009,310d50a1,2c98c2a5,631c7dce,d90b5a5b -->
