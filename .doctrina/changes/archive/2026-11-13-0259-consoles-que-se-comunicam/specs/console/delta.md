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
append-requirement ubiquitous: The system shall put the consoles opened for the same work in one room — the workspace when the directory is its root or one of its registered repositories, the directory itself otherwise — kept as files under `$DOCTRINA_HOME`, in a folder created for the person alone, opening no port and starting no daemon.
append-requirement event: When a console opens, the system shall enter the room under the name of its repository — the workspace name, as the planner, at a workspace root; a number added when the name is taken — and rewrite its card while it runs; a console that closes shall leave the room, and one whose card is ten seconds old shall no longer be listed.
append-requirement event: When `/send <name> <request>` is run, the system shall put the request in that console inbox, and with `all` in the inbox of every console that is listening, and name the consoles that are open when none has that name.
append-requirement event: When a request from another console arrives and this console is listening with an agent selected, the system shall show which console sent it, hand it to the agent with the instruction to do the work here, and send the last message of the agent back as the report, with whether the turn succeeded and how long it took.
append-requirement event: When a request arrives at a console that is not listening or has no agent, the system shall refuse it and send the reason to the console that asked.
append-requirement event: When a report or a refusal arrives, the system shall show it in the conversation with the console it came from.
append-requirement event: When `doctrina ui --send <name> "<request>"` runs, the system shall hand that console the request and wait for its report, exiting 0 when the agent finished, 1 when it failed, was refused or did not report within `--timeout` seconds, 2 when no request was given, and 3 when no such console is open or it is not listening.
append-requirement event: When `doctrina ui --peers` runs, the system shall list the consoles open in the room with their role, agent, state and directory, and exit 0.
append-requirement event: When a request typed in a console is handed to its agent while other consoles are listening, the system shall tell the agent which consoles are open and the command that hands one a task.
append-requirement state: While a console is answering a request another console sent, the system shall keep any further request waiting in the order it arrived, and shall still run the commands of the console that start no process.
append-requirement unwanted: The system shall not hand on a request that was handed over: the agent serving it is not told of the other consoles, and `doctrina ui --send` refuses to run under it.
append-requirement unwanted: The system shall not act on a message found anywhere but in its own inbox, nor write a message to an inbox whose name is not a console id.
append-criterion [verified] A room is one folder per directory with cards and inboxes the person alone can read; two consoles in one directory get different names; a message is read once, oldest first, and a file that is not a message is dropped; a stale console is removed with its mail, and an id that is a path reaches no inbox — verified by `packages/doctrina-cli/test/os-consoles-se-comunicam.test.js`.
append-criterion [verified] `/peers` lists each console with its role, agent, model and state; `/send` keeps the request as typed, reaches one console or all, and names what is open when the name is wrong or the console is not listening; the name is completed from a list; the header counts the consoles and the panel lists them; the agent is told who is open unless the request came from one — verified by `packages/doctrina-cli/test/os-consoles-se-comunicam.test.js`.
append-criterion [verified] A request from another console starts the agent with its origin, a second one waits and starts when the first is reported, a failed turn is reported as failed and a long last message is cut; a console that is not listening or has no agent refuses with the reason, and stopping to listen sends back what was waiting; the commands of the console still answer while it works — verified by `packages/doctrina-cli/test/os-consoles-se-comunicam.test.js`.
append-criterion [verified] With a planner at a workspace root and a console in one of its repositories, each sees the other; a request sent by the planner runs in the repository and its report returns; `ui --send` waits for the report and speaks as its console, refuses under a served request, exits 3 for a console that is not open and 2 with no request; two requests are answered in order; leaving empties the room — verified by `packages/doctrina-cli/test/os-consoles-se-comunicam.test.js`.
set-header Source: `packages/doctrina-cli/src/commands/ui.js`, `packages/doctrina-cli/src/lib/{console-model,console-view,console-state,console-prefs,console-room,agent-bridge}.js`
bump-version minor
```
