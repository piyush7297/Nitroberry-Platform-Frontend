"use client";

import { useEffect } from "react";
import { Button } from "@nitroberry/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
      <p className="text-sm text-gray-500 max-w-sm">An unexpected error occurred. Please try again.</p>
      <Button onClick={reset} variant="outline">Try again</Button>
    </div>
  );
}
