# Adapters

> Tradução da [versão em inglês](../en/adapters.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Doctrina é AGENTS.md-nativo. Adapters são arquivos-ponteiro finos
que permitem que agentes esperando outro nome de arquivo (Claude
Code, Cursor) encontrem o `AGENTS.md` canônico automaticamente.
Adapters nunca duplicam o conteúdo do `AGENTS.md`; eles
referenciam.

## Por que adapters finos

ADR 0001 faz do AGENTS.md a única fonte de verdade. Arquivos por
agente existem só porque alguns agentes pré-carregam um caminho
específico (`CLAUDE.md`, `.cursor/rules/*.mdc`). O adapter é a
menor ponte possível entre esse pré-carregamento e o `AGENTS.md`.

Três propriedades de todo adapter neste projeto:

- Abaixo de 30 linhas (`doctrina validate` exige).
- Um trabalho só: direcionar o agente ao `AGENTS.md`.
- Nenhuma regra própria. Se uma regra pertence a algum lugar, ela
  pertence ao `AGENTS.md` e é lida uma vez.

## Claude Code

`doctrina init --agent claude` escreve `CLAUDE.md` na raiz:

```
# CLAUDE.md — <project>

This project uses the open AGENTS.md standard as the single source of
truth for agent-readable rules. The canonical file is at the
repository root; this CLAUDE.md is a thin pointer so Claude Code's
auto-loading picks it up.

@AGENTS.md

The Doctrina framework artifacts (specs, decisions, changes) live
under .doctrina/. Read order is documented in AGENTS.md.
```

A linha `@AGENTS.md` usa a diretiva de import `@file` do Claude
Code. Claude Code lê `CLAUDE.md` automaticamente ao iniciar em um
projeto e segue o import. Da perspectiva do Claude, o contexto
canônico é o `AGENTS.md`.

## OpenAI Codex CLI

`doctrina init --agent codex` não instala **nada**. O OpenAI Codex
CLI é uma das implementações de referência da spec AGENTS.md e lê
`AGENTS.md` nativamente. Um adapter só adicionaria superfície de
drift.

O diretório `adapters/codex/` existe no inventário de templates
para simetria de estrutura entre agentes suportados, e para que
futuras affordances específicas do Codex (definições de subagentes
custom, por exemplo) tenham um lugar óbvio.

## Cursor

`doctrina init --agent cursor` escreve
`.cursor/rules/00-doctrina.mdc`:

```
---
description: Doctrina canonical rules — always read AGENTS.md first
alwaysApply: true
---

# Doctrina pointer rule

This project uses the open AGENTS.md standard as the single source of
truth for agent-readable rules. Before answering or editing, read the
canonical file at ../../AGENTS.md.

The Doctrina framework artifacts (specs, decisions, changes) live
under .doctrina/. Read order is documented in AGENTS.md.

Do not duplicate rules here. If a rule belongs in AGENTS.md, put it
there and re-read this project.
```

O frontmatter `alwaysApply: true` significa que Cursor inclui esta
regra em toda requisição, então o ponteiro sempre dispara. A regra
tem 16 linhas — bem abaixo do limite de 200 palavras da Cursor.

Cursor expõe quatro modos de regra — Always Apply, Auto-Attached
(globs), Agent-Requested (descrição) e Manual (`@nome`). Doctrina
ship só o pattern Always Apply em seu adapter porque o ponteiro
precisa disparar em toda requisição para ser útil. Os outros três
modos são primitivas excelentes de escopo para regras
projeto-específicas em cima do ponteiro do Doctrina; veja
[context-engineering.md](context-engineering.md) para como eles
mapeiam para o modelo de escopo próprio do Doctrina.

## AGENTS.md aninhado (uma raiz, muitos subsistemas)

Ferramentas AGENTS.md honram uma hierarquia: quando um agente
edita um arquivo, o `AGENTS.md` **mais próximo** (o mais perto
daquele arquivo na árvore de diretórios) tem precedência sobre
qualquer AGENTS.md acima. Para referência, o repositório principal
da OpenAI carrega 88 arquivos `AGENTS.md` aninhados. O pattern
escala.

Doctrina suporta isso diretamente. O `AGENTS.md` raiz carrega as
regras globais; um subsistema pode soltar seu próprio `AGENTS.md`
com overrides path-scoped. Casos de uso:

- Um subsistema que usa linguagem diferente do resto do repo e
  precisa de comandos diferentes de test/lint.
- Uma área legada que deve ser tocada com cuidado extra ("não
  refatorar sem ADR").
- Uma área de alto raio de impacto (auth, billing, migrations)
  que precisa de critérios de "done" mais apertados que o resto.

Mantenha cada arquivo aninhado abaixo do mesmo soft cap de 150
linhas; a hierarquia é para escopo, não para conteúdo total. O CLI
ainda não gera arquivos aninhados por você (`doctrina init`
escreve só o raiz); crie à mão e valide normalmente.

## Adapters adicionais (v0.1)

Mais cinco agentes ship adapters no v0.1, todos seguindo o mesmo
pattern de pointer fino:

| Agente | Arquivo instalado | Detecção |
|--------|-------------------|----------|
| `copilot` | `.github/copilot-instructions.md` | Instruções custom em nível de repositório do GitHub Copilot |
| `gemini` | `GEMINI.md` na raiz do projeto | Gemini CLI nativo |
| `aider` | `CONVENTIONS.md` na raiz do projeto | Aider lê CONVENTIONS.md como contexto read-only cacheado |
| `windsurf` | `.windsurfrules` na raiz do projeto | Convenção do arquivo de regras do Windsurf |
| `continue` | `.continue/rules/00-doctrina.md` | Diretório de regras do Continue.dev |

Cada um tem menos de 30 linhas e só roteia o agente para o
`AGENTS.md`. `doctrina init --agent <nome>` aceita qualquer dos
doze slugs (`claude`, `codex`, `cursor`, `copilot`, `gemini`,
`aider`, `windsurf`, `continue`, `amp`, `devin`, `factory`,
`jules`) ou `all` para instalar todos os adapters. Os últimos
quatro, como o `codex`, são AGENTS.md-native e não instalam
arquivo nenhum (veja a próxima seção).

Para LLMs locais (LLaMA, Mistral, Qwen, DeepSeek) e endpoints
cloud não-Anthropic, veja [local-llms.md](local-llms.md) com
receitas de setup que conectam o runtime escolhido através do
Doctrina ao modelo da sua preferência.

## Runtimes AGENTS.md-nativos (sem arquivo de adapter)

Quatro agentes adicionais lêem `AGENTS.md` nativamente conforme
anúncio da Linux Foundation em dezembro/2025.
`doctrina init --agent <nome>` para qualquer um deles não
instala arquivo (mesma postura do `codex`); o diretório sob
`templates/adapters/` existe para que o inventário fique
simétrico e affordances futuras por-agente tenham casa óbvia.

| Slug do agente | Ferramenta |
|----------------|------------|
| `codex` | OpenAI Codex CLI |
| `amp` | Sourcegraph Amp |
| `devin` | Cognition Devin |
| `factory` | Factory AI |
| `jules` | Google Jules |

Para esses cinco, AGENTS.md sozinho é suficiente. O diretório
de adapter Doctrina existe só para marcar o contrato de
suporte explicitamente.

## Instalando mais de um

```
doctrina init --agent all
```

Instala todos os adapters numa passada. Não há conflito: cada
agente lê seu próprio arquivo e todos apontam pro mesmo
`AGENTS.md`.

## Adicionando um novo agente

Quando um novo agente de codificação ficar relevante (Copilot
custom instructions, Gemini CLI, Windsurf, etc.), a adição é:

1. Adicione um diretório
   `.doctrina/templates/adapters/<agente>/` contendo o menor
   arquivo-ponteiro possível para esse agente. Mantenha abaixo de
   30 linhas e use só tokens canônicos (`{{AGENTS_MD_PATH}}` é
   geralmente tudo que se precisa).
2. Adicione `<agente>` ao array `SUPPORTED_AGENTS` em
   `packages/doctrina-cli/src/commands/init.js`.
3. Adicione uma linha à tabela de adapters suportados na spec
   `templates` e neste doc.
4. Abra o change com `doctrina change new` e siga o workflow
   normal.

Nenhuma mudança de código core é necessária porque a maquinaria de
adapter caminha pelo diretório genericamente.
