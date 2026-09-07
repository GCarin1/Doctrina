// @ts-check
import path from "node:path";
import { exists } from "./fs-ops.js";
import { notADoctrinaProject } from "./exit-codes.js";

// The one precondition every command shares: this is a Doctrina project.
// Six command modules carried an identical private copy of it; a lib
// operation that needs it should not have to reach into a command for the
// check (audit finding F7).
export function ensureDoctrinaProject(projectRoot) {
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
}
