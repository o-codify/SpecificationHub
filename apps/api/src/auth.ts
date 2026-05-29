import type { NextFunction, Request, Response } from "express";
import type { Role } from "@hls/core";
import { resolveSession, resolveToken, type Principal } from "./db.js";
import { config } from "./config.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal | null;
    }
  }
}

/** Attach the resolved principal (or null for anonymous) to the request. */
export function attachPrincipal(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    // A login session (admin) or a programmatic API token.
    req.principal = resolveSession(token) ?? resolveToken(token);
  } else {
    req.principal = null;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.principal) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.principal) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!roles.includes(req.principal.role)) {
      res.status(403).json({ error: `Requires role: ${roles.join(" or ")}` });
      return;
    }
    next();
  };
}

/** Whether a principal may create/edit/commit on the given branch. */
export function canWriteBranch(principal: Principal, branch: string): { ok: boolean; reason?: string } {
  if (branch === config.defaultBranch) {
    return { ok: false, reason: `Direct writes to ${config.defaultBranch} are not allowed; use merge` };
  }
  switch (principal.role) {
    case "admin":
      return { ok: true };
    case "editor": {
      if (principal.allowedBranchPrefixes.length === 0) return { ok: true };
      return matchPrefix(principal, branch);
    }
    case "ai-agent": {
      const prefixes = principal.allowedBranchPrefixes.length
        ? principal.allowedBranchPrefixes
        : ["ai/"];
      if (!branch.startsWith("ai/")) {
        return { ok: false, reason: "ai-agent may only write to ai/* branches" };
      }
      if (!prefixes.some((p) => branch.startsWith(p))) {
        return { ok: false, reason: `Branch must match one of: ${prefixes.join(", ")}` };
      }
      return { ok: true };
    }
    default:
      return { ok: false, reason: `Role ${principal.role} cannot write` };
  }
}

function matchPrefix(principal: Principal, branch: string): { ok: boolean; reason?: string } {
  if (principal.allowedBranchPrefixes.some((p) => branch.startsWith(p))) {
    return { ok: true };
  }
  return {
    ok: false,
    reason: `Branch must match one of: ${principal.allowedBranchPrefixes.join(", ")}`,
  };
}
