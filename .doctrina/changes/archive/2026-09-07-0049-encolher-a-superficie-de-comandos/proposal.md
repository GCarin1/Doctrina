# Change 0049-encolher-a-superficie-de-comandos — encolher a superficie de comandos

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** cli, insight, authoring

## Why

a superficie ja nao cabe no orcamento de quarenta linhas que o proprio projeto declarou e o comentario admite que um momento inteiro foi comprimido para caber, mas nenhum comando foi cortado; fundir ou depreciar constitution, change diff e clarify com evidencia do log de uso

## What

Começa a cortar a superfície de comandos, com evidência em vez de opinião.

- `constitution` vira `prime --rules`: ele já imprime os títulos das ADRs aceitas e conta os não-objetivos.
- `change diff` funde em `change check --verbose`: `check` já executa cada bloco de ops em memória contra a spec alvo, o que é uma prévia mais forte.
- `clarify` é decidido por ADR: o ADR 0026 o mantém — o bootstrap o invoca, e ele é checklist, não juízo.
- Tudo entra como depreciação anunciada, com alias funcionando, nunca como remoção direta.
- Deltas em `specs/cli` (a convenção de depreciação), `specs/insight` (`prime --rules`) e `specs/authoring` (`change check --verbose`).

Achado F23 da auditoria. `SURFACE_LINE_BUDGET` é 40 linhas e o comentário admite que o
momento "Maintain" foi comprimido em uma linha para caber. O teto é a força que deveria
cortar comandos, e ainda não cortou nenhum.

## Scope boundaries

- Nada é removido nesta change: são depreciações com alias e aviso.
- `watch` fica de fora: a sua utilidade muda depois que a change 0032 lhe der capacidade de agir.
- `spec set` fica de fora: ele contorna o ciclo de mudança e merece a sua própria discussão.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] `prime --rules` produz o mesmo conteúdo que `constitution` produzia.
- [x] `change check --verbose` cobre o que `change diff` mostrava.
- [x] Os nomes depreciados seguem funcionando e imprimem o aviso.
- [x] O bloco de superfície regenerado cabe no orçamento de 40 linhas com folga.

## Open questions

- **`clarify`: delegar ou cortar? — Resolvido pelo ADR 0026: nenhum dos dois,
  ele fica.** A premissa do achado ("hoje nenhum driver o invoca") é falsa, e
  era ela que sustentava o argumento: o
  `.doctrina/templates/playbooks/bootstrap.md.template` roda `doctrina clarify
  --all` como passo do bootstrap que o agente executa — ou seja, em todo
  projeto que nasce de um intake. A outra metade do argumento ("detectar
  ambiguidade é semântico") é verdadeira e não é argumento para remoção: o
  `clarify` não afirma detectar ambiguidade, ele aplica uma lista fixa de
  weasel words e placeholders e mostra onde casou. Isso é checklist, não
  juízo, e a CLI pode rodar checklists (ADR 0005).
- **Qual evidência basta para depreciar? — Resolvido: REDUNDÂNCIA demonstrada
  por teste, não contagem de uso.** É a mesma distinção que decidiu o
  `clarify`. Um log de uso mostra que um comando é pouco usado; só a
  redundância mostra que ele é desnecessário, e um comando pouco usado que faz
  algo que nada mais faz precisa ficar. Por isso as duas aposentadorias desta
  change são FUSÕES, e cada uma tem um teste que compara as saídas: o
  `constitution` imprime byte a byte o que `prime --rules` imprime, e cada
  linha do `change diff` aparece no `change check --verbose`. Isso também
  dispensa esperar por um log opt-in cuja amostra deste repositório nunca
  representaria os adotantes — a pergunta ficaria aberta para sempre.
