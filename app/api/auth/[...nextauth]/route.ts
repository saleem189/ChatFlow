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

// Create the NextAuth handler with our configuration
const handler = NextAuth(authOptions);

// Export for both GET and POST requests
export { handler as GET, handler as POST };

