// Run the document linter over a whole branch: gather every doc, build a
// file-existence index (branch + base, since assets live on the base branch and
// are inherited), and delegate to the pure linter in @spec/core.

import { lintDocs, type LintFinding, type LintFilter } from "@spec/core";
import type { SiteRepo } from "./git.js";

export function runLint(
  repo: SiteRepo,
  branch: string,
  base: string,
  filter: LintFilter = {},
): LintFinding[] {
  const docs = repo
    .listMarkdownFiles(branch)
    .map((path) => ({ path, raw: repo.readFile(branch, path) }));

  const files = new Set<string>(repo.listFiles(branch));
  if (base !== branch) {
    try {
      for (const f of repo.listFiles(base)) files.add(f);
    } catch {
      /* base branch may not exist — branch files alone are fine */
    }
  }

  return lintDocs(docs, { fileExists: (p) => files.has(p) }, filter);
}
