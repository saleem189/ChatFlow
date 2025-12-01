// ================================
// Admin Users Management Page
// ================================

import prisma from "@/lib/prisma";
import { UsersTable } from "@/components/admin/users-table";

async function getUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      lastSeen: true,
      createdAt: true,
      _count: {
        select: {
          messages: true,
          rooms: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return users;
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Users Management
          </h1>
          <p className="text-surface-500 dark:text-surface-400">
            Manage all registered users
          </p>
        </div>
        <div className="text-sm text-surface-500">
          Total: <span className="font-bold text-surface-900 dark:text-white">{users.length}</span> users
        </div>
      </div>

      {/* Users Table */}
      <UsersTable initialUsers={users} />
    </div>
  );
}

