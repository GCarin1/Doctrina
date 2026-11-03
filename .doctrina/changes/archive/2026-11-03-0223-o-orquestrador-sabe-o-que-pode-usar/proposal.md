# Change 0223-o-orquestrador-sabe-o-que-pode-usar — o orquestrador sabe o que pode usar

- **Status:** applied
- **Applied:** 2026-11-03
- **Date:** 2026-11-03
- **Owner:** Doctrina maintainers
- **Lane:** product (confident; signals: declarar)
- **Affects specs:** workspace

- **Documented surface:** n/a — `workspace tool`, `workspace guard` and `prime` at a workspace root are documented in `docs/en/cli-reference.md` and `docs/pt/cli-reference.md`, committed with this change's code (9809d38) before the close resumed; `/private/var` is a test path, not an endpoint


## Why

O operador quer que o orquestrador use Jira, Confluence, Figma, Playwright, Datadog e Databricks ou SQL ao longo da entrega, e que ele seja o mestre que sabe a quem delegar. Até aqui o workspace não dizia que ferramentas existem, quem as usa nem se podem escrever; e quem abria o workspace no Cursor não encontrava hub, regra, hooks nem subagentes — o planejador e os executores existiam só no playbook.

Todas essas ferramentas podem escrever (mover um card, apagar uma linha, silenciar um monitor). "Só leitura por padrão" escrito no AGENTS.md é uma esperança; os hooks de pré-chamada do Cursor e do Claude Code permitem que seja regra.

## What

- ADR 0031: o workspace declara as ferramentas e o agente as guarda.
- `doctrina workspace tool <nome>` com presets (jira, confluence, figma, playwright, datadog, databricks, sql), papéis, propósito e acesso `read` por padrão (`src/lib/workspace-tools.js`).
- `doctrina workspace guard --hook cursor|claude`: nega escrita por ferramenta só de leitura, pergunta ao humano a escrita declarada, deixa passar leitura e servidor não declarado; nunca bloqueia por entrada ilegível.
- Arquivos do orquestrador gerados a cada escrita (`src/lib/workspace-agents.js`): AGENTS.md do workspace, regra sempre aplicada do Cursor, hooks mesclados, subagentes `doctrina-executor`, `doctrina-reviewer`, `doctrina-qa`, `doctrina-observer` em `.claude/agents/` (lidos pelos dois agentes) e o `.code-workspace` com todos os repositórios.
- `doctrina prime` na raiz do workspace é o primer do orquestrador (`--pulse`, `--hook`).
- Correções vindas da CI do PR #27 sobre as changes 0220–0222: o `Source:` da spec `authoring` passa a declarar `code-inventory.js`, e o teste do ponteiro do workspace compara caminhos reais (no macOS o `tmpdir` é um link para `/private/var`).

## Scope boundaries

- O Doctrina não chama ferramenta nem grava a configuração dos servidores MCP (URLs, credenciais).
- O gate de subida e observabilidade da entrega é a change seguinte.

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
