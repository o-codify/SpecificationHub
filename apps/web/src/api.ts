import type {
  DiffResponse,
  Doc,
  FrontMatter,
  Role,
  SearchHit,
  TokenInfo,
  TreeResponse,
} from "@hls/core";

const TOKEN_KEY = "hls_token";

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setToken(token: string): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export interface ApiErrorBody {
  error: string;
  fields?: string[];
  detail?: string;
}

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;
  constructor(status: number, body: ApiErrorBody) {
    super(body.error || `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  auth = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && getToken()) headers["Authorization"] = `Bearer ${getToken()}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(res.status, data as ApiErrorBody);
  }
  return data as T;
}

export interface BranchesResponse {
  default: string;
  branches: { name: string; isDefault: boolean }[];
}

export interface MeResponse {
  authenticated: boolean;
  name?: string;
  role?: Role;
}

export interface PullRequestInfo {
  number: number;
  url: string;
  state: string;
}

export interface MetaResponse {
  statuses: string[];
  defaultBranch: string;
  github: { repo: string; url: string } | null;
}

export const api = {
  health: () => request<{ status: string }>("GET", "/api/health"),
  meta: () => request<MetaResponse>("GET", "/api/meta"),

  login: (username: string, password: string) =>
    request<{ token: string; expiresAt: string; user: { name: string; role: Role } }>(
      "POST",
      "/api/auth/login",
      { username, password },
    ),
  logout: () => request<{ ok: boolean }>("POST", "/api/auth/logout", {}, true),
  me: () => request<MeResponse>("GET", "/api/auth/me", undefined, true),

  branches: () => request<BranchesResponse>("GET", "/api/branches"),
  createBranch: (name: string, from: string) =>
    request<{ name: string }>("POST", "/api/branches", { name, from }, true),
  deleteBranch: (name: string) =>
    request<{ deleted: boolean }>(
      "DELETE",
      `/api/branches?name=${encodeURIComponent(name)}`,
      undefined,
      true,
    ),

  tree: (branch: string) =>
    request<TreeResponse>("GET", `/api/tree?branch=${encodeURIComponent(branch)}`),

  getDoc: (branch: string, path: string) =>
    request<Doc>(
      "GET",
      `/api/docs?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}`,
    ),
  putDoc: (branch: string, path: string, frontmatter: FrontMatter, content: string) =>
    request<{ staged: boolean }>("PUT", "/api/docs", { branch, path, frontmatter, content }, true),
  createDoc: (branch: string, path: string, frontmatter: FrontMatter, content: string) =>
    request<{ staged: boolean }>("POST", "/api/docs", { branch, path, frontmatter, content }, true),
  deleteDoc: (branch: string, path: string) =>
    request<{ deleted: boolean }>("DELETE", "/api/docs", { branch, path }, true),

  commit: (branch: string, message: string, author?: string) =>
    request<{ sha: string; branch: string; pullRequest: PullRequestInfo | null }>(
      "POST",
      "/api/commits",
      { branch, message, author },
      true,
    ),

  diff: (base: string, head: string) =>
    request<DiffResponse>(
      "GET",
      `/api/diff?base=${encodeURIComponent(base)}&head=${encodeURIComponent(head)}`,
    ),

  merge: (base: string, head: string, message: string) =>
    request<{ sha: string; merged?: boolean; pullRequest?: PullRequestInfo | null }>(
      "POST",
      "/api/merge",
      { base, head, message },
      true,
    ),

  search: (branch: string, q: string) =>
    request<{ hits: SearchHit[] }>(
      "GET",
      `/api/search?branch=${encodeURIComponent(branch)}&q=${encodeURIComponent(q)}`,
    ),

  tokens: () => request<{ tokens: TokenInfo[] }>("GET", "/api/tokens", undefined, true),
  createToken: (name: string, role: Role, allowed_branch_prefixes: string[]) =>
    request<{ token: string; info: TokenInfo }>(
      "POST",
      "/api/tokens",
      { name, role, allowed_branch_prefixes },
      true,
    ),
  deleteToken: (id: string) =>
    request<{ deleted: boolean }>("DELETE", `/api/tokens/${encodeURIComponent(id)}`, undefined, true),
};
