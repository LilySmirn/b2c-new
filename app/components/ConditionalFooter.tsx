'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const HIDDEN_FOOTER_PATHS = new Set([
  '/preview/directory/search',
  '/preview/directory/cart',
  '/preview/directory/access-error',
  '/auth',
]);

type ConditionalFooterProps = {
  children: ReactNode;
};

export default function ConditionalFooter({ children }: ConditionalFooterProps) {
  const pathname = usePathname();

  if (pathname && HIDDEN_FOOTER_PATHS.has(pathname)) {
    return null;
  }

  return <>{children}</>;
}