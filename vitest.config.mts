import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": import.meta.dirname,
      // Next's "server-only" marker throws outside the react-server condition; it's a no-op in tests.
      "server-only": `${import.meta.dirname}/test/server-only-stub.ts`,
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
  },
});
