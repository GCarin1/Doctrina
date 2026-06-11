// ANSI colour helpers. Falls back to plain text when:
//   - stdout is not a TTY, OR
//   - the NO_COLOR environment variable is set (any value), OR
//   - the FORCE_COLOR variable is "0".
//
// Reference for NO_COLOR: https://no-color.org/

import process from "node:process";

const enabled = (() => {
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.FORCE_COLOR === "0") return false;
  if (process.env.FORCE_COLOR !== undefined) return true;
  return Boolean(process.stdout.isTTY);
})();

function wrap(open, close) {
  return (s) => (enabled ? `\x1b[${open}m${s}\x1b[${close}m` : String(s));
}

export const c = {
  enabled,
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  blue: wrap(34, 39),
  cyan: wrap(36, 39),
  gray: wrap(90, 39),
};
