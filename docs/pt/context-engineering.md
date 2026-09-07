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
- `doctrina context` **monta o pack para caber num orçamento de
  tokens** em vez de concatenar uma lista. Veja abaixo.

Não shippamos um ranqueador de grafo de código hoje. Se uma change
futura shippar, ele vive ao lado do AGENTS.md como refinamento do
mesmo princípio, não como substituto.

## O orçamento de contexto

Por muito tempo `doctrina context` imprimia uma estimativa de
tokens e não fazia nada com ela. Essa era a distância entre a tese
e a ferramenta: neste repositório, `doctrina context cli` eram 23
arquivos e ~37.900 tokens, dos quais vinte ADRs aceitos eram
~26.200 — **69% do pack**, nada disso selecionado para a tarefa.

A causa é estrutural. **ADRs são imutáveis e nunca se aposentam**,
então toda decisão aceita entra em todo pack, para sempre. O pack
cresce com a *idade* do projeto em vez de com a *tarefa*, e nada
decai para fora dele.

Três mecanismos o limitam (ADR 0022):

**1. Escopo.** Um ADR pode declarar quais capabilities governa:

```markdown
- **Status:** accepted
- **Scope:** billing, reporting
```

Um pack com escopo carrega os ADRs que governam aquela capability
mais todos os sem escopo. **Sem escopo significa global**, então
um projeto que nunca adicionar o header recebe exatamente o pack
que recebia antes — a adoção é opcional, não uma migração.

Ninguém anota à mão uma pasta de documentos imutáveis, então
`doctrina decision scope` propõe um escopo para cada ADR sem
escopo a partir do change arquivado que o cita (esse change já
registra quais specs tocou). Ele imprime sugestões; `--write` as
aplica. Revise-as: um escopo estreito demais esconde uma decisão
do pack que precisava dela.

**2. Orçamento.** Um teto sempre se aplica, resolvido nesta ordem:

```
--budget <n>  >  index.json "config": { "context_budget": <n> }  >  15000
```

**3. Degradação, não truncamento.** Acima do orçamento, um ADR cai para
sua decisão em uma frase e uma spec para seu propósito — do menos
relevante primeiro — antes de qualquer coisa ser descartada. Uma decisão
reduzida a uma frase ainda carrega a decisão; uma omitida não carrega
nada. Truncar nas primeiras N linhas preservaria a seção Context do ADR,
justamente a que menos importa.

Toda degradação e omissão é nomeada no relatório:

```
within budget ~14511 of 15000 tokens (97%) after assembly:
  14 ADRs reduced to title + summary (least relevant first)
  18 parked changes reduced to a queue line — name one to read it in full
  scope an ADR to shrink this permanently: doctrina decision scope --write
```

O **core** — regras raiz, verdade de produto, a spec da capability
nomeada, e a change em foco — nunca é degradado nem descartado. Quando só o
core já excede o orçamento, o comando diz isso e sai com 1: é um achado real
(uma spec grande demais), não algo a esconder atrás de um pack grande demais.

**4. Um backlog é uma fila, não um corpus.** Changes abertas eram core por
inteiro, então o *tamanho da fila* decidia se o read path funcionava —
vinte changes planejadas puseram todo pack acima do teto. Exatamente uma
fica **em foco** e permanece inteira; toda outra vira uma linha de fila
degradável (status, motivo, progresso, specs afetadas). O foco segue a
capability nomeada e a query do `--for`, e é **singular por construção,
nunca adivinhado**: se várias casam igualmente, nenhuma fica em foco.

### Recuperação por tarefa

`--for "<tarefa>"` ranqueia por relevância a uma descrição de
tarefa, então o que sobrevive ao orçamento é o que a tarefa é:

```bash
doctrina context --for "adicionar um gate que checa exit codes"
```

O ranqueamento é uma tupla legível — termos no título, termos no
corpo, depois ocorrências por 1000 caracteres — e não um único
score misturado. Densidade em vez de contagem bruta é
determinante: contagem bruta premia um documento por ser longo, o
que fazia uma spec de 473 linhas superar a spec certa só no volume.

### Sem tarefa, um índice

Sem capability e sem `--for`, não há sobre o que recuperar, então
a resposta honesta é um mapa em vez de um despejo: cada capability
por título e propósito, cada decisão por título e resumo. Nomear
uma capability é como você pede a verdade dela por inteiro.

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
