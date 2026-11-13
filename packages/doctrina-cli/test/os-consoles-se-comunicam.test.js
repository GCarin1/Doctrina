// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { PassThrough, Writable } from "node:stream";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { agentPrompt } from "../src/lib/agent-bridge.js";
import { agentEvent, initialState, messageReceived, paletteOf, peersSeen, pressKey, settle } from "../src/lib/console-model.js";
import { PEER_STALE_MS, beat, joinRoom, leaveRoom, listPeers, roomFor, roomPeers, sendMessage, takeInbox } from "../src/lib/console-room.js";
import { renderFrame } from "../src/lib/console-view.js";
import { session } from "../src/commands/ui.js";

// CONSOLES THAT TALK TO EACH OTHER (change 0259, ADR 0033).
//
// Three repositories, three terminals, three conversations that could not
// hear one another — and a planner at the workspace root with nobody to
// hand a card to. Consoles opened for the same work share a room: files
// under the person's home, no socket. One hands another a request; its
// agent works there; the report comes back.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

const type = (/** @type {any} */ s, /** @type {string} */ text) => pressKey(s, { name: "char", text }).state;
const enter = (/** @type {any} */ s) => pressKey(s, { name: "enter" });
const claude = { id: "claude", label: "Claude Code", file: "/bin/claude", exercised: true };
const room = { name: "loja", role: "planner", root: "/ws" };
const peer = (/** @type {string} */ name, over = {}) => ({ id: name === "api" ? "aaaaaa" : "bbbbbb", name, role: "project", agent: "claude", model: null, busy: false, listening: true, ...over });
const card = (over = {}) => ({ cwd: "/x", agent: "claude", model: null, busy: false, listening: true, ...over });
const panel = /** @type {any} */ ({ kind: "project", project: "loja", cli: "9.9.9", gates: [], counts: { specs: 0, decisions: 0, skills: 0, closed: 0 }, open: [], next: [], recent: [], projects: [], mentions: [] });

