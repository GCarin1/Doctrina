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
/** @typedef {{ kind: "banner" | "user" | "out" | "err" | "agent" | "tool" | "note" | "ok" | "fail" | "blank" | "peer" | "quote", text: string }} Entry */
/** @typedef {import("./console-room.js").Message} Message */
/** @typedef {{ id: string, name: string, role: string, agent: string | null, model: string | null, busy: boolean, listening: boolean }} PeerView */
/** @typedef {{ id: string, from: { id: string, name: string }, text: string }} PeerRequest */
/** @typedef {{ name: string, summary: string, local: boolean, immediate: boolean }} PaletteCommand */
/** @typedef {{ id: string, label: string, file: string | null, bins: string[], exercised: boolean, about: string, models: string[], listing: string, takesModel: boolean, custom: boolean }} CatalogAgent */
/** @typedef {{ kind: "slash" | "mention", items: { value: string, label: string, immediate: boolean }[], from: number }} Palette */
/**
 * @typedef {{ type: "run", argv: string[], label: string }
 *   | { type: "ask", prompt: string, origin?: string }
 *   | { type: "send", to: { id: string, name: string }[], text: string }
 *   | { type: "reply", to: string, re: string, ok: boolean, summary: string, detail: string, refused: string }
 *   | { type: "beat" }
 *   | { type: "save" }
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
 *   catalog: CatalogAgent[], models: Record<string, string>, reported: Record<string, string>,
 *   room: { name: string, role: string, root: string } | null, peers: PeerView[], listening: boolean,
 *   queue: PeerRequest[], serving: PeerRequest | null, lastText: string, lastTurn: { ok: boolean, detail: string } | null,
 *   busy: { kind: "command" | "agent", label: string, since: number } | null,
 *   notice: string, armed: boolean, said: boolean,
 * }} State
 */

// The commands that only exist inside the console.
const LOCAL = [
  ["help", "What the console understands"],
  ["agent", "Which agent answers: every one known, installed or not · /agent <name>"],
  ["model", "The model the agent runs: /model <name> · /model default"],
  ["new", "Start a new conversation with the agent"],
  ["peers", "The other consoles open in this room"],
  ["send", "Hand a request to another console: /send <name> <request> · /send all …"],
  ["listen", "Take requests from other consoles, or stop: /listen off"],
  ["clear", "Clear the conversation"],
  ["panel", "Show or hide the project panel"],
  ["refresh", "Read the project's state again"],
  ["quit", "Leave the console"],
];

// The operations that mean something with no argument: Enter on one runs it.
const IMMEDIATE = new Set(["prime", "next", "status", "validate", "doctor", "handoff", "onboard", "coverage", "trace",
  "verify", "metrics", "spec list", "decision list", "skill list", "contract list", "intent list", "adapter list",
  "templates list", "workspace list", "delivery list", "help", "agent", "model", "new", "peers", "listen", "clear", "panel", "refresh", "quit"]);

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

/**
 * @param {{ agents?: State["agents"], panel?: Panel | null, catalog?: CatalogAgent[], prefs?: { agent: string | null, models: Record<string, string> } }} [opts]
 * @returns {State}
 */
