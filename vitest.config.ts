import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "prisma/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/nutrition/**/*.ts"],
      exclude: ["**/*.test.ts"],
      thresholds: { lines: 90 },
    },
  },
});
