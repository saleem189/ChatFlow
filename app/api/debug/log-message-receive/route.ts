// ================================
// Debug API Route - Log Message Receive
// ================================
// Allows client-side to log when it receives a message

import { NextRequest, NextResponse } from "next/server";
import { logClientReceive } from "@/lib/message-flow-logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, roomId, senderId, receiverId, socketId } = body;

    if (!messageId || !roomId || !senderId || !receiverId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    logClientReceive(messageId, roomId, senderId, receiverId, socketId || 'unknown');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to log message receive:", error);
    return NextResponse.json({ error: "Failed to log" }, { status: 500 });
  }
}

