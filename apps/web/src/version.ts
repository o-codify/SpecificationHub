const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Document version scheme: `YEAR.MDD.UPDATE` (e.g. 2026.529.3).
 * The date is set to today on every update; the update counter always grows.
 */
export function nextVersion(prev: unknown): string {
  const d = new Date();
  const parts = String(prev ?? "").split(".");
  const u = parts.length === 3 && /^\d+$/.test(parts[2]) ? Number(parts[2]) + 1 : 1;
  return `${d.getFullYear()}.${d.getMonth() + 1}${pad2(d.getDate())}.${u}`;
}
