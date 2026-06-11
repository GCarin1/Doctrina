# Skills

> Tradução da [versão em inglês](../en/skills.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Uma **skill** é memória procedural on-demand: um arquivo curto e
especializado "como fazer X bem" que um agente carrega só quando
uma tarefa específica casa. Skills complementam `AGENTS.md`
(memória procedural always-loaded) sem substituir.

## Modelo de duas dimensões

A taxonomia de memória CoALA divide conhecimento durável em dois
eixos. Doctrina mapeia assim:

| Tipo | Carregado | Artefato Doctrina |
|------|-----------|-------------------|
| Procedural · sempre | toda interação | `AGENTS.md` + arquivos pointer de adapter |
| Procedural · on-demand | só quando relevante | **skills** (este doc) |
| Semântica · verdade atual | ordem de leitura de spec | `.doctrina/specs/<cap>/spec.md` |
| Semântica · decisão | quando relevante | `.doctrina/decisions/NNNN-*.md` (ADRs) |
| Episódica | raramente (debugging) | `.doctrina/changes/archive/` |

Skills preenchem a célula "procedimento especializado, não em
toda interação". Sem elas, ou você incha AGENTS.md com
instruções de nicho (token tax em toda interação) ou perde o
conhecimento completamente (todo agente reinventa).

## Como uma skill se parece

```
.doctrina/skills/db-migration.md
```

```markdown
---
name: db-migration
description: Como adicionar, modificar ou reverter migrações de banco com segurança.
when: agente é pedido pra mudar schema, adicionar migration ou reverter uma.
---

# Skill — db-migration

## Quando usar esta skill

A frase de trigger em `when:` mais este parágrafo.

## Procedimento

1. Rode `make db-status` pra ver o estado atual do schema.
2. ...

## Antipatterns

- ...

## Material relacionado

- [spec de billing](../specs/billing/spec.md)
```

Três campos de frontmatter obrigatórios:

- `name` — deve casar com o slug do filename.
- `description` — uma frase que agentes lêem barato decidindo se
  devem carregar o corpo completo.
- `when` — uma frase descrevendo o trigger.

O corpo usa as mesmas regras de densidade do AGENTS.md: comandos
exatos, guard-rails explícitos, checagens verificáveis.

## Quando escrever uma skill

Três triggers:

1. Um procedimento recorre em múltiplas changes (um padrão de
   migração, um review de segurança, um fluxo de release) e
   atualmente vive em memória tribal.
2. AGENTS.md está estourando o cap de 150 linhas por causa de
   conteúdo especializado que o agente nem sempre precisa.
3. Um bug ou incidente expôs procedimento-faltante como root
   cause.

Dois anti-triggers:

- O conteúdo pertence a uma spec (descreve *o que* o sistema
  faz, não *como* fazer uma tarefa com ele).
- O conteúdo é projeto-wide e sempre-relevante (pertence ao
  AGENTS.md).

## Como skills diferem do `memory/` rejeitado

ADR 0003 adiou uma pasta `memory/` porque seria auto-curada,
propensa a despejar-tudo, vaga e taxante de token. Skills
escapam de cada dimensão:

| Preocupação | Falha de memory/ | Design de skill |
|-------------|------------------|-----------------|
| Auto-curação por LLM | Sim | Não — humano-autorada |
| Crescimento despeja-tudo | Sim | Não — cap 200 linhas, validate enforça |
| Token tax em toda interação | Sim | Não — só on-demand |
| Intent semântico vago | Sim ("lições") | Não — trigger "como fazer X" explícito |
| Documentation theater | Provável | Menor — cada skill tem frase de trigger |

Se `memory/` algum dia shippar numa versão futura, skills
permanecem distintos: skills são procedurais e pré-hoc;
memória consolidada seria pós-hoc e reflexiva.

## Semântica de loading por agente

Doctrina ship a estrutura; como um agente carrega skills cabe ao
runtime. Três patterns honestos:

- **Claude Code**: feature Skills nativa. Aponte Claude Code
  para `.doctrina/skills/` (config única no próprio Claude
  Code); o agente descobre as skills Doctrina pelo caminho
  nativo.
- **Outros agentes com contexto de arquivo**: AGENTS.md menciona
  `.doctrina/skills/` na ordem de leitura. Agentes que
  escaneiam o workspace vão ver os arquivos de skill e seu
  frontmatter; corpos completos carregam quando o agente decide
  relevância, ou quando o usuário referencia uma skill
  manualmente.
- **LLMs locais via Aider / Continue**: igual a "outros
  agentes". O usuário referencia uma skill específica no chat
  (por exemplo digitando `/add .doctrina/skills/db-migration.md`
  no Aider) quando quer o procedimento carregado.

O framework não força semântica de loading em agente nenhum;
fornece o layout do diretório e o enforcement do validate.

## CLI

```sh
# Esqueletizar nova skill a partir do template, indexada automaticamente.
doctrina skill new db-migration

# Read-only: listar skills com suas descriptions.
doctrina skill list

# Espelhar a description do frontmatter de cada skill no index.json.
doctrina skill sync
```

`doctrina validate` caminha por `.doctrina/skills/` e avisa em:

- Campo de frontmatter obrigatório faltando (`name`,
  `description` ou `when`).
- Arquivos de skill acima do cap de 200 linhas (warning a 150).
- Campo `name:` que não bate com o slug do filename.
- Description do frontmatter divergente da registrada no
  `index.json` (`doctrina skill sync` restaura).

Todos warnings, não erros — consistente com o resto do validate.

## Antipatterns específicos de skills

- **Skill que duplica uma spec**. Specs dizem O QUE, skills
  dizem COMO. Se você está repetindo conteúdo de spec, delete
  a skill.
- **Skill que deveria estar em AGENTS.md**. Se toda tarefa
  dispara, não é on-demand. Mova para AGENTS.md.
- **Skill com cláusula `when:` vaga** ("quando o agente está
  codando"). O agente não consegue casar trigger tão amplo. Seja
  específico.
- **Skill escrita por LLM sem revisão humana**. O achado do ETH
  Zurich se aplica aqui também — contexto não-curado degrada
  resultados.

## Material relacionado

- [Workflow](workflow.md) — onde skills cabem no ciclo.
- [Engenharia de contexto](context-engineering.md) — por que
  loading on-demand importa para economia de token.
- [Multi-agente](multi-agent.md) — como skills se relacionam com
  o modelo de personas-fase.
- [Glossário](glossary.md) — a entrada da taxonomia de memória
  CoALA.
