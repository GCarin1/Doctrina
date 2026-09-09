# Change 0111-um-scaffold-nao-e-um-artefato — um scaffold nao e um artefato

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product
- **Affects specs:** gates, skills

## Why

um contrato e uma skill ainda com os placeholders do scaffold passam em validate, contract check e skill sync e entram em todo context pack

## What

Tasks e specs têm checagem de placeholder (`- [ ]` sem texto bloqueia o
close; `<observable signal>` avisa no validate). Contratos e skills não
tinham. Medido:

```
contract new api → contract check: warn "unchecked"; validate: ok
  (Wiring: | <NAME> | vars | <path> |…; Selectors: | <NAME> |…; References: specs/<capability>)
skill new crlf-trap → skill sync: "already up to date"; validate: ok
  context carteira → On-demand skills: crlf-trap  <one-sentence summary of what this skill helps the agent do>
                                                  when: <one-sentence trigger — when the agent should load this skill>
```

O placeholder da skill é servido em cada context pack, e o `when:` em forma
`<…>` passa por «trigger detectável» porque tem palavras suficientes.

`validate` passa a avisar: um contrato cujas linhas de Wiring/Selectors ou
References ainda são as do scaffold; uma skill cuja `description:` ou
`when:` ainda está em forma `<…>`. Um `when:` em forma de placeholder deixa
de contar como trigger detectável, e `skill sync` diz que a skill ainda é
scaffold em vez de «up to date».

## Scope boundaries

- Nível `warning`, como os placeholders de spec: um contrato ou skill
  recém-criado é rascunho por definição.
- Não altera `contract check`, que já ignora linhas `<…>` (change 0029).

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
- [x] Um contrato recém-criado e uma skill recém-criada geram um `warning` do `validate` cada, nomeando o placeholder.
- [x] Um `when:` em forma `<…>` não é trigger detectável; `skill sync` diz que a skill é scaffold.

## Open questions

- Nenhuma.
