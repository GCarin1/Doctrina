import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { classify } from "../src/commands/triage.js";
import { parseExpectation, judgeOutput } from "../src/commands/verify.js";
import { EXIT } from "../src/lib/exit-codes.js";

// The command half of the runtime surface (change 0029): the lane
// classifier, the hold `work` puts on a runtime-shaped prompt, the
// fail-closed verify expectation, and `contract check` rendering the
// runtime verdict.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-rtcmd-"));
  const res = run(dir, ["init", "--project-description", "a fixture project"]);
  assert.equal(res.status, 0, `init failed: ${res.stderr}`);
  return dir;
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

// ------------------------------------------------------------ the classifier

test("the classifier separates the three lanes", () => {
  assert.equal(classify("add a PDF export command for reports").lane, "product");
  assert.equal(classify("users should be able to sign in with Okta").lane, "product");
  assert.equal(classify("the CI job is green but 0 scenarios ran").lane, "runtime");
  assert.equal(classify("the secret is set in GitHub but the process never sees it").lane, "runtime");
  assert.equal(classify("bump the typescript devDependency to 5.9").lane, "chore");
});

test("an unclassifiable prompt falls back to product, the lane with the ceremony", () => {
  const verdict = classify("zzzz qqqq");
  assert.equal(verdict.lane, "product");
  assert.equal(verdict.confident, false);
});

test("confidence is the margin over the RUNNER-UP, so a clear product ask reads as confident", () => {
  // Comparing a lane against itself could never make product confident —
  // the bug this pins.
  assert.equal(classify("add a PDF export command for reports").confident, true);
});

test("a feature request that merely mentions a job is not diverted into runtime", () => {
  // "job" is a runtime signal, but the product signals must still win:
  // an ordinary feature request is not an incident.
  const verdict = classify("add a new capability so users can schedule a job and get an email");
  assert.equal(verdict.lane, "product");
});

test("the classifier reports the signals it matched, so a wrong guess is arguable", () => {
  const verdict = classify("the workflow env var is empty");
  assert.equal(verdict.lane, "runtime");
  assert.ok(verdict.scores.runtime.hits.length > 0);
});

// ----------------------------------------------------- work holds the lane

