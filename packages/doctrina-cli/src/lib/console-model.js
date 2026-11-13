// @ts-check
import { CORE_SURFACE, OPERATIONS, DEPRECATED } from "./commands.js";
import { splitArgs } from "./agent-bridge.js";

// THE CONSOLE, AS STATE (change 0257).
//
// Everything the console knows is one plain object and everything that
// happens to it — a key, a line a command printed, an event from the agent —
// goes through `reduce`, which returns the next state and the EFFECTS it
// asks for: run a command, ask the agent, interrupt, refresh, quit. The
// command module performs them; nothing here reads a terminal, starts a
// process or touches the tree, so the whole interaction is tested as data.

/** @typedef {import("./console-state.js").ConsoleState} Panel */
/** @typedef {import("./agent-bridge.js").AgentEvent} AgentEvent */
/** @typedef {{ kind: "banner" | "user" | "out" | "err" | "agent" | "tool" | "note" | "ok" | "fail" | "blank", text: string }} Entry */
/** @typedef {{ name: string, summary: string, local: boolean, immediate: boolean }} PaletteCommand */
/** @typedef {{ kind: "slash" | "mention", items: { value: string, label: string, immediate: boolean }[], from: number }} Palette */
/**
 * @typedef {{ type: "run", argv: string[], label: string }
 *   | { type: "ask", prompt: string }
 *   | { type: "interrupt" } | { type: "refresh" } | { type: "quit" }} Effect
 */
/**
 * @typedef {{ name: "char" | "paste", text: string }
 *   | { name: "enter" | "tab" | "shift-tab" | "backspace" | "delete" | "left" | "right" | "up" | "down" | "home" | "end"
 *       | "pageup" | "pagedown" | "escape" | "ctrl-c" | "ctrl-d" | "ctrl-u" | "ctrl-w" | "ctrl-k" | "ctrl-l" | "ctrl-r" }} Key
 */
/**
 * @typedef {{
 *   input: string[], cursor: number,
 *   history: string[], historyAt: number | null, draft: string,
 *   transcript: Entry[], scroll: number,
 *   paletteAt: number, paletteOff: boolean,
 *   panel: Panel | null, showPanel: boolean,
 *   agents: { id: string, label: string, file: string, exercised: boolean }[], agent: string | null, session: string | null,
 *   busy: { kind: "command" | "agent", label: string, since: number } | null,
 *   notice: string, armed: boolean, said: boolean,
 * }} State
 */

// The commands that only exist inside the console.
const LOCAL = [
  ["help", "What the console understands"],
  ["agent", "Show the agents found, or switch: /agent <name> · /agent off"],
  ["new", "Start a new conversation with the agent"],
  ["clear", "Clear the conversation"],
  ["panel", "Show or hide the project panel"],
  ["refresh", "Read the project's state again"],
  ["quit", "Leave the console"],
];

// The operations that mean something with no argument: Enter on one runs it.
const IMMEDIATE = new Set(["prime", "next", "status", "validate", "doctor", "handoff", "onboard", "coverage", "trace",
  "verify", "metrics", "spec list", "decision list", "skill list", "contract list", "intent list", "adapter list",
  "templates list", "workspace list", "delivery list", "help", "agent", "new", "clear", "panel", "refresh", "quit"]);

/**
 * Every command `/` offers, in the order a person reaches for them: the
 * session loop, then the console's own, then the rest of the catalog.
 */
export function paletteCommands() {
  /** @type {PaletteCommand[]} */
  const cli = [];
  for (const [name, summary] of OPERATIONS) {
    if (DEPRECATED[name] || name === "ui" || name.startsWith("workspace guard")) continue;
    cli.push({ name, summary, local: false, immediate: IMMEDIATE.has(name) });
  }
  const loop = ["work", "next", "close", "status", ...CORE_SURFACE];
  const first = [...new Set(loop)].map((n) => cli.find((c) => c.name === n)).filter((c) => c !== undefined);
  return [
    ...first,
    ...LOCAL.map(([name, summary]) => ({ name, summary, local: true, immediate: IMMEDIATE.has(name) })),
    ...cli.filter((c) => !first.includes(c)),
  ];
}

