import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { Role, TokenInfo } from "@hls/core";
import { config } from "./config.js";

export interface Principal {
  id: string;
  name: string;
  role: Role;
  allowedBranchPrefixes: string[];
}

let db: Database.Database;

export function initDb(): void {
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  db = new Database(config.dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      allowed_branch_prefixes TEXT NOT NULL DEFAULT '[]',
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      last_used_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS oauth_clients (
      client_id TEXT PRIMARY KEY,
      client_secret TEXT,
      redirect_uris TEXT NOT NULL,
      client_name TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS oauth_codes (
      code_hash TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      code_challenge_method TEXT NOT NULL,
      scope TEXT,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      resource TEXT,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      token_hash TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      client_id TEXT NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      scope TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT
    );
  `);
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function rowToInfo(row: TokenRow): TokenInfo {
  return {
    id: row.id,
    name: row.name,
    role: row.role as Role,
    allowed_branch_prefixes: JSON.parse(row.allowed_branch_prefixes),
    created_at: row.created_at,
    last_used_at: row.last_used_at,
  };
}

interface TokenRow {
  id: string;
  name: string;
  role: string;
  allowed_branch_prefixes: string;
  token_hash: string;
  created_at: string;
  last_used_at: string | null;
}

export interface CreatedToken {
  token: string;
  info: TokenInfo;
}

export function createToken(name: string, role: Role, prefixes: string[]): CreatedToken {
  const id = crypto.randomBytes(8).toString("hex");
  const token = `hls_${crypto.randomBytes(24).toString("hex")}`;
  const created_at = new Date().toISOString();
  db.prepare(
    `INSERT INTO tokens (id, name, role, allowed_branch_prefixes, token_hash, created_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`,
  ).run(id, name, role, JSON.stringify(prefixes), hashToken(token), created_at);
  return {
    token,
    info: {
      id,
      name,
      role,
      allowed_branch_prefixes: prefixes,
      created_at,
      last_used_at: null,
    },
  };
}

export function listTokens(): TokenInfo[] {
  const rows = db.prepare(`SELECT * FROM tokens ORDER BY created_at`).all() as TokenRow[];
  return rows.map(rowToInfo);
}

export function deleteToken(id: string): boolean {
  const res = db.prepare(`DELETE FROM tokens WHERE id = ?`).run(id);
  return res.changes > 0;
}

export function countByRole(role: Role): number {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM tokens WHERE role = ?`).get(role) as {
    n: number;
  };
  return row.n;
}

export function resolveToken(token: string): Principal | null {
  const row = db
    .prepare(`SELECT * FROM tokens WHERE token_hash = ?`)
    .get(hashToken(token)) as TokenRow | undefined;
  if (!row) return null;
  db.prepare(`UPDATE tokens SET last_used_at = ? WHERE id = ?`).run(
    new Date().toISOString(),
    row.id,
  );
  return {
    id: row.id,
    name: row.name,
    role: row.role as Role,
    allowedBranchPrefixes: JSON.parse(row.allowed_branch_prefixes),
  };
}

// ---- Sessions (admin login/password) ----

export interface CreatedSession {
  token: string;
  expiresAt: string;
}

export function createSession(username: string, role: Role, ttlHours: number): CreatedSession {
  const token = `hls_sess_${crypto.randomBytes(24).toString("hex")}`;
  const now = Date.now();
  const expiresAt = new Date(now + ttlHours * 3600 * 1000).toISOString();
  db.prepare(
    `INSERT INTO sessions (token_hash, username, role, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(hashToken(token), username, role, new Date(now).toISOString(), expiresAt);
  return { token, expiresAt };
}

export function resolveSession(token: string): Principal | null {
  const row = db
    .prepare(`SELECT * FROM sessions WHERE token_hash = ?`)
    .get(hashToken(token)) as
    | { token_hash: string; username: string; role: string; expires_at: string }
    | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(row.token_hash);
    return null;
  }
  return {
    id: "session",
    name: row.username,
    role: row.role as Role,
    allowedBranchPrefixes: [],
  };
}

export function deleteSession(token: string): void {
  db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(hashToken(token));
}

export function pruneExpiredSessions(): void {
  db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(new Date().toISOString());
}

// ---- OAuth 2.1 (MCP connector authorization) ----

export interface OAuthClient {
  client_id: string;
  client_secret: string | null;
  redirect_uris: string[];
  client_name: string | null;
}

export function registerOAuthClient(
  redirectUris: string[],
  clientName: string | null,
  confidential: boolean,
): OAuthClient {
  const client_id = `hlc_${crypto.randomBytes(16).toString("hex")}`;
  const client_secret = confidential ? `hcs_${crypto.randomBytes(24).toString("hex")}` : null;
  db.prepare(
    `INSERT INTO oauth_clients (client_id, client_secret, redirect_uris, client_name, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(client_id, client_secret, JSON.stringify(redirectUris), clientName, new Date().toISOString());
  return { client_id, client_secret, redirect_uris: redirectUris, client_name: clientName };
}

export function getOAuthClient(clientId: string): OAuthClient | null {
  const row = db.prepare(`SELECT * FROM oauth_clients WHERE client_id = ?`).get(clientId) as
    | { client_id: string; client_secret: string | null; redirect_uris: string; client_name: string | null }
    | undefined;
  if (!row) return null;
  return {
    client_id: row.client_id,
    client_secret: row.client_secret,
    redirect_uris: JSON.parse(row.redirect_uris),
    client_name: row.client_name,
  };
}

export interface AuthCodeData {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string | null;
  username: string;
  role: Role;
  resource: string | null;
}

export function createAuthCode(data: AuthCodeData, ttlSec = 600): string {
  const code = `hac_${crypto.randomBytes(32).toString("hex")}`;
  const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
  db.prepare(
    `INSERT INTO oauth_codes
       (code_hash, client_id, redirect_uri, code_challenge, code_challenge_method, scope, username, role, resource, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    hashToken(code),
    data.clientId,
    data.redirectUri,
    data.codeChallenge,
    data.codeChallengeMethod,
    data.scope,
    data.username,
    data.role,
    data.resource,
    expiresAt,
  );
  return code;
}

export interface ConsumedAuthCode {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string | null;
  username: string;
  role: Role;
}

/** Atomically read-and-delete an authorization code. Returns null if missing/expired. */
export function consumeAuthCode(code: string): ConsumedAuthCode | null {
  const h = hashToken(code);
  const row = db.prepare(`SELECT * FROM oauth_codes WHERE code_hash = ?`).get(h) as
    | {
        client_id: string;
        redirect_uri: string;
        code_challenge: string;
        code_challenge_method: string;
        scope: string | null;
        username: string;
        role: string;
        expires_at: string;
      }
    | undefined;
  if (!row) return null;
  db.prepare(`DELETE FROM oauth_codes WHERE code_hash = ?`).run(h);
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return {
    clientId: row.client_id,
    redirectUri: row.redirect_uri,
    codeChallenge: row.code_challenge,
    codeChallengeMethod: row.code_challenge_method,
    scope: row.scope,
    username: row.username,
    role: row.role as Role,
  };
}

export interface OAuthGrant {
  clientId: string;
  username: string;
  role: Role;
  scope: string | null;
}

/** Issue an access token (+ refresh token) for a grant. */
export function issueOAuthTokens(
  grant: OAuthGrant,
  accessTtlSec: number,
): { accessToken: string; refreshToken: string; expiresIn: number } {
  const accessToken = `hat_${crypto.randomBytes(32).toString("hex")}`;
  const refreshToken = `hrt_${crypto.randomBytes(32).toString("hex")}`;
  const now = Date.now();
  const accessExp = new Date(now + accessTtlSec * 1000).toISOString();
  const insert = db.prepare(
    `INSERT INTO oauth_tokens (token_hash, kind, client_id, username, role, scope, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const createdAt = new Date(now).toISOString();
  insert.run(hashToken(accessToken), "access", grant.clientId, grant.username, grant.role, grant.scope, createdAt, accessExp);
  insert.run(hashToken(refreshToken), "refresh", grant.clientId, grant.username, grant.role, grant.scope, createdAt, null);
  return { accessToken, refreshToken, expiresIn: accessTtlSec };
}

/** Validate a refresh token and return its grant (does not revoke it). */
export function getRefreshGrant(refreshToken: string): OAuthGrant | null {
  const row = db
    .prepare(`SELECT * FROM oauth_tokens WHERE token_hash = ? AND kind = 'refresh'`)
    .get(hashToken(refreshToken)) as
    | { client_id: string; username: string; role: string; scope: string | null }
    | undefined;
  if (!row) return null;
  return { clientId: row.client_id, username: row.username, role: row.role as Role, scope: row.scope };
}

export function resolveOAuthToken(token: string): Principal | null {
  const row = db
    .prepare(`SELECT * FROM oauth_tokens WHERE token_hash = ? AND kind = 'access'`)
    .get(hashToken(token)) as
    | { client_id: string; username: string; role: string; expires_at: string | null }
    | undefined;
  if (!row) return null;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare(`DELETE FROM oauth_tokens WHERE token_hash = ?`).run(hashToken(token));
    return null;
  }
  return {
    id: "oauth",
    name: row.username,
    role: row.role as Role,
    allowedBranchPrefixes: [],
  };
}

export function pruneExpiredOAuth(): void {
  const now = new Date().toISOString();
  db.prepare(`DELETE FROM oauth_codes WHERE expires_at < ?`).run(now);
  db.prepare(`DELETE FROM oauth_tokens WHERE kind = 'access' AND expires_at IS NOT NULL AND expires_at < ?`).run(now);
}

/** Create an admin token on first boot if none exists. Returns the plaintext if created. */
export function ensureBootstrapAdmin(): string | null {
  if (countByRole("admin") > 0) {
    return null;
  }
  let plaintext: string;
  if (config.adminTokenEnv) {
    const id = crypto.randomBytes(8).toString("hex");
    db.prepare(
      `INSERT INTO tokens (id, name, role, allowed_branch_prefixes, token_hash, created_at, last_used_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    ).run(
      id,
      "bootstrap-admin",
      "admin",
      "[]",
      hashToken(config.adminTokenEnv),
      new Date().toISOString(),
    );
    plaintext = config.adminTokenEnv;
  } else {
    plaintext = createToken("bootstrap-admin", "admin", []).token;
  }
  try {
    fs.writeFileSync(config.adminTokenFile, plaintext + "\n", "utf8");
  } catch {
    /* best effort */
  }
  return plaintext;
}
