# Change 0166-intent-add-aceita-a-mesma-intencao-duas-vezes — intent add aceita a mesma intencao duas vezes

- **Status:** applied
- **Applied:** 2026-09-23
- **Date:** 2026-09-23
- **Owner:**
- **Lane:** product
- **Affects specs:** authoring, gates

- **Documented surface:** n/a — `intent add` gains a refusal, not a flag or a command; the CLI reference already describes it as appending an anchor

## Why

`intent add` aceita o mesmo texto duas vezes e cria duas âncoras para uma intenção só. Quando uma spec realiza a primeira, a gêmea fica `dropped` para sempre e o `trace --strict`, que é gate de CI, falha num buraco que nenhuma spec fecha com honestidade. O comando só barra colisão de id fixado (`SC15: ...`), não de texto, e o `validate` não vê a gêmea. Basta um agente repetir um passo do playbook para produzir o caso.

Reproduzido: `intent add "A carteira soma certo"` duas vezes gerou `[SC1]` e `[SC2]`; com `Realizes: SC1` numa spec, `trace` mostrou `SC2` como `dropped` e `trace --strict` saiu 1, com `validate` em silêncio.

## What

- `packages/doctrina-cli/src/lib/validation-model.js`: `intentKey(text)` — o texto dobrado (caixa e acentos pelo léxico único), espaços colapsados, pontuação final removida. A checagem de `product.md` do `validate` passa a avisar quando duas âncoras têm a mesma chave, nomeando as duas linhas.
- `packages/doctrina-cli/src/commands/intent.js`: `intent add` recusa (exit 1, como a colisão de id) um texto cuja chave já existe, nomeia a âncora que já o declara e não escreve nada; vale também para a forma com id fixado.
- Deltas em `authoring` (a recusa) e `gates` (o aviso), com critério citando o teste.

## Scope boundaries

- Igualdade, não semelhança: duas frases diferentes sobre o mesmo objetivo continuam passando. Julgar paráfrase é semântica, fora dos gates determinísticos (ADR 0005).
- O `validate` avisa, não erra: um `product.md` antigo com gêmeas não quebra o CI de ninguém da noite para o dia; o `trace --strict` já é o gate que falha.

## Verification

- [x] `packages/doctrina-cli/test/uma-intencao-nao-vira-duas-ancoras.test.js` passa (3 testes) e falha 2 deles no código anterior (`git stash`).
- [x] Automated checks pass (`doctrina verify`).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

Nenhuma.
