# Modelo multi-agente

> Tradução da [versão em inglês](../en/multi-agent.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Doctrina é vendido como framework para desenvolvimento multi-agente
com IA. Este doc explica o que essa frase significa neste projeto e
o que não significa. A justificativa arquitetural está no
[ADR 0004](../../.doctrina/decisions/0004-single-linear-orchestrator.md);
este é o guia operacional.

## O que multi-agente significa em Doctrina

Doctrina é multi-agente em três sentidos concretos:

1. **Múltiplas ferramentas compartilham um contexto canônico.** O
   `AGENTS.md` do projeto é lido nativamente pelo OpenAI Codex CLI,
   pelo Claude Code (via o adapter `CLAUDE.md` com `@`-import), pelo
   Cursor (via o adapter `.cursor/rules/00-doctrina.mdc`) e por
   outras ferramentas AGENTS.md-aware. Qualquer agente que apareça
   lê as mesmas regras.
2. **As mesmas fases de workflow podem ser conduzidas por agentes
   diferentes em sequência.** Você pode usar Claude para esboçar
   spec, Codex CLI para implementação e outra ferramenta para
   review. A fronteira da fase é o ponto de handoff.
3. **Um orquestrador único pode fanout subagentes read-only.**
   Dentro de uma fase, um orquestrador pode delegar tarefas
   isoladas e read-only (busca no codebase, parsing de output de
   lint, scan de segurança, retrieval) a subagentes que retornam
   contexto resumido.

Doctrina **não** é multi-agente neste sentido: não roda múltiplos
agentes escritores em paralelo contra o mesmo artefato. Essa
escolha é deliberada e o resto deste doc explica por que e o que
fazer em vez disso.

## O modelo que funciona

```
              intenção humana
                   |
                   v
            +-----------------+
            |  orquestrador   |   único, linear, segura o trace inteiro
            +-----------------+
                   |
   spec  ->  plano  ->  implementar  ->  revisar  ->  curar
     |        |             |              |           |
     |        |             |              |           |
     |        |             v              v           |
     |        |        read-only       read-only       |
     |        |        subagentes      subagentes      |
     |        |        (busca,         (lint,          |
     |        |        retrieval)      testes,         |
     |        |                        segurança)      |
     |        |                                        |
     +--------+----- triggers de ADR --------+---------+
                   |
                   v
            gates de aprovação humana
```

Três propriedades:

- **Um escritor por artefato por vez.** Quem está editando o
  `proposal.md` é o único editando. Mesma coisa para arquivos de
  spec, ADRs e código.
- **Trace compartilhado.** Cada passo vê o trabalho do passo
  anterior. Sem silos de contexto por papel.
- **Fanout de leitura é permitido.** Subagentes que só leem
  (buscam no codebase, parseiam relatório de lint, recuperam
  changes anteriores, scaneiam segredos) podem rodar em paralelo
  e streamar resumos de volta.

## Por que não agentes paralelos baseados em papel

O padrão intuitivo "monte um time de especialistas IA" (Analyst,
PM, Architect, PO, Dev, QA, etc.) é a alternativa dominante em
frameworks SDD de 2025–2026. Espelha como times humanos dividem
trabalho e vende bem. O registro empírico é desfavorável para
trabalho de código:

- *Don't Build Multi-Agents* da Cognition argumenta que subagentes
  paralelos que não compartilham o trace inteiro tomam decisões
  implícitas conflitantes. O merge dessas decisões é código
  incoerente.
- A Anthropic, broadly bullish em multi-agente, declara
  explicitamente que orchestrator-worker fanout é "menos efetivo
  para tarefas fortemente interdependentes como codificação" e
  custa cerca de 15× mais tokens que uma sessão de chat única
  (fonte: [How we built our multi-agent research system](https://www.anthropic.com/engineering/built-multi-agent-research-system),
  blog de engenharia da Anthropic, junho de 2025). Escrita de
  código é o pior caso de interdependência.
- O próprio Claude Code usa subagentes só para investigação
  read-only; nunca spawneia escritores de código paralelos.

Doctrina herda esses achados como restrições de design. Rótulos
de papel ("Architect", "Tester", "Reviewer") são permitidos como
**personas de prompt que o orquestrador único adota em
sequência**, nunca como processos paralelos disputando os mesmos
arquivos.

## Patterns práticos

### Personas, não processos paralelos

Se você quer um "modo Architect" para design e um "modo Tester"
para review, troque a persona do orquestrador entre fases. Mesmo
agente, mesmo contexto, prompt de enquadramento diferente. Sem
problema de coordenação porque não há concorrência.

As cinco personas canônicas que o orquestrador adota em sequência:

| Fase | Persona | Trabalho | Output | Gate humano? |
|------|---------|----------|--------|--------------|
| Intent | **Spec / PO** | Refinar o pedido em requisitos EARS; matar ambiguidade. | Nova spec ou proposal de change com delta. | Aprovação da spec. |
| Plan | **Plan / Architect** | Produzir `design.md` e `tasks.md`; trazer à tona decisões arquiteturais. | Arquivos de plano + drafts de ADR se necessário. | Decisões em escolhas irreversíveis. |
| Execute | **Implement / Dev** | Implementar tarefas contra a spec aprovada. | Commits de código. | Nenhum (ou review de PR). |
| Verify | **Review / Tester** | Rodar lint, testes, scan de segurança, `doctrina validate`; checar consistência cross-artefato. | Relatório pass/fail. | Nenhum — read-only, pode rodar como subagente. |
| Curate | **Curator** | Fazer merge dos deltas aplicados, arquivar o change, atualizar o index. | Specs atualizadas + archive mais limpo. | Nenhum para trabalho mecânico; humano para qualquer promoção de memory (quando `memory/` existir). |

Essas são **personas de prompt**, não agentes separados. Trocar
persona significa trocar o prompt de enquadramento que o mesmo
orquestrador usa; o trace e os artefatos em disco são o contexto
compartilhado através da troca.

### Subagentes read-only

Seguros para fanout:

- Busca no codebase ("ache todo call site de `processOrder`").
- Retrieval sobre changes ou ADRs anteriores.
- Parsing de output de lint ou testes.
- Scan de segurança estático (Semgrep, Bandit, etc.).
- Análise de log de build.

Cada subagente retorna texto. O orquestrador decide o que fazer
com o texto. Subagentes nunca escrevem em artefatos do repo.

### Gates de aprovação humana

Doctrina tem dois checkpoints naturais human-in-the-loop:

- Após esboço da spec e antes da implementação: o humano aprova a
  spec ou o proposal do change. Aqui a ambiguidade morre.
- Antes de uma decisão arquitetural ser registrada: o humano
  aprova ou edita o ADR antes do status flipar de `proposed` para
  `accepted`.

Um gate human-in-the-loop não é feature multi-agente; é a ausência
de uma. O orquestrador pausa, o humano lê, o orquestrador retoma.

### Múltiplos humanos no mesmo change

Dois revisores comentando num PR é OK. Dois humanos editando o
mesmo `proposal.md` ao mesmo tempo é o mesmo hazard de dois
agentes escritores: decisões implícitas conflitantes. Trate
igual — serialize as edições, compartilhe o trace, ou divida em
changes separados.

### Multi-agente entre fases

Você pode fazer handoff entre agentes nas fronteiras de fase.
Fluxo exemplo:

- Claude Code esboça a spec e o proposal do change.
- Humano aprova.
- Codex CLI implementa o change contra a spec aprovada.
- Humano aprova.
- Claude Code conduz o review (resumo de lint, resultados de
  teste, checagem de consistência da spec).
- O orquestrador (qualquer ferramenta) arquiva o change.

Cada agente possui uma fase. Nenhum se sobrepõe a outro. Os
artefatos em `.doctrina/` são o trace compartilhado.

## Quando a linha fica borrada

| Situação | Veredito |
|----------|----------|
| Dois revisores IA rodando checks read-only concorrentes | Seguro. Ambos são read-only; outputs são resumos. |
| Lint local + lint CI ao mesmo tempo | Seguro. Ambos são validadores que produzem relatórios, não artefatos em `.doctrina/`. |
| Um agente e um humano editando o mesmo `proposal.md` | Hazard. Mesmo artefato, dois escritores. Serialize. |
| Dois changes em andamento em capabilities disjuntas | Seguro. Artefatos diferentes, sem escritor compartilhado. |
| Um subagente que "só faz um patch pequeno" | Hazard. O "arquivo pequeno" é um slot de escritor; no momento que um subagente escreve, a regra de não-paralelizar-escritores se aplica a ele. |

## Material relacionado

- [Workflow](workflow.md) — como o orquestrador se move pelas fases.
- [Antipatterns](antipatterns.md) — seção 3 nomeia o modo de falha
  que este doc te ajuda a evitar.
- [Adapters](adapters.md) — como cada agente suportado acha o
  `AGENTS.md`.
- ADR 0004 — a decisão arquitetural por trás do orquestrador
  único e linear.
