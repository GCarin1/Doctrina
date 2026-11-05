// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { inventory, inventoryMarkdown } from "../src/lib/code-inventory.js";

// THE INTAKE READS THE WHOLE PROJECT (change 0229).
//
// `intake --from-code` read the manifests at the root and nothing below.
// Run on public projects, that distorted exactly what an agent absorbs:
//   - an eleven-service demo in Go, C#, Node, Python and Java read as ".NET";
//   - a FastAPI + React template read as "no framework", with one candidate
//     area — an e-mail template package — and `npm` for a bun workspace;
//   - a Spring app was named after its parent pom, its areas were `src/main/`
//     and `src/test/`, and its entry point vanished because its Java package
//     is called `samples`;
//   - `--watch`, `--ui` and npm's "no test specified" placeholder were
//     offered to `verify --init`, a gate that would then hang or always fail.
// Each case below is one of those, reduced to the files that caused it.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function tree(/** @type {Record<string, string>} */ files) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-inventory-"));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), body);
  }
  return dir;
}

const POLYGLOT = {
  "README.md": "# Boutique\n\nA demo shop made of services.\n",
  "src/checkout/go.mod": "module example.com/checkout\n\ngo 1.22\n",
  "src/checkout/main.go": "package main\n",
  "src/checkout/main_test.go": "package main\n",
  "src/payment/package.json": JSON.stringify({ name: "payment", scripts: { test: "echo \"Error: no test specified\" && exit 1", start: "node server.js" }, dependencies: { "@grpc/grpc-js": "1" } }),
  "src/payment/server.js": "// server\n",
  "src/email/requirements.txt": "flask==3.0\ngrpcio==1.60\npytest==8\n",
  "src/email/email_server.py": "# server\n",
  "src/email/test_email.py": "def test_x(): pass\n",
  "src/ads/build.gradle": "plugins { id 'java' }\ndependencies { implementation 'io.grpc:grpc-netty:1' }\n",
  "src/ads/gradlew": "#!/bin/sh\n",
  "src/ads/src/main/java/shop/AdService.java": "class AdService {}\n",
  "src/cart/src/cart.csproj": "<Project Sdk=\"Microsoft.NET.Sdk.Web\"><ItemGroup><PackageReference Include=\"Grpc.AspNetCore\" /></ItemGroup></Project>\n",
  "src/cart/src/Program.cs": "// program\n",
  "src/cart/tests/cart.tests.csproj": "<Project Sdk=\"Microsoft.NET.Sdk\"><ItemGroup><PackageReference Include=\"xunit\" /></ItemGroup></Project>\n",
  "src/cart/tests/CartTests.cs": "// tests\n",
  "protos/demo.proto": "syntax = \"proto3\";\n",
  "helm-chart/Chart.yaml": "name: shop\n",
  "kustomize/base/kustomization.yaml": "resources: []\n",
  "src/checkout/Dockerfile": "FROM golang\n",
  "src/payment/Dockerfile": "FROM node\n",
  "skaffold.yaml": "apiVersion: skaffold\n",
};

