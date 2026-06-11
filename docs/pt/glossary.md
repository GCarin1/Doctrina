# Glossário

> Tradução da [versão em inglês](../en/glossary.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Definições curtas dos termos que Doctrina usa. Fontes linkadas
quando não-óbvias.

## ADR — Architecture Decision Record

Documento curto (uma a duas páginas) que registra uma única
decisão arquiteturalmente significativa: título, status, contexto,
decisão, alternativas, consequências. Doctrina usa o
[formato Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
e as extensões [MADR](https://adr.github.io/madr/) para
alternativas explícitas. Uma vez `Status: accepted`, um ADR é
imutável exceto pelos headers `Status:` e `Superseded by:`.

## AGENTS.md

Um padrão aberto para o arquivo de fonte-de-verdade operacional
na raiz de um projeto. Introduzido pela OpenAI em agosto/2025,
doado à Linux Foundation's Agentic AI Foundation em
dezembro/2025. Adotado por Codex, Cursor, Claude Code (via
import de `CLAUDE.md`), Copilot, Devin, Gemini CLI e muitos
outros. Doctrina constrói sobre esse padrão em vez de inventar
o próprio (ADR 0001).

## Adapter

Um arquivo-ponteiro fino instalado por
`doctrina init --agent <nome>` que direciona um agente que
prefere outro nome de arquivo (como `CLAUDE.md` do Claude Code
ou `.cursor/rules/*.mdc` do Cursor) ao `AGENTS.md` canônico.
Adapters não carregam regras próprias e têm cap de 30 linhas.

## Apply

A ação de fazer merge dos deltas de spec de um change nas specs
afetadas. Deltas ADDED escrevem um arquivo de spec novo. Deltas
REMOVED deletam um arquivo. Deltas MODIFIED requerem merge
manual.

## Archive

O ato de mover uma pasta de change aplicado de
`.doctrina/changes/<id>/` para
`.doctrina/changes/archive/YYYY-MM-DD-<id>/`. Changes arquivados
viram memória episódica e saem do caminho de leitura padrão do
agente.

## Brownfield

Um projeto onde Doctrina é introduzido num codebase existente
com testes rodando, usuários reais e convenções existentes.
Contraste com greenfield. OpenSpec se chama "brownfield-first";
Doctrina herda essa postura.

## Capability

A unidade de verdade num conjunto de specs do Doctrina. Uma
capability é uma fatia coerente de comportamento de sistema
("billing", "authentication", "search") e tem exatamente um
`spec.md` em qualquer momento. O slug de capability deve casar
com `[a-z][a-z0-9-]*`.

## Change

Uma unidade de trabalho. Vive em `.doctrina/changes/<id>/`
enquanto ativo e em
`.doctrina/changes/archive/YYYY-MM-DD-<id>/` depois de aplicado.
Contém `proposal.md`, `tasks.md`, `design.md` e zero ou mais
deltas em `specs/<capability>/delta.md`.

## CLAUDE.md

O arquivo que Claude Code lê automaticamente ao iniciar num
projeto. O adapter de Claude no Doctrina é um `CLAUDE.md` fino
que `@`-importa `AGENTS.md`.

## Delta

Uma mudança de spec empacotada dentro de uma pasta de change.
Carrega um header `Operation:` (`ADDED`, `MODIFIED` ou `REMOVED`)
e um caminho de spec alvo. ADDED e REMOVED são aplicados
automaticamente por `doctrina change apply`. MODIFIED requer
merge humano.

## Dogfooding

Usar uma ferramenta para construir a ferramenta. O próprio repo do
Doctrina é construído usando Doctrina desde o commit 1 — todo
commit reflete um exercício real do workflow.

## EARS — Easy Approach to Requirements Syntax

Uma gramática pequena para escrever requisitos em cinco formas:
ubiquitous (`the system shall...`), event-driven (`when X, the
system shall...`), state-driven (`while X, the system shall...`),
unwanted-behaviour (`the system shall not...`) e optional
(`where X, the system may...`). Templates de spec do Doctrina
usam cabeçalhos EARS.

## Greenfield

Um projeto construído do zero com Doctrina desde o dia um.
Contraste com brownfield. A maioria dos frameworks SDD brilha em
greenfield e sofre em brownfield; Doctrina mira ambos.

## Index

`.doctrina/index.json`. O único arquivo JSON que cataloga todo
artefato (specs, decisions, changes abertos, archive) com id,
caminho, status, versão e datas. Lido pelo `doctrina validate`.

## MADR

Um template moderno de ADR que estende o original de Nygard com
alternativas explícitas. O `decision.md.template` do Doctrina é
MADR-adjacente.

## Memória (episódica, semântica, procedural)

A literatura de memória de agentes
([CoALA](https://arxiv.org/abs/2309.02427) e trabalhos de follow-up
de Princeton) divide conhecimento durável em três tipos:

- **Memória episódica** — o log do que aconteceu. Em Doctrina, as
  pastas de change arquivadas em `.doctrina/changes/archive/` são
  episódicas.
- **Memória semântica** — o que é verdade agora. Em Doctrina, as
  specs de capability sob `.doctrina/specs/` são semânticas, e os
  ADRs accepted sob `.doctrina/decisions/` são decisões semânticas.
- **Memória procedural** — como agir. Em Doctrina, o `AGENTS.md` e
  os adapters por agente são procedurais.

O que diferencia "lembrar" de "aprender" é o passo de consolidação:
experiências episódicas repetidas viram memória semântica (um
gotcha recorrente vira requisito de spec, uma escolha de design
recorrente vira ADR). Sem essa disciplina de consolidação, memória
episódica só acumula. Este é o modo de falha que o ADR 0003 cita
ao adiar a pasta `memory/`.

## Materialise

Usado neste codebase para significar "escrever o corpo do delta
no caminho da spec alvo durante o apply". Uma spec materializada
é a verdade ativa produzida por um delta ADDED.

## Orchestrator

O componente que coordena as fases do workflow. O orquestrador de
referência do Doctrina é um loop único e linear (ADR 0004). Pode
fanout subagentes para investigação read-only, mas nunca para
escrita paralela. Veja [multi-agent.md](multi-agent.md) para o
modelo operacional.

## Propose

O ato de abrir um change com `doctrina change new`. O change
começa com `Status: proposed`. Um proposal vira `applied` só
quando `doctrina change apply` termina sem erros e sem deltas
MODIFIED manuais.

## Spec

`.doctrina/specs/<capability>/spec.md`. A descrição canônica de
como uma capability funciona hoje. Usa EARS para requisitos.
Atualizada aplicando deltas, nunca editada freehand fora do
workflow de change.

## Skill

`.doctrina/skills/<slug>.md`. Memória procedural on-demand: um
arquivo curto e especializado "como fazer X bem" que um agente
carrega só quando uma tarefa específica casa. Frontmatter
carrega campos `name`, `description` e `when` para que agentes
decidam barato se carregam o corpo completo. Complementa o
`AGENTS.md` (procedural-always) sem substituir. Veja
[skills.md](skills.md) para design e semântica de loading
por agente.

## Spec-driven development (SDD)

Uma disciplina de desenvolvimento em que especificações são a
fonte de verdade e código é um artefato secundário gerado ou
verificado. Mapeado em detalhe por Spec Kit, OpenSpec, Kiro,
BMAD e muitos outros. Doctrina é uma síntese das lições desse
corpo de trabalho.

## Supersede

O ato de substituir um ADR aceito com um novo ADR. O ADR antigo
mantém o corpo e ganha `superseded by NNNN` no header `Status:`.
O novo ADR carrega `Supersedes: <antigo>`. Os dois são linkados
bidireccionalmente.

## Validate

`doctrina validate`. Roda checagens de schema e estrutura contra
a árvore `.doctrina/`. Sai 0 sem erros. Pensado para pre-commit
hooks.
