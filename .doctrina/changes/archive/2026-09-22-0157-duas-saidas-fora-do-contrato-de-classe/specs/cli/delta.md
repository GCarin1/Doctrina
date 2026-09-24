# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

A regra de precondição nomeava três exceções quando o CLI tem sete, e três
comandos respondiam a mesma frase com a classe errada. A regra passa a
dizer o que existe, e a dizer o critério — um comando que tem resposta
própria, sem árvore, responde.

```ops
replace-requirement state 2: While the current working directory does not contain `.doctrina/`, every command shall exit with the precondition class and the same message, except those that answer from the CLI itself rather than from a tree — `init`, which creates one, `next`, which names the door, `completion` and `ci --emit`, which render from their own declarations, and `templates list`, which shows what would be resolved — along with `--help` and `--version`, which are not commands.
append-criterion [verified] Every command answers the precondition class with one message outside a project, the declared exceptions answer with their own output instead, and a typed error crossing a multi-id driver keeps its class — verified by `packages/doctrina-cli/test/a-fronteira-da-precondicao.test.js`.
bump-version minor
```
