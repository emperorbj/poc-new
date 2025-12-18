// app/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { ProtectedRoute } from '@/components/shared/ProtectedRoutes';

export default function WelcomePage() {
  const router = useRouter();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
        <div className="max-w-md w-full text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center overflow-hidden">
              {/* Replace with your actual logo */}
               <div className="flex justify-center mb-6">
            <img
              src="/new-logo.png"
              alt="Humaein Logo"
              className="w-24 h-24 object-contain"
            />
          </div>
            </div>
          </div>

          {/* App Name */}
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Humaein</h1>
            <p className="text-gray-500">Patients before Paperwork</p>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => router.push('/login')}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              Login
            </Button>
            <Button
              onClick={() => router.push('/signup')}
              variant="outline"
              className="flex-1 border-primary text-primary hover:bg-primary/10"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}