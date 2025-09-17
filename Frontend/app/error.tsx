// app/error.tsx
"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const { theme } = useTheme();

  useEffect(() => {
    // Optionally log error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-background to-muted/20">
      <div className="bg-card border border-border shadow-2xl rounded-3xl p-8 max-w-lg w-full text-center animate-fade-in">
        {/* Error Icon with Pulse Animation */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-destructive/20 rounded-full animate-ping"></div>
            <div className="relative bg-destructive/10 p-4 rounded-full">
              <AlertTriangle
                size={64}
                className="text-destructive animate-pulse-error"
              />
            </div>
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-3xl font-bold mb-3 text-foreground">
          Something went wrong!
        </h1>

        {/* Error Message */}
        <div className="mb-6 space-y-2">
          <p className="text-muted-foreground text-sm leading-relaxed">
            We encountered an unexpected error. Don't worry, this has been logged and we're working on it.
          </p>
          {error.message && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                View technical details
              </summary>
              <div className="mt-2 p-3 bg-muted rounded-lg text-xs font-mono text-muted-foreground break-all">
                {error.message}
              </div>
            </details>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={reset}
            className="flex-1 flex items-center gap-2 h-11"
            size="lg"
          >
            <RefreshCw size={18} />
            Try Again
          </Button>
          <Link href="/" className="flex-1">
            <Button
              variant="outline"
              className="w-full flex items-center gap-2 h-11"
              size="lg"
            >
              <Home size={18} />
              Go Home
            </Button>
          </Link>
        </div>

        {/* Additional Help Text */}
        <p className="mt-6 text-xs text-muted-foreground">
          If this problem persists, please contact support or try refreshing the page.
        </p>
      </div>
    </div>
  );
}
