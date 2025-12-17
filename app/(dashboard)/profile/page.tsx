// app/(dashboard)/profile/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChevronRight, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const tenantDetails = useStore((state) => state.tenantDetails);
  const doctorInfo = useStore((state) => state.doctorInfo);
  const logout = useStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      console.log('🚪 Logging out...');

      await logout();
      console.log('✅ Logout complete');

      // Navigation happens automatically via protected route
    } catch (error) {
      console.error('❌ Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutDialog(false);
    }
  };

  const infoItems = [
    { label: 'Email', value: doctorInfo?.email || 'N/A' },
    {
      label: 'Clinic',
      value: doctorInfo?.clinic_name || tenantDetails?.clinicName || 'N/A',
    },
    {
      label: 'Registration Number',
      value:
        doctorInfo?.medical_registration_number ||
        tenantDetails?.medicalRegistrationNumber ||
        'N/A',
    },
    {
      label: 'Experience',
      value: doctorInfo?.experience
        ? `${doctorInfo.experience} years`
        : tenantDetails?.yearsOfExperience || 'N/A',
    },
    {
      label: 'Location',
      value: doctorInfo?.location || tenantDetails?.locationName || 'N/A',
    },
  ];

  const menuItems = [
    { label: 'Edit Profile', icon: ChevronRight },
    { label: 'Notifications', icon: ChevronRight },
    { label: 'Privacy & Security', icon: ChevronRight },
    { label: 'Help & Support', icon: ChevronRight },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-primary text-white p-6 pt-12">
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Doctor Info */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl font-bold text-white">
              {doctorInfo?.name?.[0] || tenantDetails?.doctorName?.[0] || 'H'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {doctorInfo?.name || tenantDetails?.doctorName || 'Doctor'}
          </h2>
          <p className="text-gray-500">
            {doctorInfo?.specialty || tenantDetails?.specialty || 'Specialty'}
          </p>
        </div>

        {/* Info Card */}
        <Card className="p-4">
          {infoItems.map((item, index) => (
            <div key={item.label}>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm font-medium text-gray-500">
                  {item.label}
                </span>
                <span className="text-sm font-semibold text-gray-800 text-right">
                  {item.value}
                </span>
              </div>
              {index < infoItems.length - 1 && (
                <div className="border-b border-gray-100" />
              )}
            </div>
          ))}
        </Card>

        {/* Settings Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Settings</h3>
          <Card className="divide-y">
            {menuItems.map((item) => (
              <button
                key={item.label}
                className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-800">{item.label}</span>
                <item.icon className="text-gray-400" size={20} />
              </button>
            ))}
          </Card>
        </div>

        {/* Logout Button */}
        <Button
          onClick={() => setShowLogoutDialog(true)}
          disabled={isLoggingOut}
          variant="destructive"
          className="w-full"
        >
          {isLoggingOut ? (
            'Logging out...'
          ) : (
            <>
              <LogOut size={20} className="mr-2" />
              Logout
            </>
          )}
        </Button>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive hover:bg-destructive/90"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}