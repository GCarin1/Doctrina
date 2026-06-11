# Workflow

> Tradução da [versão em inglês](../en/workflow.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Este doc explica como o trabalho se move por um projeto Doctrina.
Leia [getting-started.md](getting-started.md) antes, se ainda não
leu.

## O ciclo

Toda mudança não-trivial passa por quatro fases coordenadas por um
orquestrador único e linear (você, ou um agente de IA agindo em
seu nome):

```
intenção -> spec  ->  plano  ->  implementar  ->  revisar  ->  curar
```

1. **Intenção → spec.** Você descreve o que quer. O agente refina o
   pedido em uma nova spec de capability ou um proposal de change
   com delta. Ambiguidade morre aqui.
2. **Spec → plano.** A pasta do change ganha um `tasks.md` e, se
   não-trivial, um `design.md`. Decisões arquiteturais viram ADRs.
3. **Plano → implementar.** Código é escrito contra a spec
   aprovada.
4. **Implementar → revisar.** Lint, testes e `doctrina validate`
   rodam. Deltas de spec entram nas specs afetadas.
5. **Revisar → curar.** A pasta do change é arquivada. O index é
   atualizado. O próximo ciclo começa.

Não há agentes paralelos escrevendo em fase nenhuma. Subagentes
podem explorar o codebase para contexto, mas só um escritor toca um
dado artefato por vez. Veja [multi-agent.md](multi-agent.md) para o
modelo operacional e o ADR 0004 para a justificativa.

## Ciclo de vida de um change

```
.doctrina/changes/<id>/                          (Status: proposed)
  proposal.md
  tasks.md
  design.md
  specs/<capability>/delta.md

# doctrina change apply <id>
#   ADDED   -> escreve .doctrina/specs/<capability>/spec.md
#   REMOVED -> deleta esse arquivo
#   MODIFIED -> merge manual; o CLI imprime o ponteiro
#   proposal.md Status: flip proposed -> applied

# doctrina change archive <id>
.doctrina/changes/archive/YYYY-MM-DD-<id>/       (Status: applied)
```

Após arquivar, o change é **memória episódica**. Doctrina
deliberadamente mantém ele fora do caminho de leitura padrão do
agente. Se você precisa saber como uma capability **costumava**
ser, leia o archive. Se você precisa saber como ela **é hoje**,
leia a spec.

A pasta de change funciona também como pacote de contexto
autocontido para handoffs entre fases (e, se você troca agentes
entre fases, entre agentes). É o mesmo insight que o "story
file" do BMAD-METHOD implementa: a unidade de trabalho carrega
tudo que a próxima fase precisa ler, então contexto não vaza por
histórico de chat ou estado de sessão. A pasta de change do
Doctrina é o equivalente — o benefício de workflow é mantido sem
comprar a topologia de agentes-por-papel do BMAD.

## Ciclo de vida de uma decisão

```
proposed  -> accepted  -> superseded by NNNN
             |             |
             |             +-- novo ADR carrega Supersedes: <antigo>
             |
             +-- ADRs accepted são imutáveis exceto os
                 headers Status: e Superseded by:
```

Editar o corpo de um ADR aceito é a falha operacional canônica de
frameworks SDD. Doctrina previne isso por convenção e pelo ADR
0001. O único comando que toca um ADR existente é
`doctrina decision supersede`, e ele toca somente os dois headers
mencionados.

## Como specs e changes interagem

Uma spec é a verdade atual: "é assim que billing funciona hoje". Um
change é um delta proposto: "é isto que eu quero que billing faça
diferente". Um delta vive só enquanto não é aplicado. Após aplicar,
o delta vira parte da spec; após arquivar, a pasta do change é
história.

O diff entre duas versões de uma spec é o resultado cumulativo de
cada delta aplicado. O archive é o log de como a spec chegou lá.

## Formas especializadas de change

### Pattern de bug-spec

Para bugs não-triviais, o projeto Kiro recomenda uma forma de três
seções que impede o agente de over-fixar ou fixar a coisa errada.
Coloque no `proposal.md` do change (ou no delta se o bug revela
um requisito ausente):

- **Comportamento atual:** o que o sistema faz hoje, exato.
- **Comportamento esperado:** o que deveria fazer, exato.
- **Comportamento inalterado:** o que precisa continuar funcionando.
  É o guard-rail que impede "fixar o bug, quebrar duas features
  adjacentes".

Um delta é apropriado quando o bug revela que a spec estava errada
ou silenciosa. Um commit só de código (sem pasta de change) basta
quando a spec está certa e o código que driftou.

### Pattern de refactor

Um refactor muda estrutura sem mudar comportamento observável. A
pasta de change para refactor se apoia no `design.md` mais do que
no delta:

- O delta é frequentemente **REMOVED depois ADDED** para a
  capability afetada (o corpo da spec muda de forma mesmo que o
  comportamento externo não), ou sem delta nenhum (reshape só de
  código).
- O `design.md` é o artefato que carrega o peso: explica o
  trade-off, a nova estrutura, e quais consequências o time aceita.
- Refactors de qualquer tamanho **geralmente** ganham um ADR. A
  decisão de reshape é em si arquiteturalmente significativa; se
  não é, o refactor provavelmente é pequeno o suficiente para pular
  a cerimônia de change.

### Skills como complemento, não estágio

Skills não são estágio do workflow. São memória procedural
on-demand carregada quando uma tarefa específica casa. Uma
pasta de change captura um delta transitório; uma skill captura
um procedimento durável. Agentes pegam a skill relevante em
qualquer estágio onde o trigger dispara. Veja
[skills.md](skills.md) para o design.

## Quando pular o ciclo

O ciclo completo é overhead. Pule quando o custo excede a economia
de ambiguidade. Veja [gating.md](gating.md) para gatilhos
concretos. Versão curta: se você não ficaria irritado com um agente
interpretando o requisito de forma diferente da sua intenção, você
não precisa de spec.

## Memória

Doctrina v0 e v1 entrega dois tipos de memória: specs (semântica,
verdade atual) e o archive de changes (episódica, histórico). Não
há pasta `memory/`. O terceiro bucket (lições consolidadas) foi
adiado pelos motivos documentados no ADR 0003. Se você tem uma
lição durável que não cabe em spec ou ADR, escreva em um doc sob
`docs/pt/`. Se isso virar recorrente, proponha adicionar `memory/`
em um change futuro.
