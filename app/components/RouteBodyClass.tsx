'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const PREVIEW_SEARCH_ROUTE_CLASS = 'preview-directory-search-route';

export default function RouteBodyClass() {
  const pathname = usePathname();

  useEffect(() => {
    const isPreviewSearch = pathname === '/preview/directory/search';
    document.body.classList.toggle(PREVIEW_SEARCH_ROUTE_CLASS, isPreviewSearch);

    return () => {
      document.body.classList.remove(PREVIEW_SEARCH_ROUTE_CLASS);
    };
  }, [pathname]);

  return null;
}