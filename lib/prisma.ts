// ================================
// Prisma Client Singleton
// ================================
// This module exports a singleton instance of the Prisma Client
// to prevent multiple instances in development (hot reloading)

import { PrismaClient } from "@prisma/client";

// Declare a global variable to hold the Prisma Client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create or reuse the Prisma Client instance
// In production: always create a new instance
// In development: reuse the existing instance to avoid too many connections
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// Store the instance in the global object during development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

