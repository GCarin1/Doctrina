# Change 0071-o-intake-aceita-a-prosa-convidada — o intake aceita a prosa convidada

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** authoring

## Why

doctrina intake com a descricao direta responde description file not found ecoando a frase inteira como caminho de arquivo, sem sugerir --text, e a mesma ideia tem dois nomes na superficie entre intake --text e init --intake-text

## What

O bloco de superfície descreve o comando como «store the intent and print the
bootstrap playbook». Passar a descrição direta — que é o que a frase convida —
produz uma mensagem que ecoa a frase inteira como caminho de arquivo:

```
$ doctrina intake "Ledgerly is a small invoicing tool for freelancers. It issues..."
error: description file not found: Ledgerly is a small invoicing tool for
freelancers. It issues invoices, chases late payers by email, and reconciles...
```

Sem sugerir `--text`, que é a forma inline. E a mesma ideia tem dois nomes na
superfície: `intake --text` e `init --intake-text` (esta última criada pela
change 0051). Um agente que aprendeu uma não acha a outra.

## Scope boundaries

- Não remove a forma por arquivo nem a torna secundária.
- Não renomeia flag publicada sem manter a antiga funcionando: se as duas
  grafias convergirem, a que sair segue aceita e passa pela régua de depreciação
  da change 0049 e do ADR 0026.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

- Nenhuma.
- [ ] A descrição passada direta é aceita, ou recusada com uma mensagem que nomeia a forma certa.
- [ ] A mensagem de erro não ecoa uma frase inteira como se fosse um caminho.
- [ ] As duas grafias da mesma ideia estão reconciliadas, e nenhuma invocação que funcionava parou de funcionar.
