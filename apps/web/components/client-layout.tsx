'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from './error-boundary';

export function ClientLayout({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
