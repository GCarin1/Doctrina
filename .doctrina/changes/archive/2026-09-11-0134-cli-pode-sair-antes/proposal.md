# Change 0134-cli-pode-sair-antes — o CLI nao pode sair antes de ter escrito o que imprimiu, senao a saida trunca em pipe

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** cli

## Why

O entrypoint terminava assim:

    process.exit(code ?? 0);

Quando stdout é um **pipe** — todo `doctrina ... | less`, todo agente que
lê este CLI, todo `spawnSync` da própria suíte — o Node pode ainda não ter
entregue os bytes ao sistema operacional quando aquele callback roda.
`process.exit` derruba o processo imediatamente, e o que estava no buffer
é simplesmente perdido.

Isto não é teórico. Quatro testes falhavam em macOS com Node 20.12 e em
nenhuma outra perna da matriz, todos execuções `--concat` procurando
conteúdo perto do FIM de uma saída longa. O decisivo imprimiu exatamente
uma seção: o `product.md` estava em disco, estava na listagem do pacote, e
a saída do concat parou antes de chegar nele.

O tamanho do buffer de pipe varia por plataforma, e é exatamente assim que
um defeito de truncamento escolhe uma delas e se esconde nas outras. Foi a
instrumentação da change 0133 que permitiu ler isso: sem ela, a falha
dizia apenas que um regex não casou.

O custo real não é o CI vermelho. É que qualquer consumidor que canalize a
saída deste CLI pode receber menos do que o comando imprimiu, sem erro e
sem aviso. O `--concat` carrega no código o comentário "Keep the pack
pipeable", e perder o fim de um pipe é a única forma de quebrar essa
promessa.

## What

O entrypoint passa a definir `process.exitCode` em vez de chamar
`process.exit`. O Node encerra sozinho quando o trabalho acaba, e escoar o
stdout faz parte do trabalho.

Três testes fixam a promessa em toda plataforma, não só onde o buffer é
pequeno: o mecanismo no próprio fonte, um pacote `--concat` longo que
chega inteiro por pipe com a última seção completa, e a igualdade byte a
byte entre o que um pipe recebe e o que um arquivo recebe.

## Scope boundaries

Não toca os `process.exit` de `scripts/` — `check-docs.js` e
`e2e-packed.mjs` são ferramentas de build cuja saída é curta e vai para o
terminal do CI, e o harness já concentra a saída em `finish()`.

Não muda nenhum código de saída. Os cinco previstos foram conferidos um a
um depois da troca.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Vinte e cinco comandos continuam saindo sozinhos, nenhum pendura.
- [x] Os códigos de saída 0, 1, 2 e 3 seguem sendo emitidos onde eram.
- [x] O pacote que um pipe recebe é byte a byte igual ao que um arquivo recebe.

## Open questions

Nenhuma. Se a perna macOS ficar verde na próxima execução, a entrada do
`deferred.md` sobre ela pode ser fechada citando esta change.
