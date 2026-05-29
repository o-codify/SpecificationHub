import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // Native module — keep external and resolve from node_modules at runtime.
  external: ["better-sqlite3"],
  // Bundle workspace deps (@hls/core) and pure-JS deps into the output.
  noExternal: ["@hls/core"],
  banner: {
    js: "import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);",
  },
});
