// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { PassThrough, Writable } from "node:stream";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { AGENTS, agentCatalog, agentInvocation, agentPrompt, customAgents, detectAgents, splitArgs } from "../src/lib/agent-bridge.js";
import { consolePrefs, saveConsolePrefs } from "../src/lib/console-prefs.js";
import { agentEvent, commandArgv, initialState, paletteOf, parseKeys, pressKey } from "../src/lib/console-model.js";
import { renderFrame, textWidth } from "../src/lib/console-view.js";
import { session } from "../src/commands/ui.js";

// DOCTRINA WITH A FACE (change 0257, ADR 0032).
//
// The CLI was built for an agent to run: forty commands, each printing what
// to do next. A human had the same forty commands and nothing to look at.
// The console is one window — the gates across the top, the conversation,
// the open work beside it, a line to type on — and a request typed there
// goes to the agent the person already uses, through that agent's own
// non-interactive mode.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

const byId = (/** @type {string} */ id) => /** @type {(typeof AGENTS)[number]} */ (AGENTS.find((x) => x.id === id));
const type = (/** @type {any} */ s, /** @type {string} */ text) => pressKey(s, { name: "char", text }).state;
const key = (/** @type {any} */ s, /** @type {string} */ name) => pressKey(s, /** @type {any} */ ({ name }));
const claude = { id: "claude", label: "Claude Code", file: "/bin/claude", exercised: true };
const codex = { id: "codex", label: "Codex", file: "/bin/codex", exercised: false };
/** The catalog as a machine with Claude Code and Codex installed sees it. */
const catalog = [
  { ...claude, bins: ["claude"], about: "Anthropic's Claude Code", models: ["opus", "sonnet", "haiku"], listing: "`/model` inside `claude`", takesModel: true, custom: false },
  { ...codex, bins: ["codex"], about: "OpenAI's Codex CLI", models: [], listing: "`codex debug models`", takesModel: true, custom: false },
  { id: "cursor", label: "Cursor", file: null, bins: ["cursor-agent", "agent"], exercised: false, about: "the Cursor CLI", models: [], listing: "`agent models`", takesModel: true, custom: false },
  { id: "opencode", label: "opencode", file: "/bin/opencode", bins: ["opencode"], exercised: false, about: "the opencode CLI", models: [], listing: "", takesModel: false, custom: false },
];
const panel = /** @type {any} */ ({
  kind: "project", project: "links", cli: "9.9.9",
  gates: [{ id: "index", state: "ok", text: "in-sync" }, { id: "coverage", state: "warn", text: "50% (1/2)" }, { id: "trace", state: "off", text: "no anchors" }, { id: "verify", state: "fail", text: "invalid" }],
  counts: { specs: 2, decisions: 1, skills: 1, closed: 4 },
  open: [{ id: "0007-expired-links", title: "expired links", status: "proposed", done: 1, total: 4, stage: "build", delivery: null }],
  next: [{ text: "finish the open tasks", command: "doctrina work --resume 0007-expired-links" }],
  recent: [{ id: "0006-codes", date: "2026-11-12" }], projects: [],
  mentions: [
    { kind: "change", id: "0007-expired-links", label: "expired links", path: ".doctrina/changes/0007-expired-links/proposal.md" },
    { kind: "spec", id: "codes", label: "v0.2.0", path: ".doctrina/specs/codes/spec.md" },
    { kind: "skill", id: "cut-a-release", label: "Cut a release", path: ".doctrina/skills/cut-a-release.md" },
  ],
});

test("a chunk of terminal input is read as the keys a person pressed", () => {
  const names = (/** @type {string} */ data) => parseKeys(data).keys.map((k) => ("text" in k ? `${k.name}:${k.text}` : k.name));
  assert.deepEqual(names("ab\r"), ["char:ab", "enter"]);
  assert.deepEqual(names("\x1b[A\x1b[B\x1b[C\x1b[D\x1b[5~\x1b[6~\x1b[3~\x1b[Z"), ["up", "down", "right", "left", "pageup", "pagedown", "delete", "shift-tab"]);
  assert.deepEqual(names("\x1bOA\x1b[1;5C\x1b[H\x1b[F"), ["up", "right", "home", "end"], "application mode and a modifier are the same keys");
  assert.deepEqual(names("\x03\x7f\x15\x17\t\x1b"), ["ctrl-c", "backspace", "ctrl-u", "ctrl-w", "tab", "escape"]);
  assert.deepEqual(names("\x1b[200~two\nlines\x1b[201~x"), ["paste:two\nlines", "char:x"], "a paste is text, never keys");
  assert.deepEqual(names("é日本"), ["char:é日本"]);
  // A sequence cut by the chunk boundary waits for the rest.
  const cut = parseKeys("a\x1b[");
  assert.deepEqual(cut.keys, [{ name: "char", text: "a" }]);
  assert.equal(cut.rest, "\x1b[");
  assert.deepEqual(names(cut.rest + "A"), ["up"]);
});

