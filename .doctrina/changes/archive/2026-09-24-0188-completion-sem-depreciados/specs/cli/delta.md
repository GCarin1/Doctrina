# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

A completação do shell oferece a superfície viva.

```ops
append-requirement ubiquitous: The system shall generate its shell completion scripts (bash, zsh, pwsh) from the live operations of the catalog only, leaving deprecated ones out, because completion is how a person discovers what to type and a deprecated name still runs for the script that already types it.
append-criterion [verified] Each completion script offers every live command and none of the deprecated names — verified by `packages/doctrina-cli/test/a-completacao-oferece-so-o-vivo.test.js`.
bump-version minor
```
