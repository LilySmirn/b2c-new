'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const HIDDEN_HEADER_PATHS = new Set([
  '/preview/directory/search',
  '/preview/directory/cart',
]);

type ConditionalHeaderProps = {
  children: ReactNode;
};

export default function ConditionalHeader({ children }: ConditionalHeaderProps) {
  const pathname = usePathname();

  if (HIDDEN_HEADER_PATHS.has(pathname)) {
    return null;
  }

  return <>{children}</>;
}