test("the / list is ordered by what a session reaches for, and enter runs what needs no argument", () => {
  let s = type(initialState({ agents: [claude], panel }), "/ne");
  const list = paletteOf(s);
  assert.deepEqual(list?.items.slice(0, 3).map((i) => i.value), ["/next", "/new", "/spec new"], "the loop first, then the console's own, then a later word");
  assert.ok(!list?.items.some((i) => i.value === "/panel"), "a match in the middle of a word is noise");
  assert.equal(paletteOf(type(initialState({ panel }), "/"))?.items[0].value, "/work");

  // A partial name is completed, and run at once when it means something bare.
  const ran = key(s, "enter");
  assert.deepEqual(ran.effects, [{ type: "run", argv: ["next"], label: "doctrina next" }]);
  assert.equal(ran.state.busy?.label, "doctrina next");
  assert.equal(ran.state.transcript.at(-1)?.text, "/next");

  // One that takes an argument is completed and waits for it.
  s = type(initialState({ panel }), "/wo");
  const waits = key(s, "enter");
  assert.deepEqual(waits.effects, []);
  assert.equal(waits.state.input.join(""), "/work ");
  assert.equal(paletteOf(type(waits.state, "add login")), null, "a whole command with its arguments needs no list");
  const typed = key(type(waits.state, '"add login" --quiet'), "enter");
  assert.deepEqual(typed.effects[0], { type: "run", argv: ["work", "add login", "--quiet"], label: "doctrina work add login --quiet" });

  // The arrows move through the list, and tab takes the choice.
  s = key(type(initialState({ panel }), "/ne"), "down").state;
  assert.equal(key(s, "tab").state.input.join(""), "/new ");
  assert.equal(paletteOf(key(type(initialState({ panel }), "/ne"), "escape").state), null);
});

test("@ completes an artifact: its id in a command, its file in a request", () => {
  let s = type(initialState({ agents: [claude], panel }), "/close @00");
  assert.deepEqual(paletteOf(s)?.items.map((i) => i.value), ["@change:0007-expired-links"]);
  s = key(s, "tab").state;
  assert.equal(s.input.join(""), "/close @change:0007-expired-links ");
  assert.deepEqual(key(s, "enter").effects[0], { type: "run", argv: ["close", "0007-expired-links"], label: "doctrina close 0007-expired-links" });
  assert.deepEqual(commandArgv("/context @spec:codes --for \"expired links\""), ["context", "codes", "--for", "expired links"]);

  assert.deepEqual(paletteOf(type(initialState({ panel }), "follow @cut"))?.items.map((i) => i.value), ["@skill:cut-a-release"]);
  // A mention typed whole is sent with the line, not completed a second time.
  const whole = type(initialState({ agents: [claude], panel }), "tighten @spec:codes");
  assert.equal(paletteOf(whole), null);
  assert.deepEqual(key(whole, "enter").effects, [{ type: "ask", prompt: "tighten @spec:codes" }]);
  const prompt = agentPrompt("tighten @spec:codes, following @skill:cut-a-release and @spec:nope", panel.mentions);
  assert.match(prompt, /^tighten @spec:codes, following @skill:cut-a-release and @spec:nope\n\nDoctrina artifacts mentioned above:\n- @spec:codes — \.doctrina\/specs\/codes\/spec\.md\n- @skill:cut-a-release — \.doctrina\/skills\/cut-a-release\.md \(a project skill: follow its procedure\)$/);
  assert.equal(agentPrompt("mail me at a@b.co", panel.mentions), "mail me at a@b.co", "an address is not a mention");
});

test("a request goes to the agent, and without one the console says where it can go", () => {
  const asked = key(type(initialState({ agents: [claude], panel }), "refuse an expired link"), "enter");
  assert.deepEqual(asked.effects, [{ type: "ask", prompt: "refuse an expired link" }]);
  assert.equal(asked.state.busy?.kind, "agent");

  // While it works the next request can be typed, not sent.
  const early = key(type(asked.state, "and log it"), "enter");
  assert.deepEqual(early.effects, []);
  assert.match(early.state.notice, /Claude Code is still running — esc interrupts it/);
  assert.equal(early.state.input.join(""), "and log it");
  assert.deepEqual(key(asked.state, "escape").effects, [{ type: "interrupt" }]);

  const alone = key(type(initialState({ panel }), "refuse an expired link"), "enter");
  assert.deepEqual(alone.effects, []);
  assert.match(alone.state.transcript.map((e) => e.text).join("\n"), /No agent command-line tool was found on PATH \(claude, cursor-agent, codex, gemini\)[\s\S]*\/work "<request>"/);

  // What the agent says and does lands in the conversation; a refused call is named.
  let s = asked.state;
  for (const ev of AGENTS[0].parse('{"type":"system","subtype":"init","session_id":"abc"}')) s = agentEvent(s, ev);
  for (const ev of AGENTS[0].parse(JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { command: "doctrina work \"x\"" } }, { type: "text", text: "Opened **0008**." }] } }))) s = agentEvent(s, ev);
  for (const ev of AGENTS[0].parse(JSON.stringify({ type: "result", subtype: "success", is_error: false, num_turns: 3, duration_ms: 4200, session_id: "abc", permission_denials: [{ tool_name: "Bash", tool_input: { command: "npm test" } }] }))) s = agentEvent(s, ev);
  assert.equal(s.session, "abc");
  assert.equal(s.busy, null);
  assert.deepEqual(s.transcript.slice(-5).map((e) => `${e.kind}|${e.text}`), [
    "tool|Bash  doctrina work \"x\"",
    "agent|Opened **0008**.",
    "note|refused  Bash(npm test)",
    "note|The agent runs only what its own settings allow — add a rule there, or flags in DOCTRINA_AGENT_ARGS.",
    "ok|3 turns · 4.2s",
  ]);
  assert.deepEqual(AGENTS[0].parse('{"type":"stream_event","event":{}}'), [], "what the console does not show is skipped, not printed");
  assert.deepEqual(AGENTS[0].parse("plain words"), [{ type: "raw", text: "plain words" }]);

  // ctrl+c leaves only when asked twice with nothing typed.
  const once = key(initialState({ panel }), "ctrl-c");
  assert.deepEqual(once.effects, []);
  assert.match(once.state.notice, /again to leave/);
  assert.deepEqual(key(once.state, "ctrl-c").effects, [{ type: "quit" }]);
  assert.deepEqual(key(type(once.state, "x"), "ctrl-c").effects, [], "typing in between disarms it");
});

