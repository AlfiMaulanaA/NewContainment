"use client";
import * as React from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Home, Search, ArrowLeft, FileQuestion } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <SidebarInset>
      <header className="flex h-16 items-center border-b px-4 bg-gradient-to-r from-muted/50 to-muted backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-2">
            <FileQuestion size={18} className="text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">
              Page Not Found
            </h1>
          </div>
        </div>
      </header>

      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-8 bg-gradient-to-br from-background via-muted/10 to-muted/30">
        <div className="text-center space-y-6 animate-bounce-in">
          {/* 404 Illustration */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
            <div className="relative">
              <img
                src="/images/ErrorNotFound.png"
                alt="Page Not Found"
                width={400}
                height={400}
                className="mx-auto drop-shadow-2xl transition-transform hover:scale-105 duration-300"
                onError={(e) => {
                  // Fallback if image doesn't exist
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.parentElement?.querySelector('.fallback-404');
                  if (fallback) {
                    (fallback as HTMLElement).style.display = 'block';
                  }
                }}
              />
              {/* Fallback 404 Text */}
              <div className="fallback-404 hidden">
                <div className="text-9xl font-bold text-primary/20 select-none">
                  404
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground">
              Oops! Page Not Found
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              The page you're looking for doesn't exist or has been moved to a different location.
            </p>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 border">
              <p className="mb-2">This could happen because:</p>
              <ul className="text-left space-y-1 list-disc list-inside">
                <li>The URL was typed incorrectly</li>
                <li>The page has been deleted or moved</li>
                <li>You don't have permission to access this page</li>
                <li>The link you followed is broken</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="lg"
              className="flex items-center gap-2 h-12"
            >
              <ArrowLeft size={18} />
              Go Back
            </Button>

            <Link href="/">
              <Button
                size="lg"
                className="flex items-center gap-2 h-12 w-full sm:w-auto"
              >
                <Home size={18} />
                Go to Homepage
              </Button>
            </Link>

            <Link href="/dashboard-overview">
              <Button
                variant="outline"
                size="lg"
                className="flex items-center gap-2 h-12 w-full sm:w-auto"
              >
                <Search size={18} />
                Go to Dashboard
              </Button>
            </Link>
          </div>

          {/* Additional Help */}
          <div className="pt-8 text-center">
            <p className="text-xs text-muted-foreground">
              Need help? Contact support or check our documentation for assistance.
            </p>
          </div>
        </div>
      </main>
    </SidebarInset>
  );
}
