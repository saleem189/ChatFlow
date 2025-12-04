// ================================
// Admin Room Detail Page
// ================================

import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { RoomDetail } from "@/components/admin/room-detail";

async function getRoomData(roomId: string) {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
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
              status: true,
            },
          },
        },
      },
      messages: {
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          sender: {
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
        },
      },
    },
  });

  return room;
}

interface RoomDetailPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  // Await params (Next.js 16 requirement)
  const { roomId } = await params;
  const room = await getRoomData(roomId);

  if (!room) {
    notFound();
  }

  return (
    <div className="p-6 space-y-6">
      <RoomDetail room={room} />
    </div>
  );
}

