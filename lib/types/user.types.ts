// ================================
// User Types
// ================================
// Shared TypeScript types for users

/**
 * User role
 */
export type UserRole = 'user' | 'admin';

/**
 * User status
 */
export type UserStatus = 'online' | 'offline' | 'away' | 'busy';

/**
 * User structure (public, without sensitive data)
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: UserRole;
  status: UserStatus;
  lastSeen: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * User for display in UI (minimal fields)
 */
export interface UserDisplay {
  id: string;
  name: string;
  avatar?: string | null;
  status?: UserStatus;
  email?: string;
}

/**
 * User registration data
 */
export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * User login data
 */
export interface LoginUserData {
  email: string;
  password: string;
}

/**
 * User profile update data
 */
export interface UpdateUserProfileData {
  name?: string;
  avatar?: string;
}

