// ================================
// NextAuth.js Configuration
// ================================
// This file contains the authentication configuration using NextAuth.js
// with Credentials provider for email/password authentication
// SERVER-ONLY: Uses bcryptjs and Prisma (Node.js only)

import 'server-only';

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
// Dynamic import to prevent webpack from bundling bcryptjs for client
import prisma from "./prisma";
import { env } from "./env";

// Extend the default session and JWT types to include our custom fields
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
      role: string;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
  }
}

// Get NEXTAUTH_URL from validated env object
// This ensures we use the validated environment variable
const getNextAuthUrl = (): string => {
  // Use validated env object (from lib/env.ts)
  const nextAuthUrl = env.NEXTAUTH_URL;
  
  if (nextAuthUrl) {
    return nextAuthUrl;
  }
  
  // Fallback for development
  if (process.env.NODE_ENV === 'development') {
    const defaultUrl = 'http://localhost:3000';
    // Set it in process.env for NextAuth (it reads directly from process.env)
    process.env.NEXTAUTH_URL = defaultUrl;
    console.log(`ℹ️ NEXTAUTH_URL not set in .env.local, using default: ${defaultUrl}`);
    return defaultUrl;
  }
  
  // Production requires explicit configuration
  console.warn('⚠️ WARNING: NEXTAUTH_URL is not set in production. This may cause authentication issues.');
  throw new Error('NEXTAUTH_URL is required in production. Please set it in your environment variables.');
};

// CRITICAL: Ensure NEXTAUTH_URL is set BEFORE authOptions is created
// NextAuth reads process.env.NEXTAUTH_URL at initialization time
// This must be set synchronously at module load time
const nextAuthUrl = getNextAuthUrl();
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = nextAuthUrl;
}

// Double-check: Ensure it's set (NextAuth is very strict about this)
if (!process.env.NEXTAUTH_URL) {
  // Last resort: set default for development
  if (process.env.NODE_ENV === 'development') {
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  } else {
    throw new Error('NEXTAUTH_URL must be set in production. Please add it to your .env.local file.');
  }
}

export const authOptions: NextAuthOptions = {
  
  // Configure authentication providers
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        try {
          // Validate that credentials were provided
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Email and password are required");
          }

          // Find the user in the database
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          // Check if user exists
          if (!user) {
            throw new Error("No user found with this email");
          }

          // Verify the password - use require to prevent webpack static analysis
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const bcrypt = require('bcryptjs');
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error("Invalid password");
          }

          // Update user status to online
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { status: "ONLINE", lastSeen: new Date() },
            });
          } catch (updateError) {
            // Log but don't fail login if status update fails
            console.error("Failed to update user status:", updateError);
          }

          // Return user object (password excluded)
          // Convert null to undefined for NextAuth compatibility
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar ?? undefined,
            role: user.role,
          };
        } catch (error) {
          // Log the error for debugging
          console.error("Authorization error:", error);
          
          // Re-throw with a user-friendly message
          if (error instanceof Error) {
            throw error;
          }
          throw new Error("Authentication failed. Please try again.");
        }
      },
    }),
  ],

  // Configure session handling
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Configure JWT
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Custom pages for authentication
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },

  // Callbacks to customize session and JWT
  callbacks: {
    // Add custom properties to the JWT token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.avatar = user.avatar;
        token.role = user.role;
      }
      return token;
    },

    // Add custom properties to the session
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id,
          name: token.name,
          email: token.email,
          avatar: token.avatar,
          role: token.role,
        };
      }
      return session;
    },

    // Redirect based on role after login
    // Note: redirect callback doesn't have token, use baseUrl instead
    // CRITICAL: Always return a relative path to prevent URL construction errors
    async redirect({ url, baseUrl }) {
      // Always return a safe relative path - NextAuth will handle URL construction
      // This prevents "Failed to construct 'URL': Invalid URL" errors
      try {
        // Validate inputs - baseUrl might be undefined or invalid
        const safeUrl = url && typeof url === 'string' ? url.trim() : null;
        const safeBaseUrl = baseUrl && typeof baseUrl === 'string' && baseUrl.trim() ? baseUrl.trim() : null;
        
        // If url is provided and is a valid relative path, use it
        if (safeUrl) {
          // Check if it's already a relative path
          if (safeUrl.startsWith('/') && !safeUrl.startsWith('//')) {
            // Validate it's a safe path format
            if (/^\/[a-zA-Z0-9\/\-_?=&.:]*$/.test(safeUrl)) {
              return safeUrl;
            }
          }
          
          // If it's a full URL, try to extract just the pathname
          if (safeUrl.startsWith('http://') || safeUrl.startsWith('https://')) {
            try {
              // Only attempt URL parsing if it looks like a valid URL
              if (safeUrl.length > 7 && safeUrl.includes('://')) {
                const urlObj = new URL(safeUrl);
                const pathname = urlObj.pathname;
                // Return pathname if it's valid, otherwise default
                return pathname && pathname.startsWith('/') ? pathname : "/chat";
              }
            } catch {
              // If URL parsing fails, just return default
              return "/chat";
            }
          }
        }
        
        // Default: always return a safe relative path
        // Never return undefined, null, or empty string
        return "/chat";
      } catch (error) {
        // Log error but always return a safe path
        console.error("Redirect callback error:", error);
        // Always return a valid relative path
        return "/chat";
      }
    },
  },

  // Events for logging and side effects
  events: {
    async signOut({ token }) {
      // Update user status to offline when signing out
      if (token?.id) {
        await prisma.user.update({
          where: { id: token.id as string },
          data: { status: "OFFLINE", lastSeen: new Date() },
        });
      }
    },
  },

  // Enable debug mode in development
  debug: process.env.NODE_ENV === "development",
};

