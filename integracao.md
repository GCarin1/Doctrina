# Cenário: adotar Doctrina num projeto em andamento (Cursor + Copilot + Claude)

Esse cenário — código existe, faltam specs/agentes/skills — é exatamente o que os ADRs 0005 e 0010 miram. A regra de ouro: **não faça big-bang**. Doctrina é aditivo e incremental; adote em fases, capability por capability, sem parar o desenvolvimento.

## Fase 0 — Instalar sem quebrar nada (1 comando)

```bash
doctrina init --from .            # dobra um AGENTS.md/README existente em product.md, scaffolda .doctrina/
doctrina init --agent all         # ou: --agent cursor / copilot / claude
```

Isso resolve a carência de agentes: os três adapters instalados (`.cursor/rules/00-doctrina.mdc`, `.github/copilot-instructions.md`, `CLAUDE.md`) são ponteiros ≤30 linhas para um único `AGENTS.md`. O `validate` força esse teto — então Cursor, Copilot e Claude não conseguem divergir entre si: há uma fonte de verdade só. Commite isso como chore:

```bash
doctrina change new 0001-adopt "adopt Doctrina scaffolding" --chore
```

## Fase 1 — Capturar a intenção (product.md), ainda sem specs

```bash
doctrina intake --text "<visão/PRD do app>"   # imprime o bootstrap playbook
```

Deixe o Claude Code fazer esse passo (é o de maior contexto): preencher `product.md` — visão, escopo in/out, critérios de sucesso `[SC1]...`, ordem de entrega. Tudo depois ancora aqui (`doctrina trace`).

## Fase 2 — Backfill de specs a partir do código (o movimento-chave)

Não documente o app inteiro. Use `doctrina metrics` (churn local) para achar as capabilities mais editadas/bugadas e comece por elas. Para WIP não commitado, é literalmente um comando (F8):

```bash
doctrina work --from-diff         # lê o git diff, ranqueia a capability pelos arquivos tocados (F10),
                                  # e imprime o playbook "code-first": escreva a spec que
                                  # DESCREVE o que o código já faz
```

Para código já commitado: `doctrina spec new <cap>` → o agente lê o código e escreve a spec do comportamento atual.

Honestidade obrigatória: critérios nascem `[unverified]` até um teste citá-los; `Implementation: partial`. O `doctrina coverage` vira sua lista de dívida (não rode `--strict` no começo — você vai falhar de propósito, e tudo bem).

## Fase 3 — Capturar o contexto do app como skills

A carência de skills se resolve aqui — exatamente o conhecimento que os 3 agentes erram repetidamente:

```bash
doctrina skill new running-locally      # como subir/buildar
doctrina skill new domain-glossary      # termos do domínio
doctrina skill new deploy-runbook       # passos de deploy, gotchas
```

São carregadas sob demanda (mantêm o `AGENTS.md` enxuto) e indexadas/compartilhadas pelos três agentes.

## Fase 4 — Ligar o ratchet (e aí, escalar agentes)

```bash
doctrina hooks install            # pre-commit roda validate (agora pega drift de índice — F5)
doctrina verify --init            # declare typecheck/test/build
doctrina verify --clean           # pega footguns de checkout limpo ANTES de onboardar mais devs/agentes (F7)
```

## O específico de Cursor + Copilot + Claude juntos

- **Uma fonte, três bocas:** `AGENTS.md` é o contrato; os adapters são ponteiros finos. Mantenha o `AGENTS.md` no teto (warn 150 / error 200) e empurre detalhe para specs + skills, que os agentes puxam sob demanda via `doctrina context <cap>` / `doctrina search`.
- **Orçamentos de contexto diferentes:** Copilot (inline, pequeno) e Cursor (rules + retrieval) se beneficiam mais das specs/skills curtas; Claude Code roda a CLI direto (pode fazer intake, backfill, context, validate). Sugestão de papéis: Claude na destilação intake→product e no backfill de specs (long-context); Cursor/Copilot na implementação in-editor contra as specs que agora existem. As specs + skills são justamente o que torna as completions de contexto menor consistentes com o projeto.
- **Anti-drift entre agentes:** como o índice agora é uma verdade só (`validate` erra em drift de metadata, ADR 0009), três agentes mexendo em paralelo não conseguem deixar o `index.json` mentir sem o pre-commit pegar.

## Cuidados honestos

1. **Incremental, não museu:** só faça a spec de uma capability quando for mexer nela. Spec parada vira mentira.
2. **Dois eixos sempre:** backfill com tudo `[verified]` é o anti-padrão — deixe coverage/trace mostrarem a dívida.
3. **Right-sizing (3.7):** o próprio `cli/spec.md` deste repo está em 476 linhas (>400) — exemplo vivo de over-spec.

## Em resumo

capability quente → `work --from-diff` (ou `spec new` + backfill) → `skill new` para o contexto que os agentes erram → `hooks install`. Daí, toda mudança nova entra por `work` (ou `work --chore`), e o backfill continua oportunisticamente.
