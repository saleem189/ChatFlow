# How Read Receipts & Online Status Tracking Works

## 📊 Overview

The system tracks three states for messages:
1. **Sent** (1 gray tick ✓) - Message sent, recipient offline
2. **Delivered** (2 gray ticks ✓✓) - Message delivered, recipient online
3. **Read** (2 blue ticks ✓✓) - Message read by recipient

---

## 🔌 1. Online/Offline Status Tracking

### How It Works:

#### **Backend (Socket Server) - `backend/server.js`**

```javascript
// Track online users in memory
const onlineUsers = new Map(); // userId -> Set<socketId>
const socketToUser = new Map(); // socketId -> userId

// When user connects
socket.on("user-connect", (userId) => {
  addOnlineUser(userId, socket.id);
  io.emit("user-online", userId); // Broadcast to all clients
});

// When user disconnects
socket.on("disconnect", () => {
  removeOnlineUser(socket.id);
  io.emit("user-offline", userId); // Broadcast to all clients
});
```

**Key Points:**
- Server maintains a `Map` of online users in memory
- When a user connects → `user-online` event is broadcast
- When a user disconnects → `user-offline` event is broadcast
- Multiple tabs/devices = multiple socket connections per user

#### **Frontend (Client) - `components/chat/chat-sidebar.tsx`**

```typescript
// When socket connects
socket.on("connect", () => {
  socket.emit("user-connect", user.id); // Tell server who you are
  socket.emit("get-online-users"); // Get current online users
});

// Listen for online/offline events
socket.on("user-online", (userId) => {
  setOnlineUsers(prev => new Set([...prev, userId]));
});

socket.on("user-offline", (userId) => {
  setOnlineUsers(prev => {
    const next = new Set(prev);
    next.delete(userId);
    return next;
  });
});
```

**Flow:**
1. User opens app → Socket connects
2. Client emits `user-connect` with `userId`
3. Server adds user to `onlineUsers` Map
4. Server broadcasts `user-online` to all clients
5. All clients update their `onlineUsers` state

---

## 📨 2. Message Delivery Status

### How It Works:

#### **When Sending a Message - `components/chat/chat-room.tsx`**

```typescript
const handleSendMessage = async (content: string) => {
  // Check if recipient is online
  const recipientIds = participants
    .filter((p) => p.id !== currentUser.id)
    .map((p) => p.id);
  
  const recipientOnline = recipientIds.some((id) => onlineUsers.has(id));

  // Create optimistic message
  const optimisticMessage: Message = {
    // ... other fields
    isDelivered: recipientOnline, // ✅ Set based on online status
    isRead: false,
  };
};
```

**Logic:**
- **If recipient is online** → `isDelivered: true` (shows 2 gray ticks ✓✓)
- **If recipient is offline** → `isDelivered: false` (shows 1 gray tick ✓)

#### **When Recipient Comes Online - `components/chat/chat-room.tsx`**

```typescript
socket.on("user-online", (userId: string) => {
  setOnlineUsers((prev) => new Set([...prev, userId]));
  
  // Mark pending messages as delivered
  setMessages((prev) => {
    const recipientIds = participants
      .filter((p) => p.id !== currentUser.id)
      .map((p) => p.id);
    
    if (recipientIds.includes(userId)) {
      return prev.map((msg) => {
        if (
          msg.senderId === currentUser.id &&
          !msg.isDelivered &&
          !msg.isRead
        ) {
          return { ...msg, isDelivered: true }; // ✅ Update to delivered
        }
        return msg;
      });
    }
    return prev;
  });
});
```

**Flow:**
1. Recipient comes online → `user-online` event fires
2. Check if this user is a recipient in current room
3. Update all pending messages from sender → `isDelivered: true`
4. UI updates: 1 tick (✓) → 2 ticks (✓✓)

---

## 👁️ 3. Message Read Status

### How It Works:

#### **Automatic Read Detection - `components/chat/chat-room.tsx`**

```typescript
// Mark messages as read when viewed
useEffect(() => {
  const unreadMessages = messages.filter(
    (msg) => 
      msg.senderId !== currentUser.id && // Not my message
      !msg.isRead &&                      // Not already read
      !msg.isDeleted                      // Not deleted
  );

  if (unreadMessages.length > 0) {
    // Call API to mark as read
    unreadMessages.forEach((msg) => {
      fetch(`/api/messages/${msg.id}/read`, {
        method: "POST",
      });
    });

    // Update local state
    setMessages((prev) =>
      prev.map((msg) =>
        unreadMessages.some((um) => um.id === msg.id)
          ? { ...msg, isRead: true, isDelivered: true }
          : msg
      )
    );
  }
}, [messages, currentUser.id]);
```

