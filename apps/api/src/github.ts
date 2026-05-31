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

function repoPath(): string {
  return `/repos/${config.githubOwner}/${config.githubName}`;
}

export async function getDefaultBranch(): Promise<string> {
  const repo = await gh<{ default_branch: string }>(repoPath());
  return repo.default_branch;
}

export async function findOpenPullRequest(
  head: string,
  base: string,
): Promise<PullRequest | null> {
  const q = `?head=${encodeURIComponent(`${config.githubOwner}:${head}`)}&base=${encodeURIComponent(base)}&state=open`;
  const prs = await gh<Array<{ number: number; html_url: string; state: string }>>(
    `${repoPath()}/pulls${q}`,
  );
  if (prs.length === 0) return null;
  return { number: prs[0].number, url: prs[0].html_url, state: prs[0].state };
}

export async function ensurePullRequest(
  head: string,
  base: string,
  title?: string,
  body?: string,
): Promise<PullRequest> {
  const existing = await findOpenPullRequest(head, base);
  if (existing) return existing;
  const created = await gh<{ number: number; html_url: string; state: string }>(
    `${repoPath()}/pulls`,
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
  prNumber: number,
  message: string,
  method: "merge" | "squash" | "rebase" = "merge",
): Promise<{ sha: string; merged: boolean }> {
  const res = await gh<{ sha: string; merged: boolean }>(
    `${repoPath()}/pulls/${prNumber}/merge`,
    {
      method: "PUT",
      body: JSON.stringify({ merge_method: method, commit_message: message }),
    },
  );
  return res;
}
