"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebounce } from "use-debounce";

import { basePath } from "@/lib/env";

/**
 * Debounced text filter that mirrors its value into a URL query param.
 *
 * - Initializes the keyword from the param so deep links open pre-filtered.
 * - Debounces, so rapid typing ("c" → "co" → "com") only writes the URL once.
 * - Uses router.replace (not push), so intermediate filter states don't
 *   pollute browser history.
 */
export function useQueryFilter(param = "q", delay = 300) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [keyword, setKeyword] = useState(() => params.get(param) ?? "");
  const [debouncedKeyword] = useDebounce(keyword, delay);

  useEffect(() => {
    const next = new URLSearchParams(params.toString());
    if (debouncedKeyword) {
      next.set(param, debouncedKeyword);
    } else {
      next.delete(param);
    }

    // usePathname() may include the configured basePath, which router.replace
    // re-applies — strip it to avoid doubling (mirrors version-switcher).
    const path =
      basePath && pathname.startsWith(basePath)
        ? pathname.slice(basePath.length)
        : pathname;
    const query = next.toString();
    router.replace(query ? `${path}?${query}` : path, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword]);

  return { keyword, setKeyword, debouncedKeyword };
}
