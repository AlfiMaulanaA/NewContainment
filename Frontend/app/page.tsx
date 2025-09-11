"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // useEffect(() => {
  //   // Prevent multiple redirects
  //   if (isRedirecting) return;

  //   setIsRedirecting(true);

  //   // Small delay to prevent potential loops and ensure proper mounting
  //   const timer = setTimeout(() => {
  //     router.replace('/dashboard-overview');
  //   }, 100);

  //   return () => clearTimeout(timer);
  // }, [router, isRedirecting]);

  // Show a loading indicator while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
