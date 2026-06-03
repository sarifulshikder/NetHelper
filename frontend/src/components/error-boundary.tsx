'use client';

import { useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';

interface ErrorBoundaryProps {
  error: Error;
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('Error caught by boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            An unexpected error occurred while loading this page.
          </p>
          <div className="bg-gray-100 p-3 rounded-md text-sm text-gray-800 overflow-auto max-h-32">
            <code>{error.message}</code>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
