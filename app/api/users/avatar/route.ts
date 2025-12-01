// ================================
// Profile Picture Upload API
// ================================

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { UserService } from "@/lib/services/user.service";

// Get services from DI container
const userService = getService<UserService>('userService');

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return handleError(new ValidationError('No file provided'));
    }

    // Validate file type (only images)
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      return handleError(new ValidationError('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
    }

    // Validate file size (max 5MB for profile pictures)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return handleError(new ValidationError('File size exceeds 5MB limit'));
    }

    // Create avatars directory if it doesn't exist
    const avatarsDir = join(process.cwd(), "public", "avatars");
    try {
      await mkdir(avatarsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split(".").pop();
    const fileName = `${session.user.id}_${timestamp}_${randomString}.${fileExtension}`;
    const filePath = join(avatarsDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return file URL
    const avatarUrl = `/avatars/${fileName}`;

    // Update user's avatar in database
    await userService.updateAvatar(session.user.id, avatarUrl);

    return NextResponse.json({
      avatar: avatarUrl,
      message: "Profile picture updated successfully",
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/users/avatar
 * Remove profile picture
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    await userService.deleteAvatar(session.user.id);

    return NextResponse.json({
      message: "Profile picture removed successfully",
    });
  } catch (error) {
    return handleError(error);
  }
}

