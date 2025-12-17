// app/(dashboard)/layout.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/shared/ProtectedRoutes';
import { Home, User } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { name: 'Consultations', path: '/consultations', icon: Home },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pb-20">
        {children}

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
          <div className="max-w-md mx-auto flex justify-around">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.path;
              return (
                <button
                  key={tab.path}
                  onClick={() => router.push(tab.path)}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'text-primary bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={24} />
                  <span className="text-xs font-medium">{tab.name}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </ProtectedRoute>
  );
}