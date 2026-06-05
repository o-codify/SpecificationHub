import { useEffect, useState } from "react";
import { api, type MetaResponse } from "./api";

const DEFAULT = "Specification Hub";
const FALLBACK: MetaResponse = {
  statuses: [],
  brand: DEFAULT,
  version: "",
  defaultBranch: "main",
  linked: true,
  private: false,
  github: null,
};
let metaPromise: Promise<MetaResponse> | null = null;

/** Load /api/meta once (per deployment), cached and shared by the hooks below. */
function loadMeta(): Promise<MetaResponse> {
  if (!metaPromise) metaPromise = api.meta().catch(() => FALLBACK);
  return metaPromise;
}

/** Force a re-fetch of /api/meta (e.g. after logging in to a private site). */
export function refreshMeta(): void {
  metaPromise = null;
}

/** The full site meta (linked / private / brand …); null until first load. */
export function useMeta(): MetaResponse | null {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  useEffect(() => {
    let alive = true;
    loadMeta().then((m) => alive && setMeta(m));
    return () => {
      alive = false;
    };
  }, []);
  return meta;
}

export function useBrand(): string {
  const [brand, setBrand] = useState(DEFAULT);
  useEffect(() => {
    let alive = true;
    loadMeta().then((m) => {
      if (!alive) return;
      const b = m.brand || DEFAULT;
      setBrand(b);
      document.title = b;
    });
    return () => {
      alive = false;
    };
  }, []);
  return brand;
}

/** The build/deploy version from /api/meta (empty until loaded). */
export function useBuildVersion(): string {
  const [version, setVersion] = useState("");
  useEffect(() => {
    let alive = true;
    loadMeta().then((m) => {
      if (alive) setVersion(m.version || "");
    });
    return () => {
      alive = false;
    };
  }, []);
  return version;
}

/**
 * Render the brand with the first word plain and the rest emphasised (matching
 * the original "Specification Hub" look); a single-word brand renders plain.
 */
export function Brand() {
  const brand = useBrand();
  const sp = brand.indexOf(" ");
  if (sp < 0) return <>{brand}</>;
  return (
    <>
      {brand.slice(0, sp)} <b>{brand.slice(sp + 1)}</b>
    </>
  );
}
