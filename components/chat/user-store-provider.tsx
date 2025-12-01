// ================================
// User Store Provider
// ================================
// Client component to initialize user store from session

"use client";

import { useEffect } from "react";
import { useUserStore } from "@/lib/store";
import type { User } from "@/lib/types";

interface UserStoreProviderProps {
  user: User;
  children: React.ReactNode;
}

export function UserStoreProvider({ user, children }: UserStoreProviderProps) {
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    // Initialize user store with session user
    setUser(user);
  }, [user, setUser]);

  return <>{children}</>;
}