**How It Works:**
- **Automatic**: When messages are in view → marked as read
- **Trigger**: `useEffect` runs when `messages` array changes
- **Action**: Calls API to persist read status in database
- **UI Update**: Ticks turn blue (✓✓)

#### **Backend API - `app/api/messages/[messageId]/read/route.ts`**

```typescript
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const { messageId } = params;
  
  // Don't mark own messages as read
  const message = await messageRepo.findById(messageId);
  if (message.senderId === session.user.id) {
    return NextResponse.json({ message: "Cannot mark own message as read" });
  }

  // Mark as read in database
  await messageService.markAsRead(messageId, session.user.id);
  return NextResponse.json({ message: "Message marked as read" });
}
```

#### **Database Storage - `lib/services/message.service.ts`**

```typescript
async markAsRead(messageId: string, userId: string) {
  const message = await this.messageRepository.findById(messageId);
  if (!message) {
    throw new NotFoundError('Message not found');
  }

  // Don't mark own messages as read
  if (message.senderId === userId) {
    return;
  }

  // Check if already read
  const existingReadReceipt = await this.messageRepository
    .findReadReceipt(messageId, userId);
  
  if (!existingReadReceipt) {
    // Create read receipt in database
    await this.messageRepository.createReadReceipt(messageId, userId);
  }
}
```

**Database Schema:**
```prisma
model MessageRead {
  id        String   @id @default(cuid())
  messageId String
  userId    String
  readAt    DateTime @default(now())
  
  message   Message @relation(fields: [messageId], references: [id])
  user      User    @relation(fields: [userId], references: [id])
  
  @@unique([messageId, userId])
}
```

**Flow:**
1. User views messages → `useEffect` detects unread messages
2. API call → `/api/messages/[messageId]/read`
3. Backend → Creates `MessageRead` record in database
4. Frontend → Updates local state: `isRead: true`
5. UI → Ticks turn blue (✓✓)

---

## 🎯 Complete Flow Example

### Scenario: User A sends message to User B

1. **User A sends message**
   - Checks: Is User B online? → No
   - Sets: `isDelivered: false`
   - Shows: **1 gray tick (✓)**

2. **User B comes online**
   - Socket: `user-online` event fires
   - User A's client: Updates `onlineUsers` state
   - User A's client: Updates message → `isDelivered: true`
   - Shows: **2 gray ticks (✓✓)**

3. **User B views the message**
   - User B's client: `useEffect` detects unread message
   - API call: `POST /api/messages/[id]/read`
   - Database: Creates `MessageRead` record
   - User A's client: (Would need socket event to update - currently manual refresh)
   - Shows: **2 blue ticks (✓✓)**

---

## 🔄 Real-Time Updates

### Current Implementation:
- ✅ **Online/Offline**: Real-time via Socket.io
- ✅ **Delivery Status**: Real-time when recipient comes online
- ⚠️ **Read Status**: Currently requires page refresh to see on sender's side

### Future Enhancement:
To make read receipts fully real-time, you could add:

```javascript
// In backend/server.js
socket.on("message-read", ({ messageId, userId }) => {
  // Broadcast to sender
  io.to(roomId).emit("message-read-update", {
    messageId,
    userId,
    readAt: new Date().toISOString(),
  });
});
```

---

## 📝 Summary

| Status | How It's Detected | Where It's Stored |
|--------|------------------|-------------------|
| **Online** | Socket.io connection | In-memory Map (server) |
| **Offline** | Socket.io disconnect | Removed from Map |
| **Delivered** | Recipient online status | Local state (client) |
| **Read** | Message in viewport | Database (`MessageRead` table) |

---

## 🛠️ Key Files

- **Online Tracking**: `backend/server.js` (lines 33-63)
- **Client Connection**: `components/chat/chat-sidebar.tsx` (lines 98-127)
- **Delivery Logic**: `components/chat/chat-room.tsx` (lines 192-245)
- **Read Detection**: `components/chat/chat-room.tsx` (lines 157-180)
- **Read API**: `app/api/messages/[messageId]/read/route.ts`
- **Read Service**: `lib/services/message.service.ts` (markAsRead method)

