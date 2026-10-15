"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function MetrikaPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams?.toString() ?? "";
  const previousUrl = useRef<string | null>(null);

  useEffect(() => {
    const url = window.location.href;
    // The inline init already counts the first view, including in Strict Mode.
    if (previousUrl.current === null) {
      previousUrl.current = url;
      return;
    }
    if (previousUrl.current === url) return;

    const metrika = (window as Window & {
      ym?: (id: number, method: string, url: string, options: { referer: string }) => void;
    }).ym;
    metrika?.(113585722, "hit", url, { referer: previousUrl.current });
    previousUrl.current = url;
  }, [pathname, query]);

  return null;
}