# Change 0120-cortar-a-0-16-0 — cortar a 0.16.0

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** chore (confident; signals: changelog, mover) — opened as chore
- **Affects specs:** (none — chore)

## Why

cortar a versao 0.16.0: mover o Unreleased para uma seccao datada, acrescentar as entradas das dez changes desta ronda, carimbar a versao no package e nos ficheiros que a citam, e escrever o changelog voltado ao agente
## What

Corta a 0.16.0. O `## [Unreleased]` do CHANGELOG passa a `## [0.16.0] —
2026-09-09`, com as dez entradas desta ronda acrescentadas às 69 que já lá
estavam; a versão é carimbada no `package.json` e nos quatro arquivos que a
citam; o bloco voltado ao agente ganha os cinco bullets da 0.16.0; e o
`upgrade --write` regenera os blocos do AGENTS.md.

MINOR, não patch: a ronda contém mudanças que quebram. O campo `command` do
envelope JSON mudou de forma, o `clarify` e oito outros comandos mudaram de
classe de saída, o `change new` recusa ids que aceitava, e o `analyze` recusa
deltas que aprovava. Em 0.x, quebra sobe o minor.

MINOR e não 1.0: duas auditorias de campo numa semana produziram 25 achados,
e esta release corrige-os. Um 1.0 é uma promessa de estabilidade sobre o
envelope, os códigos de saída e a gramática dos artefatos — e esta release
mexe justamente nos três. A promessa faz-se depois de uma auditoria não
encontrar nada, não no mesmo dia em que encontrou.

## Scope boundaries

- Não publica: só carimba. `npm publish` é do operador.
- Não cria a tag git.
- Não mexe no `deferred.md`, que a change 0119 já registou.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project’s typecheck/test/build).
- [x] `doctrina --version` responde 0.16.0 e nenhum arquivo ainda cita a 0.15.1.
- [x] O CHANGELOG tem a secção datada e um `## [Unreleased]` vazio acima dela.
- [x] O bloco `What changed in 0.16.0` do AGENTS.md tem cinco bullets, dentro do teto.
- [x] `npm pack --dry-run` lista só `src/`, `templates/`, `README.md` e `package.json`.

## Open questions

- O `validate` avisa que a proposta de um `--chore` «names "none"» e «names "chore"»: o `Affects specs: (none — chore)` está a ser lido como dois nomes de capability. É ruído do parser, não do artefato, e fica para uma change própria.
