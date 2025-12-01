// ================================
// Validation Schemas
// ================================
// Zod schemas for validating form inputs and API requests

import { z } from "zod";

/**
 * Login form validation schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Registration form validation schema
 */
export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(6, "Password must be at least 6 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Message validation schema
 */
export const messageSchema = z.object({
  content: z
    .string()
    .max(2000, "Message must be less than 2000 characters")
    .optional()
    .transform((val) => (val?.trim() || "")),
  roomId: z.string().min(1, "Room ID is required"),
  // File attachment fields
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().positive().optional(),
  fileType: z.string().optional(),
  type: z.enum(["text", "image", "video", "file", "audio"]).optional().default("text"),
  // Reply to message
  replyToId: z.string().optional().nullable(),
}).refine(
  (data) => {
    // Either content or file must be provided
    const hasContent = data.content && data.content.trim().length > 0;
    const hasFile = data.fileUrl && data.fileUrl.trim().length > 0;
    return hasContent || hasFile;
  },
  {
    message: "Either message content or file attachment is required",
    path: ["content"], // Show error on content field
  }
);

export type MessageFormData = z.infer<typeof messageSchema>;

/**
 * Create room validation schema
 */
export const createRoomSchema = z.object({
  name: z
    .string()
    .min(2, "Room name must be at least 2 characters")
    .max(50, "Room name must be less than 50 characters")
    .optional(), // Optional for DMs - auto-generated from user name
  description: z
    .string()
    .max(200, "Description must be less than 200 characters")
    .optional(),
  isGroup: z.boolean().default(false),
  participantIds: z.array(z.string()).min(1, "Select at least one participant"),
});

export type CreateRoomFormData = z.infer<typeof createRoomSchema>;

