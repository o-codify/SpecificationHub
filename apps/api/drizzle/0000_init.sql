CREATE TABLE IF NOT EXISTS "tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"allowed_branch_prefixes" text DEFAULT '[]' NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" text NOT NULL,
	"last_used_at" text,
	CONSTRAINT "tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"role" text NOT NULL,
	"created_at" text NOT NULL,
	"expires_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauth_clients" (
	"client_id" text PRIMARY KEY NOT NULL,
	"client_secret" text,
	"redirect_uris" text NOT NULL,
	"client_name" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauth_codes" (
	"code_hash" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"code_challenge" text NOT NULL,
	"code_challenge_method" text NOT NULL,
	"scope" text,
	"username" text NOT NULL,
	"role" text NOT NULL,
	"resource" text,
	"expires_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauth_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"client_id" text NOT NULL,
	"username" text NOT NULL,
	"role" text NOT NULL,
	"scope" text,
	"created_at" text NOT NULL,
	"expires_at" text
);
