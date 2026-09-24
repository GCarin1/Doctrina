// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// THE SAME TREE COSTS THE SAME TOKENS ON EVERY OS.
//
// The pack's estimate is chars/4, and it counted the CR of every CRLF line:
// a Windows checkout paid ~2% more for identical content. The budget is a
// gate (ADR 0022) and CI runs it on Linux, macOS and Windows, so a pack near
// its ceiling could pass on one runner and fail on another — a verdict that
// depended on the line endings git chose, not on the work.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

// Every Markdown artifact rewritten with CRLF, as a Windows checkout has it.
function toCrlf(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) toCrlf(p);
    else if (name.endsWith(".md")) writeFileSync(p, readFileSync(p, "utf8").replace(/\r?\n/g, "\r\n"));
  }
}

const total = (out) => Number(out.match(/~(\d+) tokens total/)?.[1]);

test("a CRLF checkout estimates the same pack as an LF one, and the budget agrees", () => {
  const lf = mkdtempSync(path.join(os.tmpdir(), "doctrina-eol-lf-"));
  const crlf = mkdtempSync(path.join(os.tmpdir(), "doctrina-eol-crlf-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], lf).status, 0);
    assert.equal(runCli(["spec", "new", "carteira"], lf).status, 0);
    cpSync(lf, crlf, { recursive: true });
    toCrlf(path.join(crlf, ".doctrina"));
    writeFileSync(path.join(crlf, "AGENTS.md"), readFileSync(path.join(lf, "AGENTS.md"), "utf8").replace(/\r?\n/g, "\r\n"));

    const a = runCli(["context", "carteira"], lf);
    const b = runCli(["context", "carteira"], crlf);
    assert.equal(a.status, 0, a.stderr);
    assert.equal(b.status, 0, b.stderr);
    const tokens = total(a.stdout);
    assert.ok(tokens > 0, a.stdout);
    assert.equal(total(b.stdout), tokens, "line endings are not content");

    // A ceiling exactly at the LF estimate: the verdict must not depend on the OS.
    for (const dir of [lf, crlf]) {
      const r = runCli(["context", "carteira", "--budget", String(tokens)], dir);
      assert.equal(r.status, 0, `${dir === lf ? "LF" : "CRLF"} — ${r.stdout}`);
    }
  } finally {
    rmSync(lf, { recursive: true, force: true });
    rmSync(crlf, { recursive: true, force: true });
  }
});
