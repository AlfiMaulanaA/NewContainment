'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    // TEMPORARILY DISABLED TO TEST REDIRECT LOOPS
    // Redirect to dashboard-overview
    // router.replace('/dashboard-overview');
  }, [router]);

  return null;
}