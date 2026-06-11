import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, renameSync, unlinkSync, rmdirSync } from "node:fs";
import path from "node:path";

export function read(p) {
  return readFileSync(p, "utf8");
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
