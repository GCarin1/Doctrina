# Change 0095-analyze-roda-o-dry-run-de-ops — analyze roda o dry-run de ops

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** gates

## Why

analyze declara ready to apply para um delta cujo bloco ops o apply depois recusa, entao o pre-flight nao inspeciona a unica coisa que ele existe para pre-flightar; change check ja executa esse dry-run e analyze nao
## What

O dry-run de ops sai de `commands/change.js` (onde vivia inline dentro do
`change check`) e passa a ser um achado de `collectAnalysis` em
`lib/analysis.js` — que é o que `lib/gates.js` consulta. Com isso `analyze`,
`change apply` e `close` recusam pelo mesmo caminho, em vez de só o `check`
saber.

Marcado com escopo `pre-apply`. Depois de um apply bem-sucedido o alvo
contém exatamente o que aqueles ops escreveram, e re-executá-los contra ele
é uma pergunta sem sentido — o gate `integrity` do `archive` exclui esse
escopo justamente por isso. Sem a marcação, toda change recém-aplicada
ficaria presa antes de arquivar.

Terceira auditoria, achado 2. Reproduzido por execução: um delta com
`replace-requirement ubiquitous 99:` e `frobnicate everything` fazia o
`analyze` responder `ok ready to apply` e o `apply` recusar em seguida.
Décima instância de «ausência não é aprovação».

Metade do achado original está obsoleta: `change diff` já não existe, e o
`change check` já executava o dry-run corretamente. O buraco era só o
`analyze` — o que torna a correção mais estreita do que a auditoria supôs.

## Scope boundaries

- Não muda a gramática dos ops nem o comportamento all-or-none do `apply` (ADR 0007).
- Não toca o `change check`, que continua a renderizar o seu próprio passo 2/3; o que muda é que a mesma pergunta passa a ser feita pelo gate.
- Não faz o `analyze` executar deltas ADDED ou REMOVED: só o bloco `ops` de um MODIFIED é mecanicamente aplicável.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] `analyze` recusa um bloco ops que o `apply` recusaria, nomeando o op ofensor.
- [x] A recusa chega ao `apply` pelo gate `structure`, não só ao `analyze`.
- [x] Um delta MODIFIED sem bloco ops continua a passar como merge manual.
- [x] Uma change já aplicada continua a arquivar (o escopo pre-apply segura).

## Open questions

- O `change check` mantém a sua própria renderização do dry-run, que agora duplica o que o `analyze` imprime. Fundir as duas saídas é ergonomia, não correção, e fica para quando o `check` for revisto.
