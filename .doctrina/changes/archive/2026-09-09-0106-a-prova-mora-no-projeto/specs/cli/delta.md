# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

<!-- delta body below -->

O critério do typecheck era provado só por diretórios; cita agora o teste
que o executa.

```ops
replace-criterion 16: [verified] `tsc --noEmit` reports zero errors across every file under the CLI source and `scripts/` — run by `doctrina verify` and by CI — verified by `packages/doctrina-cli/test/typecheck.test.js`.
bump-version patch
```
