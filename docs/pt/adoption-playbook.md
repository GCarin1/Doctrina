# Playbook de adoção — Doctrina num projeto multi-agente existente

> Tradução da [versão em inglês](../en/adoption-playbook.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Um passo a passo concreto, guiado por comandos, para o caso mais comum no
mundo real: um **codebase em andamento** com pouca ou nenhuma spec, sem um
`AGENTS.md` compartilhado e sem contexto do app capturado — trabalhado por
**vários agentes ao mesmo tempo** (ex.: Cursor + Copilot + Claude).

Este é o companheiro passo a passo de dois docs conceituais:
[Adoção brownfield](brownfield.md) (os *princípios* — spec just-in-time,
ADRs retroativos) e o [Modelo multi-agente](multi-agent.md) (*por que* um
único `AGENTS.md` é o contrato). Leia esses para o porquê; use este para o
como.

> **A regra de ouro: não faça big-bang.** Doctrina é aditivo e incremental.
> Você não para o desenvolvimento para "escrever todas as specs". Você
> coloca o andaime uma vez e depois faz o backfill de uma capability por
> vez, conforme a toca. Um sprint de specs no dia um produz specs não lidas
> na semana oito (veja [Adoção brownfield](brownfield.md)).

## Fase 0 — Instalar sem quebrar nada

```bash
doctrina init --from .        # dobra um AGENTS.md / README existente em product.md, scaffolda .doctrina/
doctrina init --agent all     # ou escolha: --agent cursor / copilot / claude
```

`init` só adiciona arquivos (`AGENTS.md` + `.doctrina/`); nunca toca no seu
código. `--agent` instala **adapters finos** —
`.cursor/rules/00-doctrina.mdc`, `.github/copilot-instructions.md`,
`CLAUDE.md` — cada um **≤ 30 linhas e cada um um ponteiro para um único
`AGENTS.md`**. O `doctrina validate` força esse teto de 30 linhas, então as
três ferramentas *não conseguem* divergir entre si: há uma fonte de verdade
só.

Registre a própria adoção como um chore (uma mudança que não toca spec):

```bash
doctrina change new 0001-adopt "adoção do scaffolding Doctrina" --chore
```

## Fase 1 — Capturar a intenção (product.md), ainda sem specs

```bash
doctrina intake --text "<a visão do app / um colar do PRD>"
```

Isso armazena a intenção verbatim e imprime o bootstrap playbook. Deixe seu
**agente de maior contexto (ex.: Claude Code)** executá-lo: preencher o
`product.md` — visão, escopo in/out, **critérios de sucesso `[SC1]`…**,
ordem de entrega. Tudo a jusante ancora aqui (`doctrina trace` confere que
cada capability rastreia de volta a um critério de sucesso).

## Fase 2 — Backfill de specs a partir do código (o movimento-chave)

**Não** documente o app inteiro. Use `doctrina metrics` (churn local do git)
para achar as capabilities mais editadas e propensas a bug, e comece por
elas.

Para **trabalho em andamento que você ainda não commitou**, é um comando:

```bash
doctrina work --from-diff
```

Ele lê as mudanças da working tree, ranqueia a capability pelos **arquivos
que você tocou** (não só pelas palavras do prompt), registra os arquivos
alterados sob o `## Why` da proposal e imprime um playbook *code-first* de
backfill: escreva a spec que **descreve o que o código já faz**, com cada
critério de aceitação `[unverified]` até que um teste o prove.

Para **código já commitado**: `doctrina spec new <cap>` e então faça o
agente ler o código e escrever a spec do comportamento *atual*. Mantenha os
dois eixos honestos — `Implementation: partial`, critérios `[unverified]`.
Aí o `doctrina coverage` vira sua **lista de dívida** (não rode `--strict`
ainda; você vai falhar de propósito, e esse é o estado honesto).

## Fase 3 — Capturar o contexto do app como skills

Isso resolve a lacuna de "contexto não capturado" — o conhecimento
procedural que todo agente erra repetidamente:

```bash
doctrina skill new running-locally      # como buildar / rodar
doctrina skill new domain-glossary      # os termos do domínio
doctrina skill new deploy-runbook       # passos de deploy, gotchas
```

Skills carregam **sob demanda** (mantendo o `AGENTS.md` enxuto) e são
indexadas e compartilhadas pelos três agentes. Veja [Skills](skills.md).

## Fase 4 — Ligar o ratchet

```bash
doctrina hooks install     # pre-commit roda validate (agora também pega drift de índice)
doctrina verify --init     # declare seus comandos de typecheck / test / build
doctrina verify --clean    # lint estático de footguns de checkout limpo (dist não buildado, client Prisma não gerado)
```

Rode `verify --clean` *antes* de onboardar mais agentes ou colegas — ele
pega a classe de bug "funciona na minha máquina, quebra num clone novo"
logo de cara. Daqui em diante, trabalho novo entra por `doctrina work`
(spec-first) ou `doctrina work --chore` (infra/docs/build), e o backfill
continua oportunisticamente — toda vez que você tocar uma capability sem
spec, documente-a.

## Trabalhando com Cursor + Copilot + Claude juntos

- **Uma fonte, três bocas.** O `AGENTS.md` é o contrato; os três adapters
  são ponteiros minúsculos para ele. Mantenha o `AGENTS.md` sob seus tetos
  (aviso em 150 linhas, erro em 200) e empurre detalhe para **specs e
  skills**, que os agentes puxam sob demanda com `doctrina context <cap>` e
  `doctrina search`.
- **Orçamentos de contexto diferentes, mesmos artefatos.** Copilot (pequeno,
  inline) e Cursor (rules + retrieval) se beneficiam mais de specs/skills
  curtas; o **Claude Code** roda a CLI direto (`intake`, `work --from-diff`,
  `context`, `validate`). Papéis sugeridos: **Claude** para a destilação
  intake→product e o backfill de specs (síntese de longo contexto);
  **Cursor / Copilot** para implementação in-editor *contra as specs que
  agora existem*. As specs e skills são justamente o que mantém as
  completions de contexto menor consistentes com o projeto.
- **Anti-drift entre agentes.** Como o índice agora é uma verdade só
  (`validate` erra em drift de metadata), três agentes editando em paralelo
  não conseguem dessincronizar o `index.json` em silêncio sem o pre-commit
  pegar.

## Cuidados honestos

1. **Incremental, não um museu.** Faça a spec de uma capability só quando
   for mexer nela. Spec parada vira mentira.
2. **Mantenha os dois eixos honestos.** Fazer backfill com tudo
   `[verified]` é o anti-padrão — deixe `coverage` / `trace` mostrarem a
   dívida.
3. **Right-size suas specs (item 3.7 do review).** A própria spec `cli` da
   Doctrina está grande demais (> 400 linhas) — exemplo vivo de over-spec.
   Mantenha as suas pequenas e divididas por capability.
4. **ADRs retroativos são descobertas, não autoria.** Quando achar uma
   decisão passada no código, escreva o ADR com a data de hoje e uma nota
   "descoberto, não autorado nesta data" (veja
   [Adoção brownfield](brownfield.md)).

## Comece hoje (sequência mínima)

```bash
doctrina init --from . --agent all          # scaffold + alinha os três agentes
doctrina intake --text "<visão/PRD>"        # Claude preenche o product.md
# escolha uma capability quente, então:
doctrina work --from-diff                   # ou: doctrina spec new <cap> + backfill
doctrina skill new running-locally          # capture o contexto que os agentes erram
doctrina hooks install                      # ratchet ligado
```

## Material relacionado

- [Adoção brownfield](brownfield.md) — os princípios (spec just-in-time,
  ADRs retroativos) que este playbook aplica.
- [Modelo multi-agente](multi-agent.md) — por que um único `AGENTS.md` é o
  contrato.
- [Adapters de agente](adapters.md) — os arquivos-ponteiro por ferramenta.
- [Skills](skills.md) — capturar contexto do app como memória procedural sob
  demanda.
- [Workflow](workflow.md) — o ciclo de mudança em que o backfill se encaixa.
- [Gating](gating.md) — quando o pipeline completo se paga.