const COMMANDS = paletteCommands();

/** @returns {State} */
export function initialState({ agents = /** @type {State["agents"]} */ ([]), panel = /** @type {Panel | null} */ (null) } = {}) {
  return {
    input: [], cursor: 0, history: [], historyAt: null, draft: "",
    transcript: [{ kind: "banner", text: "" }], scroll: 0,
    paletteAt: 0, paletteOff: false,
    panel, showPanel: true,
    agents, agent: agents[0]?.id ?? null, session: null,
    busy: null, notice: "", armed: false, said: false,
  };
}

const text = (/** @type {State} */ s) => s.input.join("");

/**
 * What the palette offers for the input as it stands, or null.
 * @param {State} s
 * @returns {Palette | null}
 */
export function paletteOf(s) {
  if (s.paletteOff) return null;
  const line = text(s);
  // `@` completes the word under the cursor, wherever it is.
  let from = s.cursor;
  while (from > 0 && !/\s/.test(s.input[from - 1])) from--;
  const word = s.input.slice(from, s.cursor).join("");
  if (/^@[\w:.-]*$/.test(word)) {
    const q = word.slice(1).toLowerCase();
    const all = (s.panel?.mentions ?? []).map((m) => ({ value: `@${m.kind}:${m.id}`, label: m.label, key: `${m.kind}:${m.id}`.toLowerCase(), id: m.id.toLowerCase() }));
    const hits = [
      ...all.filter((m) => m.key.startsWith(q) || m.id.startsWith(q)),
      ...all.filter((m) => !(m.key.startsWith(q) || m.id.startsWith(q)) && m.key.includes(q)),
    ];
    // A mention that is already whole needs no list: enter sends the line.
    if (hits.length === 0 || (hits.length === 1 && hits[0].value === word)) return null;
    return { kind: "mention", from, items: hits.map((m) => ({ value: m.value, label: m.label, immediate: false })) };
  }
  if (!line.startsWith("/") || s.cursor !== s.input.length) return null;
  const q = line.slice(1).toLowerCase();
  // A command that is already whole, followed by its arguments, needs no list.
  // What the name starts with first; then a later word of it (`/new` finds `spec new`).
  const hits = [
    ...COMMANDS.filter((c) => c.name.startsWith(q)),
    ...COMMANDS.filter((c) => !c.name.startsWith(q) && q !== "" && !q.includes(" ") && c.name.split(" ").some((w) => w.startsWith(q))),
  ];
  if (hits.length === 0 || (hits.length === 1 && hits[0].name === q)) return null;
  return { kind: "slash", from: 0, items: hits.map((c) => ({ value: `/${c.name}`, label: c.summary, immediate: c.immediate })) };
}

const say = (/** @type {State} */ s, /** @type {Entry["kind"]} */ kind, /** @type {string} */ t) => ({ ...s, transcript: [...s.transcript, { kind, text: t }], scroll: 0 });
const setInput = (/** @type {State} */ s, /** @type {string} */ t) => ({ ...s, input: Array.from(t), cursor: Array.from(t).length, paletteAt: 0, paletteOff: false });

const HELP = [
  "Type a request in your own words and it goes to the agent, which works in this repository.",
  "",
  "  /            a Doctrina command — /next, /work \"<request>\", /close <id>, /status …  (tab completes)",
  "  @            mention an artifact — @spec:auth, @change:0001-login, @skill:…, @adr:0005",
  "  ↑ ↓          earlier inputs · pgup pgdn scroll the conversation",
  "  esc          interrupt what is running, or clear the line",
  "  /agent       which agent answers · /new starts a new conversation with it",
  "  ctrl+c       twice to leave (or /quit)",
];

