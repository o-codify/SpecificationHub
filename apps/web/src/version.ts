import { stampVersion } from "@spec/core";

/**
 * Version is auto-stamped from the clock (`YY.M{DD}.H{MM}`, minute granularity)
 * and is authoritative on the server — clients/AI never set it. This is only an
 * optimistic value; the server re-stamps on every write. Kept as a thin wrapper
 * so existing call sites stay unchanged.
 */
export function nextVersion(_prev?: unknown): string {
  return stampVersion();
}
