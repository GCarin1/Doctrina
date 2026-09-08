# Change 0066-a-porta-de-bootstrap-aparece — a porta de bootstrap aparece

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** scaffolding

## Why

o init nunca cria o intake.md mas o AGENTS.md que ele instala diz que o gatilho de bootstrap e o intake.md estar pending, e no estado logo apos o init nenhum comando do caminho de leitura nomeia o doctrina intake

## What

O `AGENTS.md` que o `init` instala no projeto adotante diz, na primeira instrução
operacional: «se `.doctrina/intake.md` está `Status: pending`, rode
`doctrina intake`». O `init` nunca cria esse arquivo. O gatilho documentado não
pode disparar num projeto recém-inicializado.

E nenhum comando do caminho de leitura cobre a lacuna. No estado logo após o
`init`, o `prime`, o `next` e o `doctor` não nomeiam `doctrina intake` —
`grep -rn "doctrina intake"` sobre `next.js`, `actions.js`, `views.js` e
`doctor.js` devolve zero. O `next` oferece as duas portas de autoria manual.

Assim que `intake.md` existe, o `next` e o `prime` passam a apontá-lo
corretamente. A lacuna é só o intervalo entre o `init` e o `intake` — que é
exatamente onde o agente novo está.

## Scope boundaries

**Decisão, tomada na implementação: o caminho de leitura nomeia a porta; o
`init` continua não escrevendo o `intake.md`.** A outra saída — o `init`
deixar um intake vazio em `pending` — cria um artefato que é só molde, e a
change 0065 acabou de tornar isso uma coisa recusável: seria o framework
embarcando exatamente o que ele passou a proibir. Então a condição que
significa "as specs não estão escritas" é lida do que ESTÁ em disco: nenhuma
capability em `.doctrina/specs/`. Vira uma ação (`bootstrap-unspecced`),
simétrica à `intake-pending` que já existia, e por isso aparece no `next`, no
`prime` e em qualquer vista que renderize ações. O texto do hub passa a
declarar esse gatilho, e não um arquivo que o `init` nunca cria.

- Não muda o playbook de bootstrap nem o que o `intake` faz com a descrição.
- Não obriga um projeto a passar pelo `intake`: quem adota código existente
  (`work --from-diff`, backfill) segue por onde já passa; o que muda é a porta
  deixar de ser invisível.
- Não duplica a instrução do `AGENTS.md` em prosa nova.

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

- Nenhuma.
- [ ] Logo após o `init`, algum comando do caminho de leitura nomeia o `intake`.
- [ ] O gatilho que o `AGENTS.md` descreve corresponde ao que o `init` deixa em disco.
- [ ] Um projeto que já converteu o intake não é reapontado para ele.
- [ ] O teste roda contra um `init` real, não contra uma árvore montada à mão.
