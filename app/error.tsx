'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="p-8 max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Something went wrong!</h2>
          <p className="text-xs text-slate-500 mt-1">
            An unexpected error occurred while loading this page.
            {error?.digest ? ` (Ref: ${error.digest})` : ''}
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <Button onClick={() => reset()}>
            <RotateCcw className="w-3.5 h-3.5" />
            Try again
          </Button>
        </div>
      </Card>
    </div>
  );
}
