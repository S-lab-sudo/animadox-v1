'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to reporting service (e.g., Sentry)
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Error Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-orange-500" />
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">
            We encountered an unexpected error. Please try again or return to the homepage.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left bg-card border border-border rounded-lg p-4">
              <summary className="cursor-pointer text-sm font-medium text-orange-500">
                Error Details (Dev Only)
              </summary>
              <pre className="mt-2 text-xs text-muted-foreground overflow-auto max-h-40">
                {error.message}
                {error.digest && `\nDigest: ${error.digest}`}
              </pre>
            </details>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="gap-2 bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Link href="/">
            <Button variant="outline" className="gap-2 w-full sm:w-auto cursor-pointer border-orange-500/50 hover:border-orange-500 hover:text-orange-500">
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </Link>
        </div>

        {/* Error ID for support */}
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Error ID: <code className="bg-muted px-1 py-0.5 rounded">{error.digest}</code>
          </p>
        )}
      </div>
    </div>
  );
}
