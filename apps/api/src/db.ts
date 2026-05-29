import crypto from "node:crypto";
import fs from "node:fs";
import pg from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { and, eq, lt } from "drizzle-orm";
import type { Role, TokenInfo } from "@hls/core";
import { config } from "./config.js";
import * as schema from "./schema.js";

export interface Principal {
  id: string;
  name: string;
  role: Role;
  allowedBranchPrefixes: string[];
}

let pool: pg.Pool;
let db: NodePgDatabase<typeof schema>;

/** Connect to Postgres and run pending migrations. */
export async function initDb(): Promise<void> {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required (Postgres connection string).");
  }
  pool = new pg.Pool({ connectionString: config.databaseUrl });
  db = drizzle(pool, { schema });
  if (fs.existsSync(config.migrationsDir)) {
    await migrate(db, { migrationsFolder: config.migrationsDir });
  } else {
    console.warn(`Migrations folder not found at ${config.migrationsDir}; skipping migrate().`);
  }
}

export async function closeDb(): Promise<void> {
  await pool?.end();
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

interface TokenRow {
  id: string;
  name: string;
  role: string;
  allowedBranchPrefixes: string;
  tokenHash: string;
  createdAt: string;
  lastUsedAt: string | null;
}

function rowToInfo(row: TokenRow): TokenInfo {
  return {
    id: row.id,
    name: row.name,
    role: row.role as Role,
    allowed_branch_prefixes: JSON.parse(row.allowedBranchPrefixes),
    created_at: row.createdAt,
    last_used_at: row.lastUsedAt,
  };
}

export interface CreatedToken {
  token: string;
  info: TokenInfo;
}

export async function createToken(name: string, role: Role, prefixes: string[]): Promise<CreatedToken> {
  const id = crypto.randomBytes(8).toString("hex");
  const token = `hls_${crypto.randomBytes(24).toString("hex")}`;
  const created_at = new Date().toISOString();
  await db.insert(schema.tokens).values({
    id,
    name,
    role,
    allowedBranchPrefixes: JSON.stringify(prefixes),
    tokenHash: hashToken(token),
    createdAt: created_at,
    lastUsedAt: null,
  });
  return {
    token,
    info: { id, name, role, allowed_branch_prefixes: prefixes, created_at, last_used_at: null },
  };
}

export async function listTokens(): Promise<TokenInfo[]> {
  const rows = await db.select().from(schema.tokens).orderBy(schema.tokens.createdAt);
  return rows.map(rowToInfo);
}

export async function deleteToken(id: string): Promise<boolean> {
  const res = await db.delete(schema.tokens).where(eq(schema.tokens.id, id)).returning({ id: schema.tokens.id });
  return res.length > 0;
}

export async function countByRole(role: Role): Promise<number> {
  const rows = await db.select({ id: schema.tokens.id }).from(schema.tokens).where(eq(schema.tokens.role, role));
  return rows.length;
}

export async function resolveToken(token: string): Promise<Principal | null> {
  const rows = await db.select().from(schema.tokens).where(eq(schema.tokens.tokenHash, hashToken(token)));
  const row = rows[0];
  if (!row) return null;
  await db
    .update(schema.tokens)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(schema.tokens.id, row.id));
  return {
    id: row.id,
    name: row.name,
    role: row.role as Role,
    allowedBranchPrefixes: JSON.parse(row.allowedBranchPrefixes),
  };
}

// ---- Sessions (admin login/password) ----

export interface CreatedSession {
  token: string;
  expiresAt: string;
}

export async function createSession(username: string, role: Role, ttlHours: number): Promise<CreatedSession> {
  const token = `hls_sess_${crypto.randomBytes(24).toString("hex")}`;
  const now = Date.now();
  const expiresAt = new Date(now + ttlHours * 3600 * 1000).toISOString();
  await db.insert(schema.sessions).values({
    tokenHash: hashToken(token),
    username,
    role,
    createdAt: new Date(now).toISOString(),
    expiresAt,
  });
  return { token, expiresAt };
}

export async function resolveSession(token: string): Promise<Principal | null> {
  const h = hashToken(token);
  const rows = await db.select().from(schema.sessions).where(eq(schema.sessions.tokenHash, h));
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, h));
    return null;
  }
  return { id: "session", name: row.username, role: row.role as Role, allowedBranchPrefixes: [] };
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashToken(token)));
}

export async function pruneExpiredSessions(): Promise<void> {
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date().toISOString()));
}

// ---- OAuth 2.1 (MCP connector authorization) ----

export interface OAuthClient {
  client_id: string;
  client_secret: string | null;
  redirect_uris: string[];
  client_name: string | null;
}

export async function registerOAuthClient(
  redirectUris: string[],
  clientName: string | null,
  confidential: boolean,
): Promise<OAuthClient> {
  const client_id = `hlc_${crypto.randomBytes(16).toString("hex")}`;
  const client_secret = confidential ? `hcs_${crypto.randomBytes(24).toString("hex")}` : null;
  await db.insert(schema.oauthClients).values({
    clientId: client_id,
    clientSecret: client_secret,
    redirectUris: JSON.stringify(redirectUris),
    clientName,
    createdAt: new Date().toISOString(),
  });
  return { client_id, client_secret, redirect_uris: redirectUris, client_name: clientName };
}

