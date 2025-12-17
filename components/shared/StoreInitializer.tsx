// components/shared/StoreInitializer.tsx
'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store/useStore';

export function StoreInitializer() {
  const initializeSession = useStore((state) => state.initializeSession);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  return null;
}