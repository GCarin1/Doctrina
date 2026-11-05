// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// THE EXAMPLES FOLLOW THE VERSION (change 0241).
//
// The 0.21.0 release bumped package.json and re-stamped the root index, and
// left both examples' index.json at 0.20.0. The release workflow validates
// the examples with --strict, where a stamp behind the CLI is a failure —
// so the tag ran every gate and stopped one step before the publish. This
// test is in the suite `doctrina close` runs, so the next bump fails HERE.

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..", "..");
const version = JSON.parse(readFileSync(path.join(repo, "packages", "doctrina-cli", "package.json"), "utf8")).version;

test("every shipped example's index is stamped with the CLI's version", () => {
  const examples = readdirSync(path.join(repo, "examples"))
    .filter((d) => existsSync(path.join(repo, "examples", d, ".doctrina", "index.json")));
  assert.ok(examples.length > 0);
  for (const d of examples) {
    const stamp = JSON.parse(readFileSync(path.join(repo, "examples", d, ".doctrina", "index.json"), "utf8")).framework_version;
    assert.equal(stamp, version, `examples/${d}: framework_version ${stamp}, CLI ${version} — run \`doctrina index rebuild\` in examples/${d}`);
  }
});
