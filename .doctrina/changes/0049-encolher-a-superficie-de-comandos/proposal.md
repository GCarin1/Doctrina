# Change 0049-encolher-a-superficie-de-comandos — encolher a superficie de comandos

- **Status:** proposed
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** cli

## Why

a superficie ja nao cabe no orcamento de quarenta linhas que o proprio projeto declarou e o comentario admite que um momento inteiro foi comprimido para caber, mas nenhum comando foi cortado; fundir ou depreciar constitution, change diff e clarify com evidencia do log de uso

## What

Começa a cortar a superfície de comandos, com evidência em vez de opinião.

- `constitution` vira `prime --rules`: ele já imprime os títulos das ADRs aceitas e conta os não-objetivos.
- `change diff` funde em `change check --verbose`: `check` já executa cada bloco de ops em memória contra a spec alvo, o que é uma prévia mais forte.
- `clarify` é decidido por ADR: delegar ao agente ou cortar. Detectar ambiguidade é semântico por natureza e nenhuma lista de weasel-words generaliza; hoje nenhum driver o invoca.
- Tudo entra como depreciação anunciada, com alias funcionando, nunca como remoção direta.
- Delta em `specs/cli`.

Achado F23 da auditoria. `SURFACE_LINE_BUDGET` é 40 linhas e o comentário admite que o
momento "Maintain" foi comprimido em uma linha para caber. O teto é a força que deveria
cortar comandos, e ainda não cortou nenhum.

## Scope boundaries

- Nada é removido nesta change: são depreciações com alias e aviso.
- `watch` fica de fora: a sua utilidade muda depois que a change 0032 lhe der capacidade de agir.
- `spec set` fica de fora: ele contorna o ciclo de mudança e merece a sua própria discussão.

## Verification

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [ ] `prime --rules` produz o mesmo conteúdo que `constitution` produzia.
- [ ] `change check --verbose` cobre o que `change diff` mostrava.
- [ ] Os nomes depreciados seguem funcionando e imprimem o aviso.
- [ ] O bloco de superfície regenerado cabe no orçamento de 40 linhas com folga.

## Open questions

- `clarify`: delegar ao agente (mantendo o CLI determinístico) ou cortar? Precisa de ADR antes de qualquer código.
- Qual evidência basta para depreciar? O log de uso é opt-in, então a amostra deste repositório pode não representar os adotantes.
