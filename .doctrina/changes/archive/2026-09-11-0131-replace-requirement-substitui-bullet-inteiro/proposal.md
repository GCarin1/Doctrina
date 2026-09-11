# Change 0131-replace-requirement-substitui-bullet-inteiro — replace-requirement substitui o bullet inteiro, nao so a primeira linha, e a prosa orfa que ele deixou sai das specs

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product (confident; signals: requirement)
- **Affects specs:** authoring

## Why

`replaceRequirement` trocava apenas a primeira linha do bullet:

    loc.lines[real[n - 1]] = `${indent}- ${value}`;

Um requisito EARS frequentemente se estende por linhas de continuação
indentadas. Todas elas sobreviviam à troca e ficavam embaixo do requisito
novo, indentadas, lendo-se como parte dele.

O resultado não é cosmético. O texto órfão é a versão ANTERIOR do
requisito, então a spec enuncia um contrato e o contradiz duas linhas
abaixo. Num framework cujo argumento inteiro é que a spec é a única fonte
de verdade, um requisito que se contradiz em silêncio é a pior avaria
possível — pior que um requisito ausente, porque um ausente ninguém
obedece por engano.

E já tinha acontecido quatro vezes, nesta própria árvore, sem que
ninguém lesse as duas metades lado a lado:

- `gates` — a sequência de close, descrita sem os passos `review` e
  `runtime` que ela hoje tem.
- `gates` — o conjunto do doctor, descrito sem a linha de runtime.
- `gates` — o gate manual do `verify`, descrito sem o registro do commit
  e dos caminhos cobertos.
- `insight` — o `prime --rules`, descrito numa forma anterior.

`appendRequirement` aprendeu essa lição na 0.13.0 e ganhou o helper
`endOfItem`, com um comentário explicando o estrago. `replaceRequirement`
foi escrito depois e nunca o adotou.

## What

`replaceRequirement` passa a substituir o item inteiro, usando o
`endOfItem` que já existia para isto.

Os quatro fragmentos órfãos saem das specs `gates` e `insight`. O que
fica em cada requisito é a versão viva, que já era a primeira linha.

Dois testes cobrem o verbo contra um fixture cujo bullet do meio se
estende por três linhas — o formato que o fixture antigo não tinha, e é
por isso que o bug passou. O segundo teste guarda o outro lado: a
numeração continua sendo por bullet, não por linha, senão trocar o
terceiro requisito reescreveria a continuação do segundo.

## Scope boundaries

Não toca `replaceCriterion`: um critério de aceitação é numerado e de uma
linha só por construção, e o verbo dele não tem esta falha.

Não reescreve nenhum requisito além da remoção dos órfãos. O texto que
permanece é exatamente o que já estava na primeira linha de cada bullet.

Não resolve o teto de 400 linhas da spec `gates`, que cai de 441 para 426
com a limpeza mas segue acima. A divisão daquela spec é trabalho próprio.

## Nota sobre o fechamento forçado

O gate de documentação do `close` acusou superfície alterada — `verify` e
`--rules` — e foi fechado com `--force`.

O gate leu os tokens do texto REMOVIDO. Nenhuma superfície mudou: os
fragmentos órfãos descreviam comportamento anterior, e a documentação já
descrevia o atual antes desta change. `docs/en/cli-reference.md` já
documenta `--signoff` com os `paths` e o registro em
`.doctrina/verify.signoffs.json` (linhas 1388-1481), e já aponta
`prime --rules` como a forma preferida (linha 1792).

Documentar aqui seria reescrever o que já está certo. O gap fica
registrado no ledger com esta explicação.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Trocar um requisito que se estende por linhas não deixa nenhuma delas para trás.
- [x] Uma varredura por toda a árvore não encontra mais fragmentos órfãos.

## Open questions

Nenhuma.
