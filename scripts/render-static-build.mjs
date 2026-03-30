import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const outputDir = path.join(repoRoot, "render-static");

const filesToCopy = [
  "index.html",
  "privacy.html",
  "app.js",
  "content.js",
  "frame-bust.js",
  "gamification.css",
  "gamification.js",
  "question-bank.js",
  "scoreboard.css",
  "scoreboard.js",
  "shared-random.js",
  "styles.css",
  "favicon.svg",
  "assets",
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const relativePath of filesToCopy) {
  const source = path.join(repoRoot, relativePath);
  const destination = path.join(outputDir, relativePath);
  await cp(source, destination, { recursive: true });
}
