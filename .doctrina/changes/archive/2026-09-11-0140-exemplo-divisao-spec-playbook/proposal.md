# Change 0140-exemplo-divisao-spec-playbook — o exemplo de divisão de spec no playbook conta as três divisões

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** chore — opened as chore
- **Affects specs:** (none — chore)

## Why

O playbook de adoção usa a história real deste repositório para ensinar a
dimensionar specs, e contava só o primeiro capítulo: a `cli` estourou o
teto de 400 linhas e virou `cli` + `gates`.

Desde então aconteceu mais duas vezes. A `gates` entregou sua metade
somente-leitura para `insight`, e agora o `validate` saiu de `gates` para
`structure`.

Contado uma vez, o episódio se lê como um acidente. Contado três, vira a
lição que a seção existe para dar: uma spec que estoura o teto uma vez vai
estourar de novo, e é isso que justifica dividir por responsabilidade em
vez de aparar prosa para caber.

Falta também o que a terceira divisão ensinou e as duas primeiras não
tinham como ensinar: medir os eixos antes de escolher. O eixo mais
tentador — o que a própria Purpose da spec sugeria — devolvia 20 linhas e
deixaria a spec acima do teto, com uma capacidade a mais para manter.

## What

O item 3 das "Honest cautions" passa a contar as três divisões, nomeando a
ADR 0028 para quem quiser o raciocínio completo, e acrescenta a medição
como parte do método.

Em EN e PT, em paridade.

## Scope boundaries

Não mexe na skill `split-an-oversized-spec`, que descreve o procedimento e
já está correta. Este item do playbook é o argumento de por que dividir; a
skill é o como.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] `check-docs` segue limpo com a paridade EN/PT preservada.

## Open questions

Nenhuma.
