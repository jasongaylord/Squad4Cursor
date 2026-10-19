import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..");
const repoTemplates = join(packageRoot, "..", "..", "templates");
const dest = join(packageRoot, "templates");

if (!existsSync(repoTemplates)) {
  console.error(`Templates not found at ${repoTemplates}`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(repoTemplates, dest, { recursive: true });
console.log(`Copied templates → ${dest}`);
