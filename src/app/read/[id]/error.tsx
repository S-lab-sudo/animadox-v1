'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ArrowLeft, BookOpen } from 'lucide-react';

export default function ReaderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Reader error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-orange-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">
            Reader Error
          </h1>
          <p className="text-muted-foreground text-sm">
            Something went wrong while loading the chapter. Please try again.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="gap-2 bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
            size="sm"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto cursor-pointer border-orange-500/50">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
