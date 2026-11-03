# ADR 0031 — O workspace declara as ferramentas e o agente as guarda

- **Status:** accepted
- **Date:** 2026-11-03
- **Deciders:** project owner
- **Scope:** workspace
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/lib/workspace-tools.js`, `packages/doctrina-cli/src/lib/workspace-agents.js`
- **Landed:** —

## Context

Uma entrega real lê a história no Jira, a documentação no Confluence, o
design no Figma, navega a aplicação com o Playwright, consulta dados no
Databricks ou num banco SQL e observa a subida no Datadog. Todos esses
sistemas têm servidor MCP oficial, e todos podem ESCREVER: mover um card,
publicar uma página, apagar uma linha, silenciar um monitor.

Duas forças pedem uma decisão. O ADR 0005 proíbe o CLI de interpretar
linguagem natural, e a regra de zero dependências proíbe que ele vire um
cliente MCP. Ao mesmo tempo, "só leitura por padrão" escrito apenas no
AGENTS.md é uma esperança, não uma regra: o agente lê o texto uma vez e a
ferramenta fica disponível o tempo todo.

Os próprios agentes oferecem o ponto de controle: o Cursor chama o hook
`beforeMCPExecution` antes de toda chamada MCP e aceita `allow`, `deny` ou
`ask`; o Claude Code chama o `PreToolUse` com o nome `mcp__<servidor>__<ferramenta>`
e aceita a mesma tríade em `permissionDecision`.

## Decision

1. O `workspace.json` DECLARA cada ferramenta: o nome do servidor MCP como
   a configuração do agente o chama, os papéis que a usam (planner,
   executor, qa, observer, reviewer), o propósito e o acesso — `read` por
   padrão, `write` só quando o operador diz.
2. O Doctrina NUNCA chama uma ferramenta e nunca grava a configuração dos
   servidores (URLs, credenciais): ela é do agente e do operador.
3. O workspace instala o hook de pré-chamada dos dois agentes, que pergunta
   ao `doctrina workspace guard`: uma escrita por ferramenta declarada só
   leitura é negada; uma escrita por ferramenta de escrita é `ask` — o
   humano aprova cada uma; uma leitura passa; um servidor não declarado não
   recebe opinião. Escrita é decidida pela chamada, não pelo servidor: um
   SQL no input decide por si; senão, os verbos do nome da ferramenta.
4. A guarda nunca bloqueia por entrada ilegível: um hook quebrado não pode
   tirar as ferramentas do agente.
5. Os arquivos que o orquestrador lê — AGENTS.md do workspace, regra
   sempre aplicada do Cursor, hooks, subagentes em `.claude/agents/` (lidos
   pelo Claude Code e pelo Cursor) e o `.code-workspace` com todos os
   repositórios — são GERADOS do `workspace.json` a cada escrita no
   workspace; os arquivos de hook do operador são mesclados.

## Consequences

- "Só leitura por padrão" vira regra aplicada pelo próprio agente.
- A heurística de verbos pode errar: um nome que esconde uma escrita passa
  como leitura. A mitigação é o operador declarar `write` com cuidado e o
  `ask` em toda escrita declarada; a guarda reduz o risco, não o elimina.
- O Cursor não escopa MCP por subagente; o Claude Code sim (`mcpServers`).
  O arquivo gerado serve aos dois, e cada um lê o que entende.
