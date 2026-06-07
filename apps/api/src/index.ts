import fs from "node:fs";
import path from "node:path";
import express from "express";
import { config } from "./config.js";
import { siteMeta, hostFromRequest } from "./site.js";
import { initDb, pruneExpiredSessions, pruneExpiredOAuth } from "./db.js";
import { initCredentials, getAdminUsername } from "./credentials.js";
import { createRouter } from "./routes.js";
import { registerMcp } from "./mcp.js";
import { registerOAuth } from "./oauth.js";

async function bootstrap(): Promise<void> {
  fs.mkdirSync(config.dataDir, { recursive: true });
  // No global repo: each domain's repository is configured per site (Settings)
  // and cloned lazily on first use. Until a domain is bound, the UI shows a
  // "configure this domain" notice.
  console.log(
    config.githubToken
      ? "GitHub token present → sites with a repository push to GitHub on accept."
      : "No GITHUB_TOKEN → sites are local-only. Configure domain→repo bindings in Settings.",
  );
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

  // Serve the built frontend, with SPA fallback. The HTML is served per-domain:
  // we inject the site's brand into <title> and a window.__SITE_META__ blob so the
  // FIRST response already renders the right brand (no flash of the default).
  if (fs.existsSync(config.webDist)) {
    const indexPath = path.join(config.webDist, "index.html");
    // `index:false` so "/" falls through to our injecting handler, not raw index.html.
    app.use(express.static(config.webDist, { index: false }));
    app.get("*", async (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      let template: string;
      try {
        template = fs.readFileSync(indexPath, "utf8");
      } catch {
        return next();
      }
      let meta: Awaited<ReturnType<typeof siteMeta>> | null = null;
      try {
        meta = await siteMeta(hostFromRequest(req));
      } catch {
        /* fall back to the template's default brand */
      }
      const brand = meta?.brand || config.brandName;
      const titleEsc = brand.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const blob = JSON.stringify(meta ?? {}).replace(/</g, "\\u003c");
      const html = template
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${titleEsc}</title>`)
        .replace("</head>", `    <script>window.__SITE_META__=${blob}</script>\n  </head>`);
      res.type("html").send(html);
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
