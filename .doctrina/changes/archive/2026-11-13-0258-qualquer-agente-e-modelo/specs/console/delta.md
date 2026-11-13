# Spec Delta — capability: console

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/console/spec.md`

<!--
For ADDED: include the full new spec body below. On apply, the body is
written verbatim to the target path.

For MODIFIED: prefer a fenced `ops` block — on apply the CLI executes it
against the target spec, all ops or none (ADR 0007). The verbs cover
headers, acceptance criteria, AND the EARS requirement bullets, so a
typical delta applies mechanically end to end; only free-prose rewrites
(Purpose, Maturity, ...) stay a by-hand merge. A MODIFIED delta with no
`ops` block prints a manual-merge pointer.

  ```ops
  set-header Implementation: verified — durable adapter (`src/db.ts`)
  bump-version minor
  set-criterion 1: verified
  append-criterion [unverified] new signal — verified by `test/x.test.ts`
  append-requirement event: When <trigger>, the system shall <action>.
  replace-requirement ubiquitous 2: The system shall <action>.
  ```

Requirement sections: ubiquitous | event | state | unwanted | optional.
To take one out: `remove-requirement <section> <n>` / `remove-criterion <n>`
(the criteria after it renumber; write removals highest number first).
append-* ops resolve numbering/position at APPLY time, so several open
changes appending to the same spec never collide on numbers — order of
application decides.

For REMOVED: the body may be empty; on apply, the target spec file is
deleted and the capability is recorded in the change archive only.
-->

---

<!-- delta body below -->

```ops
append-requirement event: When `/agent` is run with no name, the system shall list every agent it knows, installed or not, each with the path it was found at or the binaries it looked for, and complete a name typed after `/agent` from that list.
append-requirement event: When `/model <name>` is run, the system shall pass that name on the command line of the agent in use from the next request, keeping one model per agent; `/model default` shall remove it, and `/model` alone shall show the model chosen or the one the agent reported, the names the agent is known to accept, and where the agent lists the models of the account.
append-requirement event: When an agent or a model is chosen, the system shall keep the choice in `$DOCTRINA_HOME/console.json` under the directory the console was opened in.
append-requirement event: When `$DOCTRINA_HOME/agents.json` declares an agent, the system shall offer it beside the catalog, passing the request where its arguments hold `{prompt}` and on standard input when they hold none, and shall name and skip a declaration that is wrong.
append-requirement unwanted: The system shall not write the agent or the model a person chose into the project.
append-criterion [verified] `/agent` lists the installed agents with their path and the others with the binaries looked for, switches to an installed one saving the choice, and refuses one that is unknown or not installed; `/model` shows, sets, keeps per agent and removes a model, names an agent that takes none, and both arguments are completed from a list — verified by `packages/doctrina-cli/test/o-console-da-um-rosto-ao-doctrina.test.js`.
append-criterion [verified] The model reaches each agent's command line the way that agent names one, before the person's own flags; GitHub Copilot is started with write and `doctrina` allowed and no session, opencode with no model flag; the model an agent reports is shown until one is chosen — verified by `packages/doctrina-cli/test/o-console-da-um-rosto-ao-doctrina.test.js`.
append-criterion [verified] An agent declared in `agents.json` is found, started with its arguments, session and model, and takes the request on stdin when its arguments hold no `{prompt}`; four wrong declarations are each named; the choice of agent and model is kept per directory, reaches a real session's agent, and a file broken by hand loses the choice without stopping the console — verified by `packages/doctrina-cli/test/o-console-da-um-rosto-ao-doctrina.test.js`.
replace-requirement ubiquitous 3: The system shall read the panel and the gates from the tree through a process of its own, when the console opens and after every command and every answer, and shall keep nothing about the project between runs.
replace-requirement ubiquitous 5: The system shall choose the agent in this order: the one `DOCTRINA_AGENT` names, the one the person chose in this directory before while it is still installed, the one whose IDE terminal this is, the one the project has an adapter for, then the order of the catalog — Claude Code, Cursor, GitHub Copilot, Codex, Gemini CLI, opencode — and then the agents the person declared.
replace-requirement ubiquitous 6: The system shall hand a request to an agent on its standard input where the agent reads one, and otherwise as a single argument, followed by the model the person chose — named the way that agent names one — and then the arguments `DOCTRINA_AGENT_ARGS` holds.
set-header Source: `packages/doctrina-cli/src/commands/ui.js`, `packages/doctrina-cli/src/lib/{console-model,console-view,console-state,console-prefs,agent-bridge}.js`
bump-version minor
```
