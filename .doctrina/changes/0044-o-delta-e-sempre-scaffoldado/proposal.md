# Change 0044-o-delta-e-sempre-scaffoldado — o delta e sempre scaffoldado

- **Status:** proposed
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** cli

## Why

o delta so ganha Operation prefilled quando o usuario passa --capability, entao no caminho padrao o agente escreve do zero o arquivo cujo cabecalho ausente explodia dias depois; scaffoldar tambem a partir de um palpite ranqueado com margem, marcado como palpite

## What

`doctrina work` passa a scaffoldar o delta também quando a capacidade veio do
ranqueamento e não de `--capability`, desde que o primeiro colocado tenha margem sobre
o segundo — a mesma noção de confiança que `classify()` já usa para as lanes.

- O delta scaffoldado por palpite carrega um comentário dizendo que é palpite e como corrigir.
- Sem margem, o comportamento atual permanece: nenhum delta, o playbook instrui.
- Delta em `specs/cli`.

Achado F18 da auditoria. O comentário no próprio `work.js` diz que o delta era "o único
arquivo 100% escrito à mão, e aquele cujo `**Operation:**` ausente explodia dias depois
no analyze". A correção existe, mas só sob `--capability`; no caminho padrão o agente
recebe `<capability>` literal e escreve do zero. Um arquivo errado e óbvio custa menos
que um arquivo ausente e silencioso.

## Scope boundaries

- Não altera o ranqueador: isso é a change 0040, e as duas devem aterrissar em ordem.
- Não scaffolda nada no caminho `--chore`, que é spec-less por definição.
- Não scaffolda quando não há margem — um palpite fraco em pasta errada é pior que nenhum.

## Verification

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [ ] Um prompt com vencedor claro no ranking abre a change já com o delta e o `Operation` correto.
- [ ] Um prompt sem margem não scaffolda delta nenhum.
- [ ] O delta por palpite carrega a marca e a instrução de correção.

## Open questions

- Qual margem? Reaproveitar o limiar `>= 2` do `triage`, ou calibrar por diferença relativa de score, que é mais estável em specs de tamanhos muito diferentes?
