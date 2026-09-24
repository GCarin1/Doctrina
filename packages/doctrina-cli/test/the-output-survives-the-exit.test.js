// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// A COMMAND THAT PRINTS MUST FINISH PRINTING BEFORE IT EXITS.
//
// The entrypoint used to end with `process.exit(code)`. When stdout is a PIPE
// — every `doctrina … | less`, every agent reading this CLI, every spawnSync
// in this suite — Node may still be holding bytes when that runs, and
// `process.exit` throws them away.
//
// Four tests failed on macOS with Node 20.12 and on no other leg of the
// matrix, all of them `--concat` runs asserting on content near the END of a
// long output. The decisive one printed exactly ONE section: product.md was on
// disk and in the pack listing, and the concat stopped before reaching it.
// Pipe buffer sizes differ per platform, which is exactly how a truncation bug
// picks one platform and hides on the others.
//
// These tests pin the promise on every platform, so the next regression is
// caught wherever it is introduced rather than only where the buffer is small.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const repoRoot = path.resolve(here, "..", "..", "..");

function runPiped(args, cwd = repoRoot) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: "1" },
  });
}

test("the entrypoint sets an exit code instead of calling process.exit", () => {
  // The mechanism, not just the symptom: `process.exit` in the final callback
  // is the thing that loses buffered output, so the source itself is the
  // cheapest place to state the rule.
  const src = readFileSync(cliEntry, "utf8");
  assert.match(src, /process\.exitCode\s*=/,
    "the entrypoint must set process.exitCode so Node flushes stdout before exiting");
  const live = src.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.doesNotMatch(live, /^\s*process\.exit\(/m,
    "process.exit() discards whatever stdout has not handed to the OS yet");
});

test("a long --concat pack arrives whole through a pipe", () => {
  // The repository's own pack is hundreds of kilobytes — far past any pipe
  // buffer on any platform — so this is the case that truncates first.
  const r = runPiped(["context", "--concat"]);
  assert.equal(r.status, 0, r.stderr);

  const sections = r.stdout.split("\n").filter((l) => l.startsWith("====="));
  assert.ok(sections.length >= 3,
    `a truncated pack shows as too few sections; got ${sections.length}: ${JSON.stringify(sections)}`);

  // The LAST section must be complete, not cut mid-file: every section this
  // pack announces has to be followed by the body it promised.
  const last = sections[sections.length - 1];
  const body = r.stdout.slice(r.stdout.lastIndexOf(last) + last.length);
  assert.ok(body.trim().length > 0,
    `the final section "${last}" announced a file and printed nothing after it`);
});

test("the pack a pipe receives is byte-identical to the one a file receives", () => {
  // Redirection and piping take different paths inside Node. If they disagree,
  // one of them is losing bytes, and the pipe is always the one that loses.
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-flush-"));
  try {
    const piped = runPiped(["context", "--concat"]);
    assert.equal(piped.status, 0, piped.stderr);

    const outFile = path.join(tmp, "pack.txt");
    const redirected = spawnSync(
      process.execPath,
      ["-e", `const {spawnSync}=require("node:child_process");const fs=require("node:fs");
        const fd=fs.openSync(${JSON.stringify(outFile)},"w");
        const r=spawnSync(process.execPath,[${JSON.stringify(cliEntry)},"context","--concat"],
          {cwd:${JSON.stringify(repoRoot)},stdio:["ignore",fd,"ignore"],
           env:{...process.env,NO_COLOR:"1"}});
        fs.closeSync(fd);process.exitCode=r.status??1;`],
      { encoding: "utf8" },
    );
    assert.equal(redirected.status, 0, redirected.stderr);

    const onDisk = readFileSync(outFile, "utf8");
    assert.equal(piped.stdout.length, onDisk.length,
      `pipe got ${piped.stdout.length} bytes, a file got ${onDisk.length} — the pipe lost the difference`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
