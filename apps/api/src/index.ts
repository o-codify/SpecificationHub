import fs from "node:fs";
import path from "node:path";
import express from "express";
import { config } from "./config.js";
import { ensureRepo, currentDefaultBranch } from "./git.js";
import { ensureBootstrapAdmin, initDb, pruneExpiredSessions, pruneExpiredOAuth } from "./db.js";
import { initCredentials, getAdminUsername } from "./credentials.js";
import { createRouter } from "./routes.js";
import { registerMcp } from "./mcp.js";
import { registerOAuth } from "./oauth.js";

function bootstrap(): void {
  fs.mkdirSync(config.dataDir, { recursive: true });
  ensureRepo();
  // Align the protected/default branch with the repo's actual HEAD (main vs master).
  config.defaultBranch = currentDefaultBranch();
  if (config.githubEnabled) {
    console.log(
      `GitHub mode ON → ${config.githubRepo} (default branch: ${config.defaultBranch}). ` +
        `Commits push & open PRs; merges go through the PR API.`,
    );
  } else {
    console.log("GitHub mode OFF → local git repo is the source of truth (in-app merges).");
  }
  initDb();
  pruneExpiredSessions();
  pruneExpiredOAuth();

  const { generated } = initCredentials();
  console.log("\n========================================================");
  console.log("  Admin login (use at /admin):");
  console.log(`  username: ${getAdminUsername()}`);
  if (generated) {
    console.log(`  password: ${generated}  (generated — set HLS_ADMIN_PASSWORD to override)`);
    console.log(`  (also written to ${config.adminPasswordFile})`);
  } else {
    console.log(`  password: (from HLS_ADMIN_PASSWORD or ${config.adminPasswordFile})`);
  }
  console.log("========================================================\n");

  const adminToken = ensureBootstrapAdmin();
  if (adminToken) {
    console.log("  Bootstrap API admin TOKEN (programmatic/AI access, shown once):");
    console.log(`  ${adminToken}`);
    console.log(`  (also written to ${config.adminTokenFile})\n`);
  }
}

function createApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: "5mb" }));

  app.use("/api", createRouter());

  // OAuth 2.1 authorization server + MCP server (Streamable HTTP) for ChatGPT /
  // Apps SDK and other MCP clients. OAuth metadata/endpoints must be registered
  // before the SPA catch-all below.
  registerOAuth(app);
  registerMcp(app);

  // Serve the built frontend, with SPA fallback.
  if (fs.existsSync(config.webDist)) {
    app.use(express.static(config.webDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(config.webDist, "index.html"));
    });
  } else {
    app.get("/", (_req, res) => {
      res
        .status(200)
        .type("text/plain")
        .send(
          "HLS Hub API is running. Frontend build not found.\n" +
            "Run the web dev server (npm run dev:web) or build it (npm run build:web).\n" +
            "API health: /api/health",
        );
    });
  }

  return app;
}

function main(): void {
  bootstrap();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`HLS Hub listening on http://localhost:${config.port}`);
    console.log(`  Docs:   http://localhost:${config.port}/docs`);
    console.log(`  Admin:  http://localhost:${config.port}/admin`);
    console.log(`  Health: http://localhost:${config.port}/api/health`);
    console.log(`  Data:   ${config.dataDir}`);
  });
}

main();
