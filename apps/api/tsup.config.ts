import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // Postgres driver, Drizzle (subpath ESM imports incl. the migrator), and the
  // MCP SDK (many subpath ESM imports) — keep external and resolve at runtime.
  external: ["pg", /^drizzle-orm/, /^@modelcontextprotocol\/sdk/],
  // Bundle workspace deps (@spec/core) and pure-JS deps into the output.
  noExternal: ["@spec/core"],
  banner: {
    js: "import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);",
  },
});
