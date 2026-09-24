# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

A ajuda começa por onde um recém-chegado começa.

```ops
replace-requirement ubiquitous 3: The system shall print a usage summary when invoked with `--help`, `-h`, or with no arguments, opening with where to start (`doctrina init`, then `doctrina next`) and grouping one line per command — its subcommands joined — under the moment it is reached for, in the order of the AGENTS.md block, with deprecated names last, each pointing at its replacement.
append-criterion [verified] The top-level help opens with where to start, follows the moments in the AGENTS.md order, gives each live command one line, lists deprecated names only in the last group with their replacement, and is shorter than the flat list it replaced — verified by `packages/doctrina-cli/test/a-ajuda-comeca-pelo-comeco.test.js`.
bump-version minor
```
