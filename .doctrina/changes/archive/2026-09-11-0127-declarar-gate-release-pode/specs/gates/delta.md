# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

O job de publicação rodava typecheck, a suíte e `validate`, e parava.
Isso é um subconjunto estrito do que todo pull request já sobrevive — ou
seja, o gate mais fino do repositório era o que ficava entre um defeito e
o registry.

Nada impedia que encolhesse mais, porque nada dizia o que ele tinha de
rodar. O requisito abaixo diz.

```ops
bump-version minor
set-header Last updated: 2026-09-11
append-requirement event: When the project publishes a release, the system shall run every gate a pull request already runs, and shall not publish while any of them fails.
append-criterion [verified] The release job runs `verify`, the packed-install harness and the strict example check, and publishes with `--provenance`; removing any of the four fails the suite — verified by `packages/doctrina-cli/test/the-release-gate-is-not-weaker.test.js`.
```