test("history, editing and the console's own commands", () => {
  let s = initialState({ agents: [claude, codex], catalog, panel });
  s = key(type(s, "/agent"), "enter").state;
  const listed = s.transcript.map((e) => e.text).join("\n");
  assert.match(listed, /● claude {4}Claude Code — \/bin\/claude\n {12}Anthropic's Claude Code\n○ codex {5}Codex — \/bin\/codex\n {12}OpenAI's Codex CLI · started as its documentation says; not exercised/);
  assert.match(listed, /· cursor {4}Cursor — not installed \(looked for `cursor-agent`, `agent` on PATH\)/, "what is known and not installed is listed, with what was looked for");
  assert.match(listed, /One of your own goes in \$DOCTRINA_HOME\/agents\.json/);
  const switched = key(type(s, "/agent codex"), "enter");
  s = switched.state;
  assert.equal(s.agent, "codex");
  assert.deepEqual(switched.effects, [{ type: "save" }], "the choice is kept");
  assert.match(s.transcript.at(-1)?.text ?? "", /requests now go to Codex — a new conversation/);
  assert.equal(key(type(s, "/agent off"), "enter").state.agent, null);
  assert.match(key(type(s, "/agent nope"), "enter").state.transcript.at(-1)?.text ?? "", /no agent "nope" — known: claude, codex, cursor, opencode/);
  assert.match(key(type(s, "/agent cursor"), "enter").state.transcript.at(-1)?.text ?? "", /Cursor is not installed here — the console looked for `cursor-agent`, `agent` on PATH/);
  assert.deepEqual(key(type(s, "/agent codex"), "enter").effects, [], "nothing changed, nothing saved");

  s = key(s, "up").state;
  assert.equal(s.input.join(""), "/agent codex");
  s = key(s, "up").state;
  assert.equal(s.input.join(""), "/agent");
  assert.equal(key(key(s, "down").state, "down").state.input.join(""), "", "past the newest is the line that was being typed");

  s = type(initialState({ panel }), "one two three");
  s = key(s, "ctrl-w").state;
  assert.equal(s.input.join(""), "one two ");
  s = key(key(s, "home").state, "delete").state;
  assert.equal(s.input.join(""), "ne two ");
  s = pressKey(s, { name: "paste", text: "a\nb" }).state;
  assert.equal(s.input.join(""), "a bne two ", "a pasted newline does not send the line");
  assert.equal(key(s, "ctrl-u").state.input.join(""), "ne two ");
  assert.deepEqual(key(type(initialState({ panel }), "/quit"), "enter").effects, [{ type: "quit" }]);
  assert.equal(key(type(initialState({ panel }), "/panel"), "enter").state.showPanel, false);
  assert.equal(key(type(initialState({ panel }), "/clear"), "enter").state.transcript.length, 0);
});

