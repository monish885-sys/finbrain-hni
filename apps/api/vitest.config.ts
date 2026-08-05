import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    fileParallelism: false,
    env: {
      DESK_SCHEDULER_ENABLED: "false",
      VITEST: "true",
    },
  },
});
