// @ts-check
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { isDir, isFile, read } from "./fs-ops.js";
import { doctrinaHome, findWorkspace, projectAt, readWorkspace } from "./workspace-locate.js";

// CONSOLES THAT TALK TO EACH OTHER (change 0259, ADR 0033).
//
// A person with three repositories has three terminals. A console in each
// is three conversations that cannot hear one another — and the planner at
// the workspace root (ADR 0030) has nobody to hand a card to.
//
// A ROOM is what consoles opened for the same work share: the workspace
// when there is one, the directory otherwise. It is a folder under the
// person's `$DOCTRINA_HOME`, readable and writable by them alone. Each
// console keeps one small file there saying it is alive, and has an inbox;
// a message is a file moved into an inbox. No socket, no port, no daemon:
// the CLI still makes no network call, and a console that dies leaves a
// file that stops being fresh.
//
// Nothing here reads a terminal or starts a process.

/** @typedef {{ id: string, name: string, role: "planner" | "project" | "sender", cwd: string, pid: number, agent: string | null, model: string | null, busy: boolean, listening: boolean, seen: number }} Peer */
/** @typedef {{ dir: string, root: string, id: string, name: string, role: Peer["role"] }} Room */
/**
 * @typedef {{ type: "request", id: string, from: { id: string, name: string }, text: string, at: number }
 *   | { type: "result", re: string, from: { id: string, name: string }, ok: boolean, summary: string, detail: string, at: number }
 *   | { type: "refused", re: string, from: { id: string, name: string }, reason: string, at: number }} Message
 */

/** A peer that has not said it is alive for this long is gone. */
export const PEER_STALE_MS = 10_000;

const key = (/** @type {string} */ root) => createHash("sha256").update(root).digest("hex").slice(0, 12);
const token = () => randomBytes(3).toString("hex");

/**
 * Where the consoles of this directory meet, and what this one is called there.
 * @param {string} cwd
 * @param {NodeJS.ProcessEnv} [env]
 */
export function roomFor(cwd, env = process.env) {
  const here = path.resolve(cwd);
  const found = findWorkspace(here, env);
  let root = here;
  let name = path.basename(here) || "console";
  /** @type {Peer["role"]} */
  let role = "project";
  if (found) {
    try {
      const ws = readWorkspace(found.dir);
      const member = projectAt(ws, here);
      if (path.resolve(found.dir) === here) {
        root = here;
        name = ws.name || name;
        role = "planner";
      } else if (member) {
        root = path.resolve(found.dir);
        name = member.name;
      }
    } catch { /* an unreadable workspace is no room: the directory is */ }
  }
  return { dir: path.join(doctrinaHome(env), "rooms", key(root)), root, name, role };
}

function writeJson(file, data) {
  const tmp = `${file}.${token()}.tmp`;
  writeFileSync(tmp, JSON.stringify(data));
  renameSync(tmp, file);
}

function readJson(file) {
  try {
    return JSON.parse(read(file));
  } catch {
    return null;
  }
}

/** Every peer file in the room that is still fresh. */
function alive(dir, now) {
  const peers = path.join(dir, "peers");
  /** @type {Peer[]} */
  const out = [];
  if (!isDir(peers)) return out;
  for (const f of readdirSync(peers).filter((n) => n.endsWith(".json")).sort()) {
    const p = readJson(path.join(peers, f));
    if (!p || typeof p.id !== "string" || typeof p.seen !== "number") continue;
    if (now - p.seen > PEER_STALE_MS) {
      // What a console that died left behind: its card and its unread mail.
      rmSync(path.join(peers, f), { force: true });
      rmSync(path.join(dir, "inbox", p.id), { recursive: true, force: true });
      continue;
    }
    out.push(p);
  }
  return out;
}

/**
 * Enter the room: a card of this console's own, and an inbox.
 * @param {string} cwd
 * @param {{ env?: NodeJS.ProcessEnv, role?: Peer["role"], name?: string, now?: number }} [opts]
 * @returns {Room}
 */
