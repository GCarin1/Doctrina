# Change 0143-close-checa-deriva-indice — o close checa a deriva de indice depois do passo que a escreve, nao antes

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** gates
- **Documented surface:** n/a — nomeia passos do close para situar a ordem; nenhum comando, flag ou código de saída muda

## Why

A change 0142 consertou a causa: o índice era escrito de duas formas
diferentes pelos dois caminhos que o escrevem. Esta change responde a
outra pergunta, e a mais incômoda das duas — por que o `close` deixou
aquilo passar.

O check de deriva já rodava. Ele está entre os oito do `verify`, e o
`verify` é um passo bloqueante do `close`. Só que o `verify` fica cinco
passos antes do `archive`, e o `archive` é o último passo que ESCREVE o
índice.

Então o `close` certificou um índice que ainda não tinha sido escrito. Ele
não estava errado sobre o que checou; checou antes do estrago.

O passo final, o `validate`, não substitui: deriva de ordenação só aparece
reconstruindo o índice e comparando, e o `validate` deliberadamente não
reconstrói — fazê-lo a cada execução trocaria um defeito por uma lentidão.

Foi assim que a change 0138 fechou verde sobre uma árvore derivada, o
commit subiu, e as seis pernas de teste do CI ficaram vermelhas no push
seguinte.

## What

A sequência declarada do `close` ganha um passo `index-drift`, bloqueante,
**depois** do `archive`:

    ... docs → archive → index drift → validate

O runner é in-process, como todos os outros: o `close` não inicia
subprocesso do próprio binário, e há critério que o cobra.

A declaração é a mesma que o `doctor` e a action de CI leem, e o passo
entra só na sequência do `close` — a do `ci` é outra chave, então o
`action.yml` não muda e o teste que o fixa byte a byte segue verde.

## Scope boundaries

Não remove o check de dentro do `verify`. Lá ele serve a outra pergunta —
"a árvore estava sã quando o trabalho começou" — e continua útil antes do
apply.

Não faz o `validate` reconstruir o índice, pelo motivo acima.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] O passo é declarado depois do archive, e um teste lê a sequência para afirmar isso.
- [x] Um índice cuja ordem diverge de um rebuild reprova o close, mesmo com o `validate` passando.
- [x] Um close limpo deixa um índice com que o rebuild concorda.

## Open questions

Nenhuma.
