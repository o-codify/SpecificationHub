import { config } from "./config.js";

export interface PullRequest {
  number: number;
  url: string; // html_url
  state: string;
}

export class GitHubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

async function gh<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${config.githubApi}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "specification-hub",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new GitHubError(
      (data as { message?: string }).message || `GitHub API ${res.status}`,
      res.status,
    );
  }
  return data as T;
}

/** `repo` is "owner/name"; returns "/repos/owner/name". */
function repoPath(repo: string): string {
  return `/repos/${repo}`;
}

function repoOwner(repo: string): string {
  return repo.split("/")[0] ?? "";
}

export async function getDefaultBranch(repo: string): Promise<string> {
  const r = await gh<{ default_branch: string }>(repoPath(repo));
  return r.default_branch;
}

export async function findOpenPullRequest(
  repo: string,
  head: string,
  base: string,
): Promise<PullRequest | null> {
  const q = `?head=${encodeURIComponent(`${repoOwner(repo)}:${head}`)}&base=${encodeURIComponent(base)}&state=open`;
  const prs = await gh<Array<{ number: number; html_url: string; state: string }>>(
    `${repoPath(repo)}/pulls${q}`,
  );
  if (prs.length === 0) return null;
  return { number: prs[0].number, url: prs[0].html_url, state: prs[0].state };
}

export async function ensurePullRequest(
  repo: string,
  head: string,
  base: string,
  title?: string,
  body?: string,
): Promise<PullRequest> {
  const existing = await findOpenPullRequest(repo, head, base);
  if (existing) return existing;
  const created = await gh<{ number: number; html_url: string; state: string }>(
    `${repoPath(repo)}/pulls`,
    {
      method: "POST",
      body: JSON.stringify({
        title: title || `Update ${head}`,
        head,
        base,
        body: body || `Automated PR from Specification Hub for branch \`${head}\`.`,
      }),
    },
  );
  return { number: created.number, url: created.html_url, state: created.state };
}

export async function mergePullRequest(
  repo: string,
  prNumber: number,
  message: string,
  method: "merge" | "squash" | "rebase" = "merge",
): Promise<{ sha: string; merged: boolean }> {
  const res = await gh<{ sha: string; merged: boolean }>(
    `${repoPath(repo)}/pulls/${prNumber}/merge`,
    {
      method: "PUT",
      body: JSON.stringify({ merge_method: method, commit_message: message }),
    },
  );
  return res;
}
