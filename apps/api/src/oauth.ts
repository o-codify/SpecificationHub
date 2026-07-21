import crypto from "node:crypto";
import express, { type Express, type Request, type Response } from "express";
import { config } from "./config.js";
import { verifyCredentials, getAdminUsername } from "./credentials.js";
import {
  registerOAuthClient,
  getOAuthClient,
  createAuthCode,
  consumeAuthCode,
  issueOAuthTokens,
  getRefreshGrant,
  type OAuthClient,
} from "./db.js";

/**
 * Public base URL (scheme + host) of THIS request's domain — always derived from
 * the request so OAuth/MCP discovery is correct per domain (one container serves
 * many). Honours X-Forwarded-Proto / X-Forwarded-Host behind a proxy.
 */
/** Host (no port) this request is really for, honouring X-Forwarded-Host. */
function publicHost(req: Request): string {
  const h = (req.headers["x-forwarded-host"] as string)?.split(",")[0]?.trim() || req.headers.host || "";
  return h;
}

const LOCAL_HOST_RE = /^(localhost|127\.\d+\.\d+\.\d+|\[?::1\]?)(:\d+)?$/i;

/**
 * Public scheme for absolute URLs (OAuth issuer/endpoints, MCP resource).
 *
 * We must NOT trust `req.protocol` or the forwarded-proto header: behind
 * Cloudflare/Traefik the origin leg is plain http (and Traefik has been seen to
 * forward X-Forwarded-Proto: http), so the app would advertise http:// URLs for
 * an https:// site and every MCP client rejects the mismatch. A real public
 * domain is served over https in practice, so we default it to https and only
 * treat genuine localhost/dev as http. PUBLIC_PROTO overrides either way.
 */
function publicProto(req: Request): string {
  if (config.publicProto === "http" || config.publicProto === "https") return config.publicProto;
  return LOCAL_HOST_RE.test(publicHost(req)) ? "http" : "https";
}

