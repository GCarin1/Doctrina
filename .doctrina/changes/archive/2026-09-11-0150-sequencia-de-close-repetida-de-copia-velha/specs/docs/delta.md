# Spec Delta — capability: docs

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/docs/spec.md`

---

As páginas que descrevem o fechamento passam a descrever o fechamento
inteiro, e o teste da capability `gates` cobre também as páginas — por isso
aqui há um critério e não uma prova nova.

```ops
append-criterion [verified] No page in `docs/en/` or `docs/pt/` describes the closing sequence as fewer steps than the CLI declares — verified by `packages/doctrina-cli/test/a-sequencia-tem-um-autor-so.test.js`.
bump-version patch
```
