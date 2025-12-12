# Synapse Codebase Guide

**IMPORTANT:** This guide shows how the application ACTUALLY works. Before adding new code, check here to see if functionality already exists!

---

## 📋 Table of Contents

1. [Services & DI Container](#services--di-container)
2. [API Route Pattern](#api-route-pattern)
3. [Socket.io Implementation](#socketio-implementation)
4. [Backend Patterns](#backend-patterns)
5. [Memory Management](#memory-management)
6. [Existing Services Reference](#existing-services-reference)

---

## Services & DI Container

### What is Already Available

**Before creating a new service, check if it already exists!**

Our DI container has the following services registered (see `lib/di/providers.ts`):

#### Core Infrastructure Services
```typescript
// Logger - Use for all logging (injected into services)
container.register<ILogger>('logger', () => {...});

// Redis - Caching and queue management
container.register('redis', async () => {...});

// Cache Service - For caching data
container.register('cacheService', async () => {...});

// Queue Service - For background jobs
container.register('queueService', async () => {...});
```

#### Repository Layer (Data Access)
```typescript
// DO NOT create new repositories without checking these first!
container.register('userRepository', async () => {...});
container.register('roomRepository', async () => {...});
container.register('messageRepository', async () => {...});
container.register('callSessionRepository', async () => {...});
```

#### Business Logic Services
```typescript
// Message operations
container.register('messageService', async () => {...});
container.register('messageNotificationService', async () => {...});
container.register('messageReactionService', async () => {...});
container.register('messageReadService', async () => {...});

// Room operations
container.register('roomService', async () => {...});

// User operations
container.register('userService', async () => {...});

// Admin operations
container.register('adminService', async () => {...});

// Communication
container.register('emailService', async () => {...});
container.register('pushService', async () => {...});
```

### How to Use Services in Your Code

#### ✅ CORRECT: Use DI Container

```typescript
// app/api/your-endpoint/route.ts
import { getService } from "@/lib/di";
import { MessageService } from "@/lib/services/message.service";

export async function POST(request: NextRequest) {
  // ✅ Get service from DI container
  const messageService = await getService<MessageService>('messageService');
  
  // ✅ Use the service
  const message = await messageService.sendMessage(...);
  
  return NextResponse.json({ message });
}
```

**Why this is correct:**
- ✅ Uses existing service (no duplication)
- ✅ Testable (can mock services)
- ✅ All dependencies injected automatically
- ✅ Consistent with app architecture

#### ❌ WRONG: Don't Create New Service Without Checking

```typescript
// ❌ DON'T DO THIS!
export class MyNewMessageService {
  async sendMessage() {
    // This duplicates existing MessageService!
  }
}
```

**Before creating a service, ask:**
1. Does a similar service already exist in `lib/services/`?
2. Can I add a method to an existing service?
3. Should this be a separate specialized service?

### Real Example: MessageService

The MessageService already handles:

```typescript
// lib/services/message.service.ts (EXISTING - USE THIS!)
export class MessageService {
  constructor(
    private messageRepo: MessageRepository,
    private roomRepo: RoomRepository,
    private logger: ILogger, // ✅ Injected
    private cacheService?: CacheService,
    private notificationService?: MessageNotificationService,
    private reactionService?: MessageReactionService,
    private readService?: MessageReadService
  ) {}

  // Available methods (DON'T RE-IMPLEMENT THESE):
  async sendMessage(userId, roomId, content, options): Promise<Message>
  async editMessage(messageId, userId, content): Promise<Message>
  async deleteMessage(messageId, userId): Promise<void>
  async searchMessages(roomId, userId, query, limit): Promise<Message[]>
  async getUnreadCount(userId, roomId): Promise<number>
  // ... and more
}
```

**To add new message functionality:**

1. **Option A:** Add method to MessageService
   ```typescript
   // lib/services/message.service.ts
   async myNewFeature(params) {
     // Your implementation
   }
   ```

2. **Option B:** Create specialized service (if it's a distinct concern)
   ```typescript
   // lib/services/message-my-feature.service.ts
   export class MessageMyFeatureService {
     constructor(
       private messageRepo: MessageRepository,
       private logger: ILogger
     ) {}
   }
   
   // Register in lib/di/providers.ts
   container.register('messageMyFeatureService', async () => {...});
   ```

---

## API Route Pattern

### Standard API Route Structure

**ALL API routes must follow this pattern:**

```typescript
// app/api/your-endpoint/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { YourService } from "@/lib/services/your.service";
import { validateRequest, validateQueryParams } from "@/lib/middleware/validate-request";
import { yourSchema } from "@/lib/validations";
import { rateLimit, RateLimitPresets } from "@/lib/middleware/rate-limit";

// 📝 1. ALWAYS add route segment config for caching
export const dynamic = 'force-dynamic'; // or 'auto'
export const revalidate = 60; // seconds (or 0 for no cache)

/**
 * 📝 2. ALWAYS document the endpoint
 * POST /api/your-endpoint
 * Description of what it does
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 📝 3. ALWAYS check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    // 📝 4. Check authorization if needed
    if (session.user.role !== "ADMIN") {
      return handleError(new ForbiddenError('Admin access required'));
    }

    // 📝 5. Apply rate limiting for sensitive operations
    const limitResult = await rateLimit(request, RateLimitPresets.standard);
    if (!limitResult.success) {
      return limitResult.response;
    }

    // 📝 6. Get service from DI container
    const yourService = await getService<YourService>('yourService');

    // 📝 7. Validate request body
    const validation = await validateRequest(request, yourSchema);
    if (!validation.success) {
      return validation.response;
    }
    const data = validation.data;

    // 📝 8. Call service method
    const result = await yourService.doSomething(data);

    // 📝 9. Return response
    return NextResponse.json({ result });
  } catch (error) {
    // 📝 10. ALWAYS use handleError for consistent error responses
    return handleError(error);
  }
}
```

### Real Example from Codebase

```typescript
// app/api/admin/users/route.ts (ACTUAL CODE)
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }
    
    // 2. Authorization
    if (session.user.role !== "ADMIN") {
      return handleError(new ForbiddenError('Admin access required'));
    }

    // 3. Get service from DI container
    const adminService = await getService<AdminService>('adminService');

    // 4. Validate request body
    const validation = await validateRequest(request, updateUserSchema);
    if (!validation.success) {
      return validation.response;
    }
    const { userId, name, email, role, status } = validation.data;

    // 5. Call service
    const user = await adminService.updateUser(userId, { name, email, role, status });
    
    return NextResponse.json({ user });
  } catch (error) {
    return handleError(error);
  }
}
```

---

## Socket.io Implementation

### Critical: Memory Leak Prevention

**Our Socket.io server (backend/server.js) has CRITICAL patterns you MUST follow:**

### 1. Socket Connection Cleanup

**ALWAYS clean up event listeners on disconnect:**

```javascript
// backend/server.js (ACTUAL CODE - lines 1263-1274)
const handleDisconnect = async (reason) => {
  logger.log(`❌ Disconnected: ${socket.id} (${reason})`);
  
  // =====================
  // CLEANUP: Remove ALL event listeners to prevent memory leaks
  // =====================
  // This is critical for preventing memory leaks when sockets disconnect
  // Socket.io keeps references to event handlers until explicitly removed
  logger.log(`🧹 Cleaning up event listeners for socket ${socket.id}`);
  
  // Remove all event listeners
  socket.removeAllListeners();
  
  logger.log(`✅ All event listeners cleaned up for socket ${socket.id}`);
};

socket.on("disconnect", handleDisconnect);
```

### 2. Data Structure Cleanup

**ALWAYS clean up data structures:**

```javascript
// backend/server.js (ACTUAL CODE)
function removeOnlineUser(socketId) {
  const userId = socketToUser.get(socketId);
  if (userId) {
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socketId);  // ✅ Clean up socket from set
      if (sockets.size === 0) {
        onlineUsers.delete(userId);  // ✅ Clean up user if no sockets
        io.emit("user-offline", userId);
      }
    }
    socketToUser.delete(socketId);  // ✅ Clean up socket-to-user mapping
  }
}
```

### 3. Authentication Middleware

**ALWAYS authenticate sockets before allowing connections:**

```javascript
// backend/server.js (ACTUAL CODE - lines 249-308)
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication token required'));
  }

  try {
    // Validate token format (CUID)
    if (!/^c[a-z0-9]{24}$/.test(token)) {
      return next(new Error('Invalid authentication token format'));
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: token },
      select: {
        id: true,
        name: true,
        avatar: true,
        status: true,
        role: true,
      },
    });

    if (!user) {
      return next(new Error('User not found'));
    }

    // Check if banned
    if (user.status === 'BANNED') {
      return next(new Error('User account is banned'));
    }

    // Store user data on socket
    socket.userId = user.id;
    socket.userName = user.name;
    socket.userAvatar = user.avatar;
    socket.userRole = user.role;

    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});
```

### 4. Room Management

**ALWAYS join/leave rooms properly:**

```javascript
// backend/server.js (PATTERN)
socket.on("join-room", async ({ roomId }) => {
  // ✅ Validate room exists
  // ✅ Check user has permission
  // ✅ Join socket room
  socket.join(roomId);
  // ✅ Broadcast to room
  socket.to(roomId).emit("user-joined", { userId: socket.userId });
});

socket.on("leave-room", ({ roomId }) => {
  // ✅ Leave socket room
  socket.leave(roomId);
  // ✅ Broadcast to room
  socket.to(roomId).emit("user-left", { userId: socket.userId });
});
```

### 5. Event Handler Pattern

**Use named functions for cleanup:**

```javascript
// ✅ CORRECT: Named function (can be cleaned up)
const handleMessage = async (data) => {
  // Handle message
};

socket.on("send-message", handleMessage);

// On disconnect
socket.off("send-message", handleMessage);
socket.removeAllListeners(); // Or remove all at once
```

```javascript
// ❌ WRONG: Anonymous function (can't be cleaned up individually)
socket.on("send-message", async (data) => {
  // This creates a memory leak!
  // Can't remove this specific listener later
});
```

---

## Backend Patterns

### Logging Pattern

**ALWAYS use the logger from DI:**

```typescript
// ✅ CORRECT: Use injected logger
export class YourService {
  constructor(private logger: ILogger) {}
  
  async doSomething() {
    this.logger.log('Doing something');
    this.logger.error('Error occurred', error);
    this.logger.warn('Warning', { data });
  }
}
```

```typescript
// ❌ WRONG: Don't import logger directly
import { logger } from '@/lib/logger';

export class YourService {
  async doSomething() {
    logger.log('This is not testable!'); // ❌
  }
}
```

### Repository Pattern

**Use repositories for data access:**

```typescript
// ✅ CORRECT: Use repository
export class YourService {
  constructor(private userRepo: UserRepository) {}
  
  async getUser(id: string) {
    return this.userRepo.findById(id);
  }
}
```

```typescript
// ❌ WRONG: Don't use Prisma directly in services
import { prisma } from '@/lib/db';

export class YourService {
  async getUser(id: string) {
    return prisma.user.findUnique({ where: { id } }); // ❌
  }
}
```

### Error Handling

**Use custom error classes:**

```typescript
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';

// ✅ CORRECT
if (!user) {
  throw new NotFoundError('User not found');
}

if (user.role !== 'ADMIN') {
  throw new ForbiddenError('Admin access required');
}

if (!isValid) {
  throw new ValidationError('Invalid input');
}
```

---

## Memory Management

### Database Connection Management

**Connection pooling is handled by Prisma:**

```typescript
// lib/db.ts (EXISTING)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// ✅ Prisma manages connection pool automatically
// ✅ No need to close connections manually
```

### Cache Management

**Use CacheService for caching:**

```typescript
// ✅ CORRECT: Use CacheService
const cacheService = await getService<CacheService>('cacheService');

// Set with TTL
await cacheService.set('key', value, 3600); // 1 hour

// Get
const value = await cacheService.get('key');

// Delete
await cacheService.del('key');
```

### Memory Profiling

**Use built-in profiler for debugging:**

```typescript
import { memoryProfiler } from '@/lib/utils/memory-profiler';

// Start profiling
memoryProfiler.start(1000); // Snapshot every 1s

// ... your code ...

// Stop and analyze
const profile = memoryProfiler.stop();
const leakAnalysis = detectMemoryLeak(profile);

if (leakAnalysis.isLeak) {
  console.warn(leakAnalysis.recommendation);
}
```

---

## Existing Services Reference

### Full Service List

**Check this BEFORE creating new services:**

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| **MessageService** | Core message operations | sendMessage, editMessage, deleteMessage, searchMessages |
| **MessageNotificationService** | Push notifications | notifyNewMessage, notifyMention |
| **MessageReactionService** | Message reactions | addReaction, removeReaction |
| **MessageReadService** | Read receipts | markAsRead, getUnreadCount |
| **RoomService** | Room management | createRoom, updateRoom, addMembers, removeMember |
| **UserService** | User operations | getUser, updateUser, searchUsers |
| **AdminService** | Admin operations | getAllUsers, updateUser, deleteUser, getStats |
| **EmailService** | Email notifications | sendWelcomeEmail, sendNotification |
| **PushService** | Push notifications | sendNotification |
| **CacheService** | Redis caching | get, set, del, clear |
| **QueueService** | Background jobs | addJob, processJobs |

### Service Dependencies

**Understanding service composition:**

```typescript
// MessageService depends on:
- MessageRepository
- RoomRepository
- ILogger
- CacheService (optional)
- MessageNotificationService (optional)
- MessageReactionService (optional)
- MessageReadService (optional)

// All dependencies injected via DI container
```

---

## Common Mistakes to Avoid

### ❌ 1. Creating Duplicate Services

```typescript
// ❌ DON'T DO THIS
export class MyMessageService {
  async sendMessage() {
    // MessageService already does this!
  }
}
```

**✅ Instead:** Use existing MessageService or add method to it

### ❌ 2. Not Using DI Container

```typescript
// ❌ DON'T DO THIS
const messageService = new MessageService(/*...*/);
```

**✅ Instead:** Get from DI container

```typescript
const messageService = await getService<MessageService>('messageService');
```

### ❌ 3. Not Cleaning Up Socket Listeners

```typescript
// ❌ DON'T DO THIS
socket.on('disconnect', () => {
  // Cleanup data but forgot to remove listeners!
  onlineUsers.delete(socket.id);
  // Memory leak!
});
```

**✅ Instead:** Remove ALL listeners

```typescript
socket.on('disconnect', () => {
  onlineUsers.delete(socket.id);
  socket.removeAllListeners(); // ✅
});
```

### ❌ 4. Using Prisma Directly in Services

```typescript
// ❌ DON'T DO THIS
import { prisma } from '@/lib/db';

export class MyService {
  async getUser(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }
}
```

**✅ Instead:** Use repositories

```typescript
export class MyService {
  constructor(private userRepo: UserRepository) {}
  
  async getUser(id: string) {
    return this.userRepo.findById(id);
  }
}
```

### ❌ 5. Not Validating Input

```typescript
// ❌ DON'T DO THIS
export async function POST(request: NextRequest) {
  const data = await request.json();
  // Using data without validation!
}
```

**✅ Instead:** Always validate

```typescript
const validation = await validateRequest(request, yourSchema);
if (!validation.success) {
  return validation.response;
}
const data = validation.data; // ✅ Type-safe and validated
```

---

## Quick Reference

### Before Adding Code, Ask:

1. ✅ Does this service already exist? (Check `lib/services/`)
2. ✅ Can I use an existing method?
3. ✅ Am I using the DI container?
4. ✅ Am I following the API route pattern?
5. ✅ Am I cleaning up resources (sockets, listeners)?
6. ✅ Am I validating input?
7. ✅ Am I using repositories, not Prisma directly?
8. ✅ Am I injecting logger, not importing it?

### File Locations

```
lib/
├── services/          # Business logic (10+ services)
├── repositories/      # Data access layer
├── di/               # Dependency injection
│   ├── container.ts  # DI container
│   └── providers.ts  # Service registration
├── middleware/       # Request middleware
│   ├── validate-request.ts
│   └── rate-limit.ts
├── validations.ts    # Zod schemas
└── errors/           # Custom error classes

backend/
└── server.js         # Socket.io server

app/api/              # API routes
```

---

## Need Help?

- Check existing services in `lib/services/`
- Review API routes in `app/api/`
- Read Socket.io implementation in `backend/server.js`
- Ask in GitHub Discussions

---

**Remember:** Reuse before you recreate! Most functionality already exists.

