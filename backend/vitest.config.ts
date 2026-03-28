import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    fs: {
      allow: [".."],
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "frontend-tests/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
    mockReset: true,
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
    coverage: {
      provider: "v8",
      reporter: ["lcov", "text"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts", "../app.js", "../gamification.js", "../question-bank.js", "../scoreboard.js"],
      exclude: ["**/*.test.ts", "**/test/**", "**/scripts/**", "**/frontend-tests/**"],
    },
  },
});
