# Change 0051-init-aceita-o-intake — init aceita o intake

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** scaffolding

## Why

init e intake sao dois comandos para um unico momento de onboarding e ninguem roda o primeiro sem rodar o segundo, expondo uma justificativa arquitetural como duas etapas de UX; aceitar o intake dentro do init

## What

`doctrina init` passa a aceitar o intake no mesmo comando: `init --intake <arquivo>` ou
`init --intake-text "<texto>"` scaffolda a árvore, grava a descrição verbatim e imprime
o playbook de bootstrap numa passada só.

- Os dois comandos continuam existindo para quem precisa deles separados.
- Nenhuma interpretação de linguagem entra no CLI: a ADR 0005 fica intacta.
- Delta em `specs/scaffolding`.

Achado F20 da auditoria. Ninguém roda `init` sem depois rodar `intake`. A separação
existe porque `init` se recusa a interpretar linguagem — o que é correto, mas é uma
justificativa arquitetural exposta ao usuário como duas etapas de onboarding.

## Scope boundaries

- Não funde os comandos: `intake` segue sendo a porta para converter uma descrição num projeto já existente.
- Não muda o playbook de bootstrap.
- Não adiciona nenhuma leitura semântica da descrição.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] `init --intake <arquivo>` produz o mesmo estado que `init` seguido de `intake <arquivo>`, com a única diferença registrada abaixo nas Open questions.
- [x] Um valor ausente na flag é erro de uso, não fallback silencioso.
- [x] O guia de primeiros passos passa a mostrar um comando onde mostrava dois.

## Open questions

- **"Exatamente o mesmo estado" não se sustentou, e a diferença é o motivo de
  a change existir.** O teste de equivalência pegou uma linha divergente no
  `AGENTS.md`: quando o intake chega junto do `init`, ele deriva dali a
  descrição de uma linha do projeto; na sequência de dois comandos, o
  `intake` roda depois que o `AGENTS.md` já foi escrito e — corretamente —
  não reescreve o arquivo que ele nunca deve tocar. Ou seja: o caminho
  unificado não é um atalho para a sequência, é um caminho que sabe uma coisa
  a mais no momento em que ela é útil. Duas opções foram consideradas: fazer
  o `intake` preencher a descrição quando o `AGENTS.md` ainda é scaffold
  intocado (rejeitada — amplia o raio de escrita do `intake` para um arquivo
  que ele nunca escreveu, e isso merece a própria change), ou registrar a
  diferença. Registrada: o critério de aceitação e o teste dizem "mesmo
  tree, mesmo intake, diferindo só na descrição derivável", que é a
  propriedade verdadeira e ainda vale a pena garantir.
- **Por que `--intake-text` e não reaproveitar `--project-description`?**
  Porque são coisas diferentes com destinos diferentes: a descrição é uma
  frase que vai para o cabeçalho do `AGENTS.md`, o intake é o texto integral
  que o agente converte em specs e que fica gravado literalmente. Fundir as
  duas faria a frase curta virar a fonte da conversão — exatamente a perda
  que o `intake.md` verbatim existe para evitar.
