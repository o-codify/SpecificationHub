import crypto from "node:crypto";
import fs from "node:fs";
import pg from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { and, eq, lt, sql } from "drizzle-orm";
import type { Role } from "@spec/core";
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
  await ensureSessionsTable();
}

/**
 * Self-heal the `sessions` table. An older deployment may have created it with a
 * different shape; migrate() uses CREATE TABLE IF NOT EXISTS and won't fix an
 * existing-but-wrong table, so logins (an INSERT into sessions) fail with a 500
 * while everything else works. Sessions are disposable, so if the expected
 * columns are missing we recreate the table (everyone just re-logs in).
 */
async function ensureSessionsTable(): Promise<void> {
  try {
    const res = await db.execute(
      sql`select column_name, data_type from information_schema.columns where table_name = 'sessions' and table_schema = current_schema()`,
    );
    const cols = new Map(
      (res.rows as { column_name: string; data_type: string }[]).map((r) => [r.column_name, r.data_type]),
    );
    // Recreate unless the table has EXACTLY these columns, all `text`. This
    // catches a missing column, an extra (possibly NOT NULL) leftover column,
    // and a wrong type/length (e.g. token_hash as a short varchar) — any of
    // which makes the INSERT fail.
    const expected = ["token_hash", "username", "role", "created_at", "expires_at"];
    const matches =
      cols.size === expected.length && expected.every((c) => cols.get(c) === "text");
    if (matches) return;
    await db.execute(sql`DROP TABLE IF EXISTS sessions`);
    await db.execute(sql`CREATE TABLE sessions (
      token_hash text PRIMARY KEY,
      username text NOT NULL,
      role text NOT NULL,
      created_at text NOT NULL,
      expires_at text NOT NULL
    )`);
    console.warn("Recreated the 'sessions' table to match the current schema.");
  } catch (e) {
    console.warn("ensureSessionsTable check failed:", (e as Error).message);
  }
}

export async function closeDb(): Promise<void> {
  await pool?.end();
}

// ---- Sites (domain → repository bindings) ----

export interface SiteRow {
  id: string;
  domain: string;
  githubRepo: string;
  brandName: string | null;
  defaultBranch: string | null;
  visibility: string; // 'public' | 'private'
  createdAt: string;
}

function toSiteRow(r: typeof schema.sites.$inferSelect): SiteRow {
  return {
    id: r.id,
    domain: r.domain,
    githubRepo: r.githubRepo,
    brandName: r.brandName,
    defaultBranch: r.defaultBranch,
    visibility: r.visibility,
    createdAt: r.createdAt,
  };
}

export async function listSites(): Promise<SiteRow[]> {
  const rows = await db.select().from(schema.sites);
  return rows.map(toSiteRow).sort((a, b) => a.domain.localeCompare(b.domain));
}

export async function countSites(): Promise<number> {
  const rows = await db.select({ id: schema.sites.id }).from(schema.sites);
  return rows.length;
}

export async function getSiteByDomain(domain: string): Promise<SiteRow | null> {
  const rows = await db
    .select()
    .from(schema.sites)
    .where(eq(schema.sites.domain, domain.toLowerCase()));
  return rows[0] ? toSiteRow(rows[0]) : null;
}

export async function getSiteById(id: string): Promise<SiteRow | null> {
  const rows = await db.select().from(schema.sites).where(eq(schema.sites.id, id));
  return rows[0] ? toSiteRow(rows[0]) : null;
}

export interface SiteInput {
  domain: string;
  githubRepo: string;
  brandName: string | null;
  visibility: string;
}

export async function createSite(input: SiteInput): Promise<SiteRow> {
  const domain = input.domain.trim().toLowerCase();
  const id = domain; // domain is unique and stable — use it as the row id
  const row = {
    id,
    domain,
    githubRepo: input.githubRepo.trim(),
    brandName: input.brandName?.trim() || null,
    defaultBranch: null,
    visibility: input.visibility === "private" ? "private" : "public",
    createdAt: new Date().toISOString(),
  };
  await db.insert(schema.sites).values(row);
  return toSiteRow(row);
}

export async function updateSite(id: string, input: SiteInput): Promise<SiteRow | null> {
  const domain = input.domain.trim().toLowerCase();
  const rows = await db
    .update(schema.sites)
    .set({
      domain,
      githubRepo: input.githubRepo.trim(),
      brandName: input.brandName?.trim() || null,
      visibility: input.visibility === "private" ? "private" : "public",
      // Repo may have changed → drop the cached default branch; it re-resolves lazily.
      defaultBranch: null,
    })
    .where(eq(schema.sites.id, id))
    .returning();
  return rows[0] ? toSiteRow(rows[0]) : null;
}

export async function deleteSite(id: string): Promise<void> {
  await db.delete(schema.sites).where(eq(schema.sites.id, id));
}

export async function setSiteDefaultBranch(id: string, branch: string): Promise<void> {
  await db.update(schema.sites).set({ defaultBranch: branch }).where(eq(schema.sites.id, id));
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ---- Sessions (admin login/password) ----

export interface CreatedSession {
  token: string;
  expiresAt: string;
}

export async function createSession(username: string, role: Role, ttlHours: number): Promise<CreatedSession> {
  const token = `sess_${crypto.randomBytes(24).toString("hex")}`;
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
