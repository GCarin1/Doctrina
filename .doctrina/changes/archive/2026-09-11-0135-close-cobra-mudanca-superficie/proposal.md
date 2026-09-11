# Change 0135-close-cobra-mudanca-superficie — o close cobra que uma mudanca de superficie chegue ao changelog, nao so a documentacao

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** chore (confident; signals: changelog, so a documentacao)
- **Affects specs:** gates

## Why

O gate de documentação do `close` pergunta uma coisa: um leitor consegue
aprender **como** isso funciona? Ele cobra `docs/`, `README.md` e
`README.pt.md`, e para aí.

Ninguém perguntava se um leitor consegue descobrir **que** isso mudou. E
a segunda pergunta não é respondida pela primeira. Prosa descrevendo o
comportamento novo se lê exatamente como prosa que sempre o descreveu; é
o changelog que carrega a data e o fato da mudança.

Sem ninguém cobrando, derivou na primeira oportunidade. Treze changes
entraram na develop numa sessão, todas pelo `close`, todas com o gate de
docs verde, e o `## [Unreleased]` continuava vazio no fim — sob um arquivo
cuja primeira linha diz que toda mudança notável é registrada ali.

Não foi desleixo de quem fechou. O gate existia, rodava e não perguntava.

## What

O `close` passa a fazer as duas perguntas no mesmo passo. Quando o gate
de docs passa, o do changelog é consultado em seguida, com mensagem e
remédio próprios.

Bloqueante como o irmão, com `--force` disponível e a mesma linha de gap
no ledger, porque uma fase de changelog agendada para depois do trabalho
não acontece.

Silencioso em três situações, todas legítimas: quando a change não toca
superfície documentada, quando o projeto não é um repositório git, e
quando o projeto não mantém `CHANGELOG.md`. Esta última importa: o gate
reporta uma promessa que o projeto fez, e nunca inventa uma que ele não
fez — é a mesma lição de portabilidade que a change 0058 aplicou ao
remédio do gate de docs.

## Scope boundaries

Não lê o conteúdo do changelog nem exige um formato. Julgar se a entrada
descreve bem a mudança é a mesma decisão semântica que o ADR 0005 põe
fora do alcance de um gate determinístico; o que se pode afirmar é que a
entrada existe.

Não preenche as treze entradas que faltam das changes anteriores. Isso é
trabalho de dado, não de máquina, e vai em change própria.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Uma mudança de superfície com changelog intocado é recusada, nomeando o que mudou.
- [x] Tocar o changelog satisfaz o gate.
- [x] Uma change sem superfície documentada, e um projeto sem changelog, nunca são cobrados.

## Open questions

Nenhuma.
