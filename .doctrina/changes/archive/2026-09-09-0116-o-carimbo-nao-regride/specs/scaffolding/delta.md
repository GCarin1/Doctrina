# Spec Delta — capability: scaffolding

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/scaffolding/spec.md`

---

<!-- delta body below -->

O hook roda o CLI que o escreveu, não o que estiver no PATH.

```ops
append-requirement ubiquitous: The system shall write the pre-commit hook so that it invokes the CLI that installed it, by absolute path, and shall honour a `DOCTRINA` environment variable as the override, because `.git/hooks/` is local to the clone and a `doctrina` found on the PATH may be an older release.
append-criterion [verified] The installed hook names the installing CLI's entrypoint and reads `DOCTRINA` first — verified by `packages/doctrina-cli/test/the-stamp-does-not-regress.test.js`.
bump-version minor
```
