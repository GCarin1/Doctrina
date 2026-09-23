# Change 0167-teste-adr-substituta-falha — o teste da ADR substituta falha no Windows

- **Status:** applied
- **Applied:** 2026-09-23
- **Date:** 2026-09-23
- **Owner:**
- **Lane:** chore
- **Affects specs:** (none — chore)

- **Documented surface:** n/a — só um teste muda; nenhum comando, flag ou saída do CLI

## Why

O CI do push da 0165 (run 84) ficou vermelho só nos dois jobs de Windows: os três testes de `uma-adr-substituta-herda-o-escopo.test.js` falharam com `ADR 0001 still carries the template`. O helper `author()` do teste procura `## Context\n`; no checkout do Windows o template chega com CRLF, a troca não casa nada, e o `decision accept` recusa com razão uma ADR que continua template. O defeito é do teste, não do produto: o `supersede` herda o escopo com CRLF também.

Reproduzido aqui convertendo `.doctrina/templates/` para CRLF: os 3 testes falham como no CI; com a correção, passam nos dois finais de linha.

## What

- `packages/doctrina-cli/test/uma-adr-substituta-herda-o-escopo.test.js`: o helper casa `?
`, como os outros testes do repositório já fazem, e a asserção do `Scope:` da sucessora tolera o `` antes do fim da linha.

## Scope boundaries

- Código do CLI intocado: o comportamento já era correto em CRLF.
- O teste da 0166 (`uma-intencao-nao-vira-duas-ancoras.test.js`) foi rodado sob CRLF e passa; não muda.

## Verification

- [x] Sob templates CRLF (simulação do checkout Windows) o teste falhava 3/3 e agora passa 3/3; sob LF, passa 3/3.
- [x] Automated checks pass (`doctrina verify`).

## Open questions

Nenhuma.