test("a polyglot repository reads as every build it declares, not as its root's", () => {
  const dir = tree(POLYGLOT);
  try {
    const inv = inventory(dir);
    assert.deepEqual(inv.stack, [".NET", "Go", "JVM", "Node.js", "Python"]);
    for (const s of ["ASP.NET Core", "Flask", "gRPC", "pytest", "xUnit"]) assert.ok(inv.signals.includes(s), `${s} in ${inv.signals}`);
    assert.deepEqual(inv.units.map((u) => u.dir).sort(),
      ["src/ads", "src/cart/src", "src/cart/tests", "src/checkout", "src/email", "src/payment"]);
    const md = inventoryMarkdown(inv, "boutique");
    assert.match(md, /gRPC \/ protobuf: `protos\/demo\.proto`/);
    assert.match(md, /Runtime: Helm charts — `helm-chart`/);
    assert.match(md, /Runtime: Kustomize — `kustomize\/base`/);
    assert.match(md, /Runtime: Skaffold/);
    assert.match(md, /Runtime: Docker — `src\/checkout\/Dockerfile`, `src\/payment\/Dockerfile`/);
    assert.match(md, /`src\/checkout\/main\.go`/, "an entry point to start reading from");
    // What verify --init gets: every unit's own test command, run in the unit.
    const seeded = inv.checks.map((c) => `${c.command} @ ${c.cwd ?? "."}`).sort();
    assert.deepEqual(seeded, [
      `${process.platform === "win32" ? "./gradlew" : "sh ./gradlew"} test @ src/ads`, "dotnet test @ src/cart/tests", "go test ./... @ src/checkout", "pytest @ src/email"].sort());
    assert.match(md, /npm's placeholder — no test declared/, "a script that fails by design is named, not seeded");
    assert.ok(!inv.areas.some(([a]) => a === "src/cart/tests"), "a test unit is evidence, not an area");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const FULLSTACK = {
  "package.json": JSON.stringify({ name: "fullstack", workspaces: ["frontend"], scripts: {
    lint: "bun run --filter frontend lint", test: "bun run --filter frontend test",
    "test:ui": "bun run --filter frontend test:ui", "test:watch": "vitest --watch" } }),
  "bun.lock": "{}\n",
  "uv.lock": "version = 1\n",
  "frontend/package.json": JSON.stringify({ name: "frontend", scripts: { test: "playwright test", "test:ui": "playwright test --ui" },
    dependencies: { react: "19", "@tanstack/react-router": "1" }, devDependencies: { "@playwright/test": "1", typescript: "5" } }),
  "frontend/tsconfig.json": "{}\n",
  "frontend/src/main.tsx": "// app\n",
  "frontend/src/routes/login.tsx": "// route\n",
  "frontend/src/components/Button.tsx": "// button\n",
  "frontend/tests/login.spec.ts": "// spec\n",
  "backend/pyproject.toml": "[project]\nname = \"app\"\ndependencies = [\n  \"fastapi[standard]<1.0\",\n  \"sqlmodel>=0.0.21\",\n  \"alembic>=1.12\",\n]\n[dependency-groups]\ndev = [\"pytest<9.0\"]\n",
  "backend/app/main.py": "# app\n",
  "backend/app/api/routes/users.py": "# users\n",
  "backend/app/api/routes/items.py": "# items\n",
  "backend/app/core/config.py": "# config\n",
  "backend/app/alembic/versions/001_init.py": "# migration\n",
  "backend/tests/test_users.py": "def test_u(): pass\n",
  ".env": "SECRET_KEY=never-read-this-value\n",
  "compose.yml": "services: {}\n",
};

test("a full-stack monorepo reads its units, its own runners and its areas — and no secret", () => {
  const dir = tree(FULLSTACK);
  try {
    const inv = inventory(dir);
    for (const s of ["FastAPI", "SQLModel", "Alembic", "pytest", "React", "TanStack Router", "Playwright"]) {
      assert.ok(inv.signals.includes(s), `${s} in ${inv.signals}`);
    }
    assert.equal(inv.units.find((u) => u.dir === "frontend")?.runner, "bun", "the lockfile says bun, not npm");
    const areas = inv.areas.map(([a]) => a);
    for (const a of ["backend", "frontend", "backend/app/api", "frontend/src/routes"]) assert.ok(areas.includes(a), `${a} in ${areas}`);
    const seeded = inv.checks.map((c) => `${c.command} @ ${c.cwd ?? "."}`).sort();
    assert.deepEqual(seeded, ["bun run lint @ .", "bun run test @ .", "uv run pytest @ backend"],
      "the root orchestrates the JS units; the backend runs its own pytest through uv");
    const md = inventoryMarkdown(inv, "fullstack");
    assert.match(md, /`bun run test:ui` — long-running or interactive/);
    assert.match(md, /`bun run test:watch` — long-running or interactive/);
    assert.match(md, /Migrations: `backend\/app\/alembic\/versions\/`/);
    assert.match(md, /Route \/ controller folders: .*`backend\/app\/api\/routes`/);
    assert.match(md, /`backend\/app\/main\.py`/);
    assert.match(md, /Present and NOT read \(may hold secrets\): `\.env`/);
    assert.doesNotMatch(md, /never-read-this-value|SECRET_KEY/, "a real .env is neither read nor named");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const SPRING = {
  "pom.xml": "<project><parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId></parent>"
    + "<groupId>org.example</groupId><artifactId>petclinic</artifactId>"
    + "<dependencies><dependency><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>\n",
  "mvnw": "#!/bin/sh\n",
  "settings.gradle": "rootProject.name = 'petclinic'\n",
  "src/main/java/org/example/samples/clinic/ClinicApplication.java": "class ClinicApplication {}\n",
  "src/main/java/org/example/samples/clinic/owner/Owner.java": "class Owner {}\n",
  "src/main/java/org/example/samples/clinic/owner/OwnerController.java": "class OwnerController {}\n",
  "src/main/java/org/example/samples/clinic/vet/Vet.java": "class Vet {}\n",
  "src/main/resources/db/schema.sql": "create table owners();\n",
  "src/test/java/org/example/samples/clinic/owner/OwnerTests.java": "class OwnerTests {}\n",
};

test("a Spring app is named after itself, its areas are its feature packages, and its entry point survives", () => {
  const dir = tree(SPRING);
  try {
    const inv = inventory(dir);
    assert.equal(inv.units[0].name, "petclinic", "not spring-boot-starter-parent");
    assert.ok(!inv.workspaces.some((w) => w.tool === "Gradle multi-project"), "a settings file with no include is one project");
    const areas = inv.areas.map(([a]) => a);
    assert.ok(areas.includes("src/main/java/org/example/samples/clinic/owner"), areas.join(", "));
    assert.ok(areas.includes("src/main/java/org/example/samples/clinic/vet"));
    assert.ok(!areas.includes("src/main") && !areas.includes("src/test"));
    assert.ok(inv.entryPoints.includes("src/main/java/org/example/samples/clinic/ClinicApplication.java"),
      "a Java package named `samples` is code, not an example");
    assert.deepEqual(inv.checks.map((c) => c.command), [`${process.platform === "win32" ? "./mvnw" : "sh ./mvnw"} -q test`],
      "a wrapper written without its execute bit runs through sh");
    assert.match(inventoryMarkdown(inv, "petclinic"), /Schemas: `src\/main\/resources\/db\/schema\.sql`/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the inventory says what it could not see", () => {
  const dir = tree({ ...FULLSTACK, "scripts/tool.py": "# a script with no manifest above it\n" });
  try {
    const md = inventoryMarkdown(inventory(dir), "fullstack");
    const limits = md.slice(md.indexOf("## What this inventory could not see"));
    assert.match(limits, /ask the human/);
    assert.match(limits, /How this code is built — no manifest above it: `scripts\/` \(1 files\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("verify --init on a polyglot repository writes each unit's command with its cwd", () => {
  const dir = tree(POLYGLOT);
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  try {
    assert.equal(run(["init", "--non-interactive", "--project-name", "Boutique"]).status, 0);
    const r = run(["verify", "--init"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /go test \.\/\.\.\. \(in src\/checkout\/\)/);
    const cfg = JSON.parse(readFileSync(path.join(dir, ".doctrina", "verify.json"), "utf8"));
    assert.ok(cfg.checks.some((c) => c.run === "go test ./..." && c.cwd === "src/checkout"));
    assert.ok(!cfg.checks.some((c) => /npm run test/.test(c.run)), "the placeholder never reaches the gate");
    const list = run(["verify", "--list"]);
    assert.equal(list.status, 0, list.stderr);
    assert.match(list.stdout, /test \(src\/checkout\) go test \.\/\.\.\./);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("test files alone seed no runner, and a project deep in tests/ is a fixture", () => {
  const dir = tree({
    "pyproject.toml": "[project]\nname = \"Framework\"\n",
    "framework/core.py": "# core\n",
    "tests/runtests.py": "# runs the suite\n",
    "tests/test_core.py": "def test_c(): pass\n",
    "tests/admin/templates/project/extra/requirements.txt": "requests\n",
  });
  try {
    const inv = inventory(dir);
    assert.deepEqual(inv.checks, [], "Django-style tests do not run through pytest by default");
    assert.match(inventoryMarkdown(inv, "framework"), /`python tests\/runtests\.py` — a test script, not a declared runner/);
    assert.ok(inv.units.find((u) => u.dir.startsWith("tests/admin"))?.example, "a fixture project, not a unit");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
