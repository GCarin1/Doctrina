# Migrando para Doctrina

> Tradução da [versão em inglês](../en/migration.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Mapeamentos práticos dos cinco frameworks SDD mais citados de
2025–2026 para seus equivalentes Doctrina. Cada seção assume que
você já usa o framework-fonte e quer trazer seu trabalho sem
perder contexto.

## Princípios gerais

O que se mantém vindo de qualquer dos cinco fontes:

- **Specs como verdade.** Todo framework-fonte trata
  especificações como artefatos duráveis. Doctrina mantém esse
  contrato; só o caminho em disco e o nome mudam.
- **Decisões arquiteturais como registros.** Doctrina usa ADRs
  Nygard/MADR; qualquer forma que seu fonte use, o conteúdo
  mapeia um-para-um.
- **Requisitos EARS** se mantêm verbatim onde você os usou. O
  template de spec do Doctrina ship cabeçalhos EARS.

O que **não** se mantém:

- Topologias de agentes por papel (BMAD). Doctrina rejeita
  escritores paralelos pelo ADR 0004; rótulos de papel viram
  personas de fase que o orquestrador único adota em sequência.
- Arquivos de contexto gerados por LLM. O resultado ETH Zurich
  AGENTbench é a razão; qualquer framework que ship esses
  arquivos não deve portá-los sem revisão.
- Endpoints de telemetria, network calls, sync remoto. Doctrina
  é zero-deps e offline; compartilhamento cross-projeto é o
  pattern manual de conventions-repo (veja
  `context-engineering.md`).

## Vindo do Spec Kit

| Artefato Spec Kit | Equivalente Doctrina |
|-------------------|----------------------|
| `.specify/memory/constitution.md` | Os ADRs aceitos (`0001`, `0003`, `0004` neste repo) mais a seção de princípios de design do README |
| `/speckit.specify` slash command | `doctrina spec new <capability>` |
| `/speckit.plan` slash command | `proposal.md` + `design.md` dentro de uma pasta de change |
| `/speckit.tasks` slash command | `tasks.md` dentro de uma pasta de change |
| `/speckit.implement` slash command | O passo de implementação no workflow (sem comando dedicado) |
| `/clarify` quality gate | `doctrina clarify <path>` |
| `/checklist` quality gate | A seção `## Acceptance criteria` em toda spec Doctrina |
| `/analyze` quality gate | `doctrina analyze <change-id>` |

Esboço da migração:

1. `doctrina init` no seu projeto.
2. Leia seu `constitution.md`. Cada regra não-negociável vira ou
   um ADR (escolhas arquiteturais) ou uma linha no novo
   `AGENTS.md` (regras operacionais).
3. Para cada `spec.md` existente sob sua árvore Spec Kit, rode
   `doctrina spec new <slug>` e cole o conteúdo relevante no
   corpo da nova spec.
4. Para trabalho em andamento, abra um `doctrina change new` por
   `plan.md` ativo, copie o plano para `design.md`, as tarefas
   para `tasks.md`, e prossiga.

## Vindo do OpenSpec

OpenSpec é arquiteturalmente o mais próximo do Doctrina. A
mudança se parece mais com um rename do que com uma migração.

| Caminho OpenSpec | Caminho Doctrina |
|------------------|------------------|
| `openspec/specs/<capability>/spec.md` | `.doctrina/specs/<capability>/spec.md` |
| `openspec/changes/<id>/proposal.md` | `.doctrina/changes/<id>/proposal.md` |
| `openspec/changes/<id>/tasks.md` | `.doctrina/changes/<id>/tasks.md` |
| `openspec/changes/<id>/design.md` | `.doctrina/changes/<id>/design.md` |
| `openspec/changes/<id>/specs/<cap>/delta.md` | `.doctrina/changes/<id>/specs/<cap>/delta.md` |
| `openspec/changes/archive/` | `.doctrina/changes/archive/` |
| `openspec validate` | `doctrina validate` |
| Schema custom `spec-driven-with-adr` | `.doctrina/decisions/` first-class |

Esboço da migração:

1. `doctrina init` no seu projeto.
2. Mova `openspec/` para `.doctrina/` (`git mv` serve; a
   semântica de delta ADDED/MODIFIED/REMOVED é idêntica).
3. Se você usou o schema `spec-driven-with-adr`, seus arquivos
   ADR vão direto para `.doctrina/decisions/` e ganham o
   cabeçalho padrão do Doctrina.
4. Rode `doctrina validate`. Qualquer drift aparece como warning.

## Vindo do BMAD-METHOD

| Artefato BMAD | Equivalente Doctrina |
|---------------|----------------------|
| Arquivos de persona (Analyst, PM, Architect, Dev, QA, etc.) | Personas de fase que o orquestrador único adota em sequência (veja `multi-agent.md`) |
| Story file (por task, contexto autocontido) | A pasta de change (`proposal.md` + `tasks.md` + `design.md` + delta) |
| PRD / plano de arquitetura da fase de Planning | `.doctrina/product.md` mais ADRs aceitos |
| Config `bmad-core` | Combinação de `AGENTS.md` (operacional) e `.doctrina/product.md` (visão/escopo) |

Esboço da migração:

1. `doctrina init` no seu projeto.
2. O insight do story-file (pacote de handoff autocontido)
   transfere diretamente para a pasta de change. Seus story
   files existentes viram proposal/tasks/design dentro de uma
   change.
3. Os prompts de agente por papel comprimem em personas que o
   mesmo orquestrador troca. Veja `multi-agent.md` para as cinco
   personas canônicas.
4. Mova conteúdo do PRD para `.doctrina/product.md` e decisões
   de arquitetura para ADRs via
   `doctrina decision new "<title>"`.

## Vindo do AWS Kiro

| Artefato Kiro | Equivalente Doctrina |
|---------------|----------------------|
| `.kiro/specs/<feature>/requirements.md` (user stories + EARS) | `.doctrina/specs/<cap>/spec.md` (seção EARS Requirements) |
| `.kiro/specs/<feature>/design.md` | Dentro da pasta de change: `design.md` |
| `.kiro/specs/<feature>/tasks.md` | Dentro da pasta de change: `tasks.md` |
| `.kiro/steering/product.md`, `structure.md`, `tech.md` | `AGENTS.md` raiz (operacional) mais `.doctrina/product.md` (visão) |
| Agent Hooks (on-save) | `doctrina hooks install` (pre-commit) mais `templates/hooks/watch.sample` (on-save) |
| Integração Kiro IDE | Qualquer agente AGENTS.md-aware que seu time usa |

Esboço da migração:

1. `doctrina init` no seu projeto.
2. Steering files se fundem no novo `AGENTS.md` raiz. Mantenha
   abaixo do soft cap de 150 linhas; corte qualquer coisa não-
   operacional.
3. Cada pasta de feature vira uma spec de capability (o conteúdo
   do requirements.md) mais uma pasta de change arquivada (o
   design.md + tasks.md do mesmo feature Kiro).
4. Instale o pre-commit hook; pareie com o watch sample para
   validação on-save.

## Vindo do SpecWeave

O diferenciador primário do SpecWeave é a largura de skills
por-agente. O conjunto de adapters thin-pointer do Doctrina
(doze agentes suportados, cada adapter com menos de 30 linhas)
é trade-off deliberado; se seu time depende de skills
específicas SpecWeave para outros
agentes, a migração é principalmente uma decisão de adoção do
AGENTS.md.

| Artefato SpecWeave | Equivalente Doctrina |
|--------------------|----------------------|
| Skill packs por-agente | Arquivos de adapter sob `.doctrina/templates/adapters/<agent>/`; doze agentes são suportados out of the box, mais podem ser adicionados por contribuição |
| Arquivos de spec SpecWeave | `.doctrina/specs/<cap>/spec.md` |
| Comando validate SpecWeave | `doctrina validate` |

Esboço da migração:

1. `doctrina init --agent all` para instalar todos os adapters
   suportados.
2. Mova cada spec para `.doctrina/specs/<cap>/spec.md`.
3. Se seu time usa um agente que Doctrina ainda não ship adapter,
   contribua via uma change (veja CONTRIBUTING.md e os adapters
   existentes como referência — adapters têm menos de 30 linhas
   cada).

## Depois da migração

Uma vez que suas specs e ADRs estão em `.doctrina/`:

- Rode `doctrina validate` para confirmar que a árvore está
  bem-formada.
- Rode `doctrina clarify` em cada spec migrada; as convenções de
  linguagem do framework-fonte podem sinalizar smells.
- Leia `gating.md` e aplique a pergunta de gating ao trabalho em
  andamento antes de abrir novas changes — hábitos antigos de
  frameworks com mais cerimônia (Spec Kit, BMAD) tendem a
  over-spec no início.

## Material relacionado

- [Comparação](comparison.md) — posicionamento vs cada
  framework-fonte em quinze dimensões.
- [Workflow](workflow.md) — o ciclo Doctrina pelo qual seus
  artefatos migrados se movem.
- [Brownfield](brownfield.md) — aplique as regras brownfield mesmo
  para specs migradas; a regra just-in-time ainda ajuda.
