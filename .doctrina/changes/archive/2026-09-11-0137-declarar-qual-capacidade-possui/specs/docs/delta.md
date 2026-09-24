# Spec Delta — capability: docs

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/docs/spec.md`

---

`SECURITY.md`, `CONTRIBUTING.md` e `CONVENTIONS.md` são documentos em
prosa na raiz, do mesmo tipo que os READMEs que esta spec já reivindica, e
nenhuma capacidade os declarava.

```ops
set-header Source: `docs/**`, `scripts/check-docs.js`, `CHANGELOG.md`, `README*.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CONVENTIONS.md`
bump-version patch
set-header Last updated: 2026-09-11
```
