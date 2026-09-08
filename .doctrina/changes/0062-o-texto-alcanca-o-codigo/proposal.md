# Change 0062-o-texto-alcanca-o-codigo — o texto alcanca o codigo

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain) — opened as chore
- **Affects specs:** (none — chore)

## Why

o contrato ainda aponta o context_budget para o index.json e o AGENTS.md esta em 165 linhas contra o orcamento de 150 que ele mesmo declara

## What

Duas dívidas de texto que ficaram para trás do código. Nenhuma spec muda — é
chore.

- **A8.** A change 0047 mudou a casa declarada do orçamento de contexto para
  `.doctrina/config.json`. O contrato do sistema — o artefato cuja função é
  declarar a fiação — continua dizendo `index.json config.context_budget`. O
  `contract check` não vê porque é prosa dentro de um comentário, e é justamente
  a parte que explica *por quê* que o próximo leitor usa para decidir.
- **A11.** `AGENTS.md` está em 165 linhas contra o orçamento de 150 que o próprio
  contrato declara como OUTPUT. Os blocos gerados obedecem (superfície 39/40); as
  117 linhas de prosa escrita à mão é que estouram — a metade que nenhum gate
  mede. O mecanismo de defesa (`analyze` recusa uma change que resolva o estouro
  subindo o teto) nunca dispara, porque ninguém sobe o teto: convive-se com o
  aviso.

Para o AGENTS.md há duas saídas honestas, e a escolha é editorial: cortar ~15
linhas de prosa, ou mover o número com o argumento escrito — que é exatamente o
que a linha do contrato pede que aconteça.

## Scope boundaries

- Não mexe nos blocos gerados do AGENTS.md nem no orçamento da superfície.
- Não transforma o cap do AGENTS.md em erro: ele segue soft.

## Verification


- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [ ] O contrato aponta a casa atual do `context_budget`.
- [ ] `doctrina validate` não avisa mais sobre o tamanho do AGENTS.md, ou o novo teto está registrado com o argumento que o justifica.

## Open questions

- Nenhuma.
