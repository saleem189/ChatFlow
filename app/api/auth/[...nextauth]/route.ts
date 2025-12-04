// ================================
// NextAuth.js API Route Handler
// ================================
// This file handles all authentication routes:
// - /api/auth/signin
// - /api/auth/signout
// - /api/auth/callback
// - /api/auth/session
// - etc.

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { env } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";
import { getService } from "@/lib/di";
import type { ILogger } from "@/lib/logger/logger.interface";

// Ensure NEXTAUTH_URL is set before NextAuth initializes
// This function ensures NEXTAUTH_URL is always available
function ensureNextAuthUrl(): void {
  if (!process.env.NEXTAUTH_URL) {
    const nextAuthUrl = env.NEXTAUTH_URL;
    
    if (nextAuthUrl) {
      process.env.NEXTAUTH_URL = nextAuthUrl;
    } else if (process.env.NODE_ENV === 'development') {
      // Development fallback
      const defaultUrl = 'http://localhost:3000';
      process.env.NEXTAUTH_URL = defaultUrl;
    } else {
      // Production: use request headers to infer URL
      // This is a fallback - NEXTAUTH_URL should be set in .env.local
      // Use console.warn since logger requires async DI resolution
      console.warn('⚠️ WARNING: NEXTAUTH_URL not set. Using fallback detection.');
    }
  }
}

// Ensure NEXTAUTH_URL is set at module load time
ensureNextAuthUrl();

// Create the NextAuth handler with our configuration
const handler = NextAuth(authOptions);

// Wrap handler to ensure NEXTAUTH_URL is set on every request
// This is critical because NextAuth may construct URLs during request handling
// NextAuth handler in App Router accepts (req, context) where context has params
async function wrappedHandler(
  req: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
): Promise<Response> {
  // Ensure NEXTAUTH_URL is set before processing request
  ensureNextAuthUrl();
  
  // If still not set, try to infer from request headers
  if (!process.env.NEXTAUTH_URL) {
    try {
      const url = new URL(req.url);
      process.env.NEXTAUTH_URL = `${url.protocol}//${url.host}`;
    } catch {
      // Fallback if URL parsing fails
      const protocol = req.headers.get('x-forwarded-proto') || 'http';
      const host = req.headers.get('host') || 'localhost:3000';
      process.env.NEXTAUTH_URL = `${protocol}://${host}`;
    }
  }
  
  // Call the NextAuth handler
  // NextAuth handler returns a Promise<Response>
  // In Next.js 16, params is a Promise, so we need to await it
  const params = await context.params;
  return handler(req, { params });
}

// Export for both GET and POST requests
export { wrappedHandler as GET, wrappedHandler as POST };