export async function getOAuthClient(clientId: string): Promise<OAuthClient | null> {
  const rows = await db.select().from(schema.oauthClients).where(eq(schema.oauthClients.clientId, clientId));
  const row = rows[0];
  if (!row) return null;
  return {
    client_id: row.clientId,
    client_secret: row.clientSecret,
    redirect_uris: JSON.parse(row.redirectUris),
    client_name: row.clientName,
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

export async function createAuthCode(data: AuthCodeData, ttlSec = 600): Promise<string> {
  const code = `hac_${crypto.randomBytes(32).toString("hex")}`;
  const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
  await db.insert(schema.oauthCodes).values({
    codeHash: hashToken(code),
    clientId: data.clientId,
    redirectUri: data.redirectUri,
    codeChallenge: data.codeChallenge,
    codeChallengeMethod: data.codeChallengeMethod,
    scope: data.scope,
    username: data.username,
    role: data.role,
    resource: data.resource,
    expiresAt,
  });
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
export async function consumeAuthCode(code: string): Promise<ConsumedAuthCode | null> {
  const rows = await db
    .delete(schema.oauthCodes)
    .where(eq(schema.oauthCodes.codeHash, hashToken(code)))
    .returning();
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) return null;
  return {
    clientId: row.clientId,
    redirectUri: row.redirectUri,
    codeChallenge: row.codeChallenge,
    codeChallengeMethod: row.codeChallengeMethod,
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

export async function issueOAuthTokens(
  grant: OAuthGrant,
  accessTtlSec: number,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const accessToken = `hat_${crypto.randomBytes(32).toString("hex")}`;
  const refreshToken = `hrt_${crypto.randomBytes(32).toString("hex")}`;
  const now = Date.now();
  const createdAt = new Date(now).toISOString();
  await db.insert(schema.oauthTokens).values([
    {
      tokenHash: hashToken(accessToken),
      kind: "access",
      clientId: grant.clientId,
      username: grant.username,
      role: grant.role,
      scope: grant.scope,
      createdAt,
      expiresAt: new Date(now + accessTtlSec * 1000).toISOString(),
    },
    {
      tokenHash: hashToken(refreshToken),
      kind: "refresh",
      clientId: grant.clientId,
      username: grant.username,
      role: grant.role,
      scope: grant.scope,
      createdAt,
      expiresAt: null,
    },
  ]);
  return { accessToken, refreshToken, expiresIn: accessTtlSec };
}

export async function getRefreshGrant(refreshToken: string): Promise<OAuthGrant | null> {
  const rows = await db
    .select()
    .from(schema.oauthTokens)
    .where(and(eq(schema.oauthTokens.tokenHash, hashToken(refreshToken)), eq(schema.oauthTokens.kind, "refresh")));
  const row = rows[0];
  if (!row) return null;
  return { clientId: row.clientId, username: row.username, role: row.role as Role, scope: row.scope };
}

export async function resolveOAuthToken(token: string): Promise<Principal | null> {
  const h = hashToken(token);
  const rows = await db
    .select()
    .from(schema.oauthTokens)
    .where(and(eq(schema.oauthTokens.tokenHash, h), eq(schema.oauthTokens.kind, "access")));
  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
    await db.delete(schema.oauthTokens).where(eq(schema.oauthTokens.tokenHash, h));
    return null;
  }
  return { id: "oauth", name: row.username, role: row.role as Role, allowedBranchPrefixes: [] };
}

export async function pruneExpiredOAuth(): Promise<void> {
  const now = new Date().toISOString();
  await db.delete(schema.oauthCodes).where(lt(schema.oauthCodes.expiresAt, now));
  await db
    .delete(schema.oauthTokens)
    .where(and(eq(schema.oauthTokens.kind, "access"), lt(schema.oauthTokens.expiresAt, now)));
}

/** Create an admin token on first boot if none exists. Returns the plaintext if created. */
export async function ensureBootstrapAdmin(): Promise<string | null> {
  if ((await countByRole("admin")) > 0) {
    return null;
  }
  let plaintext: string;
  if (config.adminTokenEnv) {
    const id = crypto.randomBytes(8).toString("hex");
    await db.insert(schema.tokens).values({
      id,
      name: "bootstrap-admin",
      role: "admin",
      allowedBranchPrefixes: "[]",
      tokenHash: hashToken(config.adminTokenEnv),
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    });
    plaintext = config.adminTokenEnv;
  } else {
    plaintext = (await createToken("bootstrap-admin", "admin", [])).token;
  }
  try {
    fs.writeFileSync(config.adminTokenFile, plaintext + "\n", "utf8");
  } catch {
    /* best effort */
  }
  return plaintext;
}
