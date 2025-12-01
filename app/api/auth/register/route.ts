// ================================
// User Registration API Route
// ================================
// POST /api/auth/register
// Creates a new user account with hashed password

import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { UserService } from "@/lib/services/user.service";
import { registerSchema } from "@/lib/validations";

// Get services from DI container
const userService = getService<UserService>('userService');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return handleError(validationResult.error);
    }

    const { name, email, password } = validationResult.data;

    // Register user via service
    const user = await userService.register(name, email, password);

    return NextResponse.json(
      {
        message: "User created successfully",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}

