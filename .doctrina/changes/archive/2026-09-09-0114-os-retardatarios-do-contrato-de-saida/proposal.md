# Change 0114-os-retardatarios-do-contrato-de-saida — os retardatarios do contrato de saida

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product
- **Affects specs:** cli

## Why

close de uma change inexistente sai 1 enquanto os irmãos saem 2; change tick abc diz no box NaN; verify --json deixa o stderr do filho fora do envelope e as linhas carregam CR

## What

Três sobras do contrato de saída (ADR 0018) e do envelope (change 0086),
medidas depois da change 0093:

```
close 0099                      → exit 1   (analyze/apply/archive/check/tick/abandon 0099 → 2)
change tick <id> abc            → error: no box #NaN
verify --json (check falha no shell) → stderr do filho impresso ANTES do JSON;
                                        envelope: "stderr": [] · stdout: ["ok\r", …]
```

- `close` passa a verificar a existência da change antes de sequenciar
  qualquer passo, e sai com a classe de uso como todos os irmãos.
- O envelope `--json` passa a capturar também `process.stderr.write` — o
  caminho que `verify` usa para ecoar o filho — e remove o `\r` das linhas
  capturadas, para que o envelope diga tudo o que o terminal disse.
- O `#NaN` do `tick` já foi corrigido pela change 0104 (o argumento é
  nomeado); esta change fixa-o em teste ao lado dos dois irmãos.

## Scope boundaries

- Não muda o que `verify` imprime sem `--json`.
- Não muda a classe de nenhum comando que já estava certo.

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
- [x] `close <inexistente>` sai 2 sem sequenciar passo nenhum.
- [x] `verify --json` com um check que escreve no stderr devolve stdout puro e o envelope carrega essas linhas, sem `\r`.

## Open questions

- Nenhuma.
