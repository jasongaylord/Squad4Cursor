import { join } from "node:path";
import { syncCursorAdapters } from "./fs-utils.js";
import { resolveTemplatesRoot } from "./paths.js";

export type UpgradeResult = {
  touched: string[];
  messages: string[];
};

/**
 * Refresh Squad4Cursor-owned Cursor templates/skills only.
 * Never clobbers .squad/ team state (histories, decisions, roster).
 */
export function upgradeProject(projectRoot: string): UpgradeResult {
  const templatesRoot = resolveTemplatesRoot();
  const touched = syncCursorAdapters(join(templatesRoot, "cursor"), projectRoot);
  return {
    touched,
    messages: [
      "Upgraded Cursor adapters (rules, skills, commands).",
      "Left .squad/ team state untouched.",
      touched.length === 0 ? "No adapter files needed changes." : `Updated ${touched.length} file(s).`,
    ],
  };
}
