// app/(auth)/layout.tsx

import { ProtectedRoute } from '@/components/shared/ProtectedRoutes';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </ProtectedRoute>
  );
}