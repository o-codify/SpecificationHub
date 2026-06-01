export const STATUS_COLORS: Record<string, string> = {
  request: "var(--s-request)",
  draft: "var(--s-draft)",
  review: "var(--s-review)",
  stable: "var(--s-stable)",
  deprecated: "var(--s-deprecated)",
  experimental: "var(--s-experimental)",
};

export function statusColor(status: string): string {
  return STATUS_COLORS[status] || "var(--s-draft)";
}

/** Per-section pastel accent that tints nav/headings/cards. */
export const VIEW_ACCENT: Record<string, string> = {
  docs: "var(--p3)",
  documents: "var(--p3)",
  editor: "var(--p1)",
  diff: "var(--p5)",
  branches: "var(--p2)",
  tokens: "var(--p6)",
  login: "var(--p1)",
};

/**
 * Mirror the mockup's body-class + --acc system. CSS gates nav/user-tag/logout
 * behind `body.v-admin`, so this must run on every view.
 */
export function setViewAccent(view: string): void {
  document.body.style.setProperty("--acc", VIEW_ACCENT[view] || "var(--accent)");
  const kind = view === "docs" ? "v-site" : view === "login" ? "v-login" : "v-admin";
  document.body.classList.remove("v-site", "v-admin", "v-login");
  document.body.classList.add(kind);
}
