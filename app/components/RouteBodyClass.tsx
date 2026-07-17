'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const PREVIEW_SEARCH_ROUTE_CLASS = 'preview-directory-search-route';
const PREVIEW_CART_ROUTE_CLASS = 'preview-directory-cart-route';
const PREVIEW_ACCESS_ERROR_ROUTE_CLASS = 'preview-directory-access-error-route';
const AUTH_ROUTE_CLASS = 'auth-route';

export default function RouteBodyClass() {
  const pathname = usePathname();

  useEffect(() => {
    const isPreviewSearch = pathname === '/preview/directory/search';
    const isPreviewCart = pathname === '/preview/directory/cart';
    const isPreviewAccessError = pathname === '/preview/directory/access-error';
    const isAuth = pathname === '/auth';

    document.body.classList.toggle(PREVIEW_SEARCH_ROUTE_CLASS, isPreviewSearch);
    document.body.classList.toggle(PREVIEW_CART_ROUTE_CLASS, isPreviewCart);
    document.body.classList.toggle(PREVIEW_ACCESS_ERROR_ROUTE_CLASS, isPreviewAccessError);
    document.body.classList.toggle(AUTH_ROUTE_CLASS, isAuth);

    return () => {
      document.body.classList.remove(PREVIEW_SEARCH_ROUTE_CLASS);
      document.body.classList.remove(PREVIEW_CART_ROUTE_CLASS);
      document.body.classList.remove(PREVIEW_ACCESS_ERROR_ROUTE_CLASS);
      document.body.classList.remove(AUTH_ROUTE_CLASS);
    };
  }, [pathname]);

  return null;
}