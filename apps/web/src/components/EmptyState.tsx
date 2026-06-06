import type { ReactNode } from "react";

/**
 * A centered, considered placeholder for the document area — used for loading,
 * empty repositories, missing docs and "pick a doc" states (instead of a stray
 * line of muted text floating at the top-left).
 */
export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  loading,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="doc-empty">
      {loading ? <div className="spinner" aria-label="Loading" /> : icon ? <div className="doc-empty-ic">{icon}</div> : null}
      <h2>{title}</h2>
      {subtitle && <p className="muted">{subtitle}</p>}
      {action}
    </div>
  );
}
