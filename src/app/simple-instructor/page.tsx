/**
 * DEPRECATED: Simple Instructor Dashboard
 * 
 * This route is deprecated. Redirecting to modern instructor dashboard.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedInstructorPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to modern instructor dashboard
    router.replace('/instructor/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
        <p className="text-gray-400">Taking you to the updated instructor dashboard</p>
      </div>
    </div>
  );
}