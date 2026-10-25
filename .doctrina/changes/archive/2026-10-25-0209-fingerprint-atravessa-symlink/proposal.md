# Change 0209-fingerprint-atravessa-symlink — fingerprint atravessa symlink

- **Status:** applied
- **Applied:** 2026-10-25
- **Date:** 2026-10-25
- **Owner:** Doctrina maintainers
- **Lane:** product (uncertain)
- **Affects specs:** insight

- **Documented surface:** n/a — cita `verify --reuse` para dizer onde o bug aparecia; o comportamento documentado não muda


## Why

O CI do PR da 0.18.0 falhou só no macOS: `worktreeFingerprint` devolvia
`null`. O prefixo do projeto dentro do repositório era calculado com
`path.relative` entre o toplevel que o git devolve (já resolvido,
`/private/var/…`) e o caminho recebido (`/var/…`, um symlink) — o resultado
`../..` não nomeia nada na árvore. No CLI passava despercebido porque o
`process.cwd()` já vem resolvido, mas um projeto aberto por um caminho com
symlink nunca reaproveitaria um verify verde.

## What

- `worktreeFingerprint` (lib/git.js) pergunta o prefixo ao git
  (`rev-parse --show-prefix`) em vez de calculá-lo.
- O teste `o-verify-verde-nao-roda-duas-vezes.test.js` compara a impressão
  pelo caminho próprio e por um symlink.
- CHANGELOG, na seção 0.18.0 ainda não publicada.

## Scope boundaries

- Nenhuma mudança de comportamento fora da impressão digital.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.
