# Change 0035-o-pack-de-contexto-nunca-bloqueia — o pack de contexto nunca bloqueia

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** gates

## Why

mudancas abertas sao tier CORE e nunca degradam, entao um backlog legitimo de trabalho faz todo pack estourar o teto e o gate sair 1; o tamanho do projeto nunca deve bloquear o read path, entao changes abertas precisam degradar e ranquear como o resto

## What

Mudanças abertas deixam de ser núcleo irredutível em `src/commands/context.js`. Hoje
elas entram no tier `CORE`, que nunca degrada e nunca é descartado, então o tamanho do
backlog — trabalho legítimo — decide se o read path funciona.

- Novo tier `CHANGE`, ranqueado por `--for` e pela capacidade nomeada.
- Forma degradada de uma change: H1, `## Why` e o placar de tarefas — o suficiente para saber que ela existe e do que trata.
- Novo degrau na escada de `fitToBudget`, antes de descartar qualquer coisa.
- O gate só sai 1 quando o núcleo real (AGENTS.md, product.md, a spec nomeada) não cabe.
- A spec que uma query `--for` aponta inequivocamente também entra no CORE — `--for` é nomear a capacidade, indiretamente.
- Delta em `specs/gates`.

Medido neste repositório: com zero changes abertas os packs já ocupam 95–99% do teto,
e uma única change vazia leva `scaffolding` a 100%. O backlog desta auditoria (20
changes) estoura todos os packs e derruba o gate `Context budget` do CI — um projeto
não pode ser bloqueado por ter trabalho planejado.

## Scope boundaries

- Não altera o teto padrão de 15000 nem a linha `context-pack` da tabela Budgets do contrato.
- Não muda a ordem de leitura documentada: as changes seguem depois das specs e antes das ADRs.
- Não filtra changes por `--diff`: elas continuam sempre presentes, ainda que resumidas.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Com as 20 changes deste backlog abertas, todo pack de capacidade fica dentro do teto.
- [x] A change em foco (a que casa `--for` ou a capacidade nomeada) nunca degrada.
- [x] O gate segue saindo 1 quando o núcleo real, sozinho, não cabe.
- [x] O job `Context budget gate` do `ci.yml` volta a passar com o backlog aberto.

## Open questions

- ~~Qual change é "em foco": a que casa `--for`, a que toca a capacidade nomeada, ou a mais recente?~~ **Resolvido: a líder inequívoca**, ranqueada por (toca a capacidade nomeada, relevância da query). Empate significa NENHUMA em foco. Descoberto rodando: `context cli` casa cinco changes igualmente, e eleger a de menor número dava status CORE a uma change por um motivo que o leitor não consegue ver — o pack decidindo silenciosamente no que você está trabalhando. "A mais recente" foi descartada pelo mesmo motivo.
- ~~Uma change sem `## Why` escrito degrada para quê?~~ **Resolvido:** `[status] no rationale written yet.` — o `analyze` recusa esse estado, mas o `context` roda antes dele, então a forma degradada precisa ser honesta sobre a lacuna em vez de ficar vazia.
- Surgiu durante a implementação e foi incluído: a mesma regra de líder inequívoca promove ao CORE a **spec** que uma query `--for` aponta. Sem isso, numa árvore onde uma spec é metade do orçamento (a `gates` são 7.483 tokens), a resposta a "do que trata esta tarefa?" era justamente o que era resumido para caber.
