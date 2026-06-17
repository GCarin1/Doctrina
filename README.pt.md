# Doctrina

```
 ____             _        _             
|  _ \  ___   ___| |_ _ __(_)_ __   __ _ 
| | | |/ _ \ / __| __| '__| | '_ \ / _` |
| |_| | (_) | (__| |_| |  | | | | | (_| |
|____/ \___/ \___|\__|_|  |_|_| |_|\__,_|

  spec-driven · AGENTS.md-native · zero-deps
```

[![CI](https://github.com/GCarin1/Doctrina/actions/workflows/ci.yml/badge.svg)](https://github.com/GCarin1/Doctrina/actions/workflows/ci.yml)

> Framework spec-driven nativo de AGENTS.md para desenvolvimento multi-agente com IA.

**Status:** v0.3.0 — lançado.
**Leia em [inglês](./README.md).**

---

## Por que Doctrina

O gargalo do desenvolvimento assistido por IA não é a geração de código — é a
transferência confiável de intenção e a persistência de contexto entre sessões
e agentes. Doctrina trata especificações como a única fonte da verdade, mantém
decisões de arquitetura como ADRs imutáveis, e orquestra o trabalho por meio
de um coordenador único e linear em vez de agentes paralelos concorrentes.

O nome vem do latim *doctrina* (doutrina) — o texto fundacional que governa
como um corpo de agentes age.

## Princípios de design

1. **Propriedade única de cada fato.** Specs guardam a verdade atual. Changes
   guardam deltas transitórios que fazem merge nas specs e somem. ADRs guardam
   decisões imutáveis. Nenhuma informação tem dois donos.
2. **Verdade ativa pequena e densa.** Arquivos que a IA lê em toda interação
   têm limite de tamanho para combater o efeito "lost in the middle".
3. **Status, não migração de pasta.** Itens são aposentados por status + link,
   não movendo arquivos (exceto changes transitórias que vão para o archive).
4. **Orquestrador único e linear por padrão.** Paralelismo multi-agente é o
   padrão errado para escrita de código — produz decisões implícitas
   conflitantes. Subagentes só para investigação read-only isolada.
5. **Pipeline com gate por valor.** A cerimônia completa só roda quando a
   ambiguidade custa tempo real. Fix de uma linha pula tudo.
6. **Portabilidade sobre invenção.** Doctrina constrói sobre o padrão aberto
   AGENTS.md, sobre ADRs no formato Nygard/MADR, e sobre EARS para requisitos.

## O que está incluído

- Um template `AGENTS.md` aderente ao padrão aberto.
- Um esqueleto `.doctrina/` com `product.md`, `specs/`, `changes/`, `decisions/`,
  `skills/`, `templates/` e `index.json`.
- O CLI `doctrina` (Node.js, zero deps de runtime) com 15 comandos
  (26 operações) cobrindo init, spec, change, decision, skill, analyze,
  clarify, validate, templates, hooks, index, next, metrics, context
  e search.
- Adapters para 12 agentes AGENTS.md-aware (Claude Code, OpenAI Codex CLI,
  Cursor, GitHub Copilot, Gemini CLI, Aider, Windsurf, Continue, Amp, Devin,
  Factory, Jules).
- Seis specs de capability e três ADRs aceitos que descrevem o framework.
- Dois projetos exemplo de referência (Python FastAPI greenfield, TypeScript
  Express brownfield retrofit).
- Documentação bilíngue em inglês e português.

## O que está deliberadamente **fora**

- Uma pasta `memory/`. Adiada até que dor mensurável justifique a complexidade.
  Veja [`.doctrina/decisions/0003-defer-memory-folder.md`](./.doctrina/decisions/0003-defer-memory-folder.md).
- Escritores multi-agente em paralelo. Veja
  [`.doctrina/decisions/0004-single-linear-orchestrator.md`](./.doctrina/decisions/0004-single-linear-orchestrator.md).
- Banco de dados, vector store ou camada RAG.
- Geradores de documentação que produzem conteúdo que humanos nunca leem.
- Telemetria, analytics ou network calls. Veja `SECURITY.md`.

## Layout do repositório

```
AGENTS.md                regras raiz (padrão aberto e portátil)
README.md                versão em inglês
README.pt.md             este arquivo
LICENSE                  MIT
package.json             npm workspaces
.doctrina/               artefatos do framework (product, specs, decisions, skills, templates, index)
docs/en /docs/pt         documentação bilíngue para usuários
examples/                dois projetos de referência (Python FastAPI, TypeScript Express)
packages/doctrina-cli/   fonte do CLI npm
scripts/                 benchmark de performance sintético
```

## Documentação

**📖 Site de documentação:** [gcarin1.github.io/Doctrina](https://gcarin1.github.io/Doctrina/) —
bilíngue (EN/PT), navegação lateral, busca full-text, servido direto da
pasta `docs/` deste repositório via GitHub Pages, sem build (habilite uma
vez em *Settings → Pages → Deploy from a branch → `main` / `docs`*).

A documentação para usuários vive em [`docs/`](./docs/):

- [Começando](./docs/pt/getting-started.md) — instalar, init, primeira feature.
- [Workflow](./docs/pt/workflow.md) — propose → apply → archive.
- [Referência do CLI](./docs/pt/cli-reference.md) — todos os comandos e flags.
- [Adapters](./docs/pt/adapters.md) — Claude Code, Codex CLI, Cursor, Copilot, Gemini CLI, Aider, Windsurf, Continue.
- [LLMs locais](./docs/pt/local-llms.md) — conectar Doctrina a LLaMA, Mistral, Qwen, DeepSeek ou qualquer endpoint OpenAI-compatible.
- [Modelo multi-agente](./docs/pt/multi-agent.md) — como Doctrina coordena ferramentas, fases e humanos sem escritores paralelos.
- [Skills](./docs/pt/skills.md) — memória procedural on-demand: conhecimento especializado "como fazer X" carregado só quando relevante.
- [Engenharia de contexto](./docs/pt/context-engineering.md) — por que a forma do contexto prevê performance mais do que contagem de agentes.
- [Gating](./docs/pt/gating.md) — quando o pipeline completo compensa.
- [Adoção brownfield](./docs/pt/brownfield.md) — guia operacional para instalar Doctrina num codebase existente.
- [Comparação](./docs/pt/comparison.md) — posicionamento honesto vs Spec Kit, Kiro, OpenSpec, BMAD, SpecWeave.
- [Migração](./docs/pt/migration.md) — mapeamentos práticos vindos de Spec Kit, OpenSpec, BMAD, Kiro, SpecWeave.
- [Benchmarks](./docs/pt/benchmarks.md) — números sintéticos de `validate` e `clarify` por tamanho de projeto.
- [Adiado](./docs/pt/deferred.md) — o que deliberadamente não shippamos em v0.1.0 e por quê.

Dois projetos de referência vivem em [`examples/`](./examples/):
um demo FastAPI greenfield em Python e um retrofit Express
brownfield em TypeScript.

Política do projeto: [CONTRIBUTING.md](./CONTRIBUTING.md) · [CHANGELOG.md](./CHANGELOG.md) · [SECURITY.md](./SECURITY.md).
- [Antipatterns](./docs/pt/antipatterns.md) — modos de falha documentados.
- [Validação](./docs/pt/validation.md) — protocolo A/B empírico para decidir se Doctrina compensa.
- [Glossário](./docs/pt/glossary.md) — EARS, ADR, MADR, capability, etc.

As versões em inglês estão em [`docs/en/`](./docs/en/).

## Trabalho anterior e créditos

Doctrina apoia-se em [GitHub Spec Kit](https://github.com/github/spec-kit),
[OpenSpec](https://github.com/Fission-AI/OpenSpec), [AWS Kiro](https://kiro.dev/),
[BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD), no padrão aberto
[AGENTS.md](https://agents.md/) e no formato ADR de Michael Nygard.
Doctrina é uma re-síntese deliberada — não um fork — de suas lições.

## Licença

MIT. Veja [LICENSE](./LICENSE).