export function baseUrl(req: Request): string {
  const proto = publicProto(req);
  const host = publicHost(req) || req.headers.host;
  // Include the site's path prefix: for a base-URL binding (docs.example.com/hls)
  // the issuer, endpoints and MCP resource all live under it, so the advertised
  // URLs must too — otherwise a client would hit the host root and resolve the
  // wrong (or no) site. Bare-domain sites get "" and are unchanged.
  return `${proto}://${host}${req.siteBase ?? ""}`;
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** RFC 7636 PKCE check. Only S256 is accepted. */
function verifyPkce(verifier: string, challenge: string, method: string): boolean {
  if (method !== "S256") return false;
  const expected = base64url(crypto.createHash("sha256").update(verifier).digest());
  if (expected.length !== challenge.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(challenge));
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Server-rendered login/consent page for the authorization endpoint. */
function loginPage(
  params: Record<string, string>,
  error?: string,
  base = "",
  brand = config.brandName,
): string {
  const hidden = Object.entries(params)
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Authorize · ${esc(config.brandName)}</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#16140f;color:#efe9df;
    font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .card{width:340px;max-width:90vw;background:#211d16;border:1px solid #38322750;border-radius:14px;
    padding:26px 24px;box-shadow:0 18px 50px #0008}
  h1{font-size:18px;margin:0 0 4px}
  p{font-size:13px;color:#b7ad9c;margin:0 0 18px}
  label{display:block;font-size:12px;color:#b7ad9c;margin:12px 0 5px}
  input.f{width:100%;box-sizing:border-box;height:38px;padding:0 12px;border-radius:9px;
    border:1px solid #38322755;background:#16140f;color:#efe9df;font-size:14px}
  button{width:100%;height:40px;margin-top:20px;border:0;border-radius:9px;cursor:pointer;
    background:#c8a96a;color:#211d16;font-weight:600;font-size:14px}
  .err{background:#4a211c;color:#f0c0b6;font-size:12.5px;padding:9px 12px;border-radius:8px;margin-bottom:14px}
  .who{font-family:ui-monospace,monospace;color:#c8a96a}
</style></head>
<body><form class="card" method="post" action="${esc(base)}/oauth/authorize">
  <h1>Authorize access</h1>
  <p><span class="who">${esc(params.client_name || "An application")}</span> wants to access ${esc(brand)}.</p>
  ${error ? `<div class="err">${esc(error)}</div>` : ""}
  <label>Username</label>
  <input class="f" name="username" autocomplete="username" autofocus>
  <label>Password</label>
  <input class="f" name="password" type="password" autocomplete="current-password">
  ${hidden}
  <button type="submit">Sign in &amp; allow</button>
</form></body></html>`;
}

function redirectError(res: Response, redirectUri: string, state: string | undefined, error: string, desc?: string) {
  const u = new URL(redirectUri);
  u.searchParams.set("error", error);
  if (desc) u.searchParams.set("error_description", desc);
  if (state) u.searchParams.set("state", state);
  res.redirect(302, u.toString());
}

function clientAuthOk(client: OAuthClient, req: Request): boolean {
  if (!client.client_secret) return true; // public client (PKCE only)
  const body = req.body ?? {};
  let secret = typeof body.client_secret === "string" ? body.client_secret : "";
  const authz = req.headers.authorization;
  if (!secret && authz?.startsWith("Basic ")) {
    const decoded = Buffer.from(authz.slice(6), "base64").toString("utf8");
    secret = decoded.slice(decoded.indexOf(":") + 1);
  }
  return secret === client.client_secret;
}

/** Mount the OAuth 2.1 authorization server used by MCP connectors (e.g. ChatGPT). */
export function registerOAuth(app: Express): void {
  if (!config.mcpEnabled) return;
  const form = express.urlencoded({ extended: false });

  // ---- Discovery metadata (RFC 8414 / RFC 9728) ----
  const authServerMeta = (req: Request, res: Response) => {
    const b = baseUrl(req);
    res.json({
      issuer: b,
      authorization_endpoint: `${b}/oauth/authorize`,
      token_endpoint: `${b}/oauth/token`,
      registration_endpoint: `${b}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
      // ChatGPT inspects this during negotiation; we support DCR, not CIMD.
      client_id_metadata_document_supported: false,
      scopes_supported: ["mcp"],
    });
  };
  const protectedResourceMeta = (req: Request, res: Response) => {
    const b = baseUrl(req);
    res.json({
      resource: `${b}/mcp`,
      authorization_servers: [b],
      scopes_supported: ["mcp"],
      bearer_methods_supported: ["header"],
    });
  };
  // Root and path-suffixed variants (clients probe both).
  app.get("/.well-known/oauth-authorization-server", authServerMeta);
  app.get("/.well-known/oauth-authorization-server/mcp", authServerMeta);
  app.get("/.well-known/openid-configuration", authServerMeta);
  app.get("/.well-known/oauth-protected-resource", protectedResourceMeta);
  app.get("/.well-known/oauth-protected-resource/mcp", protectedResourceMeta);

  // ---- Dynamic Client Registration (RFC 7591) ----
  app.post("/oauth/register", async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const redirectUris: unknown = body.redirect_uris;
    if (!Array.isArray(redirectUris) || redirectUris.length === 0 || !redirectUris.every((u) => typeof u === "string")) {
      res.status(400).json({ error: "invalid_redirect_uri", error_description: "redirect_uris (array) is required" });
      return;
    }
    const authMethod = typeof body.token_endpoint_auth_method === "string" ? body.token_endpoint_auth_method : "none";
    const confidential = authMethod !== "none";
    const client = await registerOAuthClient(
      redirectUris as string[],
      typeof body.client_name === "string" ? body.client_name : null,
      confidential,
    );
    res.status(201).json({
      client_id: client.client_id,
      ...(client.client_secret ? { client_secret: client.client_secret } : {}),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: client.redirect_uris,
      token_endpoint_auth_method: confidential ? "client_secret_post" : "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      ...(client.client_name ? { client_name: client.client_name } : {}),
    });
  });

  // ---- Authorization endpoint ----
  app.get("/oauth/authorize", async (req: Request, res: Response) => {
    const q = req.query as Record<string, string>;
    const client = q.client_id ? await getOAuthClient(q.client_id) : null;
    if (!client) {
      res.status(400).type("text/plain").send("Unknown client_id");
      return;
    }
    if (!q.redirect_uri || !client.redirect_uris.includes(q.redirect_uri)) {
      res.status(400).type("text/plain").send("Invalid redirect_uri");
      return;
    }
    if (q.response_type !== "code") {
      redirectError(res, q.redirect_uri, q.state, "unsupported_response_type");
      return;
    }
    if (!q.code_challenge || q.code_challenge_method !== "S256") {
      redirectError(res, q.redirect_uri, q.state, "invalid_request", "PKCE S256 is required");
      return;
    }
    res.type("html").send(
      loginPage({
        client_id: q.client_id,
        redirect_uri: q.redirect_uri,
        code_challenge: q.code_challenge,
        code_challenge_method: q.code_challenge_method,
        state: q.state ?? "",
        scope: q.scope ?? "",
        resource: q.resource ?? "",
        client_name: client.client_name ?? "",
      }, undefined, req.siteBase ?? "", req.site?.brandName || config.brandName),
    );
  });

  app.post("/oauth/authorize", form, async (req: Request, res: Response) => {
    const b = req.body ?? {};
    const client = b.client_id ? await getOAuthClient(b.client_id) : null;
    if (!client || !b.redirect_uri || !client.redirect_uris.includes(b.redirect_uri)) {
      res.status(400).type("text/plain").send("Invalid client or redirect_uri");
      return;
    }
    const params = {
      client_id: b.client_id,
      redirect_uri: b.redirect_uri,
      code_challenge: b.code_challenge,
      code_challenge_method: b.code_challenge_method,
      state: b.state ?? "",
      scope: b.scope ?? "",
      resource: b.resource ?? "",
      client_name: client.client_name ?? "",
    };
    if (!verifyCredentials(String(b.username ?? ""), String(b.password ?? ""))) {
      res
        .status(401)
        .type("html")
        .send(
          loginPage(
            params,
            "Invalid username or password.",
            req.siteBase ?? "",
            req.site?.brandName || config.brandName,
          ),
        );
      return;
    }
    const code = await createAuthCode({
      clientId: client.client_id,
      redirectUri: b.redirect_uri,
      codeChallenge: b.code_challenge,
      codeChallengeMethod: b.code_challenge_method,
      scope: b.scope || null,
      username: getAdminUsername(),
      role: "admin",
      resource: b.resource || null,
    });
    const u = new URL(b.redirect_uri);
    u.searchParams.set("code", code);
    if (b.state) u.searchParams.set("state", b.state);
    res.redirect(302, u.toString());
  });

  // ---- Token endpoint ----
  app.post("/oauth/token", form, async (req: Request, res: Response) => {
    const b = req.body ?? {};
    const grantType = b.grant_type;
    const tokenErr = (status: number, error: string, desc?: string) =>
      res.status(status).json({ error, ...(desc ? { error_description: desc } : {}) });

    if (grantType === "authorization_code") {
      const client = b.client_id ? await getOAuthClient(b.client_id) : null;
      if (!client) return tokenErr(401, "invalid_client");
      if (!clientAuthOk(client, req)) return tokenErr(401, "invalid_client");
      if (!b.code || !b.code_verifier) return tokenErr(400, "invalid_request", "code and code_verifier are required");
      const data = await consumeAuthCode(String(b.code));
      if (!data) return tokenErr(400, "invalid_grant", "code is invalid or expired");
      if (data.clientId !== client.client_id) return tokenErr(400, "invalid_grant", "client mismatch");
      if (data.redirectUri !== b.redirect_uri) return tokenErr(400, "invalid_grant", "redirect_uri mismatch");
      if (!verifyPkce(String(b.code_verifier), data.codeChallenge, data.codeChallengeMethod)) {
        return tokenErr(400, "invalid_grant", "PKCE verification failed");
      }
      const t = await issueOAuthTokens(
        { clientId: client.client_id, username: data.username, role: data.role, scope: data.scope },
        config.oauthTokenTtlSec,
      );
      return res.json({
        access_token: t.accessToken,
        token_type: "Bearer",
        expires_in: t.expiresIn,
        refresh_token: t.refreshToken,
        ...(data.scope ? { scope: data.scope } : {}),
      });
    }

    if (grantType === "refresh_token") {
      if (!b.refresh_token) return tokenErr(400, "invalid_request", "refresh_token is required");
      const grant = await getRefreshGrant(String(b.refresh_token));
      if (!grant) return tokenErr(400, "invalid_grant", "refresh_token is invalid");
      const client = await getOAuthClient(grant.clientId);
      if (client && !clientAuthOk(client, req)) return tokenErr(401, "invalid_client");
      const t = await issueOAuthTokens(grant, config.oauthTokenTtlSec);
      return res.json({
        access_token: t.accessToken,
        token_type: "Bearer",
        expires_in: t.expiresIn,
        refresh_token: t.refreshToken,
        ...(grant.scope ? { scope: grant.scope } : {}),
      });
    }

    return tokenErr(400, "unsupported_grant_type");
  });
}
