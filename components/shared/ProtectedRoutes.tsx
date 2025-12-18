// components/shared/ProtectedRoute.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isInitialized = useStore((state) => state.isInitialized);
  const isProfileComplete = useStore((state) => state.isProfileComplete);
  const [isMounted, setIsMounted] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const hasRedirectedRef = useRef(false);
  const lastPathRef = useRef<string | null>(null);

  // Set mounted flag after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Compute redirect target and handle redirects
  useEffect(() => {
    if (!isMounted || !isInitialized) {
      setShouldRedirect(false);
      return;
    }

    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup');
    const isDashboardPage = pathname?.startsWith('/consultations') || pathname?.startsWith('/profile');
    const isTenantSetup = pathname?.startsWith('/tenant-setup');

    let redirectTarget: string | null = null;

    if (!isAuthenticated && (isDashboardPage || isTenantSetup)) {
      redirectTarget = '/';
    } else if (isAuthenticated && !isProfileComplete && isDashboardPage) {
      redirectTarget = '/tenant-setup';
    } else if (isAuthenticated && isProfileComplete) {
      if (isAuthPage || pathname === '/' || isTenantSetup) {
        redirectTarget = '/consultations';
      }
    }

    // Reset redirect flag if pathname changed (navigation completed)
    if (lastPathRef.current !== pathname) {
      hasRedirectedRef.current = false;
      lastPathRef.current = pathname;
    }

    // Only redirect if we have a target, we're not already there, and we haven't redirected yet
    if (redirectTarget && redirectTarget !== pathname && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      setShouldRedirect(true);
      console.log('🔄 Redirecting to:', redirectTarget);
      
      // Use setTimeout to defer redirect and prevent render conflicts
      const timeoutId = setTimeout(() => {
        router.replace(redirectTarget!);
        // Reset redirect state after navigation
        setTimeout(() => {
          setShouldRedirect(false);
        }, 100);
      }, 0);

      return () => clearTimeout(timeoutId);
    } else {
      setShouldRedirect(false);
    }
  }, [isMounted, isInitialized, isAuthenticated, isProfileComplete, pathname, router]);

  // Show loading during initialization or when redirecting
  if (!isMounted || !isInitialized || shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}