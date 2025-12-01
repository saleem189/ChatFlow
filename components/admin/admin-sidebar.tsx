// ================================
// Admin Sidebar Component
// ================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  Shield,
  BarChart3,
  Activity,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface AdminSidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/rooms", icon: MessageSquare, label: "Chat Rooms" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/admin/activity", icon: Activity, label: "Live Activity" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-full flex flex-col bg-surface-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-surface-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Admin Panel</h1>
            <p className="text-xs text-surface-400">ChatFlow Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                isActive
                  ? "bg-primary-600 text-white"
                  : "text-surface-300 hover:bg-surface-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Note: Admins are redirected away from /chat by middleware */}

      {/* User Profile */}
      <div className="p-3 border-t border-surface-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white font-semibold">
              {getInitials(user.name)}
            </div>
            <div>
              <p className="font-medium text-sm">{user.name}</p>
              <p className="text-xs text-red-400 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Admin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle className="w-8 h-8 bg-surface-800 hover:bg-surface-700" />
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-8 h-8 rounded-lg bg-surface-800 hover:bg-red-600 flex items-center justify-center transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

