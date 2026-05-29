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
