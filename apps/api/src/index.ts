import fs from "node:fs";
import path from "node:path";
import express from "express";
import { config } from "./config.js";
import { ensureRepo, repoFor } from "./git.js";
import { legacySite } from "./site.js";
import { initDb, pruneExpiredSessions, pruneExpiredOAuth } from "./db.js";
import { initCredentials, getAdminUsername } from "./credentials.js";
import { createRouter } from "./routes.js";
import { registerMcp } from "./mcp.js";
import { registerOAuth } from "./oauth.js";

async function bootstrap(): Promise<void> {
  fs.mkdirSync(config.dataDir, { recursive: true });
  // Ensure the legacy/single-tenant repo on the original on-disk paths. When no
  // domain bindings exist this is the active site; when they do it is the
  // env-fallback. Either way existing deployments keep their data untouched.
  const legacy = legacySite();
  ensureRepo(legacy);
  // Align the protected/default branch with the repo's actual HEAD (main vs master).
  config.defaultBranch = repoFor(legacy).currentDefaultBranch();
  if (config.githubEnabled) {
    console.log(
      `GitHub mode ON → ${config.githubRepo} (default branch: ${config.defaultBranch}). ` +
        `Commits push & open PRs; merges go through the PR API.`,
    );
  } else {
    console.log("GitHub mode OFF → local git repo is the source of truth (in-app merges).");
  }
  await initDb();
  await pruneExpiredSessions();
  await pruneExpiredOAuth();

  const { generated } = initCredentials();
  console.log("\n========================================================");
  console.log("  Admin login (use at /admin):");
  console.log(`  username: ${getAdminUsername()}`);
  if (generated) {
    console.log(`  password: ${generated}  (generated — set ADMIN_PASSWORD to override)`);
    console.log(`  (also written to ${config.adminPasswordFile})`);
  } else {
    console.log(`  password: (from ADMIN_PASSWORD or ${config.adminPasswordFile})`);
  }
  console.log("========================================================\n");
}

function createApp(): express.Express {
  const app = express();

  // CORS — ChatGPT (and other browser-based MCP clients) fetch the OAuth
  // discovery/registration endpoints and probe /mcp from the browser, so these
  // responses must be CORS-enabled. Without this the connector's auth popup
  // stays on about:blank because the cross-origin fetches are blocked.
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, mcp-session-id, mcp-protocol-version, last-event-id",
    );
    res.setHeader("Access-Control-Expose-Headers", "WWW-Authenticate, mcp-session-id");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

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
          "Specification Hub API is running. Frontend build not found.\n" +
            "Run the web dev server (npm run dev:web) or build it (npm run build:web).\n" +
            "API health: /api/health",
        );
    });
  }

  return app;
}

async function main(): Promise<void> {
  await bootstrap();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Specification Hub listening on http://localhost:${config.port}`);
    console.log(`  Docs:   http://localhost:${config.port}/docs`);
    console.log(`  Admin:  http://localhost:${config.port}/admin`);
    console.log(`  Health: http://localhost:${config.port}/api/health`);
    console.log(`  Data:   ${config.dataDir}`);
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
