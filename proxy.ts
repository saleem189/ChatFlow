// ================================
// Next.js Proxy (formerly Middleware)
// ================================
// Handles authentication and route protection with role-based redirects
// Note: In Next.js 16, middleware.ts has been renamed to proxy.ts
// Proxy runtime is nodejs and cannot be configured to edge

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // If user is admin, redirect them away from chat routes
    if (token?.role === "ADMIN") {
      // Admin trying to access chat - redirect to admin dashboard
      if (pathname.startsWith("/chat")) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    }

    // If user is NOT admin, redirect them away from admin routes
    if (token && token.role !== "ADMIN") {
      if (pathname.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/chat", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Check if user is authorized
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow access to public routes
        if (
          pathname === "/" ||
          pathname.startsWith("/auth") ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/monitoring") // Sentry tunnel route - must be public
        ) {
          return true;
        }

        // Require authentication for protected routes
        return !!token;
      },
    },
  }
);

// Configure which routes to protect
export const config = {
  matcher: [
    // Protect chat routes
    "/chat/:path*",
    // Protect admin routes
    "/admin/:path*",
    // Protect API routes (except auth and monitoring)
    "/api/rooms/:path*",
    "/api/messages/:path*",
    "/api/users/:path*",
    "/api/admin/:path*",
    // Note: /monitoring (Sentry tunnel) is excluded from matcher to allow public access
  ],
};

