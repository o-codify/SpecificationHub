import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

const DEFAULT_BRANCH = "main";

/** Read/update the `branch` query parameter, defaulting to main. */
export function useBranchParam(): [string, (b: string) => void] {
  const [params, setParams] = useSearchParams();
  const branch = params.get("branch") || DEFAULT_BRANCH;
  const setBranch = useCallback(
    (b: string) => {
      const next = new URLSearchParams(params);
      next.set("branch", b);
      setParams(next);
    },
    [params, setParams],
  );
  return [branch, setBranch];
}
