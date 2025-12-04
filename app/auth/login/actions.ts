// ================================
// Login Server Actions
// ================================
// React 19 Server Actions for login form
// Provides better UX with automatic pending states and form validation

// ================================
// Login Server Actions
// ================================
// React 19 Server Actions for login form
// Note: NextAuth doesn't support server actions directly, so we use the API route
// This provides better UX with automatic pending states and form validation

"use server";

import { redirect } from "next/navigation";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface LoginFormState {
  error?: string;
  success?: boolean;
}

/**
 * Server action for login form
 * Validates credentials and redirects based on user role
 * Note: Actual authentication is handled via API route due to NextAuth limitations
 */
export async function loginAction(
  prevState: LoginFormState | null,
  formData: FormData
): Promise<LoginFormState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const callbackUrl = formData.get("callbackUrl") as string | null;

  // Validate inputs
  if (!email || !password) {
    return {
      error: "Please enter both email and password.",
    };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      error: "Please enter a valid email address.",
    };
  }

  // Validate password length
  if (password.length < 6) {
    return {
      error: "Password must be at least 6 characters long.",
    };
  }

  // Validate callbackUrl for security
  const safeCallbackUrl = callbackUrl && 
    callbackUrl.startsWith('/') && 
    !callbackUrl.startsWith('//') &&
    /^\/[a-zA-Z0-9\/\-_?=&.:]*$/.test(callbackUrl)
    ? callbackUrl
    : "/chat";

  try {
    // Call the NextAuth sign-in API route
    const response = await fetch(`${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        email,
        password,
        redirect: "false",
        json: "true",
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      // Map NextAuth error messages to user-friendly messages
      let errorMessage = data.error || "Login failed. Please try again.";
      if (data.error === "CredentialsSignin") {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (data.error?.includes("Email and password are required")) {
        errorMessage = "Please enter both email and password.";
      } else if (data.error?.includes("No user found")) {
        errorMessage = "No account found with this email address.";
      } else if (data.error?.includes("Invalid password")) {
        errorMessage = "Invalid password. Please try again.";
      }

      logger.warn("Login failed", { email, error: data.error });
      return { error: errorMessage };
    }

    // Check session to determine redirect
    const session = await getServerSession(authOptions);
    
    if (session?.user) {
      logger.info("Login successful", { email, userId: session.user.id });
      
      // Redirect based on role
      if (session.user.role === "ADMIN") {
        redirect("/admin");
      } else {
        redirect(safeCallbackUrl);
      }
    }

    // If no session, return error
    logger.warn("Login succeeded but no session found", { email });
    return { error: "Login failed. Please try again." };
  } catch (error) {
    logger.error("Login error", { error, email });
    
    // Return error message
    let errorMessage = "An unexpected error occurred. Please try again.";
    if (error instanceof Error) {
      if (error.message.includes("fetch") || error.message.includes("ECONNREFUSED")) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
      }
    }

    return { error: errorMessage };
  }
}

