// @ts-check
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, renameSync, unlinkSync, rmdirSync } from "node:fs";
import path from "node:path";

// Every module reads a file through here, so the byte-order mark is removed
// here — once, at the door (third audit, finding 5).
//
// A spec saved by a Windows editor opens `﻿# Spec — …`, and `validate`
// reported "carries no title" while `show`, `spec list` and `coverage` read
// the same file without complaint: the surfaces disagreed about a file none
// of them had a problem with. The mark is an encoding artifact of how the
// bytes were stored, not something the Doctrina grammar has an opinion
// about, so no parser downstream should have to know it exists.
//
// It matters beyond Markdown: `JSON.parse` throws on a leading BOM, so an
// `index.json` written by the wrong editor was unreadable with an error
// that named neither the cause nor the file.
//
// A file that had one loses it when a command rewrites it. That is a
// normalisation, and the right one — nothing in this tree is served by
// keeping it.
export function read(p) {
  const text = readFileSync(p, "utf8");
  return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

export function write(p, content, { force = false } = {}) {
  if (existsSync(p) && !force) {
    throw new Error(`refusing to overwrite existing file: ${p} (pass --force to allow)`);
  }
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, content);
}

export function exists(p) {
  return existsSync(p);
}

export function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

export function mkdirp(p) {
  mkdirSync(p, { recursive: true });
}

export function move(from, to) {
  mkdirSync(path.dirname(to), { recursive: true });
  renameSync(from, to);
}

export function remove(p) {
  if (!existsSync(p)) return;
  if (isDir(p)) {
    for (const entry of readdirSync(p)) remove(path.join(p, entry));
    rmdirSync(p);
  } else {
    unlinkSync(p);
  }
}

/**
 * Remove `dir` and each ancestor of it, walking up, for as long as each one
 * is EMPTY — stopping at the first directory that still holds something, and
 * never touching `stopAt` itself or anything outside it.
 *
 * The asymmetry this closes: a command that creates a directory with
 * `mkdirp` on the way in has to unmake it on the way out, or "remove" leaves
 * a configuration root behind. An EMPTY directory is the safe case to
 * delete — there is nothing of anyone else's in it — which is why this
 * stops at the first non-empty one rather than recursing.
 *
 * @param {string} dir     The innermost directory to consider.
 * @param {string} stopAt  Boundary, never removed and never escaped.
 * @returns {string[]} The directories removed, innermost first.
 */
export function pruneEmptyDirs(dir, stopAt) {
  const removed = [];
  const boundary = path.resolve(stopAt);
  let cur = path.resolve(dir);
  while (cur !== boundary && cur.startsWith(boundary + path.sep)) {
    if (!isDir(cur)) break;
    let entries;
    try {
      entries = readdirSync(cur);
    } catch {
      break;
    }
    if (entries.length > 0) break;
    try {
      rmdirSync(cur);
    } catch {
      break;
    }
    removed.push(cur);
    cur = path.dirname(cur);
  }
  return removed;
}

// Recursive file walk. Returns absolute paths of every regular file.
export function walk(root) {
  const out = [];
  if (!exists(root)) return out;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (isDir(full)) stack.push(full);
      else if (isFile(full)) out.push(full);
    }
  }
  return out.sort();
}

export function lineCount(p) {
  const text = read(p);
  if (text.length === 0) return 0;
  return text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
}

// Normalise a path to forward slashes for display and comparison. CLI
// output is part of the contract (tests, docs, agents parse it), so it
// must not change shape between platforms.
export function toPosix(p) {
  return p.split(path.sep).join("/");
}

// path.relative with stable, platform-independent forward slashes.
export function relPath(from, to) {
  return toPosix(path.relative(from, to));
}
