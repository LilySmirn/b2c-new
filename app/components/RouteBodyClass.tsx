'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const PREVIEW_SEARCH_ROUTE_CLASS = 'preview-directory-search-route';
const PREVIEW_CART_ROUTE_CLASS = 'preview-directory-cart-route';

export default function RouteBodyClass() {
  const pathname = usePathname();

  useEffect(() => {
    const isPreviewSearch = pathname === '/preview/directory/search';
    const isPreviewCart = pathname === '/preview/directory/cart';

    document.body.classList.toggle(PREVIEW_SEARCH_ROUTE_CLASS, isPreviewSearch);
    document.body.classList.toggle(PREVIEW_CART_ROUTE_CLASS, isPreviewCart);

    return () => {
      document.body.classList.remove(PREVIEW_SEARCH_ROUTE_CLASS);
      document.body.classList.remove(PREVIEW_CART_ROUTE_CLASS);
    };
  }, [pathname]);

  return null;
}