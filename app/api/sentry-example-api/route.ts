import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

class SentryExampleAPIError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "SentryExampleAPIError";
  }
}

/**
 * GET /api/sentry-example-api
 * A faulty API route to test Sentry's error monitoring
 * This intentionally throws an error to verify error tracking works
 */
export async function GET() {
  try {
    throw new SentryExampleAPIError("This error is raised on the backend called by the example page.");
    return NextResponse.json({ data: "Testing Sentry Error..." });
  } catch (error) {
    // Re-throw to let Sentry catch it
    throw error;
  }
}
