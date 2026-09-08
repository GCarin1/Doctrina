# Spec Delta — capability: insight

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/insight/spec.md`

---

<!-- delta body below -->

## What changes

O requisito ainda nomeia o `index.json` como a casa do orçamento de contexto.
A change 0047 mudou a casa declarada para `.doctrina/config.json` e manteve o
bloco `config` do índice como a casa legada. Mesma classe de A8: o texto ficou
para trás do código.

```ops
bump-version patch
replace-requirement ubiquitous 1: The system shall assemble a context pack within a token budget, resolved as the `--budget` flag, then the project's `.doctrina/config.json`, then the legacy `config.context_budget` block of `index.json`, then a built-in default.
```