/** The command line of a `/` input: mentions become the ids they name. */
export function commandArgv(line) {
  return splitArgs(line.replace(/^\//, "")).map((a) => a.replace(/^@[a-z]+:([A-Za-z0-9._-]+)$/, "$1"));
}

/**
 * @param {State} s
 * @param {string} line
 * @returns {{ state: State, effects: Effect[] }}
 */
function submit(s, line) {
  const trimmed = line.trim();
  if (trimmed === "") return { state: s, effects: [] };
  if (s.busy) return { state: { ...s, notice: `${s.busy.label} is still running — esc interrupts it` }, effects: [] };
  /** @type {State} */
  let next = { ...setInput(s, ""), history: s.history[s.history.length - 1] === trimmed ? s.history : [...s.history, trimmed], historyAt: null, draft: "", said: true };
  next = say(say(next, "blank", ""), "user", trimmed);
  if (trimmed === "?") return { state: HELP.reduce((acc, l) => say(acc, "note", l), next), effects: [] };
  if (!trimmed.startsWith("/")) {
    const agent = next.agents.find((a) => a.id === next.agent);
    if (!agent) {
      next = say(next, "note", next.agents.length > 0
        ? "No agent is selected — /agent <name> picks one."
        : "No agent command-line tool was found on PATH (claude, cursor-agent, codex, gemini), so a request has nowhere to go.");
      next = say(next, "note", "Open the change yourself with /work \"<request>\", or install your agent's CLI and run /agent.");
      return { state: next, effects: [] };
    }
    return { state: { ...next, busy: { kind: "agent", label: agent.label, since: Date.now() } }, effects: [{ type: "ask", prompt: trimmed }] };
  }
  const argv = commandArgv(trimmed);
  const [name, ...rest] = argv;
  switch (name) {
    case undefined:
      return { state: next, effects: [] };
    case "help":
      return { state: HELP.reduce((acc, l) => say(acc, "note", l), next), effects: [] };
    case "quit":
    case "exit":
      return { state: next, effects: [{ type: "quit" }] };
    case "clear":
      return { state: { ...next, transcript: [], scroll: 0 }, effects: [] };
    case "panel":
      return { state: { ...next, showPanel: !next.showPanel }, effects: [] };
    case "refresh":
      return { state: say(next, "note", "reading the project's state again"), effects: [{ type: "refresh" }] };
    case "new":
      return { state: say({ ...next, session: null }, "note", "the next request starts a new conversation with the agent"), effects: [] };
    case "agent":
      return { state: chooseAgent(next, rest[0] ?? ""), effects: [] };
    case "ui":
      return { state: say(next, "note", "this is the console already"), effects: [] };
    default:
      return { state: { ...next, busy: { kind: "command", label: `doctrina ${name}`, since: Date.now() } }, effects: [{ type: "run", argv, label: `doctrina ${argv.join(" ")}` }] };
  }
}

function chooseAgent(s, name) {
  if (name === "") {
    if (s.agents.length === 0) return say(s, "note", "No agent CLI found on PATH. The console looks for: claude (Claude Code), cursor-agent (Cursor), codex, gemini.");
    let out = s;
    for (const a of s.agents) {
      out = say(out, "note", `${a.id === s.agent ? "●" : "○"} ${a.id.padEnd(7)} ${a.label} — ${a.file}${a.exercised ? "" : "  (driven from its documentation; not exercised by Doctrina's tests against the real binary)"}`);
    }
    return say(out, "note", "Switch with /agent <name>, or /agent off. DOCTRINA_AGENT pins one; DOCTRINA_AGENT_ARGS adds flags of your own.");
  }
  if (name === "off" || name === "none") return say({ ...s, agent: null, session: null }, "note", "no agent: requests are not sent anywhere until /agent <name>");
  const hit = s.agents.find((a) => a.id === name);
  if (!hit) return say(s, "note", `no agent "${name}" here — found: ${s.agents.map((a) => a.id).join(", ") || "none"}`);
  return say({ ...s, agent: hit.id, session: null }, "note", `requests now go to ${hit.label}`);
}

/**
 * One key.
 * @param {State} s0
 * @param {Key} key
 * @returns {{ state: State, effects: Effect[] }}
 */
export function pressKey(s0, key) {
  // Any key but a second ctrl+c disarms the exit, and clears the notice.
  const s = key.name === "ctrl-c" ? s0 : { ...s0, armed: false, notice: "" };
  const palette = paletteOf(s);
  const edit = (/** @type {string[]} */ input, /** @type {number} */ cursor) => ({ state: { ...s, input, cursor, paletteAt: 0, paletteOff: false, historyAt: null }, effects: [] });
  const accept = () => {
    if (!palette) return s;
    const item = palette.items[Math.min(s.paletteAt, palette.items.length - 1)];
    const before = s.input.slice(0, palette.from);
    const after = s.input.slice(s.cursor);
    const insert = Array.from(`${item.value} `);
    return { ...s, input: [...before, ...insert, ...after], cursor: before.length + insert.length, paletteAt: 0, paletteOff: false };
  };
  switch (key.name) {
    case "char":
    case "paste": {
      const chars = Array.from(key.text.replace(/\r?\n|\r|\t/g, " ")).filter((ch) => ch >= " " && ch !== "\x7f");
      if (chars.length === 0) return { state: s, effects: [] };
      return edit([...s.input.slice(0, s.cursor), ...chars, ...s.input.slice(s.cursor)], s.cursor + chars.length);
    }
    case "backspace":
      return s.cursor === 0 ? { state: s, effects: [] } : edit([...s.input.slice(0, s.cursor - 1), ...s.input.slice(s.cursor)], s.cursor - 1);
    case "delete":
      return edit([...s.input.slice(0, s.cursor), ...s.input.slice(s.cursor + 1)], s.cursor);
    case "ctrl-u":
      return edit(s.input.slice(s.cursor), 0);
    case "ctrl-k":
      return edit(s.input.slice(0, s.cursor), s.cursor);
    case "ctrl-w": {
      let at = s.cursor;
      while (at > 0 && /\s/.test(s.input[at - 1])) at--;
      while (at > 0 && !/\s/.test(s.input[at - 1])) at--;
      return edit([...s.input.slice(0, at), ...s.input.slice(s.cursor)], at);
    }
    case "left":
      return { state: { ...s, cursor: Math.max(0, s.cursor - 1), paletteAt: 0 }, effects: [] };
    case "right":
      return { state: { ...s, cursor: Math.min(s.input.length, s.cursor + 1), paletteAt: 0 }, effects: [] };
    case "home":
      return { state: { ...s, cursor: 0 }, effects: [] };
    case "end":
      return { state: { ...s, cursor: s.input.length }, effects: [] };
    case "up":
    case "down": {
      const step = key.name === "up" ? -1 : 1;
      if (palette) {
        const n = palette.items.length;
        return { state: { ...s, paletteAt: (Math.min(s.paletteAt, n - 1) + step + n) % n }, effects: [] };
      }
      if (s.history.length === 0) return { state: s, effects: [] };
      const at = s.historyAt === null ? s.history.length : s.historyAt;
      const to = at + step;
      if (to < 0) return { state: s, effects: [] };
      if (to >= s.history.length) return { state: { ...setInput(s, s.draft), historyAt: null, paletteOff: true }, effects: [] };
      return { state: { ...setInput(s, s.history[to]), historyAt: to, draft: s.historyAt === null ? text(s) : s.draft, paletteOff: true }, effects: [] };
    }
    case "pageup":
      return { state: { ...s, scroll: s.scroll + 8 }, effects: [] };
    case "pagedown":
      return { state: { ...s, scroll: Math.max(0, s.scroll - 8) }, effects: [] };
    case "tab":
    case "shift-tab":
      return { state: accept(), effects: [] };
    case "enter": {
      if (palette) {
        const item = palette.items[Math.min(s.paletteAt, palette.items.length - 1)];
        const typed = text(s).trim();
        // A whole command is run as typed; a partial one is completed first,
        // and run at once only when it means something without arguments.
        if (palette.kind === "mention" || typed !== item.value) {
          const done = accept();
          return palette.kind === "slash" && item.immediate ? submit(done, text(done)) : { state: done, effects: [] };
        }
      }
      return submit(s, text(s));
    }
    case "escape":
      if (palette) return { state: { ...s, paletteOff: true }, effects: [] };
      if (s.busy) return { state: { ...s, notice: `interrupting ${s.busy.label}…` }, effects: [{ type: "interrupt" }] };
      return { state: { ...setInput(s, ""), scroll: 0 }, effects: [] };
    case "ctrl-l":
    case "ctrl-r":
      return { state: s, effects: [{ type: "refresh" }] };
    case "ctrl-d":
      return s.input.length === 0 ? { state: s, effects: [{ type: "quit" }] } : { state: s, effects: [] };
    case "ctrl-c":
      if (s.busy) return { state: { ...s, notice: `interrupting ${s.busy.label}…`, armed: false }, effects: [{ type: "interrupt" }] };
      if (s.input.length > 0) return { state: { ...setInput(s, ""), armed: false }, effects: [] };
      if (s.armed) return { state: s, effects: [{ type: "quit" }] };
      return { state: { ...s, armed: true, notice: "press ctrl+c again to leave" }, effects: [] };
    default:
      return { state: s, effects: [] };
  }
}

/** A line a running command printed. */
export function commandLine(s, stream, line) {
  return { ...s, transcript: [...s.transcript, { kind: stream === "stderr" ? "err" : "out", text: line }] };
}

/** A command ended. */
export function commandDone(s, code, signal) {
  const secs = s.busy ? ((Date.now() - s.busy.since) / 1000).toFixed(1) : "0.0";
  const entry = signal
    ? { kind: /** @type {const} */ ("fail"), text: `interrupted · ${secs}s` }
    : (code === 0 ? { kind: /** @type {const} */ ("ok"), text: `${secs}s` } : { kind: /** @type {const} */ ("fail"), text: `exit ${code} · ${secs}s` });
  return { ...s, busy: null, notice: "", transcript: [...s.transcript, entry] };
}

/**
 * Something the agent said or did.
 * @param {State} s
 * @param {AgentEvent} ev
 * @returns {State}
 */
export function agentEvent(s, ev) {
  const add = (/** @type {Entry["kind"]} */ kind, /** @type {string} */ t) => ({ ...s, transcript: [...s.transcript, { kind, text: t }] });
  switch (ev.type) {
    case "session":
      return { ...s, session: ev.id };
    case "text":
      return add("agent", ev.text);
    case "tool":
      return add("tool", ev.detail ? `${ev.name}  ${ev.detail}` : ev.name);
    case "raw":
      return add("out", ev.text);
    case "result": {
      const secs = ev.ms !== null ? `${(ev.ms / 1000).toFixed(1)}s` : (s.busy ? `${((Date.now() - s.busy.since) / 1000).toFixed(1)}s` : "");
      const turns = ev.turns !== null ? `${ev.turns} turn${ev.turns === 1 ? "" : "s"}` : "";
      let out = { ...s, busy: null, notice: "" };
      // What the agent was refused, each on one line, and whose rule it is.
      for (const d of ev.denials.slice(0, 4)) {
        out = { ...out, transcript: [...out.transcript, { kind: "note", text: `refused  ${d.length > 72 ? `${d.slice(0, 71)}…` : d}` }] };
      }
      if (ev.denials.length > 0) {
        const more = ev.denials.length > 4 ? ` (and ${ev.denials.length - 4} more)` : "";
        out = { ...out, transcript: [...out.transcript, { kind: "note", text: `The agent runs only what its own settings allow${more} — add a rule there, or flags in DOCTRINA_AGENT_ARGS.` }] };
      }
      const summary = [turns, secs].filter(Boolean).join(" · ");
      return { ...out, transcript: [...out.transcript, ev.ok ? { kind: "ok", text: summary } : { kind: "fail", text: [ev.error, summary].filter(Boolean).join(" · ") }] };
    }
    default:
      return s;
  }
}

/** The agent's process ended; a turn that reported no result is closed here. */
export function agentExit(s, code, signal, stderr) {
  if (!s.busy) return s;
  const secs = `${((Date.now() - s.busy.since) / 1000).toFixed(1)}s`;
  let out = { ...s, busy: null, notice: "" };
  if (signal) return { ...out, transcript: [...out.transcript, { kind: "fail", text: `interrupted · ${secs}` }] };
  if (code !== 0) {
    for (const l of String(stderr).split("\n").map((x) => x.trim()).filter(Boolean).slice(-4)) {
      out = { ...out, transcript: [...out.transcript, { kind: "err", text: l }] };
    }
    return { ...out, transcript: [...out.transcript, { kind: "fail", text: `${s.busy.label} exited ${code} · ${secs}` }] };
  }
  return { ...out, transcript: [...out.transcript, { kind: "ok", text: secs }] };
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const CTRL = /** @type {Record<string, Key["name"]>} */ ({
  "\x01": "home", "\x03": "ctrl-c", "\x04": "ctrl-d", "\x05": "end", "\x0b": "ctrl-k", "\x0c": "ctrl-l",
  "\x12": "ctrl-r", "\x15": "ctrl-u", "\x17": "ctrl-w", "\x7f": "backspace", "\b": "backspace", "\t": "tab", "\r": "enter", "\n": "enter",
});
const CSI = /** @type {Record<string, Key["name"]>} */ ({
  A: "up", B: "down", C: "right", D: "left", H: "home", F: "end", Z: "shift-tab",
  "1~": "home", "7~": "home", "4~": "end", "8~": "end", "3~": "delete", "5~": "pageup", "6~": "pagedown",
});
const PASTE_END = "\x1b[201~";

/**
 * What a chunk of terminal input means. `rest` is an unfinished sequence to
 * prepend to the next chunk.
 * @param {string} data
 * @returns {{ keys: Key[], rest: string }}
 */
export function parseKeys(data) {
  /** @type {Key[]} */
  const keys = [];
  let i = 0;
  let run = "";
  const flush = () => {
    if (run !== "") keys.push({ name: "char", text: run });
    run = "";
  };
  while (i < data.length) {
    const ch = data[i];
    if (ch === "\x1b") {
      flush();
      if (data.startsWith("\x1b[200~", i)) {
        const end = data.indexOf(PASTE_END, i);
        if (end < 0) return { keys, rest: data.slice(i) };
        keys.push({ name: "paste", text: data.slice(i + 6, end) });
        i = end + PASTE_END.length;
        continue;
      }
      const next = data[i + 1];
      if (next === "[" || next === "O") {
        // CSI: parameters, then one final byte.
        let j = i + 2;
        while (j < data.length && !/[@-~]/.test(data[j])) j++;
        if (j >= data.length) return { keys, rest: data.slice(i) };
        const body = data.slice(i + 2, j + 1).replace(/^1;\d/, "");
        const name = CSI[body];
        if (name) keys.push(/** @type {Key} */ ({ name }));
        i = j + 1;
        continue;
      }
      if (next === "\x7f" || next === "\b") {
        keys.push({ name: "ctrl-w" });
        i += 2;
        continue;
      }
      keys.push({ name: "escape" });
      i += next === undefined || next === "\x1b" ? 1 : 2;
      continue;
    }
    const ctrl = CTRL[ch];
    if (ctrl) {
      flush();
      keys.push(/** @type {Key} */ ({ name: ctrl }));
    } else if (ch >= " ") run += ch;
    i++;
  }
  flush();
  return { keys, rest: "" };
}
