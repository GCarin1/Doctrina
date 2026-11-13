// @ts-check
import path from "node:path";
import { isFile, mkdirp, read, write } from "./fs-ops.js";
import { doctrinaHome } from "./workspace-locate.js";

// WHAT A PERSON CHOSE IN THE CONSOLE (change 0258).
//
// Which agent answers and which model it runs are the person's choices, not
// the project's: two people on one repository use different agents. So they
// are kept beside the person's other Doctrina state, in
// `$DOCTRINA_HOME/console.json`, per directory the console was opened in —
// never in the repository, and never read by any command but the console.

export const PREFS_FILE = "console.json";

/** @typedef {{ agent: string | null, models: Record<string, string> }} ConsolePrefs */

const prefsPath = (/** @type {NodeJS.ProcessEnv} */ env) => path.join(doctrinaHome(env), PREFS_FILE);

function readAll(env) {
  const file = prefsPath(env);
  if (!isFile(file)) return {};
  try {
    const data = JSON.parse(read(file));
    return data && typeof data.projects === "object" && data.projects !== null ? data.projects : {};
  } catch {
    // A file a person broke by hand is their choices lost, not a console that will not open.
    return {};
  }
}

/**
 * The choices kept for a directory; the defaults when there are none.
 * @param {string} cwd
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {ConsolePrefs}
 */
export function consolePrefs(cwd, env = process.env) {
  const entry = readAll(env)[path.resolve(cwd)];
  /** @type {Record<string, string>} */
  const models = {};
  if (entry && typeof entry.models === "object" && entry.models !== null) {
    for (const [id, name] of Object.entries(entry.models)) {
      if (typeof name === "string" && name.trim() !== "") models[id] = name;
    }
  }
  return { agent: typeof entry?.agent === "string" ? entry.agent : null, models };
}

/**
 * Keep a directory's choices. Returns false when the file cannot be written:
 * the choice then lasts for the session, which is what it did before.
 * @param {string} cwd
 * @param {ConsolePrefs} prefs
 * @param {NodeJS.ProcessEnv} [env]
 */
export function saveConsolePrefs(cwd, prefs, env = process.env) {
  try {
    const projects = readAll(env);
    projects[path.resolve(cwd)] = { agent: prefs.agent, models: prefs.models };
    mkdirp(doctrinaHome(env));
    write(prefsPath(env), JSON.stringify({ version: 1, projects }, null, 2) + "\n", { force: true, atomic: true });
    return true;
  } catch {
    return false;
  }
}
