// ================================
// Error Boundary Wrapper (Client Component)
// ================================
// Wrapper to use Error Boundary in server components

"use client";

import { ErrorBoundary } from "./error-boundary";

interface ErrorBoundaryWrapperProps {
  children: React.ReactNode;
}

export function ErrorBoundaryWrapper({ children }: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log error for debugging
        console.error("Application error:", error, errorInfo);
        
        // TODO: Send to error tracking service
        // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

