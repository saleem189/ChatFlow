// ================================
// Admin Chat Rooms Management Page
// ================================

import prisma from "@/lib/prisma";
import { RoomsTable } from "@/components/admin/rooms-table";

async function getRooms() {
  const rooms = await prisma.chatRoom.findMany({
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          messages: true,
          participants: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return rooms;
}

export default async function AdminRoomsPage() {
  const rooms = await getRooms();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Chat Rooms Management
          </h1>
          <p className="text-surface-500 dark:text-surface-400">
            Manage all chat rooms and conversations
          </p>
        </div>
        <div className="text-sm text-surface-500">
          Total: <span className="font-bold text-surface-900 dark:text-white">{rooms.length}</span> rooms
        </div>
      </div>

      {/* Rooms Table */}
      <RoomsTable initialRooms={rooms} />
    </div>
  );
}

