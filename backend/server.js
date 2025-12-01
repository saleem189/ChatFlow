// ================================
// Socket.io Standalone Server
// ================================
// Handles real-time messaging for the chat application
// Run with: npm run server

const { Server } = require("socket.io");
const http = require("http");
const fs = require("fs");
const path = require("path");

// Message flow logger helper functions
const LOG_FILE = path.join(process.cwd(), 'message-flow.log');

function writeLog(entry) {
  try {
    const logLine = JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
    }) + '\n';
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
    
    // Also log to console
    const emoji = {
      'API_RECEIVE': '📥',
      'API_BROADCAST': '📤',
      'SOCKET_RECEIVE': '🔌',
      'SOCKET_BROADCAST': '📡',
      'CLIENT_RECEIVE': '📨',
      'SOCKET_CONNECT': '🔗',
      'SOCKET_DISCONNECT': '🔌',
      'ROOM_JOIN': '📥',
      'ROOM_LEAVE': '📤',
      'ERROR': '❌',
    }[entry.stage] || '📋';
    
    console.log(`${emoji} [${entry.stage}] ${entry.messageId || entry.socketId || 'N/A'} | Room: ${entry.roomId || 'N/A'} | ${JSON.stringify(entry.details)}`);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

const PORT = process.env.SOCKET_PORT || 3001;
const CORS_ORIGIN = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

// Create HTTP server
const httpServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", connections: io.engine.clientsCount }));
    return;
  }
  res.writeHead(404);
  res.end();
});

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: [CORS_ORIGIN, "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Track online users
const onlineUsers = new Map(); // userId -> Set<socketId>
const socketToUser = new Map(); // socketId -> userId
const socketLastRequest = new Map(); // socketId -> timestamp (for debouncing get-online-users)

function getOnlineUserIds() {
  return Array.from(onlineUsers.keys());
}

function addOnlineUser(userId, socketId) {
  const wasAlreadyOnline = onlineUsers.has(userId);
  
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socketId);
  socketToUser.set(socketId, userId);
  
  // Only emit user-online if this is a NEW user coming online (not just another tab/connection)
  if (!wasAlreadyOnline) {
    io.emit("user-online", userId);
  }
}

function removeOnlineUser(socketId) {
  const userId = socketToUser.get(socketId);
  if (userId) {
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit("user-offline", userId);
      }
    }
    socketToUser.delete(socketId);
  }
}

