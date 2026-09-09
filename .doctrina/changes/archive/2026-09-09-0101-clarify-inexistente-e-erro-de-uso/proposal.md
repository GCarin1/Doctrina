# Change 0101-clarify-inexistente-e-erro-de-uso — clarify inexistente e erro de uso

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** gates

## Why

clarify apontado para um arquivo que nao existe sai com a classe de gate em vez da classe de uso, divergindo de intake --file, init --intake-file e templates check --path
## What

`clarify <arquivo-inexistente>` passa a sair 2 em vez de 1.

Terceira auditoria, achado 9. Um caminho que não existe é uma invocação
errada: repeti-la inalterada nunca passa. Um agente que ramifica no código
lê 1 como «o trabalho não está pronto» e itera para sempre (ADR 0018).

Era o último de uma família já consistente: `intake --file`,
`init --intake-file` e `templates check --path` já saíam 2.

## Scope boundaries

- Não muda o código de saída quando o arquivo existe e tem cheiros: isso continua a ser gate (1).
- Não toca `--all`, que varre a árvore e não recebe caminho.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project’s typecheck/test/build).
- [x] The affected spec’s acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] `clarify` com caminho inexistente sai 2 e diz o que fazer.
- [x] `clarify` sobre um arquivo real continua a gatear normalmente.
- [x] Os quatro comandos que recebem caminho respondem igual a um caminho ausente.

## Open questions

- Fica de fora a família `already exists` (`spec new`, `contract new`, `skill new`, `change new`, `intake`, `init`), que sai 1 nos seis. É consistente, mas pelo teste do próprio `exit-codes.md` — repetir a mesma string falha do mesmo jeito — lê-se como classe 2. A auditoria registou sem afirmar, e continua por decidir.
