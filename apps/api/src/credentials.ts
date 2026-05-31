import crypto from "node:crypto";
import fs from "node:fs";
import { config } from "./config.js";

let adminUsername = "admin";
let adminPassword = "";

/**
 * Resolve the admin login credentials at boot.
 * - Username comes from ADMIN_USERNAME (default "admin").
 * - Password comes from ADMIN_PASSWORD if set; otherwise a random one is
 *   generated once and persisted to the data dir (so it is stable across
 *   restarts) and returned so it can be logged.
 *
 * Returns the generated password the first time it is created, else null.
 */
export function initCredentials(): { generated: string | null } {
  adminUsername = config.adminUsername || "admin";

  if (config.adminPassword) {
    adminPassword = config.adminPassword;
    return { generated: null };
  }

  if (fs.existsSync(config.adminPasswordFile)) {
    adminPassword = fs.readFileSync(config.adminPasswordFile, "utf8").trim();
    return { generated: null };
  }

  const generated = `hls-${crypto.randomBytes(9).toString("base64url")}`;
  adminPassword = generated;
  try {
    fs.writeFileSync(config.adminPasswordFile, generated + "\n", "utf8");
  } catch {
    /* best effort */
  }
  return { generated };
}

export function getAdminUsername(): string {
  return adminUsername;
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still compare to keep timing roughly constant, but result is false.
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

export function verifyCredentials(username: string, password: string): boolean {
  if (!adminPassword) return false;
  return constantTimeEqual(username, adminUsername) && constantTimeEqual(password, adminPassword);
}
