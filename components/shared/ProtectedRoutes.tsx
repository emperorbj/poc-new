// components/shared/ProtectedRoute.tsx
'use client';

import { useLayoutEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isInitialized = useStore((state) => state.isInitialized);
  const isProfileComplete = useStore((state) => state.isProfileComplete);
  const hasRedirectedRef = useRef(false);
  const lastPathRef = useRef<string | null>(null);

  // Compute redirect target synchronously
  let redirectTarget: string | null = null;

  if (isInitialized) {
    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup');
    const isDashboardPage = pathname?.startsWith('/consultations') || pathname?.startsWith('/profile');
    const isTenantSetup = pathname?.startsWith('/tenant-setup');

    if (!isAuthenticated && (isDashboardPage || isTenantSetup)) {
      redirectTarget = '/';
    } else if (isAuthenticated && !isProfileComplete && isDashboardPage) {
      redirectTarget = '/tenant-setup';
    } else if (isAuthenticated && isProfileComplete) {
      if (isAuthPage || pathname === '/' || isTenantSetup) {
        redirectTarget = '/consultations';
      }
    }
  }

  // Use useLayoutEffect to redirect synchronously before paint
  useLayoutEffect(() => {
    if (!isInitialized) {
      hasRedirectedRef.current = false;
      lastPathRef.current = null;
      return;
    }

    // Reset redirect flag if pathname changed (navigation completed)
    if (lastPathRef.current !== pathname) {
      hasRedirectedRef.current = false;
      lastPathRef.current = pathname;
    }

    // Only redirect if we have a target, we're not already there, and we haven't redirected yet
    if (redirectTarget && redirectTarget !== pathname && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      console.log('🔄 Redirecting to:', redirectTarget);
      router.replace(redirectTarget);
    }
  }, [redirectTarget, pathname, isInitialized, router]);

  // Show loading if not initialized or if we need to redirect
  if (!isInitialized || (redirectTarget && redirectTarget !== pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}