import { useEffect, useState } from "react";
import { api } from "./api";

const DEFAULT = "Specification Hub";
let brandPromise: Promise<string> | null = null;

/** Load the configured brand once (per deployment, from /api/meta), cached. */
function loadBrand(): Promise<string> {
  if (!brandPromise) {
    brandPromise = api
      .meta()
      .then((m) => m.brand || DEFAULT)
      .catch(() => DEFAULT);
  }
  return brandPromise;
}

export function useBrand(): string {
  const [brand, setBrand] = useState(DEFAULT);
  useEffect(() => {
    let alive = true;
    loadBrand().then((b) => {
      if (!alive) return;
      setBrand(b);
      document.title = b;
    });
    return () => {
      alive = false;
    };
  }, []);
  return brand;
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
