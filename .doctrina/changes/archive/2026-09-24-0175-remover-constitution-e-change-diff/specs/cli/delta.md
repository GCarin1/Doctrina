# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

Um nome removido responde com o substituto, não com um palpite.

A lista "fora de escopo" deixou de citar o `constitution` por edição manual.

```ops
append-requirement event: When an invocation names an operation removed from the catalog, the system shall run nothing and answer with the usage class, naming the version that removed it and the command that replaces it — in the `--json` envelope too — rather than "unknown command" and a guess.
append-criterion [verified] `constitution` and `change diff` answer the usage class naming `prime --rules` and `change check --verbose`, print nothing on stdout, and return `{ok: false, exit_code: 2}` under `--json` — verified by `packages/doctrina-cli/test/deprecation.test.js`.
bump-version minor
```
