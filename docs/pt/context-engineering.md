# Engenharia de contexto

> Tradução da [versão em inglês](../en/context-engineering.md). O
> inglês é a fonte de verdade; este arquivo o segue.

Este doc explica o que Doctrina chama de "engenharia de contexto"
e por que investir em artefatos densos e bem-escopados retorna
mais do que investir em topologia de agentes. As decisões
arquiteturais estão nos ADRs; este é o guia de princípios.

## Por que engenharia de contexto importa mais que contagem de agentes

Na avaliação BrowseComp, a Anthropic mediu que **uso de tokens
sozinho explica 80% da variância em performance de tarefas**
(fonte: [How we built our multi-agent research system](https://www.anthropic.com/engineering/built-multi-agent-research-system),
blog de engenharia da Anthropic, junho de 2025). A variância
restante divide-se entre número de chamadas de ferramenta e
escolha de modelo. Adicionar mais agentes, mais
papéis ou mais paralelismo — os movimentos para os quais a
literatura multi-agente naturalmente puxa — não move esses 80%.
Re-moldar o que o agente lê move.

O design do Doctrina segue os dados: um orquestrador, um AGENTS.md
canônico por escopo, caps de tamanho, regras de ordem de leitura,
archive fora do caminho de leitura padrão. Cada decisão de
framework que parece "menos" em vez de "mais" é downstream desse
achado.

## Densidade de sinal em AGENTS.md

AGENTS.md é lido a cada interação. Cada linha é paga em tokens, em
atenção e na penalidade lost-in-the-middle que bate quando o
contexto cresce. Três regras:

- **Comandos exatos batem conselho.** Escreva `uv run pytest tests/unit/ -v`,
  não "rode os testes". O agente copia; conselho é ignorado.
- **Fronteiras explícitas batem intenção educada.** Escreva "não
  toque em `/legacy`", não "tenha cuidado com código legado".
  Fronteiras são regras; intenção é decoração.
- **Critérios de "done" verificáveis batem adjetivos.** Escreva
  "funções devem ter menos de 30 linhas", não "mantenha funções
  pequenas". O limiar é o critério.

O soft cap de 150 linhas e o hard cap de 200 linhas que `doctrina
validate` impõe no AGENTS.md existem porque densidade cai à medida
que o comprimento sobe. Um AGENTS.md de 400 linhas raramente é
melhor que um de 100 linhas; geralmente é menos acionável.

## Seleção em vez de despejar

A arte prévia mais influente em seleção de contexto do lado do
agente é o repo map do Aider. Aider constrói um grafo de código
com tree-sitter, ranqueia nós via PageRank sobre o grafo de
dependências, e envia ao agente só o código mais bem ranqueado
que cabe num orçamento de tokens (default 1k). A lição
generaliza: **contexto não é "despeje tudo que o agente possa
querer"; é "ranqueie por relevância e mande a fatia mais útil
sob um orçamento".**

Doctrina implementa a lição no nível dos artefatos, não no nível
do grafo de código:

- AGENTS.md prescreve uma **ordem de leitura** (este arquivo,
  depois `product.md`, depois a spec da capability em que você
  está trabalhando, depois qualquer change aberto, depois ADRs
  aceitos). A ordem é o ranqueamento.
- O archive de changes está fora do caminho de leitura padrão.
  Contexto histórico é alcançável mas não carregado por padrão.
- Caps de tamanho em AGENTS.md, specs e ADRs são enforcement de
  orçamento disfarçado.

Não shippamos um ranqueador de grafo de código hoje. Se uma change
futura shippar, ele vive ao lado do AGENTS.md como refinamento do
mesmo princípio, não como substituto.

## Hierarquia e escopo

Um único AGENTS.md raiz é o mínimo. À medida que um repositório
cresce, a hierarquia "AGENTS.md mais próximo vence" permite que
subsistemas carreguem suas próprias regras sem poluir o arquivo
global (veja [adapters.md](adapters.md) para detalhes e a
referência das 88 pastas da OpenAI).

A hierarquia é uma forma de escopo progressivo. O sistema de
regras do Cursor oferece quatro modos de escopo que cobrem o
mesmo espaço:

| Modo | Quando dispara | Equivalente Doctrina |
|------|----------------|----------------------|
| Always Apply | Toda requisição | `AGENTS.md` raiz, o adapter Cursor do Doctrina |
| Auto-Attached (globs) | Quando o arquivo editado casa com glob | Um `AGENTS.md` aninhado num subdiretório |
| Agent-Requested | O agente busca por descrição | Não modelado diretamente; cite specs pelo nome |
| Manual (`@nome`) | Usuário invoca por nome | Não modelado; usuários abrem specs à mão |

Doctrina ship só o pattern Always Apply no seu adapter Cursor. Os
outros três são refinamentos definidos pelo usuário em cima, não
mandatos do framework.

## Compartilhando contexto entre projetos

Aprendizado cross-projeto é o problema mais difícil não-resolvido
do espaço de frameworks de agentes. O pattern pragmático que a
pesquisa recomenda é um **repositório de conventions**: um repo
pequeno que possui um AGENTS.md base (mais snippets compartilhados
opcionais) e é importado ou copiado em novos projetos no init.

Doctrina suporta isso de forma leve:

1. Mantenha um repo, ex: `org/conventions`, cuja raiz tem um
   `AGENTS.md` curado mais seções de estilo de casa (convenções
   de commit, orientação de PR template, bullets de do-and-do-not
   de estilo de código).
2. Em `doctrina init` num novo projeto, depois que o framework
   esqueletiza o `AGENTS.md` local, cole o conteúdo de conventions
   ou `@`-importe (Claude Code) antes do conteúdo
   projeto-específico.
3. Quando o repo de conventions atualiza, projetos puxam o novo
   conteúdo manualmente. Não há sync automático; isso
   re-introduziria o problema de staleness e regras conflitantes
   que o princípio single-source-of-truth existe para evitar.

Isso não é feature de framework. É uma convenção que Doctrina
respeita mas não enforça. Uma change futura pode shippar uma flag
`doctrina init --from <repo>` se demanda justificar.

## Antipatterns específicos de contexto

Três de [antipatterns.md](antipatterns.md) são sobre qualidade de
contexto diretamente:

- #5 — Inchar AGENTS.md passando o soft cap.
- #6 — Tratar o archive como verdade viva.
- #10 — Refinamento iterativo sem review de segurança (caso
  especial de contexto driftando silenciosamente à medida que o
  mesmo código é "polido" muitas vezes).

O ortogonal que não está nessa lista: **confiar em qualquer
contexto que o agente gerar sem curadoria.** O resultado do
ETH Zurich AGENTbench é inequívoco — arquivos de contexto
escritos por LLM reduziram sucesso da tarefa em 0,5–2% e elevaram
custo de inferência em 20–23%. A implicação para usuários do
Doctrina: qualquer artefato que um humano não revisou é passivo,
não ativo.

## Material relacionado

- [Workflow](workflow.md) — o ciclo pelo qual os artefatos se
  movem.
- [Adapters](adapters.md) — integração por agente e a seção de
  AGENTS.md aninhado.
- [Antipatterns](antipatterns.md) — modos de falha que erros de
  contexto produzem.
- [Modelo multi-agente](multi-agent.md) — como orquestração se
  relaciona com forma do contexto.
- [Validação](validation.md) — medir se o contexto que você
  shippa paga seu custo.
