import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, flagAll, flagString, flagBool } from "../src/lib/args.js";

test("positional only", () => {
  const { positional, flags } = parseArgs(["init", "core"]);
  assert.deepEqual(positional, ["init", "core"]);
  assert.equal(flags.size, 0);
});

test("--flag=value", () => {
  const { flags } = parseArgs(["--project-name=Acme"]);
  assert.equal(flagString(flags, "project-name"), "Acme");
});

test("--flag value", () => {
  const { flags } = parseArgs(["--project-name", "Acme"]);
  assert.equal(flagString(flags, "project-name"), "Acme");
});

test("boolean flag without value", () => {
  const { flags } = parseArgs(["--force"], { boolean: ["force"] });
  assert.equal(flagBool(flags, "force"), true);
});

test("--flag followed by another flag treats first as boolean", () => {
  const { flags } = parseArgs(["--force", "--agent", "claude"]);
  assert.equal(flags.get("force"), true);
  assert.equal(flagString(flags, "agent"), "claude");
});

test("-- stops flag parsing", () => {
  const { positional, flags } = parseArgs(["change", "new", "0042", "--", "--with-dashes"]);
  assert.deepEqual(positional, ["change", "new", "0042", "--with-dashes"]);
  assert.equal(flags.size, 0);
});

test("short flags", () => {
  const { flags } = parseArgs(["-h"], { boolean: ["h"] });
  assert.equal(flags.get("h"), true);
});

// Change 0228: a repeated string flag keeps every value for flagAll, while
// flags.get / flagString still answer with the last one.
test("flagAll returns every value of a repeated flag, in order", () => {
  const { flags } = parseArgs(["delta", "--op", "a", "--op=b", "--op", "c", "--bump", "minor", "--bump", "patch", "--json"], { boolean: ["json"] });
  assert.deepEqual(flagAll(flags, "op"), ["a", "b", "c"]);
  assert.equal(flagString(flags, "op"), "c", "a single reading is still the last value");
  assert.deepEqual(flagAll(flags, "bump"), ["minor", "patch"]);
  assert.deepEqual(flagAll(flags, "json"), [], "a boolean flag has no values");
  assert.deepEqual(flagAll(flags, "absent"), []);
  assert.deepEqual(flagAll(new Map([["op", "x"]]), "op"), ["x"], "a hand-built map answers with its one value");
});
