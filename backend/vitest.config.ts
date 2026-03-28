import path from "node:path";
import { defineConfig } from "vitest/config";

const repoRoot = path.resolve(import.meta.dirname, "..");

export default defineConfig({
  root: repoRoot,
  server: {
    fs: {
      allow: [".."],
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["backend/src/**/*.test.ts", "backend/frontend-tests/**/*.test.ts"],
    setupFiles: ["backend/src/test/setup.ts"],
    mockReset: true,
    typecheck: {
      tsconfig: "backend/tsconfig.test.json",
    },
    coverage: {
      provider: "v8",
      reporter: ["lcov", "text"],
      reportsDirectory: "backend/coverage",
      allowExternal: true,
      include: [
        "backend/src/**/*.ts",
        "app.js",
        "content.js",
        "frame-bust.js",
        "gamification.js",
        "question-bank.js",
        "scoreboard.js",
        "shared-random.js",
      ],
      exclude: ["**/*.test.ts", "**/test/**", "**/scripts/**", "**/frontend-tests/**"],
    },
  },
});
