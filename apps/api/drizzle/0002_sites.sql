CREATE TABLE IF NOT EXISTS "sites" (
	"id" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"github_repo" text DEFAULT '' NOT NULL,
	"brand_name" text,
	"default_branch" text,
	"visibility" text DEFAULT 'public' NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "sites_domain_unique" UNIQUE("domain")
);