test("a room is files the person alone can read: cards that go stale, inboxes read once", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-room-"));
  try {
    const env = { DOCTRINA_HOME: path.join(dir, "home") };
    const cwd = path.join(dir, "repo");
    mkdirSync(cwd);
    const a = joinRoom(cwd, { env, now: 1000 });
    const b = joinRoom(cwd, { env, now: 1000 });
    assert.equal(a.dir, b.dir, "the same directory is the same room");
    assert.ok(a.dir.startsWith(path.join(dir, "home", "rooms")));
    assert.equal(a.name, "repo");
    assert.equal(b.name, "repo", "nobody was there yet to share the name with");
    beat(a, card(), 1000);
    assert.equal(joinRoom(cwd, { env, now: 1000 }).name, "repo-2", "two consoles in one directory are told apart");
    if (process.platform !== "win32") assert.equal(statSync(path.join(a.dir, "inbox")).mode & 0o077, 0, "nobody else can drop a request there");
    assert.equal(JSON.parse(readFileSync(path.join(a.dir, "room.json"), "utf8")).root, realpathSync(cwd), "the room records the real path of its directory");

    beat(b, card({ busy: true, agent: "cursor", model: "gpt-5" }), 1000);
    assert.deepEqual(listPeers(a, 1500).map((p) => `${p.name} ${p.agent} ${p.model} ${p.busy}`), ["repo cursor gpt-5 true"]);
    assert.deepEqual(roomPeers(cwd, env, 1500).length, 2, "from outside, both are seen");

    // A message is a file in an inbox, read once, oldest first.
    assert.equal(sendMessage(a, b.id, { type: "request", id: "m2", from: { id: a.id, name: a.name }, text: "second", at: 2000 }), true);
    assert.equal(sendMessage(a, b.id, { type: "request", id: "m1", from: { id: a.id, name: a.name }, text: "first", at: 1999 }), true);
    writeFileSync(path.join(b.dir, "inbox", b.id, "0000-junk.json"), "{ not json");
    assert.deepEqual(takeInbox(b).map((m) => (m.type === "request" ? m.text : "")), ["first", "second"], "and what is not a message is dropped");
    assert.deepEqual(takeInbox(b), []);
    assert.equal(sendMessage(a, "ffffff", { type: "request", id: "x", from: { id: a.id, name: a.name }, text: "x", at: 1 }), false, "nobody is there");
    assert.equal(sendMessage(a, "../../etc", { type: "request", id: "x", from: { id: a.id, name: a.name }, text: "x", at: 1 }), false, "an id is never a path");

    // A console that stopped saying it is alive is gone, with its mail.
    assert.deepEqual(listPeers(a, 1000 + PEER_STALE_MS + 1), []);
    assert.equal(existsSync(path.join(b.dir, "inbox", b.id)), false);
    beat(b, card(), 50_000);
    leaveRoom(b);
    assert.deepEqual(listPeers(a, 50_000), []);
    assert.deepEqual(readdirSync(path.join(a.dir, "peers")).filter((f) => f.startsWith(b.id)), []);

    // Another directory is another room.
    const other = path.join(dir, "other");
    mkdirSync(other);
    assert.notEqual(roomFor(other, env).dir, a.dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("/peers, /send and /listen: who is there, what is handed over, and what is refused", () => {
  const alone = peersSeen(initialState({ agents: [claude] }), room, []);
  assert.match(enter(type(alone, "/peers")).state.transcript.map((e) => e.text).join("\n"), /No other console is open in this room \(\/ws\)\.\nOpen one in another terminal/);

  const s = peersSeen(alone, room, [peer("api", { model: "opus" }), peer("web", { busy: true, agent: "cursor" })]);
  assert.equal(peersSeen(s, room, [peer("api", { model: "opus" }), peer("web", { busy: true, agent: "cursor" })]), s, "the same look changes nothing");
  const listed = enter(type(s, "/peers")).state.transcript.map((e) => e.text).join("\n");
  assert.match(listed, /This console is loja \(the planner\)\. Also open:\n↔ api {12}console · claude · opus · idle\n↔ web {12}console · cursor · busy\nHand one a request with \/send <name> <request>/);

  const sent = enter(type(s, '/send api refuse an "expired" link with 410'));
  assert.deepEqual(sent.effects, [{ type: "send", to: [{ id: "aaaaaa", name: "api" }], text: 'refuse an "expired" link with 410' }], "the request keeps its quotes");
  assert.deepEqual(sent.state.transcript.at(-1), { kind: "peer", text: 'to api  refuse an "expired" link with 410' });
  assert.equal(sent.state.busy, null, "this console is free while the other works");
  assert.deepEqual(enter(type(s, "/send all bump the lockfile")).effects, [{ type: "send", to: [{ id: "aaaaaa", name: "api" }, { id: "bbbbbb", name: "web" }], text: "bump the lockfile" }]);
  assert.match(enter(type(s, "/send nope x")).state.transcript.at(-1)?.text ?? "", /no console named "nope" is open in this room — open: api, web/);
  assert.match(enter(type(s, "/send api")).state.transcript.at(-1)?.text ?? "", /\/send api <request>/);
  const deaf = peersSeen(alone, room, [peer("api", { listening: false })]);
  assert.match(enter(type(deaf, "/send api x")).state.transcript.at(-1)?.text ?? "", /api is not listening/);
  assert.deepEqual(enter(type(deaf, "/send api x")).effects, []);

  // The name of a console is chosen from a list, and the request is typed after it.
  assert.deepEqual(paletteOf(type(s, "/send "))?.items.map((i) => `${i.value} | ${i.label}`), [
    "/send api | console · claude · opus · idle", "/send web | console · cursor · busy", "/send all | every console that is listening",
  ]);
  const chosen = enter(type(s, "/send a"));
  assert.equal(chosen.state.input.join(""), "/send api ");
  assert.deepEqual(chosen.effects, []);

  // The header counts them, the panel lists them.
  const frame = renderFrame({ ...s, panel }, { cols: 110, rows: 24, color: false, now: 0 }).lines.join("\n");
  assert.match(frame, /↔ 2 {3}● claude/);
  assert.match(frame, /│ CONSOLES +\n[^\n]*│ ↔ api {2}idle · claude +\n[^\n]*│ ↔ web {2}busy · cursor/);

  // The agent is told who is there — unless the request came from one of them.
  assert.match(agentPrompt("ship the coupon", [], { peers: [peer("api"), peer("web", { busy: true }), peer("docs", { listening: false })] }),
    /^ship the coupon\n\nOther Doctrina consoles are open in other terminals: api \(idle\), web \(busy\)\. To hand one a task and wait for its report, run: doctrina ui --send <name> "<the task, self-contained>"/);
  const served = agentPrompt("add the coupon field", [], { peers: [peer("web")], origin: "loja" });
  assert.match(served, /This request was sent by the Doctrina console "loja", open in another terminal\. Do the work here, in this repository; do not hand it to another console\. Your last message is sent back to "loja" as the report/);
  assert.doesNotMatch(served, /--send/, "a request that was handed over is not handed on");
  assert.equal(agentPrompt("alone", [], { peers: [] }), "alone");
});

test("a request from another console goes to this one's agent, waits its turn, and is answered", () => {
  const base = peersSeen(initialState({ agents: [claude] }), { name: "api", role: "project", root: "/ws" }, [peer("loja", { role: "planner" })]);
  const req = (/** @type {string} */ id, /** @type {string} */ text) => /** @type {any} */ ({ type: "request", id, from: { id: "cccccc", name: "loja" }, text, at: 1 });

  const got = messageReceived(base, req("m1", "add the coupon field"));
  assert.deepEqual(got.effects, [{ type: "ask", prompt: "add the coupon field", origin: "loja" }]);
  assert.deepEqual(got.state.transcript.at(-1), { kind: "peer", text: "from loja  add the coupon field" });
  assert.equal(got.state.busy?.kind, "agent");
  assert.match(renderFrame(got.state, { cols: 100, rows: 20, color: false, now: got.state.busy?.since ?? 0 }).lines.join("\n"), /Claude Code 0s · for loja · esc interrupts/);
  assert.match(renderFrame(got.state, { cols: 100, rows: 20, color: false, now: 0 }).lines.join("\n"), / ↔ from loja {2}add the coupon field/);

  // A second one waits; nothing is settled while the first runs.
  const queued = messageReceived(got.state, req("m2", "and document it"));
  assert.deepEqual(queued.effects, []);
  assert.match(queued.state.transcript.at(-1)?.text ?? "", /loja sent a request — it runs when what is running here ends \(1 waiting\)/);
  assert.deepEqual(settle(queued.state).effects, []);

  // The agent ends: the report goes back, and the next request starts.
  let s = agentEvent(queued.state, { type: "text", text: "Added `coupon` to the order and its test." });
  s = agentEvent(s, { type: "result", ok: true, turns: 6, ms: 31_000, denials: [], error: "" });
  const after = settle(s);
  assert.deepEqual(after.effects, [
    { type: "reply", to: "cccccc", re: "m1", ok: true, summary: "Added `coupon` to the order and its test.", detail: "6 turns · 31.0s", refused: "" },
    { type: "ask", prompt: "and document it", origin: "loja" },
  ]);
  assert.equal(after.state.serving?.id, "m2");
  assert.deepEqual(after.state.queue, []);

  // A failed turn is reported as one; a long last message is cut.
  s = agentEvent(after.state, { type: "text", text: "x".repeat(3000) });
  s = agentEvent(s, { type: "result", ok: false, turns: 1, ms: 900, denials: [], error: "quota" });
  const failed = settle(s).effects[0];
  assert.equal(failed.type === "reply" && failed.ok, false);
  assert.equal(failed.type === "reply" && failed.summary.length, 1500);

  // While the agent works, the console's own commands still answer; a request of this console's waits.
  assert.match(enter(type(got.state, "/peers")).state.transcript.at(-1)?.text ?? "", /Hand one a request with \/send/);
  assert.deepEqual(enter(type(got.state, "/send loja done soon")).effects, [{ type: "send", to: [{ id: "loja" === "api" ? "aaaaaa" : "bbbbbb", name: "loja" }], text: "done soon" }]);
  assert.match(enter(type(got.state, "another thing")).state.notice, /still running/);
  assert.match(enter(type(got.state, "/next")).state.notice, /still running/);

  // Not listening, or with no agent: refused, and the sender is told why.
  const off = enter(type(base, "/listen off"));
  assert.equal(off.state.listening, false);
  assert.deepEqual(off.effects, [{ type: "beat" }]);
  assert.deepEqual(messageReceived(off.state, req("m3", "x")).effects, [{ type: "reply", to: "cccccc", re: "m3", ok: false, summary: "", detail: "", refused: "api is not listening" }]);
  assert.deepEqual(messageReceived(peersSeen(initialState(), { name: "api", role: "project", root: "/ws" }, []), req("m4", "x")).effects,
    [{ type: "reply", to: "cccccc", re: "m4", ok: false, summary: "", detail: "", refused: "api has no agent connected" }]);
  // Stopping to listen sends back what was waiting.
  const stopped = enter(type(queued.state, "/listen off"));
  assert.deepEqual(stopped.effects, [{ type: "beat" }, { type: "reply", to: "cccccc", re: "m2", ok: false, summary: "", detail: "", refused: "api stopped listening" }]);
  assert.deepEqual(stopped.state.queue, []);
  assert.equal(enter(type(off.state, "/listen on")).state.listening, true);

  // The report, at the console that asked.
  const planner = peersSeen(initialState({ agents: [claude] }), room, [peer("api")]);
  const report = messageReceived(planner, { type: "result", re: "m1", from: { id: "aaaaaa", name: "api" }, ok: true, summary: "Added `coupon`.\nTwo tasks left.", detail: "6 turns · 31.0s", at: 2 });
  assert.deepEqual(report.state.transcript.slice(-2), [{ kind: "peer", text: "api finished  6 turns · 31.0s" }, { kind: "quote", text: "Added `coupon`.\nTwo tasks left." }]);
  assert.match(renderFrame(report.state, { cols: 80, rows: 20, color: false, now: 0 }).lines.join("\n"), / ↔ api finished {2}6 turns · 31\.0s +\n {3}│ Added coupon\. +\n {3}│ Two tasks left\./);
  assert.match(messageReceived(planner, { type: "refused", re: "m9", from: { id: "aaaaaa", name: "api" }, reason: "api is not listening", at: 3 }).state.transcript.at(-1)?.text ?? "",
    /api did not take the request: api is not listening/);
});

// ---------------------------------------------------------------------------
// Two consoles, for real
// ---------------------------------------------------------------------------

function terminal(cols = 82, rows = 30) {
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
    throw new Error(`the screen never showed ${what}:\n${frame().join("\n")}`);
  };
  return { inp, out, frame, until };
}

// An agent that says where it ran, what it was asked, and who it answers.
const FAKE_AGENT = `#!/usr/bin/env node
let prompt = "";
process.stdin.on("data", (d) => { prompt += d; });
process.stdin.on("end", () => {
  const say = (o) => console.log(JSON.stringify(o));
  say({ type: "system", subtype: "init", session_id: "s" });
  const first = prompt.split("\\n")[0];
  const done = () => {
    say({ type: "assistant", message: { content: [{ type: "text", text: "did: " + first + " [in " + require("node:path").basename(process.cwd()) + ", for " + (process.env.DOCTRINA_CONSOLE_SERVING || "the human") + ", told of peers: " + /Other Doctrina consoles are open/.test(prompt) + "]" }] } });
    say({ type: "result", subtype: "success", is_error: false, num_turns: 1, duration_ms: 100, session_id: "s", permission_denials: [] });
  };
  if (first.includes("slowly")) setTimeout(done, 1500); else done();
});
`;

test("two consoles in two repositories of one workspace: a request crosses, the report returns, and --send waits for it", { skip: process.platform === "win32" }, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-two-consoles-"));
  /** @type {(() => void)[]} */
  const closers = [];
  try {
    const bin = path.join(dir, "bin");
    mkdirSync(bin);
    writeFileSync(path.join(bin, "claude"), FAKE_AGENT);
    chmodSync(path.join(bin, "claude"), 0o755);
    const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(dir, "home"), DOCTRINA_AGENT: "claude", PATH: `${bin}${path.delimiter}${process.env.PATH}` };
    delete env.FORCE_COLOR;
    delete env.DOCTRINA_CONSOLE_SERVING;
    delete env.DOCTRINA_CONSOLE_NAME;
    delete env.DOCTRINA_WORKSPACE;
    const cli = (/** @type {string[]} */ args, /** @type {string} */ cwd, extra = {}) => spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env: { ...env, ...extra } });
    // The consoles live in this process: a command that waits on one must not block it.
    const cliAsync = (/** @type {string[]} */ args, /** @type {string} */ cwd, extra = {}) => new Promise((resolve) => {
      const proc = spawn(process.execPath, [cliEntry, ...args], { cwd, env: { ...env, ...extra } });
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (d) => { stdout += d; });
      proc.stderr.on("data", (d) => { stderr += d; });
      proc.on("close", (status) => resolve(/** @type {{ status: number | null, stdout: string, stderr: string }} */ ({ status, stdout, stderr })));
    });

    // A workspace with two repositories.
    const ws = path.join(dir, "loja-ws");
    const api = path.join(dir, "api");
    const web = path.join(dir, "web");
    for (const d of [ws, api, web]) mkdirSync(d);
    for (const d of [api, web]) spawnSync("git", ["init", "-q"], { cwd: d });
    assert.equal(cli(["workspace", "init", ".", "--name", "loja", "--no-git"], ws).status, 0);
    assert.equal(cli(["workspace", "add", api, "--name", "api"], ws).status, 0);
    assert.equal(cli(["workspace", "add", web, "--name", "web"], ws).status, 0);
    assert.deepEqual([roomFor(ws, env), roomFor(api, env), roomFor(web, env)].map((r) => `${r.name}:${r.role}`), ["loja:planner", "api:project", "web:project"]);
    assert.equal(roomFor(api, env).dir, roomFor(ws, env).dir, "the workspace is the room of its repositories");
    assert.match(cli(["ui", "--peers"], ws).stdout, /no console is open in this room/);

    const open = (/** @type {string} */ cwd) => {
      const term = terminal();
      /** @type {Promise<number>} */
      const ended = new Promise((resolve) => { session(cwd, resolve, { inp: term.inp, out: term.out, env, color: false, poll: 60 }); });
      closers.push(() => term.inp.write("/quit\r"));
      return { term, ended };
    };
    const planner = open(ws);
    const apiConsole = open(api);

    // Each sees the other.
    await planner.term.until((s) => /↔ 1 {3}● claude/.test(s), "the planner seeing api");
    await apiConsole.term.until((s) => /↔ 1 {3}● claude/.test(s), "api seeing the planner");
    planner.term.inp.write("/peers\r");
    await planner.term.until((s) => /This console is loja \(the planner\)\. Also open:\s+↔ api {12}console · claude · idle/.test(s), "the list of consoles");
    const listed = cli(["ui", "--peers"], api).stdout;
    assert.match(listed, /^api {14}console {2}claude {4}idle {2}\S+api$/m);
    assert.match(listed, /^loja {13}planner {2}claude {4}idle/m);
    assert.deepEqual(JSON.parse(cli(["ui", "--json"], ws).stdout).peers.map((/** @type {any} */ p) => p.name), ["api", "loja"]);

    // The planner hands api a request; api's agent does it there; the report returns.
    planner.term.inp.write("/send api add the coupon field\r");
    await apiConsole.term.until((s) => / ↔ from loja {2}add the coupon field/.test(s), "the request arriving at api");
    const report = await planner.term.until((s) => / ↔ api finished/.test(s) && /did: add the coupon field \[in api, for loja, told of peers: false\]/.test(s), "the report at the planner");
    assert.match(report, / ↔ to api {2}add the coupon field/);
    assert.match(report, / {3}│ did: add the coupon field \[in api, for loja, told of peers: false\]/);

    // A request typed at the planner tells its own agent who is there.
    planner.term.inp.write("plan the coupon delivery\r");
    await planner.term.until((s) => /did: plan the coupon delivery \[in loja-ws, for the human, told of peers: true\]/.test(s), "the planner's agent knowing its peers");

    // What a planner's agent runs: --send waits for the report, and speaks as its console.
    const sent = await cliAsync(["ui", "--send", "api", "add the coupon test", "--timeout", "20"], ws, { DOCTRINA_CONSOLE_NAME: "loja" });
    assert.equal(sent.status, 0, sent.stdout + sent.stderr);
    assert.match(sent.stdout, /^api finished — 1 turn · 0\.1s\n\ndid: add the coupon test \[in api, for loja, told of peers: false\]/);
    assert.match(apiConsole.term.frame().join("\n"), / ↔ from loja {2}add the coupon test/);

    // A request that was handed over is not handed on; an unknown console is a precondition.
    const chained = await cliAsync(["ui", "--send", "web", "pass it on"], api, { DOCTRINA_CONSOLE_SERVING: "loja" });
    assert.equal(chained.status, 1);
    assert.match(chained.stderr, /this console is answering "loja" — a request that was handed over is done here, not handed on/);
    const nobody = await cliAsync(["ui", "--send", "web", "x"], ws);
    assert.equal(nobody.status, 3);
    assert.match(nobody.stderr, /no console named "web" is open in this room\n.*open: api, loja/);
    assert.equal((await cliAsync(["ui", "--send", "api"], ws)).status, 2, "a request is needed");

    // Busy: the second request waits, and both are answered in order.
    planner.term.inp.write("/send api do it slowly\r");
    await apiConsole.term.until((s) => /Claude Code \d+s · for loja · esc interrupts/.test(s), "api working for the planner");
    const waited = await cliAsync(["ui", "--send", "api", "then the next", "--timeout", "20"], ws);
    assert.equal(waited.status, 0, waited.stderr);
    assert.match(waited.stdout, /did: then the next \[in api/);
    assert.match(apiConsole.term.frame().join("\n"), /did: do it slowly[\s\S]*did: then the next/);

    // A console that stops listening refuses, and says so to whoever asked.
    apiConsole.term.inp.write("/listen off\r");
    await apiConsole.term.until((s) => /not listening: requests from other consoles are refused/.test(s), "api saying it stopped");
    await planner.term.until((s) => /│?/.test(s) && /not listening/.test(cli(["ui", "--peers"], ws).stdout), "api seen as not listening");
    const refused = await cliAsync(["ui", "--send", "api", "x"], ws);
    assert.equal(refused.status, 3);
    assert.match(refused.stderr, /api is not listening/);

    // Leaving takes the console out of the room.
    apiConsole.term.inp.write("/quit\r");
    assert.equal(await apiConsole.ended, 0);
    await planner.term.until((s) => !/↔ 1/.test(s.split("\n")[0]), "the planner alone again");
    planner.term.inp.write("/quit\r");
    assert.equal(await planner.ended, 0);
    assert.deepEqual(roomPeers(ws, env), []);
  } finally {
    for (const close of closers) {
      try {
        close();
      } catch { /* already closed */ }
    }
    await new Promise((r) => setTimeout(r, 200));
    rmSync(dir, { recursive: true, force: true });
  }
});
