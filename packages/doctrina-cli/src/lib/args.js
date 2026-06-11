// Tiny argv parser. Returns { positional: string[], flags: Map<string, string|boolean> }.
// Supports:
//   --flag                          -> flags.set("flag", true)
//   --flag=value                    -> flags.set("flag", "value")
//   --flag value                    -> flags.set("flag", "value")   (next token consumed)
//   -x                              -> flags.set("x", true)
//   -x=value or -x value            -> string value
//   --                              -> stop flag parsing; rest is positional
//
// Anything else becomes positional. Repeated flags overwrite the previous value.

export function parseArgs(argv, opts = {}) {
  const booleanFlags = new Set(opts.boolean ?? []);
  const positional = [];
  const flags = new Map();
  let i = 0;
  let stopped = false;

  while (i < argv.length) {
    const token = argv[i];

    if (stopped) {
      positional.push(token);
      i += 1;
      continue;
    }

    if (token === "--") {
      stopped = true;
      i += 1;
      continue;
    }

    if (token.startsWith("--")) {
      const body = token.slice(2);
      const eq = body.indexOf("=");
      if (eq >= 0) {
        flags.set(body.slice(0, eq), body.slice(eq + 1));
        i += 1;
      } else if (booleanFlags.has(body) || isNextTokenFlag(argv[i + 1])) {
        flags.set(body, true);
        i += 1;
      } else {
        flags.set(body, argv[i + 1] ?? true);
        i += 2;
      }
      continue;
    }

    if (token.startsWith("-") && token.length > 1) {
      const body = token.slice(1);
      const eq = body.indexOf("=");
      if (eq >= 0) {
        flags.set(body.slice(0, eq), body.slice(eq + 1));
        i += 1;
      } else if (booleanFlags.has(body) || isNextTokenFlag(argv[i + 1])) {
        flags.set(body, true);
        i += 1;
      } else {
        flags.set(body, argv[i + 1] ?? true);
        i += 2;
      }
      continue;
    }

    positional.push(token);
    i += 1;
  }

  return { positional, flags };
}

function isNextTokenFlag(token) {
  if (token === undefined) return true;
  if (typeof token !== "string") return true;
  return token.startsWith("-");
}

export function flagString(flags, name, fallback = undefined) {
  const v = flags.get(name);
  if (v === undefined || v === true) return fallback;
  return String(v);
}

export function flagBool(flags, name, fallback = false) {
  const v = flags.get(name);
  if (v === undefined) return fallback;
  if (v === true) return true;
  if (v === false) return false;
  const s = String(v).toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}