export function initialState({ agents = [], panel = null, catalog = [], prefs = { agent: null, models: {} } } = {}) {
  // The agent a person chose here before, while it is still installed;
  // otherwise the one this terminal and this project point at.
  const kept = agents.find((a) => a.id === prefs.agent);
  return {
    input: [], cursor: 0, history: [], historyAt: null, draft: "",
    transcript: [{ kind: "banner", text: "" }], scroll: 0,
    paletteAt: 0, paletteOff: false,
    panel, showPanel: true,
    agents, agent: (kept ?? agents[0])?.id ?? null, session: null,
    catalog, models: { ...prefs.models }, reported: {},
    room: null, peers: [], listening: true, queue: [], serving: null, lastText: "", lastTurn: null,
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
  // The argument of /agent, /model and /send is chosen from a list too.
  const arg = /^\/(agent|model|send) (\S*)$/.exec(line);
  if (arg) {
    const typed = arg[2].toLowerCase();
    let options;
    if (arg[1] === "agent") {
      options = [...s.catalog.map((a) => ({ value: a.id, label: `${a.label} — ${a.file ? (a.id === s.agent ? "in use" : "installed") : "not installed"}` })),
        { value: "off", label: "send requests nowhere" }];
    } else if (arg[1] === "model") {
      options = [...(s.catalog.find((a) => a.id === s.agent)?.models ?? []).map((m) => ({ value: m, label: "" })),
        { value: "default", label: "the agent's own default" }];
    } else {
      options = [...s.peers.map((p) => ({ value: p.name, label: peerLine(p) })),
        ...(s.peers.length > 1 ? [{ value: "all", label: "every console that is listening" }] : [])];
    }
    const hits = options.filter((o) => o.value.toLowerCase().startsWith(typed));
    if (hits.length === 0 || (hits.length === 1 && hits[0].value.toLowerCase() === typed)) return null;
    // A request still has to be typed after the name of a console.
    return { kind: "slash", from: 0, items: hits.map((o) => ({ value: `/${arg[1]} ${o.value}`, label: o.label, immediate: arg[1] !== "send" })) };
  }
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

const WHILE_BUSY = /^(\?|\/(help|peers|listen|send|panel|clear|refresh|quit|exit)(\s|$))/;

const HELP = [
  "Type a request in your own words and it goes to the agent, which works in this repository.",
  "",
  "  /            a Doctrina command — /next, /work \"<request>\", /close <id>, /status …  (tab completes)",
  "  @            mention an artifact — @spec:auth, @change:0001-login, @skill:…, @adr:0005",
  "  ↑ ↓          earlier inputs · pgup pgdn scroll the conversation",
  "  esc          interrupt what is running, or clear the line",
  "  /peers       the consoles open in other terminals · /send <name> <request> hands one a request, and its report comes back",
  "  /agent       which agent answers — Claude Code, Cursor, GitHub Copilot, Codex, Gemini, opencode, or your own",
  "  /model       the model that agent runs · /new starts a new conversation with it",
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
  // While something runs, only what starts nothing of its own goes through:
  // the console's own commands, and a request handed to another console.
  if (s.busy && !WHILE_BUSY.test(trimmed)) return { state: { ...s, notice: `${s.busy.label} is still running — esc interrupts it` }, effects: [] };
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
    return { state: { ...next, busy: { kind: "agent", label: agent.label, since: Date.now() }, lastText: "", lastTurn: null }, effects: [{ type: "ask", prompt: trimmed }] };
  }
  // The raw line: a request handed to another console keeps its quotes.
  const sending = /^\/send\s+(\S+)(?:\s+([\s\S]+))?$/.exec(trimmed);
  if (sending) return sendTo(next, sending[1], (sending[2] ?? "").trim());
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
    case "agent": {
      const chosen = chooseAgent(next, rest[0] ?? "");
      return { state: chosen, effects: chosen.agent !== next.agent ? [{ type: "save" }] : [] };
    }
    case "model": {
      const chosen = chooseModel(next, rest.join(" "));
      return { state: chosen, effects: chosen.models !== next.models ? [{ type: "save" }] : [] };
    }
    case "ui":
      return { state: say(next, "note", "this is the console already"), effects: [] };
    case "send":
      return { state: say(next, "note", "/send <name> <request> — /peers lists the consoles open in this room"), effects: [] };
    case "peers":
      return { state: listPeers(next), effects: [] };
    case "listen": {
      const on = rest[0] === undefined ? !next.listening : rest[0] !== "off";
      const said = say({ ...next, listening: on }, "note", on
        ? "listening: a request another console sends here goes to this console's agent"
        : "not listening: requests from other consoles are refused until /listen on");
      // Stopping sends back what was waiting, instead of leaving its sender to wait.
      const refusals = on ? [] : next.queue.map((q) => refusal(q, `${next.room?.name ?? "that console"} stopped listening`));
      return { state: { ...said, queue: on ? said.queue : [] }, effects: [{ type: "beat" }, ...refusals] };
    }
    default:
      return { state: { ...next, busy: { kind: "command", label: `doctrina ${name}`, since: Date.now() } }, effects: [{ type: "run", argv, label: `doctrina ${argv.join(" ")}` }] };
  }
}

const peerLine = (/** @type {PeerView} */ p) => `${p.role === "planner" ? "planner" : "console"} · ${p.agent ?? "no agent"}${p.model ? ` · ${p.model}` : ""} · ${p.busy ? "busy" : "idle"}${p.listening ? "" : " · not listening"}`;

/** @returns {Effect} */
const refusal = (/** @type {PeerRequest} */ req, /** @type {string} */ reason) => ({ type: "reply", to: req.from.id, re: req.id, ok: false, summary: "", detail: "", refused: reason });

/** `/peers`: who else is in the room. */
function listPeers(s) {
  if (!s.room) return say(s, "note", "this console is alone: it could not join a room under $DOCTRINA_HOME");
  if (s.peers.length === 0) {
    const out = say(s, "note", `No other console is open in this room (${s.room.root}).`);
    return say(out, "note", "Open one in another terminal — `doctrina` in a repository of the same workspace, or in this directory — and it appears here.");
  }
  let out = say(s, "note", `This console is ${s.room.name}${s.room.role === "planner" ? " (the planner)" : ""}${s.listening ? "" : ", not listening"}. Also open:`);
  for (const p of s.peers) out = say(out, "note", `↔ ${p.name.padEnd(14)} ${peerLine(p)}`);
  return say(out, "note", "Hand one a request with /send <name> <request>; its agent works there and the report comes back here.");
}