// Socket connection handler
io.on("connection", (socket) => {
  console.log(`\n========== NEW SOCKET CONNECTION ==========`);
  console.log(`✅ Socket ID: ${socket.id}`);
  console.log(`📋 Address: ${socket.handshake.address}`);
  console.log(`📋 Origin: ${socket.handshake.headers.origin || 'N/A'}`);
  console.log(`📋 User-Agent: ${socket.handshake.headers['user-agent'] || 'N/A'}`);
  console.log(`==========================================\n`);
  
  // Log socket connection
  writeLog({
    stage: 'SOCKET_CONNECT',
    socketId: socket.id,
    details: {
      action: 'Socket connected',
      address: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'] || 'N/A',
      origin: socket.handshake.headers.origin || 'N/A',
    },
  });
  
  // CRITICAL: Set up onAny handler IMMEDIATELY and synchronously
  // This must be done before any other async operations
  console.log(`🔧 [Socket ${socket.id}] Setting up event handlers NOW...`);
  console.log(`🔧 [Socket ${socket.id}] Socket object:`, {
    id: socket.id,
    connected: socket.connected,
    disconnected: socket.disconnected,
    rooms: Array.from(socket.rooms),
  });
  
  // Debug: Log all events from this socket to both console and file
  // IMPORTANT: Set this up FIRST before any other handlers to catch all events
  socket.onAny((event, ...args) => {
    const eventData = args.length > 0 ? args[0] : null;
    const logMessage = `📡 [Socket ${socket.id}] Event: ${event}`;
    console.log(logMessage, eventData ? JSON.stringify(eventData, null, 2) : '');
    
    // Special handling for send-message to catch it early
    if (event === 'send-message') {
      console.log(`\n🚨 [onAny] Caught "send-message" event from socket ${socket.id}`);
      console.log(`📋 Event data:`, JSON.stringify(eventData, null, 2));
    }
    
    // Log ALL events to file for complete flow tracking
    let stage = 'SOCKET_CONNECT';
    if (event === 'send-message') {
      stage = 'SOCKET_RECEIVE';
    } else if (event === 'user-connect') {
      stage = 'SOCKET_CONNECT';
    } else if (event === 'join-room') {
      stage = 'ROOM_JOIN';
    } else if (event === 'leave-room') {
      stage = 'ROOM_LEAVE';
    } else if (event === 'disconnect') {
      stage = 'SOCKET_DISCONNECT';
    }
    
    writeLog({
      stage: stage,
      socketId: socket.id,
      messageId: eventData?.id || eventData?.messageId,
      roomId: eventData?.roomId,
      senderId: eventData?.senderId || eventData?.userId,
      details: {
        action: `Socket event: ${event}`,
        eventData: eventData ? (typeof eventData === 'object' ? JSON.stringify(eventData) : String(eventData)) : null,
      },
    });
  });
  
  console.log(`🔧 [Socket ${socket.id}] Event handlers set up, listening for all events...`);
  console.log(`🔧 [Socket ${socket.id}] onAny handler registered, will catch ALL events including "send-message"`);
  console.log(`🔧 [Socket ${socket.id}] Ready to receive events. Socket connected: ${socket.connected}`);

  // User connects
  socket.on("user-connect", (userId) => {
    if (!userId) return;
    console.log(`👤 User ${userId} connected (socket: ${socket.id})`);
    addOnlineUser(userId, socket.id);
    socket.userId = userId;
    
    // Log user connection to file
    writeLog({
      stage: 'SOCKET_CONNECT',
      socketId: socket.id,
      senderId: userId,
      details: {
        action: 'User connected',
        userId: userId,
      },
    });
  });

  // Get online users (with debouncing to prevent loops)
  const ONLINE_USERS_DEBOUNCE_MS = 1000; // 1 second debounce
  
  socket.on("get-online-users", () => {
    const now = Date.now();
    const lastRequest = socketLastRequest.get(socket.id) || 0;
    
    // Debounce: only respond if last request was more than 1 second ago
    if (now - lastRequest < ONLINE_USERS_DEBOUNCE_MS) {
      return;
    }
    socketLastRequest.set(socket.id, now);
    
    const users = getOnlineUserIds();
    console.log(`📋 Sending online users:`, users);
    socket.emit("online-users", users);
  });

  // Join room
  socket.on("join-room", (roomId) => {
    if (!roomId) return;
    socket.join(roomId);
    console.log(`📥 Socket ${socket.id} joined room: ${roomId}`);
    
    // Log room join
    writeLog({
      stage: 'ROOM_JOIN',
      socketId: socket.id,
      roomId: roomId,
      details: {
        action: 'Socket joined room',
        userId: socket.userId || 'unknown',
      },
    });
  });

  // Leave room
  socket.on("leave-room", (roomId) => {
    if (!roomId) return;
    socket.leave(roomId);
    console.log(`📤 Socket ${socket.id} left room: ${roomId}`);
    
    // Log room leave
    writeLog({
      stage: 'ROOM_LEAVE',
      socketId: socket.id,
      roomId: roomId,
      details: {
        action: 'Socket left room',
        userId: socket.userId || 'unknown',
      },
    });
  });

  // =====================
  // MESSAGE HANDLING
  // =====================
  socket.on("send-message", (message, callback) => {
    // Log socket receive IMMEDIATELY - this should be caught by onAny() too
    console.log(`\n🔔 [SOCKET SERVER] Received "send-message" event from socket ${socket.id}`);
    console.log(`📋 Message data:`, JSON.stringify(message, null, 2));
    console.log(`📋 Callback provided: ${typeof callback === 'function'}`);
    console.log(`📋 Socket still connected: ${socket.connected}`);
    console.log(`📋 Socket userId: ${socket.userId || 'NONE (API socket)'}`);
    console.log(`📋 Is from API: ${!socket.userId}`);
    
    writeLog({
      stage: 'SOCKET_RECEIVE',
      messageId: message?.id || 'unknown',
      roomId: message?.roomId,
      senderId: message?.senderId,
      socketId: socket.id,
      details: {
        action: 'Socket server received message',
        isFromAPI: !socket.userId,
        content: message?.content ? message.content.substring(0, 50) : 'media',
        hasCallback: typeof callback === 'function',
      },
    });
    
    console.log(`\n========== MESSAGE RECEIVED ==========`);
    console.log(`From socket: ${socket.id}`);
    console.log(`Message:`, JSON.stringify(message, null, 2));
    
    // Validate message has either content or file
    if (!message?.roomId || (!message?.content && !message?.fileUrl)) {
      console.log(`❌ Invalid message - missing roomId, content, or file`);
      
      // Log error
      writeLog({
        stage: 'ERROR',
        messageId: message?.id || 'unknown',
        roomId: message?.roomId,
        details: {
          action: 'Invalid message received',
          error: 'Missing roomId, content, or file',
          socketId: socket.id,
        },
      });
      return;
    }

    // Ensure replyTo is properly structured
    const replyToData = message.replyTo ? {
      id: message.replyTo.id,
      content: message.replyTo.content || "Media",
      senderName: message.replyTo.senderName,
      senderAvatar: message.replyTo.senderAvatar || null,
    } : null;

    // Use the message ID from the payload - API provides real DB ID, client provides temp ID
    // IMPORTANT: Always use the ID from the message payload to ensure proper matching
    const messageId = message.id; // Use the ID from the payload (real DB ID from API or temp ID from client)
    
    if (!messageId) {
      console.error(`❌ Message missing ID!`, message);
      return;
    }

    const payload = {
      id: messageId, // Use the exact ID from the message payload
      content: message.content || "",
      senderId: message.senderId,
      senderName: message.senderName,
      roomId: message.roomId,
      type: message.type || "text",
      fileUrl: message.fileUrl || null,
      fileName: message.fileName || null,
      fileSize: message.fileSize || null,
      fileType: message.fileType || null,
      replyToId: message.replyToId || null,
      replyTo: replyToData,
      createdAt: message.createdAt || new Date().toISOString(),
    };

    console.log(`📤 Broadcasting to room ${message.roomId}...`);
    console.log(`📋 Message ID: ${messageId} (${message.id ? 'from API' : 'temp'})`);
    console.log(`📋 Reply data:`, JSON.stringify(replyToData, null, 2));
    
    // Check if this is from the API server socket (no userId) or a regular client
    const isFromAPI = !socket.userId;
    
    // Get room size for logging
    const room = io.sockets.adapter.rooms.get(message.roomId);
    const clientCount = room ? room.size : 0;
    
    if (isFromAPI) {
      // If from API, broadcast to ALL users in the room (including sender's other tabs)
      // Use io.to() to broadcast from the server, not from the socket
      io.to(message.roomId).emit("receive-message", payload);
      console.log(`✅ API message broadcast complete to room ${message.roomId} (all users, ${clientCount} clients)`);
      
      // Log broadcast to file
      writeLog({
        stage: 'SOCKET_BROADCAST',
        messageId: messageId,
        roomId: message.roomId,
        senderId: message.senderId,
        socketId: socket.id,
        details: {
          action: 'Socket server broadcasting to clients',
          broadcastType: 'all',
          clientCount: clientCount,
          payload: JSON.stringify(payload),
        },
      });
    } else {
      // If from client, broadcast to all users EXCEPT the sender
      // The sender will receive the message via API response
      socket.to(message.roomId).emit("receive-message", payload);
      console.log(`✅ Client message broadcast complete to room ${message.roomId} (excluding sender ${socket.userId}, ${clientCount - 1} clients)`);
      
      // Log broadcast to file
      writeLog({
        stage: 'SOCKET_BROADCAST',
        messageId: messageId,
        roomId: message.roomId,
        senderId: message.senderId,
        socketId: socket.id,
        details: {
          action: 'Socket server broadcasting to clients',
          broadcastType: 'except-sender',
          clientCount: clientCount - 1,
          payload: JSON.stringify(payload),
        },
      });
    }
    console.log(`==========================================\n`);
  });

  // Typing indicators
  socket.on("typing", ({ roomId, userId, userName }) => {
    if (!roomId) return;
    console.log(`⌨️ ${userName} is typing in ${roomId}`);
    socket.to(roomId).emit("user-typing", { roomId, userId, userName });
  });

  socket.on("stop-typing", ({ roomId, userId }) => {
    if (!roomId) return;
    socket.to(roomId).emit("user-stop-typing", { roomId, userId });
  });

  // Message updated (edit)
  socket.on("message-updated", ({ messageId, content, roomId }) => {
    if (!messageId || !roomId) return;
    console.log(`✏️ Message ${messageId} updated in room ${roomId}`);
    io.to(roomId).emit("message-updated", {
      messageId,
      content,
      roomId,
      updatedAt: new Date().toISOString(),
    });
  });

  // Message deleted
  socket.on("message-deleted", ({ messageId, roomId }) => {
    if (!messageId || !roomId) return;
    console.log(`🗑️ Message ${messageId} deleted in room ${roomId}`);
    io.to(roomId).emit("message-deleted", {
      messageId,
      roomId,
    });
  });

  // Reaction added/removed
  socket.on("reaction-updated", ({ messageId, roomId, reactions }) => {
    if (!messageId || !roomId) return;
    console.log(`😀 Reaction updated for message ${messageId} in room ${roomId}`);
    io.to(roomId).emit("reaction-updated", {
      messageId,
      roomId,
      reactions,
    });
  });

  // Message read receipt
  socket.on("message-read", ({ messageId, userId, roomId }) => {
    if (!messageId || !userId || !roomId) return;
    console.log(`👁️ Message ${messageId} read by user ${userId} in room ${roomId}`);
    // Broadcast to all users in the room (so sender sees the read receipt)
    io.to(roomId).emit("message-read-update", {
      messageId,
      userId,
      roomId,
      readAt: new Date().toISOString(),
    });
  });

  // Message delivered receipt
  socket.on("message-delivered", ({ messageId, roomId }) => {
    if (!messageId || !roomId) return;
    console.log(`📬 Message ${messageId} delivered in room ${roomId}`);
    // Broadcast to all users in the room (so sender sees the delivery status)
    io.to(roomId).emit("message-delivered-update", {
      messageId,
      roomId,
    });
  });

  // Disconnect
  socket.on("disconnect", (reason) => {
    console.log(`❌ Disconnected: ${socket.id} (${reason})`);
    removeOnlineUser(socket.id);
    socketLastRequest.delete(socket.id); // Clean up debounce tracking
    
    // Log socket disconnect
    writeLog({
      stage: 'SOCKET_DISCONNECT',
      socketId: socket.id,
      details: {
        action: 'Socket disconnected',
        reason: reason,
        userId: socket.userId || 'unknown',
      },
    });
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 ChatFlow Socket Server             ║
║  Running on http://localhost:${PORT}      ║
║  CORS: ${CORS_ORIGIN}
╚════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on("SIGTERM", () => httpServer.close(() => process.exit(0)));
process.on("SIGINT", () => httpServer.close(() => process.exit(0)));