export function joinRoom(cwd, { env = process.env, role, name, now = Date.now() } = {}) {
  const at = roomFor(cwd, env);
  // The person's alone: a request found here was put here by them.
  mkdirSync(path.join(at.dir, "peers"), { recursive: true, mode: 0o700 });
  mkdirSync(path.join(at.dir, "inbox"), { recursive: true, mode: 0o700 });
  if (!isFile(path.join(at.dir, "room.json"))) writeJson(path.join(at.dir, "room.json"), { root: at.root });
  const id = token();
  // Two consoles in one directory are told apart by a number.
  const taken = new Set(alive(at.dir, now).filter((p) => p.role !== "sender").map((p) => p.name));
  let unique = name ?? at.name;
  // A `--send` speaks as the console whose agent ran it: it keeps that name.
  for (let n = 2; role !== "sender" && taken.has(unique); n++) unique = `${name ?? at.name}-${n}`;
  mkdirSync(path.join(at.dir, "inbox", id), { recursive: true, mode: 0o700 });
  return { dir: at.dir, root: at.root, id, name: unique, role: role ?? at.role };
}

/**
 * Say this console is alive, and what it is doing.
 * @param {Room} room
 * @param {{ cwd: string, agent: string | null, model: string | null, busy: boolean, listening: boolean }} info
 * @param {number} [now]
 */
export function beat(room, info, now = Date.now()) {
  /** @type {Peer} */
  const card = { id: room.id, name: room.name, role: room.role, pid: process.pid, seen: now, ...info };
  try {
    writeJson(path.join(room.dir, "peers", `${room.id}.json`), card);
  } catch { /* a home that cannot be written is a console alone, not a console that stops */ }
}

/** Leave: the card and the inbox go. */
export function leaveRoom(room) {
  rmSync(path.join(room.dir, "peers", `${room.id}.json`), { force: true });
  rmSync(path.join(room.dir, "inbox", room.id), { recursive: true, force: true });
}

/**
 * The other consoles in the room, by name. A `--send` in flight is not one.
 * @param {Room} room
 * @param {number} [now]
 * @returns {Peer[]}
 */
export function listPeers(room, now = Date.now()) {
  return alive(room.dir, now).filter((p) => p.id !== room.id && p.role !== "sender").sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The consoles open for a directory, without entering the room.
 * @param {string} cwd
 * @param {NodeJS.ProcessEnv} [env]
 * @param {number} [now]
 * @returns {Peer[]}
 */
export function roomPeers(cwd, env = process.env, now = Date.now()) {
  return alive(roomFor(cwd, env).dir, now).filter((p) => p.role !== "sender").sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Put a message in a console's inbox. False when that console is gone.
 * @param {Room} room
 * @param {string} toId
 * @param {Message} message
 */
export function sendMessage(room, toId, message) {
  const inbox = path.join(room.dir, "inbox", toId);
  if (!/^[0-9a-f]+$/.test(toId) || !isDir(inbox)) return false;
  try {
    writeJson(path.join(inbox, `${String(message.at).padStart(15, "0")}-${token()}.json`), message);
    return true;
  } catch {
    return false;
  }
}

/**
 * Take what arrived, oldest first. Each message is read once.
 * @param {Room} room
 * @returns {Message[]}
 */
export function takeInbox(room) {
  const inbox = path.join(room.dir, "inbox", room.id);
  /** @type {Message[]} */
  const out = [];
  if (!isDir(inbox)) return out;
  for (const f of readdirSync(inbox).filter((n) => n.endsWith(".json")).sort()) {
    const file = path.join(inbox, f);
    const m = readJson(file);
    rmSync(file, { force: true });
    if (m && typeof m.type === "string" && m.from && typeof m.from.id === "string" && typeof m.from.name === "string") out.push(m);
  }
  return out;
}

/** A new message id. */
export const messageId = () => `${Date.now().toString(36)}${token()}`;