/**
 * `/send`: a request for another console's agent.
 * @param {State} s
 * @param {string} name
 * @param {string} request
 * @returns {{ state: State, effects: Effect[] }}
 */
function sendTo(s, name, request) {
  if (request === "") return { state: say(s, "note", `/send ${name} <request> — say what that console's agent should do`), effects: [] };
  const targets = name === "all" ? s.peers.filter((p) => p.listening) : s.peers.filter((p) => p.name === name || p.id === name);
  if (targets.length === 0) {
    const known = s.peers.map((p) => p.name).join(", ");
    return { state: say(s, "note", name === "all" ? "no console is listening — /peers" : `no console named "${name}" is open in this room${known ? ` — open: ${known}` : " — /peers"}`), effects: [] };
  }
  const deaf = targets.filter((p) => !p.listening);
  if (deaf.length > 0) return { state: say(s, "note", `${deaf.map((p) => p.name).join(", ")} is not listening — it takes requests again after /listen on there`), effects: [] };
  const out = say(s, "peer", `to ${targets.map((p) => p.name).join(", ")}  ${request}`);
  return { state: out, effects: [{ type: "send", to: targets.map((p) => ({ id: p.id, name: p.name })), text: request }] };
}

/** Start the agent on a request another console sent. */
function serve(s, req) {
  const agent = s.agents.find((a) => a.id === s.agent);
  if (!agent) return { state: s, effects: [refusal(req, `${s.room?.name ?? "that console"} has no agent connected`)] };
  const said = say(say(s, "blank", ""), "peer", `from ${req.from.name}  ${req.text}`);
  return {
    state: { ...said, said: true, serving: req, lastText: "", lastTurn: null, busy: { kind: /** @type {const} */ ("agent"), label: agent.label, since: Date.now() } },
    effects: [/** @type {Effect} */ ({ type: "ask", prompt: req.text, origin: req.from.name })],
  };
}

/**
 * The consoles seen in the room, as the last look found them.
 * @param {State} s
 * @param {{ name: string, role: string, root: string } | null} room
 * @param {PeerView[]} peers
 * @returns {State}
 */
export function peersSeen(s, room, peers) {
  const same = JSON.stringify(peers) === JSON.stringify(s.peers) && JSON.stringify(room) === JSON.stringify(s.room);
  return same ? s : { ...s, room, peers };
}

/**
 * A message from another console arrived.
 * @param {State} s
 * @param {Message} m
 * @returns {{ state: State, effects: Effect[] }}
 */
export function messageReceived(s, m) {
  if (m.type === "request") {
    const req = { id: m.id, from: m.from, text: String(m.text ?? "") };
    if (!s.listening) return { state: s, effects: [refusal(req, `${s.room?.name ?? "that console"} is not listening`)] };
    if (s.busy || s.queue.length > 0) {
      return { state: say({ ...s, queue: [...s.queue, req] }, "note", `↔ ${m.from.name} sent a request — it runs when what is running here ends (${s.queue.length + 1} waiting)`), effects: [] };
    }
    return serve(s, req);
  }
  if (m.type === "result") {
    let out = say(say(s, "blank", ""), "peer", `${m.from.name} ${m.ok ? "finished" : "failed"}${m.detail ? `  ${m.detail}` : ""}`);
    if (m.summary) out = say(out, "quote", m.summary);
    return { state: { ...out, said: true }, effects: [] };
  }
  if (m.type === "refused") return { state: say(s, "note", `↔ ${m.from.name} did not take the request: ${m.reason}`), effects: [] };
  return { state: s, effects: [] };
}

/**
 * Nothing is running any more: report to the console that asked, and take
 * the next request that was waiting.
 * @param {State} s
 * @returns {{ state: State, effects: Effect[] }}
 */
export function settle(s) {
  if (s.busy) return { state: s, effects: [] };
  /** @type {Effect[]} */
  const effects = [];
  let out = s;
  if (s.serving) {
    const turn = s.lastTurn ?? { ok: false, detail: "" };
    effects.push({ type: "reply", to: s.serving.from.id, re: s.serving.id, ok: turn.ok, summary: s.lastText.length > 1500 ? `${s.lastText.slice(0, 1499)}…` : s.lastText, detail: turn.detail, refused: "" });
    out = { ...out, serving: null, lastTurn: null };
  }
  if (out.queue.length > 0) {
    const [next, ...rest] = out.queue;
    const started = serve({ ...out, queue: rest }, next);
    return { state: started.state, effects: [...effects, ...started.effects] };
  }
  return { state: out, effects };
}

