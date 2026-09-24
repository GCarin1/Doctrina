# Change 0123-harness-e2e-aborta-primeira — o harness e2e aborta na primeira falha em vez de seguir com estado inválido

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** chore — opened as chore
- **Affects specs:** (none — chore)

## Why

O `assert` do harness imprimia a falha e devolvia o controle:

    function assert(cond, what, detail) {
      if (cond) ok(what);
      else fail(what, detail);
    }

O harness é sequencial e carrega estado: o passo N trabalha sobre o
projeto que o passo N-1 deixou. Então uma asserção reprovada não é uma
linha vermelha entre outras, é o ponto a partir do qual nenhum passo
seguinte significa mais nada.

Quando o caminho do delta sumiu, foi exatamente isso que aconteceu. O
arquivo imprimiu `✗ work scaffolded a prefilled delta` e seguiu; duas
linhas adiante um `readFileSync` sem guarda estourou. O log de CI
terminou num stack trace de `node:fs`, sem contagem final e com o
diretório de scratch vazado em `/tmp`. A frase que nomeava o defeito real
ficou rolagem acima, e quem olhou o fim do log viu um erro de sistema de
arquivos onde havia um defeito de teste.

Custou semanas de leitura errada de um log que já dizia a coisa certa.

## What

Três peças.

`finish()` concentra a saída: imprime a contagem, remove o scratch e sai
com o código certo. Toda saída do harness passa por lá, então nenhuma
saída antecipada pode pular a limpeza ou o resumo.

`assert` para na primeira falha, imprimindo por que parou.

`assertIndependent` cobre o caso legítimo oposto — o sweep de adapters,
onde cada agente recebe um projeto descartável próprio e um adapter ruim
não diz nada sobre o próximo. Ali a varredura completa é a informação
útil, e ela continua completa.

Fecha-se ainda a última porta: um `uncaughtException` vindo de fora de
qualquer asserção também passa a cair em `finish()`, com o stack como
detalhe. Um bug no próprio harness deixa de custar a contagem e a
limpeza.

## Scope boundaries

Não altera nenhuma asserção existente nem o que o harness exercita: o
conjunto de 45 checks é o mesmo antes e depois. Não mexe no `run()` nem
na forma como o CLI é invocado.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Caminho verde: os 45 checks passam contra uma instalação empacotada.
- [x] Caminho vermelho: reintroduzido o defeito original, o harness termina na asserção que falhou, imprime a contagem, sai 1 e não vaza scratch.

## Open questions

Nenhuma.
