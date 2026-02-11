"use client";
import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, Shield } from 'lucide-react';

// This page redirects logged-in admin users to the admin dashboard
// For direct admin login, use /admin/login

const AdminRedirectPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Check if user is an admin
      if (user?.isAdmin) {
        // Store a marker that user has admin access via user account
        localStorage.setItem('adminUserAccess', 'true');
        router.push('/admin/dashboard');
      } else {
        // Not an admin user, redirect to home
        router.push('/feed');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Checking admin access...</p>
      </div>
    </div>
  );
};

export default AdminRedirectPage;