/** `/agent`: every agent known, and the switch to one that is installed. */
function chooseAgent(s, name) {
  if (name === "") {
    let out = s;
    for (const a of s.catalog) {
      const mark = a.id === s.agent ? "●" : (a.file ? "○" : "·");
      const where = a.file ? a.file : `not installed (looked for ${a.bins.map((b) => `\`${b}\``).join(", ")} on PATH)`;
      out = say(out, "note", `${mark} ${a.id.padEnd(9)} ${a.label} — ${where}`);
      out = say(out, "note", `            ${a.about}${a.exercised || !a.file ? "" : " · started as its documentation says; not exercised against the real binary by Doctrina's tests"}`);
    }
    return say(out, "note", "Switch with /agent <name> · /agent off. One of your own goes in $DOCTRINA_HOME/agents.json. DOCTRINA_AGENT pins one; DOCTRINA_AGENT_ARGS adds flags.");
  }
  if (name === "off" || name === "none") return say({ ...s, agent: null, session: null }, "note", "no agent: requests are not sent anywhere until /agent <name>");
  const known = s.catalog.find((a) => a.id === name);
  const hit = s.agents.find((a) => a.id === name);
  if (!hit) {
    return say(s, "note", known
      ? `${known.label} is not installed here — the console looked for ${known.bins.map((b) => `\`${b}\``).join(", ")} on PATH. Install its command-line tool and open the console again.`
      : `no agent "${name}" — known: ${s.catalog.map((a) => a.id).join(", ") || "none"}`);
  }
  if (hit.id === s.agent) return say(s, "note", `${hit.label} already answers`);
  const model = s.models[hit.id];
  return say({ ...s, agent: hit.id, session: null }, "note", `requests now go to ${hit.label}${model ? ` · ${model}` : ""} — a new conversation`);
}

/** `/model`: what the agent in use runs, and the change of it. */
function chooseModel(s, name) {
  const agent = s.catalog.find((a) => a.id === s.agent);
  if (!agent) return say(s, "note", "no agent is selected — /agent <name> first, then /model");
  const current = s.models[agent.id];
  if (name === "") {
    let out = say(s, "note", current
      ? `${agent.label} runs ${current} (chosen here)`
      : `${agent.label} runs its own default${s.reported[agent.id] ? ` — it reported ${s.reported[agent.id]}` : ""}`);
    if (!agent.takesModel) return say(out, "note", `${agent.label} takes no model on its command line here — name it in the agent's own settings, or in DOCTRINA_AGENT_ARGS`);
    if (agent.models.length > 0) out = say(out, "note", `Names it accepts include: ${agent.models.join(", ")}`);
    if (agent.listing) out = say(out, "note", `The models your account has: ${agent.listing}`);
    return say(out, "note", "Choose with /model <name> — any name the agent accepts — or /model default.");
  }
  if (!agent.takesModel) return say(s, "note", `${agent.label} takes no model on its command line here — name it in the agent's own settings, or in DOCTRINA_AGENT_ARGS`);
  if (name === "default") {
    if (!current) return say(s, "note", `${agent.label} already runs its own default`);
    const { [agent.id]: _dropped, ...rest } = s.models;
    return say({ ...s, models: rest }, "note", `${agent.label} goes back to its own default from the next request`);
  }
  if (name === current) return say(s, "note", `${agent.label} already runs ${name}`);
  return say({ ...s, models: { ...s.models, [agent.id]: name } }, "note", `${agent.label} runs ${name} from the next request — the agent refuses a name it does not know`);
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
    case "model":
      return s.agent ? { ...s, reported: { ...s.reported, [s.agent]: ev.name } } : s;
    case "text":
      return { ...add("agent", ev.text), lastText: ev.text };
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
      return { ...out, lastTurn: { ok: ev.ok, detail: summary }, transcript: [...out.transcript, ev.ok ? { kind: "ok", text: summary } : { kind: "fail", text: [ev.error, summary].filter(Boolean).join(" · ") }] };
    }
    default:
      return s;
  }
}

/** The agent's process ended; a turn that reported no result is closed here. */
export function agentExit(s, code, signal, stderr) {
  if (!s.busy) return s;
  const secs = `${((Date.now() - s.busy.since) / 1000).toFixed(1)}s`;
  /** @type {State} */
  let out = { ...s, busy: null, notice: "", lastTurn: { ok: code === 0 && !signal, detail: signal ? `interrupted · ${secs}` : (code === 0 ? secs : `exited ${code} · ${secs}`) } };
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
