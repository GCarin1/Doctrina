# Change 0112-o-intake-convertido-nao-volta — o intake convertido nao volta

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product
- **Affects specs:** authoring

## Why

intake --force depois da conversão volta o intake para pending e imprime o playbook de bootstrap como se não houvesse spec

## What

Medido num projeto com duas specs ativas e o intake já `converted`:

```
intake --force --text "Descrição nova"   → created .doctrina/intake.md (Status: pending)
                                           + o playbook de bootstrap inteiro
next                                     → 1. doctrina intake — a pending intake awaits conversion
```

O AGENTS.md diz: «After conversion the specs are the only source of truth
— never edit `intake.md` to change requirements». `--force` era o caminho
sancionado pela CLI para fazer exatamente isso, e o playbook impresso pedia
para derivar capabilities como se a árvore estivesse vazia.

Depois da conversão, `intake --force` recusa com a classe de precondição e
aponta as portas certas: `intent add "<texto>"` para uma intenção nova e
`work "<prompt>"` para uma mudança de comportamento. `--force` continua
valendo para o caso que existe para servir: um intake ainda `pending` que
se quer substituir.

## Scope boundaries

- Não muda `intake` sem `--force`, que já recusa quando o arquivo existe.
- Não apaga nem reescreve o intake convertido.

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
- [x] `intake --force` sobre um intake `converted` sai 3, não toca no arquivo e aponta `intent add` / `work`.
- [x] `intake --force` sobre um intake `pending` continua substituindo.

## Open questions

- Nenhuma.