test("work HOLDS a runtime-shaped prompt and names the diagnosis path", () => {
  const dir = project();
  try {
    const res = run(dir, ["work", "the CI job is green but 0 scenarios ran and the artifact is missing"]);
    assert.equal(res.status, EXIT.PRECONDITION);
    assert.match(res.stderr, /RUNTIME problem/);
    assert.match(res.stderr, /doctrina triage/);
    // Nothing was scaffolded: the point of the hold is that no ceremony
    // is spent before the diagnosis.
    const after = run(dir, ["next", "--json"]);
    assert.doesNotMatch(after.stdout, /complete \d+ open task/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--force opens the change anyway: the classifier advises, it never refuses", () => {
  const dir = project();
  try {
    const res = run(dir, ["work", "--force", "the CI job is green but 0 scenarios ran"]);
    assert.equal(res.status, 0, `expected the change to open: ${res.stderr}`);
    assert.match(res.stdout, /created .*proposal\.md/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a product prompt still opens a change with no hold at all", () => {
  const dir = project();
  try {
    const res = run(dir, ["work", "add a PDF export command for reports"]);
    assert.equal(res.status, 0, `expected the change to open: ${res.stderr}`);
    assert.doesNotMatch(res.stderr, /RUNTIME problem/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--chore skips the hold: wiring the spec already covers is its own lane", () => {
  const dir = project();
  try {
    const res = run(dir, ["work", "--chore", "wire the CI job env var that is empty"]);
    assert.equal(res.status, 0, `expected the chore to open: ${res.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------- triage output

test("triage names the lane and reports an undeclared runtime surface honestly", () => {
  const dir = project();
  try {
    const res = run(dir, ["triage", "the workflow secret never reaches the process"]);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /RUNTIME/);
    // No contracts: silence must not read as "verified".
    assert.match(res.stdout, /nothing declares the runtime surface/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("triage exits 1 when a declared wiring does not hold", () => {
  const dir = project();
  try {
    mkdirSync(path.join(dir, ".github", "workflows"), { recursive: true });
    writeFileSync(
      path.join(dir, ".github", "workflows", "e2e.yml"),
      "name: e2e\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: behave\n",
    );
    run(dir, ["contract", "new", "system"]);
    const contract = path.join(dir, ".doctrina", "contracts", "system.md");
    writeFileSync(
      contract,
      "# Contract — system\n\n**Status:** active\n\n## Wiring\n\n" +
      "| Variable | Origin | Workflow | Job/Step | Consumer |\n" +
      "|---|---|---|---|---|\n" +
      "| AXE_SEVERITY | vars | .github/workflows/e2e.yml | test | config.py |\n",
    );
    const res = run(dir, ["triage"]);
    assert.equal(res.status, 1);
    assert.match(res.stdout, /RT01/);
    assert.match(res.stdout, /fix the wiring, not the spec/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("triage --json is machine-readable and carries the lane and findings", () => {
  const dir = project();
  try {
    const res = run(dir, ["triage", "--json", "the CI job ran nothing"]);
    const payload = JSON.parse(res.stdout);
    assert.equal(payload.lane, "runtime");
    assert.equal(payload.contracts, 0);
    assert.deepEqual(payload.findings, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------------- contract check: the runtime half

test("contract check reports the runtime finding and exits 1", () => {
  const dir = project();
  try {
    run(dir, ["contract", "new", "system"]);
    mkdirSync(path.join(dir, "features"), { recursive: true });
    writeFileSync(path.join(dir, "features", "a.feature"), "@smoke_test\nFeature: x\n");
    writeFileSync(
      path.join(dir, ".doctrina", "contracts", "system.md"),
      "# Contract — system\n\n**Status:** active\n\n## Selectors\n\n" +
      "| Selector | Source | Pattern | Used by |\n" +
      "|---|---|---|---|\n" +
      "| tags | features/**/*.feature | @([a-z0-9_-]+) | smoke-test |\n",
    );
    const res = run(dir, ["contract", "check"]);
    assert.equal(res.status, 1);
    assert.match(res.stdout, /RT05/);
    assert.match(res.stdout, /executes 0 cases and exits 0/);
    assert.match(res.stdout, /smoke_test/); // the near-miss is named
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a scaffolded contract passes check and says its runtime surface is UNCHECKED", () => {
  const dir = project();
  try {
    run(dir, ["contract", "new", "system"]);
    const res = run(dir, ["contract", "check"]);
    assert.equal(res.status, 0);
    // The distinction that keeps a green check honest.
    assert.match(res.stdout, /runtime surface is unchecked/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --------------------------------------------- verify: fail-closed empty runs

test("an expect block compiles only when it declares a usable pattern", () => {
  assert.equal(parseExpectation({ run: "x" }), null);
  assert.equal(parseExpectation({ run: "x", expect: {} }), null);
  assert.ok(parseExpectation({ run: "x", expect: { fail_if_output_matches: "0 scenarios" } }));
  assert.throws(() => parseExpectation({ run: "x", expect: { fail_if_output_matches: "([bad" } }));
});

test("judgeOutput fails a run whose output matches the declared failure shape", () => {
  const exp = parseExpectation({ expect: { fail_if_output_matches: "0 scenarios" } });
  assert.equal(judgeOutput(exp, "7 scenarios passed").ok, true);
  const bad = judgeOutput(exp, "0 scenarios passed, 0 failed");
  assert.equal(bad.ok, false);
  assert.match(bad.reason, /a run that executed nothing exits 0 too/);
});

test("judgeOutput fails a run that never printed its required proof", () => {
  const exp = parseExpectation({ expect: { require_output_matches: "\\d+ scenarios? passed" } });
  assert.equal(judgeOutput(exp, "7 scenarios passed").ok, true);
  assert.equal(judgeOutput(exp, "nothing to do").ok, false);
});

test("verify fails a green check that executed nothing", () => {
  const dir = project();
  try {
    writeJson(path.join(dir, ".doctrina", "verify.json"), {
      checks: [{
        name: "empty-suite",
        run: "echo \"0 scenarios passed, 0 failed\"",
        expect: { fail_if_output_matches: "0 scenarios" },
      }],
    });
    const res = run(dir, ["verify"]);
    assert.equal(res.status, 1);
    assert.match(res.stdout, /exit 0, but its output matched/);
    // The output is still shown — expectations read it, they do not hide it.
    assert.match(res.stdout, /0 scenarios passed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("verify passes the same check once the run is real", () => {
  const dir = project();
  try {
    writeJson(path.join(dir, ".doctrina", "verify.json"), {
      checks: [{
        name: "real-suite",
        run: "echo \"7 scenarios passed, 0 failed\"",
        expect: { fail_if_output_matches: "0 scenarios", require_output_matches: "\\d+ scenarios passed" },
      }],
    });
    const res = run(dir, ["verify"]);
    assert.equal(res.status, 0, res.stdout);
    assert.match(res.stdout, /1\/1 checks passed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an uncompilable expect pattern is a USAGE error at config time, not a silent skip", () => {
  const dir = project();
  try {
    writeJson(path.join(dir, ".doctrina", "verify.json"), {
      checks: [{ name: "bad", run: "echo hi", expect: { fail_if_output_matches: "([unclosed" } }],
    });
    const res = run(dir, ["verify"]);
    assert.equal(res.status, EXIT.USAGE);
    assert.match(res.stderr, /not a valid regular expression/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("verify --list shows which checks judge their own output", () => {
  const dir = project();
  try {
    writeJson(path.join(dir, ".doctrina", "verify.json"), {
      checks: [{ name: "e2e", run: "echo hi", expect: { fail_if_output_matches: "0 scenarios" } }],
    });
    const res = run(dir, ["verify", "--list"]);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /fail if output matches \/0 scenarios\//);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------ doctor + next

test("doctor reports the runtime row, and --env never prints a value", () => {
  const dir = project();
  try {
    run(dir, ["contract", "new", "system"]);
    writeFileSync(
      path.join(dir, ".doctrina", "contracts", "system.md"),
      "# Contract — system\n\n**Status:** active\n\n## Environment\n\n" +
      "| Variable | Required | Values | Example |\n" +
      "|---|---|---|---|\n" +
      "| MODE | no | fast\\|slow | fast |\n",
    );
    writeFileSync(path.join(dir, ".env"), "MODE=super-secret-invalid\n");
    const res = run(dir, ["doctor", "--env"]);
    assert.match(res.stdout, /runtime/);
    assert.match(res.stdout, /local \.env/);
    assert.ok(!res.stdout.includes("super-secret-invalid"), "doctor must never print the value");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("next puts a broken runtime declaration ABOVE the artifact chores", () => {
  const dir = project();
  try {
    run(dir, ["contract", "new", "system"]);
    writeFileSync(
      path.join(dir, ".doctrina", "contracts", "system.md"),
      "# Contract — system\n\n**Status:** active\n\n## Wiring\n\n" +
      "| Variable | Origin | Workflow | Job/Step | Consumer |\n" +
      "|---|---|---|---|---|\n" +
      "| TOKEN | secrets | .github/workflows/missing.yml | test | app.js |\n",
    );
    const res = run(dir, ["next", "--json"]);
    const payload = JSON.parse(res.stdout);
    // Actions are RECORDS since change 0032: a consumer branches on
    // `command`/`args` rather than re-reading the sentence the CLI built.
    assert.equal(payload.actions[0].command, "triage");
    assert.equal(payload.actions[0].id, "runtime-declarations");
    assert.match(payload.actions[0].why, /do(es)? not hold/);
    assert.match(payload.actions[0].text, /doctrina triage/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------- expect streams while it captures (0.15.1)
//
// The first cut ran an expect-carrying check piped and echoed the whole
// buffer once it finished — forty seconds of blank terminal on this
// project's own suite. Reading a check's output and showing it are
// independent concerns.

test("an expect check STREAMS its output instead of withholding it to the end", async () => {
  const dir = project();
  try {
    // Three chunks a second apart; if the output only arrives at the end,
    // the first chunk's timestamp will sit next to the last one's.
    // A script FILE, not `node -e`: nested quotes through `shell: true`
    // are mangled differently on every platform, and this test is about
    // streaming, not about quoting.
    writeFileSync(
      path.join(dir, "ticker.js"),
      [
        "let i = 0;",
        "const t = setInterval(() => {",
        "  console.log('tick ' + (++i));",
        "  if (i === 3) { clearInterval(t); console.log('pass 3'); }",
        "}, 400);",
      ].join("\n"),
    );
    writeJson(path.join(dir, ".doctrina", "verify.json"), {
      checks: [{
        name: "slow",
        run: "node ticker.js",
        expect: { require_output_matches: "pass [1-9]" },
      }],
    });

    const started = Date.now();
    /** @type {number[]} */
    const tickTimes = [];
    await new Promise((resolve) => {
      const child = spawn(process.execPath, [cliEntry, "verify"], {
        cwd: dir,
        env: { ...process.env, NO_COLOR: "1" },
      });
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        for (const line of String(chunk).split("\n")) {
          if (line.includes("tick ")) tickTimes.push(Date.now() - started);
        }
      });
      child.on("close", resolve);
    });

    assert.equal(tickTimes.length, 3, `expected 3 ticks, saw ${tickTimes.length}`);
    // The first tick must arrive well before the last: that gap IS the
    // streaming. Buffered output would land all three within a few ms.
    assert.ok(
      tickTimes[2] - tickTimes[0] > 300,
      `output was buffered, not streamed (ticks at ${tickTimes.join("ms, ")}ms)`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the tee still judges the output and still reports the exit code", () => {
  const dir = project();
  try {
    writeJson(path.join(dir, ".doctrina", "verify.json"), {
      checks: [
        { name: "empty", run: "echo \"0 scenarios\"", expect: { fail_if_output_matches: "0 scenarios" } },
      ],
    });
    const res = run(dir, ["verify"]);
    assert.equal(res.status, 1);
    assert.match(res.stdout, /0 scenarios/, "the output must still be shown");
    assert.match(res.stdout, /exit 0, but its output matched/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a non-zero exit is still a failure, tee or not", () => {
  const dir = project();
  try {
    writeJson(path.join(dir, ".doctrina", "verify.json"), {
      checks: [{ name: "boom", run: "echo pass 1 && exit 3", expect: { require_output_matches: "pass [1-9]" } }],
    });
    const res = run(dir, ["verify"]);
    assert.equal(res.status, 1);
    assert.match(res.stdout, /exit 3/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------ authoring verbs beat domain nouns (0.15.1)
//
// Two real misreads from operating 0.15.0 on this repository. Both lanes
// matched domain NOUNS and mistook work ON the machinery for an incident
// IN it. The fix is that authoring verbs — declare, document, specify —
// pull toward the ceremony lane whatever nouns surround them.

test("declaring runtime wiring is authoring, not a diagnosis", () => {
  // Scored RUNTIME on "workflow" + "wiring" before the fix.
  const verdict = classify(
    "declare the release workflow wiring in a contract and add an expect guard to the test check",
  );
  assert.equal(verdict.lane, "product", `misread as ${verdict.lane}`);
});

test("a prompt ABOUT a rename is not a request TO rename", () => {
  // Scored CHORE on "rename" — the noun in "an intentional rename".
  const verdict = classify(
    "let a wiring row declare the source variable name so an intentional rename stops warning forever",
  );
  assert.equal(verdict.lane, "product", `misread as ${verdict.lane}`);
});

test("an actual rename request is still a chore", () => {
  // The guard against overcorrecting: with no authoring verb, "rename"
  // still means what it always meant.
  assert.equal(classify("rename the helper file and tidy the imports").lane, "chore");
});

test("real incidents still read as RUNTIME", () => {
  for (const prompt of [
    "the CI job is green but 0 scenarios ran",
    "the secret is set in GitHub but the process never sees it",
    "the workflow env var arrives empty and the default never applies",
  ]) {
    assert.equal(classify(prompt).lane, "runtime", `misread: ${prompt}`);
  }
});

// ---------------------------------------- change 0056: the summary line too

// The per-contract line said "unchecked" from change 0029 onward. The
// SUMMARY still said "ok N contracts consistent" — and the summary is the
// line the CI log keeps and the close prints, so it is the one that was
// read. These pin the three surfaces saying the same thing about the same
// state.

test("the check summary refuses the word consistent when nothing was declared", () => {
  const dir = project();
  try {
    run(dir, ["contract", "new", "system"]);
    const res = run(dir, ["contract", "check"]);
    assert.equal(res.status, 0, "an undeclared surface is reported, not failed (change 0029)");
    assert.doesNotMatch(res.stdout, /consistent/,
      "there is nothing to be consistent with when nothing was declared");
    assert.match(res.stdout, /^warn .*runtime surface is unchecked/m, res.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the check summary counts how many contracts went unchecked", () => {
  const dir = project();
  try {
    run(dir, ["contract", "new", "system"]);
    run(dir, ["contract", "new", "delivery"]);
    writeFileSync(path.join(dir, ".env.example"), "API_TOKEN=x\n");
    writeFileSync(
      path.join(dir, ".doctrina", "contracts", "system.md"),
      "# Contract — system\n\n**Status:** active\n\n## Wiring\n\n" +
      "| Variable | Origin | Consumer | Exported by |\n" +
      "|---|---|---|---|\n" +
      "| API_TOKEN | env | src/app.js | .env.example |\n",
    );
    const res = run(dir, ["contract", "check"]);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /1 of 2 contracts declare no Wiring\/Selectors rows/, res.stdout);
    assert.doesNotMatch(res.stdout, /consistent/, res.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a declared surface that holds is reported as consistent AND as rows that hold", () => {
  const dir = project();
  try {
    run(dir, ["contract", "new", "system"]);
    writeFileSync(path.join(dir, ".env.example"), "API_TOKEN=x\n");
    writeFileSync(
      path.join(dir, ".doctrina", "contracts", "system.md"),
      "# Contract — system\n\n**Status:** active\n\n## Wiring\n\n" +
      "| Variable | Origin | Consumer | Exported by |\n" +
      "|---|---|---|---|\n" +
      "| API_TOKEN | env | src/app.js | .env.example |\n",
    );
    const res = run(dir, ["contract", "check"]);
    assert.equal(res.status, 0, res.stdout + res.stderr);
    assert.match(res.stdout, /^ok 1 contract consistent, 1 declared row holds/m, res.stdout);
    assert.doesNotMatch(res.stdout, /unchecked/, res.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("contract check, doctor and triage describe an undeclared surface the same way", () => {
  const dir = project();
  try {
    run(dir, ["contract", "new", "system"]);
    const check = run(dir, ["contract", "check"]);
    const doc = run(dir, ["doctor"]);
    const tri = run(dir, ["triage", "the secret is set in GitHub but the process never sees it"]);
    for (const [name, res] of [["contract check", check], ["doctor", doc], ["triage", tri]]) {
      assert.match(res.stdout, /unchecked/i, `${name} must call the surface unchecked:\n${res.stdout}`);
      assert.doesNotMatch(res.stdout, /contracts? consistent/,
        `${name} must not call an undeclared surface consistent:\n${res.stdout}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
