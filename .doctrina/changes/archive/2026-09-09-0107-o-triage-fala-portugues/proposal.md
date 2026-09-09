# Change 0107-o-triage-fala-portugues — o triage fala portugues

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product
- **Affects specs:** authoring, gates

## Why

o léxico de triage é só inglês: o mesmo pedido de runtime em português abre uma change em vez de segurar com exit 3; clarify com detecção automática não vê smells em português numa spec bilíngue

## What

O léxico de lanes era só inglês. Medido num projeto limpo:

```
work "the build is broken in CI, DATABASE_URL never reaches the process"
     → hold: RUNTIME, exit 3
work "o build está quebrado no CI, a variável DATABASE_URL nunca chega ao processo"
     → change criada, exit 0
```

O guard que a 0.15.1 acrescentou não segurava o mesmo pedido na língua em
que os prompts deste projeto chegam. O prompt passa a ser dobrado (acentos
fora, minúsculas — o mesmo `fold` que `work` e `context --for` já usam, ADR
0040) e cada lista de sinais carrega os dois vocabulários, sem repetir os
termos ingleses na metade portuguesa (repetir dobraria o peso e fazia
«declare the release workflow wiring» virar RUNTIME).

Segunda metade: `clarify --all` com detecção por arquivo varria uma spec
bilíngue com um só léxico e não via nada onde `--lang pt` via dois. Sem
língua forçada nem configurada, o documento é varrido com os dois léxicos;
os vocabulários não se sobrepõem, então um smell em qualquer das línguas é
um smell.

## Scope boundaries

- Não muda os pesos nem a regra de decisão (product por defeito; runtime
  tem de VENCER product).
- Não muda o comportamento com `--lang` ou `language` no config: uma língua
  declarada varre só com o léxico dela.
- Não unifica o léxico de «vago» do intake (`clarity.js`) com o do
  `clarify` — são detectores de coisas diferentes (brief vs spec).

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
- [x] O mesmo pedido de runtime em português e em inglês é segurado pelo `work` com exit 3.
- [x] Um documento bilíngue com detecção por arquivo reporta o smell das duas línguas.
- [x] Os testes existentes do classificador continuam verdes (nenhum prompt inglês muda de lane).

## Open questions

- Nenhuma.
