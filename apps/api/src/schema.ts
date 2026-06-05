import { pgTable, text } from "drizzle-orm/pg-core";

// Timestamps are stored as ISO-8601 strings (text) to match the rest of the
// app, which already formats/compares dates as ISO strings.

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  username: text("username").notNull(),
  role: text("role").notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});

export const oauthClients = pgTable("oauth_clients", {
  clientId: text("client_id").primaryKey(),
  clientSecret: text("client_secret"),
  redirectUris: text("redirect_uris").notNull(),
  clientName: text("client_name"),
  createdAt: text("created_at").notNull(),
});

export const oauthCodes = pgTable("oauth_codes", {
  codeHash: text("code_hash").primaryKey(),
  clientId: text("client_id").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  codeChallenge: text("code_challenge").notNull(),
  codeChallengeMethod: text("code_challenge_method").notNull(),
  scope: text("scope"),
  username: text("username").notNull(),
  role: text("role").notNull(),
  resource: text("resource"),
  expiresAt: text("expires_at").notNull(),
});

// Domain → repository bindings. One container can serve many domains; the host
// of each request selects the site (and thus the repo + brand + visibility).
// When this table is EMPTY the app runs in legacy single-tenant mode (every host
// → the env/local repo), so existing deployments keep working without any rows.
export const sites = pgTable("sites", {
  id: text("id").primaryKey(), // stable slug, e.g. "owner__name"
  domain: text("domain").notNull().unique(), // lower-cased host to match
  githubRepo: text("github_repo").notNull().default(""), // "owner/name" ("" = local-only)
  brandName: text("brand_name"),
  defaultBranch: text("default_branch"), // cached repo HEAD (main/master)
  visibility: text("visibility").notNull().default("public"), // 'public' | 'private'
  createdAt: text("created_at").notNull(),
});

export const oauthTokens = pgTable("oauth_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  kind: text("kind").notNull(),
  clientId: text("client_id").notNull(),
  username: text("username").notNull(),
  role: text("role").notNull(),
  scope: text("scope"),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at"),
});
