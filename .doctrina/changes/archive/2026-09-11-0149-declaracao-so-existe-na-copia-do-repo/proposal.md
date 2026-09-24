# Change 0149-declaracao-so-existe-na-copia-do-repo — declaracao so existe na copia do repo

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** templates
- **Documented surface:** n/a — cita o nome da declaração que o gate pede para dizer onde ela passou a existir; nenhum comando ou flag muda

<!--
Optional, and usually absent. The closing docs gate reads COMMAND and FLAG
names out of the prose below and asks for documentation when it finds any.
It cannot tell a change from a mention: explaining an effect, or writing a
Scope boundaries line about what this deliberately does NOT touch, names
things just as loudly as changing them would.

When that happens, say so on the record instead of forcing the close:

- **Documented surface:** n/a — names two commands to explain an effect; alters neither

`none` reads the same as `n/a`, and a BARE one silences nothing — the
reason is the declaration.
-->

## Why

O bloco de orientação da declaração de superfície citada, que a change 0144 acrescentou, entrou só na cópia de projeto do template de proposal; o template empacotado em packages/doctrina-cli/templates não recebeu nada, então quem adota o Doctrina pelo pacote publicado scaffolda uma proposal sem a saída que o gate de docs exige.

## What

O template empacotado em
`packages/doctrina-cli/templates/change/proposal.md.template` recebe o
bloco de orientação que só existia na cópia de projeto, e os dois passam a
ser byte a byte iguais.

A spec `templates` declara a árvore empacotada no cabeçalho `Source:` —
ela era a única das duas que nenhuma capacidade nomeava, e foi por isso
que uma change inteira passou por cima dela sem ninguém notar.

Um teste novo compara as duas árvores por completo, exige que o template
enviado carregue a declaração sem desarmar o gate, e cobra a declaração
de posse.

Artefatos: `packages/doctrina-cli/templates/change/proposal.md.template`,
`packages/doctrina-cli/test/o-template-que-envia-e-o-que-vale.test.js`
(novo), delta na spec `templates`.

## Scope boundaries

A ADR 0019 continua valendo: um projeto adotante pode sobrescrever um
template. A igualdade cobrada aqui é uma regra DESTE repositório, que
mantém a cópia para comer a própria comida — por isso ela mora no teste,
não num requisito imposto a quem adota.

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
- [x] As duas árvores de template são idênticas e o template enviado carrega
      a declaração sem silenciar o gate, provado em
      `packages/doctrina-cli/test/o-template-que-envia-e-o-que-vale.test.js`.

## Open questions

Nenhuma.
