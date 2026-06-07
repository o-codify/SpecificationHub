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
let usedInjected = false;

/** Server-injected meta (window.__SITE_META__) so the first paint has the right
 *  brand/link-state without a round-trip. Present only on the initial document. */
function injectedMeta(): MetaResponse | null {
  const m = (window as unknown as { __SITE_META__?: unknown }).__SITE_META__;
  return m && typeof m === "object" && "brand" in (m as object) ? (m as MetaResponse) : null;
}

/** Load meta once: prefer the server-injected blob on first load, else /api/meta. */
function loadMeta(): Promise<MetaResponse> {
  if (!metaPromise) {
    const inj = usedInjected ? null : injectedMeta();
    if (inj) {
      usedInjected = true;
      metaPromise = Promise.resolve(inj);
    } else {
      metaPromise = api.meta().catch(() => FALLBACK);
    }
  }
  return metaPromise;
}

/** Force a re-fetch of /api/meta (e.g. after binding a repo in Settings). */
export function refreshMeta(): void {
  metaPromise = null; // next loadMeta() goes to /api/meta (injected already consumed)
}

/** The full site meta (linked / private / brand …); seeded from the injected blob. */
export function useMeta(): MetaResponse | null {
  const [meta, setMeta] = useState<MetaResponse | null>(() => injectedMeta());
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
  const [brand, setBrand] = useState(() => injectedMeta()?.brand || DEFAULT);
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
