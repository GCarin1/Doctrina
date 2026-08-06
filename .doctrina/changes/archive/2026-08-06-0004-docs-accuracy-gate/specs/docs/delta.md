# Spec Delta — capability: docs

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/docs/spec.md`

---

The docs gate checked shape and never truth (audit item D1): a page could
name a removed command, a renamed flag, or a stale exit code, and
`doctrina verify` stayed green. Five accuracy checks join the five shape
checks, drawing on the command catalog rather than a new data source.

The flag check shares `lib/flag-catalog.js` with the C3 source test — one
invariant, two consumers, so source and prose cannot drift apart.

<!-- APPLIED 2026-08-06 by `doctrina change apply` (docs spec 0.3.0 -> 0.4.0).
Preserved inside this comment because ops are not idempotent: re-applying
would duplicate the criteria and bump the version again. Criterion 9 was
repaired by hand after the matchOpsBlock defect described in the proposal.

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement ubiquitous: The system shall hold documentation to accuracy as well as shape: `scripts/check-docs.js` shall verify that every documented command resolves to the CLI catalog, that every flag documented in a reference flag table is declared by that command, that every relative link resolves, that every fenced block showing CLI output carries an explicit illustrative marker, and that paired EN and PT pages stay within a declared length ratio.
append-requirement event: When a command is removed from the CLI catalog or a flag is renamed, `scripts/check-docs.js` shall fail until the documentation follows.
append-requirement unwanted: The system shall not treat filename parity as content parity; a page that has diverged in length from its counterpart shall be reported.
append-criterion [verified] Every documented `doctrina <command>` resolves to the CLI catalog, and a page naming a command that does not exist fails the gate — `scripts/check-docs.js`, `packages/doctrina-cli/test/check-docs.test.js`.
append-criterion [verified] Every flag documented in a `cli-reference.md` flag table is declared in that command's exported flag spec, via the catalog shared with the source-side test — `packages/doctrina-cli/src/lib/flag-catalog.js`, `packages/doctrina-cli/test/check-docs.test.js`.
append-criterion [verified] Every relative link in the documented surfaces resolves; docsify router paths and fenced sample links are exempt — `packages/doctrina-cli/test/check-docs.test.js`.
append-criterion [verified] Every fenced block showing CLI output carries an `<!-- illustrative -->` marker; invocation-only blocks do not need one — `packages/doctrina-cli/test/check-docs.test.js`.
append-criterion [verified] Paired EN and PT pages stay within the declared length ratio, so a divergence filename parity cannot see is reported — `packages/doctrina-cli/test/check-docs.test.js`.
```
-->
