import type { CSSProperties } from "react";
import { statusColor } from "../status";

export function StatusBadge({ status }: { status: string }) {
  if (!status) return null;
  return (
    <span className="badge-draft" style={{ "--c": statusColor(status) } as CSSProperties}>
      {status.toUpperCase()}
    </span>
  );
}
