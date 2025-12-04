// ================================
// Global Providers Component
// ================================
// This component wraps the app with all necessary context providers:
// - NextAuth SessionProvider for authentication
// - ThemeProvider for dark mode support
// - Sonner Toast provider for notifications
// - Any other global providers

"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ReactNode } from "react";
import { ReactQueryProvider } from "@/lib/react-query-provider";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { RouteChangeHandler } from "@/components/route-change-handler";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      {/* SessionProvider uses relative URLs by default, which prevents client-side NEXTAUTH_URL errors */}
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
      >
        <ReactQueryProvider>
          <KeyboardShortcuts />
          <RouteChangeHandler />
          {children}
          <Toaster 
            position="top-right" 
            richColors 
            closeButton
            toastOptions={{
              duration: 4000,
            }}
          />
        </ReactQueryProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

