# Change 0088-citar-um-comando-nao-e-mexer-nele — citar um comando nao e mexer nele

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** gates

## Why

o gate de docs conta uma citacao como alteracao: uma proposta que escreve o nome de um comando em backticks para descrever o sintoma marca aquele comando como superficie alterada e exige mudanca em docs

## What

Encontrado fechando a change 0085, que só reorganizava seções do AGENTS.md:

```
──── 10/12 docs
error: this change alters a documented surface but no docs/ change
       accompanies it:
  - commands: close, templates
```

Os dois sinais vieram da própria proposta, que escrevia `` `doctrina
templates check` `` (o gate que reportou o achado) e `` `doctrina close <id>`
`` (a frase que passava a estar no hub). Nenhum dos dois comandos mudava de
comportamento.

O gate lê a proposta e o delta — o que o AUTOR escreveu, e isso está certo
por desenho (change 0058 já subtraiu o boilerplate do template pela mesma
razão). O que falta é distinguir **«este comando é o assunto»** de **«este
comando muda»**. Uma proposta descreve o sintoma citando o comando que o
reporta; é a forma mais natural de escrever um achado, e ela dispara o gate.

A change 0085 foi fechada com `--force` e a lacuna registrada, que é o que
se faz uma vez. Um gate que obriga o `--force` na escrita natural de uma
proposta é um gate a caminho de ser ignorado.

## Scope boundaries

- Não afrouxa o gate: uma change que de fato altera um comando documentado
  continua sendo obrigada a documentar.
- Não volta a ler o diff em vez da proposta: a fonte continua sendo o que o
  autor escreveu.

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
- [ ] Uma proposta que apenas cita um comando ao descrever o sintoma não
      dispara o gate por causa dele.
- [ ] Uma change que altera um comando documentado continua sendo pega.
- [ ] A change 0085, reprocessada, passaria sem `--force`.

## Open questions

- Nenhuma.
