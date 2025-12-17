// components/shared/ProtectedRoute.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isInitialized = useStore((state) => state.isInitialized);
  const isProfileComplete = useStore((state) => state.isProfileComplete);

  useEffect(() => {
    if (!isInitialized) return;

    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup');
    const isDashboardPage = pathname?.startsWith('/consultations') || pathname?.startsWith('/profile');
    const isTenantSetup = pathname?.startsWith('/tenant-setup');

    console.log('🔐 Protected route check:', {
      isAuthenticated,
      isProfileComplete,
      pathname,
    });

    if (!isAuthenticated && (isDashboardPage || isTenantSetup)) {
      console.log('🔄 Redirecting to home (not authenticated)');
      router.replace('/');
    } else if (isAuthenticated && !isProfileComplete && isDashboardPage) {
      console.log('🔄 Redirecting to tenant setup (profile incomplete)');
      router.replace('/tenant-setup');
    } else if (isAuthenticated && isProfileComplete && (isAuthPage || pathname === '/')) {
      console.log('🔄 Redirecting to dashboard (authenticated & complete)');
      router.replace('/consultations');
    }
  }, [isAuthenticated, isProfileComplete, isInitialized, pathname, router]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}