test("/model names the model the agent in use runs, and the names are chosen from a list", () => {
  const base = initialState({ agents: [claude, codex], catalog, panel });
  // What it runs now, the names it accepts, and where its own list is.
  const shown = key(type(base, "/model"), "enter").state.transcript.map((e) => e.text).join("\n");
  assert.match(shown, /Claude Code runs its own default\nNames it accepts include: opus, sonnet, haiku\nThe models your account has: `\/model` inside `claude`\nChoose with \/model <name>/);

  const set = key(type(base, "/model opus"), "enter");
  assert.deepEqual(set.state.models, { claude: "opus" });
  assert.deepEqual(set.effects, [{ type: "save" }]);
  assert.match(set.state.transcript.at(-1)?.text ?? "", /Claude Code runs opus from the next request/);
  assert.match(key(type(set.state, "/model"), "enter").state.transcript.map((e) => e.text).join("\n"), /Claude Code runs opus \(chosen here\)/);
  assert.deepEqual(key(type(set.state, "/model opus"), "enter").effects, [], "the same name again saves nothing");
  // Any name the agent accepts may be typed: the list is examples.
  assert.deepEqual(key(type(set.state, "/model claude-next-9"), "enter").state.models, { claude: "claude-next-9" });
  const back = key(type(set.state, "/model default"), "enter");
  assert.deepEqual(back.state.models, {});
  assert.deepEqual(back.effects, [{ type: "save" }]);

  // A model is kept per agent, and the one in use changes with the agent.
  let s = key(type(set.state, "/agent codex"), "enter").state;
  s = key(type(s, "/model gpt-x"), "enter").state;
  assert.deepEqual(s.models, { claude: "opus", codex: "gpt-x" });
  assert.match(key(type(s, "/agent claude"), "enter").state.transcript.at(-1)?.text ?? "", /requests now go to Claude Code · opus/);

  // The list: agents with their state, models with the way back.
  assert.deepEqual(paletteOf(type(base, "/agent "))?.items.map((i) => `${i.value} | ${i.label}`), [
    "/agent claude | Claude Code — in use", "/agent codex | Codex — installed", "/agent cursor | Cursor — not installed",
    "/agent opencode | opencode — installed", "/agent off | send requests nowhere",
  ]);
  assert.deepEqual(paletteOf(type(base, "/agent co"))?.items.map((i) => i.value), ["/agent codex"]);
  assert.deepEqual(key(type(base, "/agent co"), "enter").state.agent, "codex", "enter takes the choice and runs it");
  assert.deepEqual(paletteOf(type(base, "/model "))?.items.map((i) => i.value), ["/model opus", "/model sonnet", "/model haiku", "/model default"]);
  assert.equal(paletteOf(type(base, "/model opus")), null, "a whole name needs no list");

  // An agent that names no model on its command line says so; no agent, likewise.
  const oc = initialState({ agents: [{ id: "opencode", label: "opencode", file: "/bin/opencode", exercised: false }], catalog, panel });
  assert.match(key(type(oc, "/model big"), "enter").state.transcript.at(-1)?.text ?? "", /opencode takes no model on its command line here — name it in the agent's own settings, or in DOCTRINA_AGENT_ARGS/);
  assert.match(key(type(initialState({ catalog, panel }), "/model"), "enter").state.transcript.at(-1)?.text ?? "", /no agent is selected/);

  // What the agent says it runs is shown when nothing was chosen; a choice wins.
  let r = agentEvent(base, { type: "model", name: "claude-opus-5" });
  assert.match(renderFrame(r, { cols: 110, rows: 20, color: false, now: 0 }).lines[0], /● claude · claude-opus-5 {3}v9\.9\.9 $/);
  r = key(type(r, "/model sonnet"), "enter").state;
  const frame = renderFrame(r, { cols: 110, rows: 20, color: false, now: 0 }).lines.join("\n");
  assert.match(frame, /● claude · sonnet {3}v9\.9\.9 /);
  assert.match(frame, /╭─ to Claude Code · sonnet ─/);
  assert.match(renderFrame(initialState({ catalog, panel }), { cols: 90, rows: 20, color: false, now: 0 }).lines.join("\n"), /╭─ no agent — \/agent chooses one ─/);

  // The agent chosen before answers again, while it is still installed.
  assert.equal(initialState({ agents: [claude, codex], catalog, prefs: { agent: "codex", models: { codex: "gpt-x" } } }).agent, "codex");
  assert.equal(initialState({ agents: [claude], catalog, prefs: { agent: "codex", models: {} } }).agent, "claude");
});

test("every frame is exactly the window: the panel when it fits, one strip when it does not", () => {
  const base = initialState({ agents: [claude], panel });
  for (const [cols, rows] of [[120, 34], [104, 30], [84, 24], [70, 20], [48, 14], [30, 10]]) {
    for (const s of [base, type(base, "/ne"), type(base, "x".repeat(300)), type(base, "see @sp")]) {
      const f = renderFrame(s, { cols, rows, color: false, now: 0 });
      assert.equal(f.lines.length, rows, `${cols}x${rows}`);
      f.lines.forEach((line, i) => assert.equal(textWidth(line), i === rows - 1 ? cols - 1 : cols, `${cols}x${rows} line ${i}: ${JSON.stringify(line)}`));
      assert.ok(f.cursor.row < rows && f.cursor.col < cols);
      assert.doesNotMatch(f.lines.join(""), /\x1b/, "no colour was asked for");
    }
  }
  const wide = renderFrame(base, { cols: 110, rows: 30, color: false, now: 0 }).lines.join("\n");
  assert.match(wide, /^ ◆ Doctrina {2}│ {2}links +● claude {3}v9\.9\.9 \n index ✓ {3}coverage ! 50% \(1\/2\) {3}trace · no anchors {3}verify ✗ invalid +2 specs · 1 ADR · 4 closed /);
  assert.match(wide, /│ OPEN WORK +\n[^\n]*│ 0007-expired-links +\n[^\n]*│ ✓ plan ─ ● build ─ ○ close +\n[^\n]*│ ■■■□□□□□□□ {2}1\/4 tasks/);
  assert.match(wide, /│ NEXT +\n[^\n]*│ 1 finish the open tasks +\n[^\n]*│ {3}\/work --resume 0007-expired-links/);
  assert.match(wide, /╭─ to Claude Code ─+╮\n│ › Ask Claude Code for a change, or type \/ for commands +│\n╰─+╯/);

  const narrow = renderFrame(base, { cols: 70, rows: 20, color: false, now: 0 }).lines;
  assert.doesNotMatch(narrow.join("\n"), /OPEN WORK/);
  assert.match(narrow[2], /^ ► 0007-expired-links {2}build 1\/4 {3}next \/work --resume 0007-expired-l…$/);

  // The cursor follows the typed line, onto the next row when it wraps.
  const short = renderFrame(type(base, "abc"), { cols: 60, rows: 20, color: false, now: 0 });
  assert.equal(short.lines[short.cursor.row].slice(0, short.cursor.col), "│ › abc");
  const long = renderFrame(type(base, "y".repeat(70)), { cols: 60, rows: 20, color: false, now: 0 });
  assert.equal(long.cursor.row, short.cursor.row, "the box grows upward, the cursor stays on its last row");
  assert.match(long.lines[long.cursor.row - 1], /^│ › y{54} │$/);

  // What is running is named on the box, with the way out.
  const busy = { ...base, busy: { kind: /** @type {const} */ ("agent"), label: "Claude Code", since: 0 } };
  assert.match(renderFrame(busy, { cols: 90, rows: 20, color: false, now: 12_000 }).lines.join("\n"), /╭─ . Claude Code 12s · esc interrupts ─+╮/);
  assert.match(renderFrame(base, { cols: 90, rows: 20, color: true, now: 0 }).lines[0], /\x1b\[1;38;5;179m ◆ \x1b\[0m/);
  assert.match(renderFrame({ ...base, panel: { ...panel, kind: "none", project: null, gates: [], open: [] } }, { cols: 90, rows: 20, color: false, now: 0 }).lines[1], /not a Doctrina project — \/init sets it up/);
});

test("an agent is started as its documentation says, and never with a flag that skips its approvals", () => {
  const call = agentInvocation(claude, "open the change", { session: null, env: {} });
  assert.deepEqual(call.args, ["-p", "--output-format", "stream-json", "--verbose", "--permission-mode", "acceptEdits", "--allowedTools", "Bash(doctrina:*)"]);
  assert.equal(call.stdin, "open the change", "what a person typed is never an argument");
  assert.deepEqual(agentInvocation(claude, "x", { session: "abc", env: { DOCTRINA_AGENT_ARGS: '--model "claude x" --add-dir ../lib' } }).args.slice(-6),
    ["--resume", "abc", "--model", "claude x", "--add-dir", "../lib"]);
  assert.deepEqual(splitArgs(" a  'b c' \"\" d"), ["a", "b c", "", "d"]);

  const others = { cursor: "/bin/cursor-agent", codex: "/bin/codex", gemini: "/bin/gemini" };
  assert.deepEqual(agentInvocation({ id: "cursor", file: others.cursor }, "do it", { session: "c1", env: {} }).args, ["-p", "--output-format", "stream-json", "--resume", "c1", "do it"]);
  assert.deepEqual(agentInvocation({ id: "codex", file: others.codex }, "do it", { session: "t1", env: {} }).args, ["exec", "resume", "t1", "--json", "--sandbox", "workspace-write", "do it"]);
  assert.deepEqual(agentInvocation({ id: "gemini", file: others.gemini }, "do it", { env: {} }), { refused: "", file: others.gemini, args: ["--approval-mode", "auto_edit"], stdin: "do it", shell: false });
  assert.deepEqual(agentInvocation({ id: "copilot", file: "/bin/copilot" }, "do it", { session: "x", model: "gpt-5.3-codex", env: {} }).args,
    ["-p", "do it", "-s", "--allow-tool=write, shell(doctrina:*)", "--model=gpt-5.3-codex"], "Copilot may write and run doctrina, and resumes nothing");
  assert.deepEqual(agentInvocation({ id: "opencode", file: "/bin/opencode" }, "do it", { model: "big", env: {} }).args, ["run", "do it"], "no model flag is documented for it, so none is passed");
  // The model goes the way each agent names one, before the person's own flags.
  assert.deepEqual(agentInvocation(claude, "x", { model: "opus", env: { DOCTRINA_AGENT_ARGS: "--add-dir ../lib" } }).args.slice(-4), ["--model", "opus", "--add-dir", "../lib"]);
  assert.deepEqual(agentInvocation({ id: "cursor", file: others.cursor }, "do it", { model: "gpt-5", env: {} }).args, ["-p", "--output-format", "stream-json", "--model", "gpt-5", "do it"]);
  assert.deepEqual(agentInvocation({ id: "gemini", file: others.gemini }, "do it", { model: "flash", env: {} }).args, ["--approval-mode", "auto_edit", "--model", "flash"]);
  assert.deepEqual(AGENTS.map((a) => a.id), ["claude", "cursor", "copilot", "codex", "gemini", "opencode"]);
  for (const spec of AGENTS) {
    const args = spec.args("p", { session: "s", extra: [] }).join(" ");
    assert.doesNotMatch(args, /bypass|yolo|dangerously|--force|(^| )-f( |$)|danger-full-access|unrestricted|allow-all|--yes/i, `${spec.id} is never told to skip its approvals`);
  }
  assert.deepEqual(AGENTS[0].parse('{"type":"system","subtype":"init","session_id":"s1","model":"claude-opus-5"}'),
    [{ type: "session", id: "s1" }, { type: "model", name: "claude-opus-5" }], "the model an agent reports is read, never assumed");

  // The security policy says the same thing the code does.
  const policy = readFileSync(path.resolve(here, "..", "..", "..", "SECURITY.md"), "utf8").replace(/\s+/g, " ");
  assert.match(policy, /The CLI spawns exactly four kinds of process/);
  for (const spec of AGENTS) for (const bin of spec.bins) assert.ok(policy.includes(`\`${bin}\``), `SECURITY.md names ${bin}`);
  assert.match(policy, /never through a shell that could read it as commands, and never with a flag that skips the agent's approvals/);
  assert.match(policy, /`DOCTRINA_AGENT` and `DOCTRINA_AGENT_ARGS` in your environment, not a file of the project/);

  // A .cmd launcher runs through cmd.exe: only with the prompt on stdin.
  const shim = agentInvocation({ id: "claude", file: "C:\\npm\\claude.cmd" }, "a & del", { env: {}, platform: "win32" });
  assert.equal(shim.shell, true);
  assert.ok(!shim.args.includes("a & del"));
  assert.match(agentInvocation({ id: "cursor", file: "C:\\npm\\cursor-agent.cmd" }, "a & del", { env: {}, platform: "win32" }).refused, /a prompt is not passed through cmd\.exe/);

  // Cursor's and Codex's streams, as their documentation shows them.
  assert.deepEqual(byId("cursor").parse('{"type":"tool_call","subtype":"started","call_id":"1","tool_call":{"readToolCall":{"args":{"path":"README.md"}}}}'), [{ type: "tool", name: "Read", detail: "README.md" }]);
  assert.deepEqual(byId("cursor").parse('{"type":"result","subtype":"success","is_error":false,"duration_ms":5234,"result":"done","session_id":"c6"}'),
    [{ type: "session", id: "c6" }, { type: "result", ok: true, turns: null, ms: 5234, denials: [], error: "" }]);
  assert.deepEqual(byId("codex").parse('{"type":"thread.started","thread_id":"t9"}'), [{ type: "session", id: "t9" }]);
  assert.deepEqual(byId("codex").parse('{"type":"item.completed","item":{"id":"1","type":"agent_message","text":"done"}}'), [{ type: "text", text: "done" }]);
  assert.equal(byId("codex").parse('{"type":"turn.failed","error":{"message":"quota"}}')[0].type, "result");
});

test("the agent found first is the one this terminal, or this project, already uses", { skip: process.platform === "win32" }, () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-agents-"));
  try {
    const bin = path.join(dir, "bin");
    mkdirSync(bin);
    for (const name of ["claude", "codex", "agent"]) {
      writeFileSync(path.join(bin, name), "#!/bin/sh\n");
      chmodSync(path.join(bin, name), 0o755);
    }
    writeFileSync(path.join(bin, "gemini"), "not executable");
    const project = path.join(dir, "project");
    mkdirSync(project);
    const found = (/** @type {NodeJS.ProcessEnv} */ env) => detectAgents({ env: { PATH: bin, ...env }, cwd: project }).map((a) => a.id);
    assert.deepEqual(found({}), ["claude", "codex"], "a bare `agent` is not taken for Cursor's, and a file that cannot run is not an agent");
    assert.deepEqual(found({ DOCTRINA_AGENT: "codex" }), ["codex", "claude"]);
    assert.deepEqual(found({ DOCTRINA_AGENT: "none" }), []);
    assert.deepEqual(found({ CURSOR_TRACE_ID: "x" }), ["cursor", "claude", "codex"], "in Cursor's terminal, Cursor answers");
    mkdirSync(path.join(project, ".cursor"));
    assert.deepEqual(found({}), ["cursor", "claude", "codex"], "a project with the Cursor adapter");
    assert.deepEqual(found({ CLAUDECODE: "1" }), ["claude", "cursor", "codex"]);
    assert.deepEqual(detectAgents({ env: { PATH: path.join(dir, "nowhere") }, cwd: project }), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an agent of the person's own is declared once, and a broken declaration is named", { skip: process.platform === "win32" }, () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-own-agent-"));
  try {
    const home = path.join(dir, "home");
    const bin = path.join(dir, "bin");
    mkdirSync(home);
    mkdirSync(bin);
    writeFileSync(path.join(bin, "mycli"), "#!/bin/sh\n");
    chmodSync(path.join(bin, "mycli"), 0o755);
    const env = { PATH: bin, DOCTRINA_HOME: home };
    assert.deepEqual(customAgents(env), { specs: [], errors: [] }, "no file, no agent, no complaint");

    writeFileSync(path.join(home, "agents.json"), JSON.stringify({ agents: [
      { id: "mine", label: "My agent", command: "mycli", args: ["run", "--quiet", "{prompt}"], model: ["--model", "{model}"], resume: ["--session", "{session}"], models: ["small", "large"] },
      { id: "piped", command: "mycli", output: "stream-json" },
      { id: "claude", command: "x" },
      { id: "Bad Id", command: "x" },
      { id: "nocmd" },
      { id: "badargs", command: "x", args: "run" },
    ] }));
    const { specs, errors } = customAgents(env);
    assert.deepEqual(specs.map((a) => a.id), ["mine", "piped"]);
    assert.deepEqual(errors.map((e) => e.replace(/^.*agents\.json: /, "")), [
      'agents[2].id "claude" is already an agent', "agents[3].id must be lowercase letters, digits and hyphens",
      "agents[4].command names the binary to run", "agents[5].args must be an array of strings",
    ]);
    const mine = agentCatalog({ env, cwd: dir }).find((a) => a.id === "mine");
    assert.equal(mine?.file, path.join(bin, "mycli"));
    assert.equal(mine?.custom, true);
    assert.ok(detectAgents({ env, cwd: dir }).some((a) => a.id === "mine"));
    assert.deepEqual(agentInvocation({ id: "mine", file: path.join(bin, "mycli") }, "do it", { session: "s9", model: "large", env }),
      { refused: "", file: path.join(bin, "mycli"), args: ["run", "--quiet", "do it", "--session", "s9", "--model", "large"], stdin: null, shell: false });
    // With no {prompt} in its arguments, the request goes in on stdin.
    assert.equal(agentInvocation({ id: "piped", file: path.join(bin, "mycli") }, "do it", { env }).stdin, "do it");
    assert.equal(specs[1].parse('{"type":"assistant","message":{"content":[{"type":"text","text":"hi"}]}}')[0].type, "text");

    writeFileSync(path.join(home, "agents.json"), "{ not json");
    assert.match(customAgents(env).errors[0], /agents\.json is not valid JSON/);

    // The choices: kept per directory, and a file broken by hand loses them without stopping the console.
    assert.equal(saveConsolePrefs(dir, { agent: "mine", models: { mine: "large" } }, env), true);
    assert.deepEqual(consolePrefs(dir, env), { agent: "mine", models: { mine: "large" } });
    assert.deepEqual(JSON.parse(readFileSync(path.join(home, "console.json"), "utf8")).version, 1);
    writeFileSync(path.join(home, "console.json"), "nope");
    assert.deepEqual(consolePrefs(dir, env), { agent: null, models: {} });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-console-"));
  const home = path.join(dir, ".home");
  const root = path.join(dir, "links");
  mkdirSync(root);
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: home, DOCTRINA_AGENT: "none" };
  delete env.FORCE_COLOR;
  const run = (/** @type {string[]} */ args, cwd = root) => {
    const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env });
    return { status: r.status, stdout: r.stdout, stderr: r.stderr };
  };
  run(["init", "--non-interactive", "--project-name", "links"]);
  run(["spec", "new", "codes"]);
  run(["work", "expired links are refused", "--title", "expired links", "--capability", "codes", "--quiet"]);
  return { dir, root, env, run, done: () => rmSync(dir, { recursive: true, force: true }) };
}

test("ui --json is the panel's state, and without a terminal ui prints one frame", () => {
  const p = project();
  try {
    const state = JSON.parse(p.run(["ui", "--json"]).stdout);
    assert.equal(state.command, "ui");
    assert.equal(state.kind, "project");
    assert.equal(state.project, "links");
    assert.deepEqual(state.gates.map((/** @type {any} */ g) => `${g.id}:${g.state}`), ["index:ok", "coverage:warn", "trace:off", "verify:off"]);
    assert.deepEqual(state.open.map((/** @type {any} */ c) => `${c.id} ${c.stage} ${c.done}/${c.total}`), ["0001-expired-links plan 0/3"]);
    assert.match(state.next[0].command, /^doctrina work --resume 0001-expired-links/);
    assert.deepEqual(state.mentions.map((/** @type {any} */ m) => `@${m.kind}:${m.id}`), ["@change:0001-expired-links", "@spec:codes"]);
    assert.deepEqual(state.agents.map((/** @type {any} */ a) => a.id).sort(), ["claude", "codex", "copilot", "cursor", "gemini", "opencode"], "every agent known, installed or not");
    assert.ok(state.agents.every((/** @type {any} */ a) => "file" in a && "model" in a));

    const frame = p.run(["ui", "--frame", "--cols", "96", "--rows", "22"]);
    assert.equal(frame.status, 0);
    const lines = frame.stdout.replace(/\n$/, "").split("\n");
    assert.equal(lines.length, 22);
    assert.match(lines[0], /^ ◆ Doctrina {2}│ {2}links +○ no agent {3}v\d+\.\d+\.\d+ $/);
    assert.match(frame.stdout, /│ 0001-expired-links +\n[^\n]*│ ● plan ─ ○ build ─ ○ close/);
    assert.equal(frame.stderr, "");

    const piped = p.run(["ui"]);
    assert.equal(piped.status, 0);
    assert.match(piped.stdout, /◆ Doctrina/);
    assert.match(piped.stderr, /the console is interactive — run `doctrina ui` in a terminal; this is one frame of it/);

    // A pipe that runs `doctrina` alone still gets the help; a directory with no project still gets a frame.
    assert.match(p.run([]).stdout, /^Usage: doctrina/m);
    const bare = p.run(["ui", "--frame", "--cols", "90", "--rows", "12"], p.dir);
    assert.equal(bare.status, 0);
    assert.match(bare.stdout, /not a Doctrina project — \/init sets it up, \/onboard walks you through/);
    assert.equal(JSON.parse(p.run(["ui", "--json"], p.dir).stdout).kind, "none");
  } finally {
    p.done();
  }
});

/** A terminal a test owns: what is written is kept, what is "typed" is pushed. */
function terminal(cols = 100, rows = 30) {
  let text = "";
  const out = /** @type {any} */ (new Writable({ write(chunk, _enc, cb) { text += chunk; cb(); } }));
  Object.assign(out, { columns: cols, rows, isTTY: true });
  const inp = /** @type {any} */ (new PassThrough());
  Object.assign(inp, { isTTY: true, setRawMode: () => inp });
  const frame = () => (text.split("\x1b[?25l\x1b[H").pop() ?? "").replace(/\x1b\[\d+;\d+H\x1b\[\?25h[\s\S]*$/, "").split("\r\n");
  const until = async (/** @type {(screen: string) => boolean} */ ok, what = "") => {
    const end = Date.now() + 30_000;
    while (Date.now() < end) {
      if (ok(frame().join("\n"))) return frame().join("\n");
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`the screen never showed ${what || ok}:\n${frame().join("\n")}`);
  };
  return { inp, out, frame, until, raw: () => text };
}

const FAKE_AGENT = `#!/usr/bin/env node
let prompt = "";
process.stdin.on("data", (d) => { prompt += d; });
process.stdin.on("end", () => {
  const say = (o) => console.log(JSON.stringify(o));
  const at = process.argv.indexOf("--resume");
  say({ type: "system", subtype: "init", session_id: "sess-1" });
  if (prompt.includes("wait forever")) { setInterval(() => {}, 1000); return; }
  say({ type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { command: "doctrina next" } }] } });
  const m = process.argv.indexOf("--model");
  say({ type: "assistant", message: { content: [{ type: "text", text: "heard: " + prompt.split("\\n")[0] + " (resume " + (at < 0 ? "none" : process.argv[at + 1]) + (m < 0 ? "" : ", model " + process.argv[m + 1]) + ")" }] } });
  say({ type: "result", subtype: "success", is_error: false, num_turns: 2, duration_ms: 1200, session_id: "sess-1", permission_denials: [] });
});
`;

test("the console in a terminal: a command, two requests in one conversation, an interrupt, and the way out", { skip: process.platform === "win32" }, async () => {
  const p = project();
  try {
    const bin = path.join(p.dir, "bin");
    mkdirSync(bin);
    writeFileSync(path.join(bin, "claude"), FAKE_AGENT);
    chmodSync(path.join(bin, "claude"), 0o755);
    const env = { ...p.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, DOCTRINA_AGENT: "claude" };
    // Narrow enough that the panel is one strip: the conversation is the whole width.
    const term = terminal(82, 30);
    /** @type {Promise<number>} */
    const ended = new Promise((resolve) => { session(p.root, resolve, { inp: term.inp, out: term.out, env, color: false }); });
    assert.ok(term.raw().startsWith("\x1b[?1049h\x1b[?2004h"), "the terminal's own screen is left alone");

    // The panel arrives from the tree, not from the console.
    await term.until((s) => /► 0001-expired-links {2}plan 0\/3/.test(s), "the open change");
    assert.match(term.frame()[0], /^ ◆ Doctrina {2}│ {2}links +● claude/);

    // A command: what it prints is what it prints anywhere.
    term.inp.write("/next\r");
    const next = await term.until((s) => /Next actions \(in priority order\):[\s\S]*✓ \d+\.\ds/.test(s), "doctrina next and its end");
    assert.match(next, / › \/next +\n {3}Next actions \(in priority order\):/);

    // A request: the agent's tool call, its words, its end — and the session kept.
    term.inp.write("refuse an expired link with @spec:codes\r");
    const first = await term.until((s) => /2 turns · 1\.2s/.test(s), "the agent's answer");
    assert.match(first, / › refuse an expired link with @spec:codes +\n {3}└ Bash {2}doctrina next +\n ◆ heard: refuse an expired link with @spec:codes \(resume none\) +\n {3}✓ 2 turns · 1\.2s/);
    assert.match(first, /╭─ to Claude Code · same conversation ─/);
    term.inp.write("and log it\r");
    await term.until((s) => /heard: and log it \(resume sess-1\)/.test(s), "the second request continuing the first");
    term.inp.write("/new\r");
    term.inp.write("start over\r");
    await term.until((s) => /heard: start over \(resume none\)/.test(s), "a new conversation");

    // A model chosen here reaches the agent's command line, and is kept for next time.
    term.inp.write("/model opus\r");
    term.inp.write("with a model\r");
    await term.until((s) => /heard: with a model \(resume sess-1, model opus\)/.test(s), "the model on the agent's command line");
    assert.match(term.frame().join("\n"), /╭─ to Claude Code · opus · same conversation ─/);
    assert.deepEqual(consolePrefs(p.root, env), { agent: "claude", models: { claude: "opus" } });
    assert.deepEqual(consolePrefs(path.join(p.root, "elsewhere"), env), { agent: null, models: {} }, "a choice belongs to the directory it was made in");

    // An agent that never ends is interrupted with esc, and says so.
    term.inp.write("wait forever\r");
    await term.until((s) => /Claude Code \d+s · esc interrupts/.test(s), "the running agent");
    term.inp.write("\x1b");
    await term.until((s) => /✗ interrupted · \d+\.\ds/.test(s), "the interrupt");

    term.inp.write("/quit\r");
    assert.equal(await ended, 0);
    assert.ok(term.raw().endsWith("\x1b[?2004l\x1b[?25h\x1b[?1049l"), "and the terminal is given back");
    assert.equal(readFileSync(path.join(p.root, ".doctrina", "index.json"), "utf8").includes("0001-expired-links"), true);
  } finally {
    p.done();
  }
});
