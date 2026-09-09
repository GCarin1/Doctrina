# Change 0077-o-review-enxerga-o-codigo-que-revisa — o review enxerga o codigo que revisa

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain; signals: spec)
- **Affects specs:** gates

## Why

o ranqueamento de capability por diff so pontua quando o nome da capability e segmento do caminho ou a spec cita o arquivo, entao 80 de 92 arquivos fonte nao mapeiam para capability nenhuma e o review nao enxerga o codigo que revisa

## What

`rankCapabilitiesByDiff` (`packages/doctrina-cli/src/lib/work-model.js:17`)
pontua um arquivo contra uma capability por três sinais: o nome da capability
como segmento do caminho (+3), a spec citando o caminho inteiro (+5) e a spec
citando o basename (+2). Nada mais.

Medido sobre este repositório: **80 de 92 arquivos-fonte pontuam zero.**

```
packages/doctrina-cli/src/commands/adapter.js   []
packages/doctrina-cli/src/commands/work.js      []
packages/doctrina-cli/src/commands/close.js     []
packages/doctrina-cli/src/lib/gates.js          []
packages/doctrina-cli/src/lib/runtime.js        []
```

O `review` roda dentro de todo `close` e é o gate que pergunta «o código mudou,
a spec acompanhou?». Ele não consegue nem dizer que mexer em `commands/adapter.js`
toca `scaffolding`.

E o buraco se esconde sozinho: o aviso «changed code maps to no existing
capability spec» só dispara quando NENHUM arquivo casa. Basta um arquivo sob
`docs/` — que casa com a capability `docs` por acidente de o diretório se
chamar assim — para o aviso calar. No close da change 0073, uma change de
adapter, o review imprimiu «Capabilities touched: docs».

O sinal que falta já existe em outro lugar da árvore: as specs citam os testes
que provam cada critério. O que elas não citam é o código que os testes exercem.

## Scope boundaries

- Não transforma o review em juiz semântico: ele continua estrutural, e se o
  código é FIEL à spec continua sendo chamada humana (ADR 0005).
- Não inventa capability para código que genuinamente não tem uma — esse caso
  já tem aviso próprio, e ele precisa passar a disparar.

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
- [x] Um arquivo do CLI mapeia para a capability cuja spec o descreve.
- [x] O aviso de código sem capability dispara mesmo quando outro arquivo casou.
- [x] A cobertura do mapeamento é medida, não estimada.

## Open questions

- Nenhuma.
