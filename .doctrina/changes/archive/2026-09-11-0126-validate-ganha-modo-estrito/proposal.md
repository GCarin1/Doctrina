# Change 0126-validate-ganha-modo-estrito — validate ganha um modo estrito que trata warning como erro, para o passo de CI dos exemplos poder reprovar

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** runtime (confident; signals: ci) — opened anyway (--force)
- **Affects specs:** gates

## Why

`validate` classifica o que encontra em erros e warnings, e sempre saiu
apenas sobre os erros. Esse padrão está certo para uma pessoa no
terminal: um warning é conselho, e conselho que bloqueia commit deixa de
ser lido.

Está errado para quem existe justamente para reprovar. O passo de CI que
valida os exemplos publicados roda `validate`. Os dois exemplos derivaram
para warnings. O passo reportou verde em toda execução por semanas,
enquanto o defeito de EARS que o exemplo do retrofit existe para ensinar
a evitar morava dentro dele pela segunda vez.

Não foi descuido de quem lê o log: não havia o que ler. O gate rodava,
encontrava as duas coisas, imprimia as duas, e saía 0. Um gate que não
consegue dizer não é um gate só no nome.

Aberto com `--force`: o classificador de faixa segurou o prompt como
RUNTIME pela palavra "CI", e a skill `triage-holds-work-on-the-machinery`
cobre exatamente esse falso positivo. O requisito de fato não existe,
então é produto.

## What

`doctrina validate --strict` passa a contar warnings contra o código de
saída, sob o mesmo nome que `coverage --strict` e `trace --strict` já
usam para isso: reprovar em qualquer lacuna.

O padrão continua leniente. O que muda é que a escolha passa a existir, e
ela pertence a quem chama — pessoa quer conselho, gate quer veredito.

Quando não há erro algum e mesmo assim a saída é 1, o comando diz por
quê, para que o código não pareça um bug.

O passo dos exemplos no `ci.yml` passa a usar `--strict`, que é o que
impede a terceira regressão. `--json` carrega `strict` no payload, para
que um agente leia o modo em que a checagem rodou em vez de deduzi-lo.

Documentado em `docs/en/cli-reference.md` e `docs/pt/cli-reference.md`,
em paridade.

## Scope boundaries

Não reclassifica nada: o que era warning continua warning e o que era
erro continua erro. Mudar a severidade de um check é decisão por check, e
não é esta.

Não passa `--strict` no passo de self-validate do próprio repositório,
que hoje tem um warning legítimo em aberto — a spec `gates` acima do teto
de 400 linhas. Aquilo é dívida com change própria, e transformá-la em
falha de CI por tabela seria esconder uma decisão dentro de outra.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Uma árvore cujo único achado é warning sai 1 sob `--strict` e 0 sem ele.
- [x] Uma árvore sem nada a dizer continua saindo 0 sob `--strict`.
- [x] Os dois exemplos publicados passam sob `--strict`.

## Open questions

Nenhuma.
