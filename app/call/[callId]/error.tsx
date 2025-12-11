// ================================
// Call Error Boundary
// ================================

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function CallError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Call page error:", error);
  }, [error]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-muted">
      <div className="text-center space-y-4 max-w-md px-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
        </div>
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground">
          {error.message || "An error occurred while loading the call."}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" onClick={() => window.close()}>
            Close Window
          </Button>
        </div>
      </div>
    </div>
  );
}

