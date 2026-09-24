# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

Uma change é nomeada pela pasta, nunca por um caminho.

```ops
append-requirement unwanted: The system shall not resolve a change reference given to `change apply|archive|check|tick|abandon`, `close`, `analyze` or `work --resume` that is not a single folder name under `.doctrina/changes/` — one containing a path separator, `.`, `..`, or the archive's own folder name — and shall refuse it with the usage class before touching the filesystem, while still resolving an existing change whose id predates the `NNNN-slug` grammar.
append-criterion [verified] Every command that takes a change reference refuses `../../victim` and `archive` with exit 2, leaving an outside directory, the ledger and the index untouched, and a legacy id such as `Add_Login` still resolves — verified by `packages/doctrina-cli/test/um-id-de-change-e-um-nome.test.js`.
bump-version minor
```
