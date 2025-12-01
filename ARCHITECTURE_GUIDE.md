# Architecture & Design Patterns Guide

## 📋 Table of Contents
1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Recommended Design Patterns](#recommended-design-patterns)
3. [Proposed Architecture Improvements](#proposed-architecture-improvements)
4. [Code Organization Strategy](#code-organization-strategy)
5. [Best Practices for Open Source](#best-practices-for-open-source)
6. [Migration Roadmap](#migration-roadmap)

---

## 🏗️ Current Architecture Analysis

### Strengths
- ✅ Next.js 14 App Router (modern, performant)
- ✅ TypeScript (type safety)
- ✅ Prisma ORM (type-safe database access)
- ✅ Component-based React architecture
- ✅ Separation of concerns (components, lib, app/api)
- ✅ Real-time capabilities with Socket.io

### Areas for Improvement
- ⚠️ Business logic mixed with API routes
- ⚠️ No service layer abstraction
- ⚠️ Direct Prisma calls in components/API routes
- ⚠️ Inconsistent error handling
- ⚠️ No repository pattern for data access
- ⚠️ Socket logic tightly coupled
- ⚠️ Limited custom hooks for reusable logic
- ⚠️ No clear separation between domain and infrastructure

---

## 🎯 Recommended Design Patterns

### 1. **Repository Pattern** (Data Access Layer)
**Purpose**: Abstract database operations, improve testability, enable easy database switching

**Structure**:
```
lib/repositories/
  ├── base.repository.ts      # Base repository with common CRUD
  ├── user.repository.ts
  ├── message.repository.ts
  ├── room.repository.ts
  └── index.ts
```

**Benefits**:
- Single responsibility for data access
- Easy to mock for testing
- Can swap Prisma for another ORM without changing business logic
- Centralized query logic

**Example**:
```typescript
// lib/repositories/base.repository.ts
export abstract class BaseRepository<T> {
  protected prisma: PrismaClient;
  
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }
  
  abstract findById(id: string): Promise<T | null>;
  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<void>;
}

// lib/repositories/message.repository.ts
export class MessageRepository extends BaseRepository<Message> {
  async findByRoomId(roomId: string, limit: number = 50): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        replyTo: { include: { sender: true } },
        reactions: { include: { user: true } },
      },
    });
  }
  
  async findById(id: string): Promise<Message | null> {
    return this.prisma.message.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        replyTo: { include: { sender: true } },
        reactions: { include: { user: true } },
      },
    });
  }
  
  // ... other methods
}
```

---

### 2. **Service Layer Pattern** (Business Logic)
**Purpose**: Encapsulate business logic, coordinate between repositories, handle transactions

**Structure**:
```
lib/services/
  ├── message.service.ts
  ├── room.service.ts
  ├── user.service.ts
  ├── notification.service.ts
  └── index.ts
```

**Benefits**:
- Business logic separated from API routes
- Reusable across different entry points (API, Server Actions, etc.)
- Easier to test
- Single source of truth for business rules

**Example**:
```typescript
// lib/services/message.service.ts
export class MessageService {
  constructor(
    private messageRepo: MessageRepository,
    private roomRepo: RoomRepository,
    private socketService: SocketService
  ) {}
  
  async sendMessage(
    userId: string,
    roomId: string,
    content: string,
    replyToId?: string
  ): Promise<Message> {
    // 1. Validate user is participant
    const isParticipant = await this.roomRepo.isParticipant(roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError('User is not a participant in this room');
    }
    
    // 2. Get reply message if replying
    const replyTo = replyToId 
      ? await this.messageRepo.findById(replyToId)
      : null;
    
    if (replyToId && !replyTo) {
      throw new NotFoundError('Reply message not found');
    }
    
    // 3. Create message
    const message = await this.messageRepo.create({
      content,
      senderId: userId,
      roomId,
      replyToId: replyToId || null,
      type: 'text',
    });
    
    // 4. Update room timestamp
    await this.roomRepo.update(roomId, { updatedAt: new Date() });
    
    // 5. Broadcast via socket
    await this.socketService.broadcastMessage(roomId, message);
    
    return message;
  }
  
  async searchMessages(
    roomId: string,
    userId: string,
    query: string
  ): Promise<Message[]> {
    // Validate access
    const isParticipant = await this.roomRepo.isParticipant(roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError('Access denied');
    }
    
    // Search using repository
    return this.messageRepo.search(roomId, query);
  }
}
```

---

### 3. **Custom Hooks Pattern** (React Logic Reusability)
**Purpose**: Extract reusable React logic, improve component readability

**Structure**:
```
hooks/
  ├── use-messages.ts
  ├── use-rooms.ts
  ├── use-socket.ts
  ├── use-typing-indicator.ts
  ├── use-message-search.ts
  └── index.ts
```

**Example**:
```typescript
// hooks/use-messages.ts
export function useMessages(roomId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const socket = useSocket();
  
  useEffect(() => {
    // Fetch initial messages
    fetchMessages();
    
    // Listen for new messages
    const handleReceive = (message: Message) => {
      if (message.roomId === roomId) {
        setMessages(prev => [...prev, message]);
      }
    };
    
    socket.on('receive-message', handleReceive);
    return () => socket.off('receive-message', handleReceive);
  }, [roomId]);
  
  const sendMessage = async (content: string, replyToId?: string) => {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, roomId, replyToId }),
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      return await response.json();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };
  
  return { messages, loading, error, sendMessage };
}
```

---

### 4. **Factory Pattern** (Socket Events)
**Purpose**: Create socket event handlers dynamically, reduce boilerplate

**Structure**:
```
lib/socket/
  ├── handlers/
  │   ├── message.handler.ts
  │   ├── typing.handler.ts
  │   ├── room.handler.ts
  │   └── index.ts
  ├── event-factory.ts
  └── socket.service.ts
```

**Example**:
```typescript
// lib/socket/handlers/message.handler.ts
export class MessageHandler {
  constructor(
    private messageService: MessageService,
    private socketService: SocketService
  ) {}
  
  handleSendMessage = async (socket: Socket, data: SendMessageData) => {
    try {
      const message = await this.messageService.sendMessage(
        socket.userId,
        data.roomId,
        data.content,
        data.replyToId
      );
      
      // Broadcast to room
      this.socketService.broadcastToRoom(data.roomId, 'receive-message', message);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  };
}

// lib/socket/event-factory.ts
export class SocketEventFactory {
  static registerHandlers(io: Server, handlers: SocketHandler[]) {
    io.on('connection', (socket) => {
      handlers.forEach(handler => {
        handler.register(socket);
      });
    });
  }
}
```

---

### 5. **Error Handling Strategy**
**Purpose**: Consistent error handling across the application

**Structure**:
```
lib/errors/
  ├── base.error.ts
  ├── validation.error.ts
  ├── not-found.error.ts
  ├── forbidden.error.ts
  ├── error-handler.ts
  └── index.ts
```

**Example**:
```typescript
// lib/errors/base.error.ts
export abstract class AppError extends Error {
  abstract statusCode: number;
  abstract code: string;
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
  
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

// lib/errors/validation.error.ts
export class ValidationError extends AppError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
}

// lib/errors/error-handler.ts
export function handleError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      error.toJSON(),
      { status: error.statusCode }
    );
  }
  
  console.error('Unexpected error:', error);
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    { status: 500 }
  );
}
```

---

### 6. **Dependency Injection Pattern**
**Purpose**: Loose coupling, easier testing, better maintainability

**Structure**:
```
lib/di/
  ├── container.ts
  └── providers.ts
```

**Example**:
```typescript
// lib/di/container.ts
class DIContainer {
  private services = new Map<string, any>();
  
  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory);
  }
  
  resolve<T>(key: string): T {
    const factory = this.services.get(key);
    if (!factory) {
      throw new Error(`Service ${key} not found`);
    }
    return factory();
  }
}

export const container = new DIContainer();

// lib/di/providers.ts
export function setupDI() {
  // Repositories
  container.register('messageRepository', () => new MessageRepository(prisma));
  container.register('roomRepository', () => new RoomRepository(prisma));
  container.register('userRepository', () => new UserRepository(prisma));
  
  // Services
  container.register('messageService', () => 
    new MessageService(
      container.resolve('messageRepository'),
      container.resolve('roomRepository'),
      container.resolve('socketService')
    )
  );
}
```

---

### 7. **Observer Pattern** (State Management)
**Purpose**: Decouple components, manage global state efficiently

**Consider**: Zustand or Jotai for lightweight state management

**Example with Zustand**:
```typescript
// stores/message-store.ts
import { create } from 'zustand';

interface MessageStore {
  messages: Map<string, Message[]>; // roomId -> messages
  addMessage: (roomId: string, message: Message) => void;
  updateMessage: (roomId: string, messageId: string, updates: Partial<Message>) => void;
  getMessages: (roomId: string) => Message[];
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  messages: new Map(),
  
  addMessage: (roomId, message) => {
    set((state) => {
      const roomMessages = state.messages.get(roomId) || [];
      return {
        messages: new Map(state.messages).set(roomId, [...roomMessages, message]),
      };
    });
  },
  
  updateMessage: (roomId, messageId, updates) => {
    set((state) => {
      const roomMessages = state.messages.get(roomId) || [];
      const updated = roomMessages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
      return {
        messages: new Map(state.messages).set(roomId, updated),
      };
    });
  },
  
  getMessages: (roomId) => {
    return get().messages.get(roomId) || [];
  },
}));
```

---

## 🏛️ Proposed Architecture Improvements

### Recommended Folder Structure

```
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (thin layer)
│   │   ├── messages/
│   │   │   └── route.ts          # Only: validation, auth, call service
│   │   └── ...
│   ├── chat/
│   └── ...
│
├── components/                   # React Components
│   ├── chat/                     # Feature components
│   ├── ui/                       # UI primitives
│   └── ...
│
├── lib/                          # Core Business Logic
│   ├── repositories/             # Data Access Layer
│   │   ├── base.repository.ts
│   │   ├── message.repository.ts
│   │   └── ...
│   ├── services/                 # Business Logic Layer
│   │   ├── message.service.ts
│   │   ├── room.service.ts
│   │   └── ...
│   ├── socket/                   # Socket.io Logic
│   │   ├── handlers/
│   │   ├── socket.service.ts
│   │   └── ...
│   ├── errors/                   # Error Classes
│   │   ├── base.error.ts
│   │   └── ...
│   ├── validations/              # Zod Schemas (organized)
│   │   ├── message.schema.ts
│   │   ├── room.schema.ts
│   │   └── ...
│   ├── utils/                    # Pure Utility Functions
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── ...
│   └── types/                     # Shared TypeScript Types
│       ├── message.types.ts
│       ├── room.types.ts
│       └── ...
│
├── hooks/                        # Custom React Hooks
│   ├── use-messages.ts
│   ├── use-rooms.ts
│   └── ...
│
├── stores/                       # State Management (if using Zustand/Jotai)
│   ├── message-store.ts
│   └── ...
│
├── config/                       # Configuration Files
│   ├── database.ts
│   ├── socket.ts
│   └── ...
│
└── tests/                        # Test Files
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## 📦 Code Organization Strategy

### 1. **Feature-Based Organization** (Recommended)
Group by feature rather than by type:

```
features/
  ├── messages/
  │   ├── components/
  │   ├── hooks/
  │   ├── services/
  │   ├── repositories/
  │   ├── types/
  │   └── index.ts
  ├── rooms/
  │   └── ...
  └── users/
      └── ...
```

### 2. **Barrel Exports** (index.ts)
Use barrel exports for cleaner imports:

```typescript
// features/messages/index.ts
export { MessageService } from './services/message.service';
export { MessageRepository } from './repositories/message.repository';
export { useMessages } from './hooks/use-messages';
export type { Message, MessagePayload } from './types/message.types';
```

### 3. **API Route Pattern**
Keep API routes thin - delegate to services:

```typescript
// app/api/messages/route.ts
import { MessageService } from '@/lib/services/message.service';
import { handleError } from '@/lib/errors/error-handler';
import { messageSchema } from '@/lib/validations/message.schema';
import { getServerSession } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const validated = messageSchema.parse(body);
    
    const messageService = new MessageService(
      messageRepository,
      roomRepository,
      socketService
    );
    
    const message = await messageService.sendMessage(
      session.user.id,
      validated.roomId,
      validated.content,
      validated.replyToId
    );
    
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
```

---

## 🌟 Best Practices for Open Source

### 1. **Documentation Standards**
- **README.md**: Setup, architecture overview, contribution guide
- **CONTRIBUTING.md**: How to contribute, code style, PR process
- **ARCHITECTURE.md**: This document
- **API.md**: API documentation
- **JSDoc Comments**: For all public functions/classes

### 2. **Code Quality Tools**
```json
// package.json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint-config-prettier": "^9.0.0",
    "prettier": "^3.0.0",
    "jest": "^29.0.0",
    "@testing-library/react": "^14.0.0"
  }
}
```

### 3. **TypeScript Strict Mode**
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 4. **Testing Strategy**
- **Unit Tests**: Services, repositories, utilities
- **Integration Tests**: API routes, database operations
- **E2E Tests**: Critical user flows (Playwright/Cypress)

### 5. **Git Workflow**
- **Main Branch**: Production-ready code
- **Develop Branch**: Integration branch
- **Feature Branches**: `feature/description`
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `refactor:`

### 6. **Environment Configuration**
```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  SOCKET_PORT: z.string().transform(Number),
});

export const env = envSchema.parse(process.env);
```

---

## 🗺️ Migration Roadmap

### Phase 1: Foundation (Week 1-2)
1. ✅ Set up error handling system
2. ✅ Create base repository class
3. ✅ Set up dependency injection container
4. ✅ Add TypeScript strict mode
5. ✅ Set up testing framework

### Phase 2: Data Layer (Week 3-4)
1. ✅ Create repository for Messages
2. ✅ Create repository for Rooms
3. ✅ Create repository for Users
4. ✅ Migrate API routes to use repositories
5. ✅ Write unit tests for repositories

### Phase 3: Business Logic (Week 5-6)
1. ✅ Create MessageService
2. ✅ Create RoomService
3. ✅ Create UserService
4. ✅ Migrate business logic from API routes
5. ✅ Write unit tests for services

### Phase 4: React Layer (Week 7-8)
1. ✅ Extract custom hooks from components
2. ✅ Implement state management (if needed)
3. ✅ Refactor components to use hooks
4. ✅ Write component tests

### Phase 5: Socket Layer (Week 9-10)
1. ✅ Refactor socket handlers
2. ✅ Implement factory pattern
3. ✅ Add socket service abstraction
4. ✅ Write socket tests

### Phase 6: Documentation & Polish (Week 11-12)
1. ✅ Write comprehensive documentation
2. ✅ Add JSDoc comments
3. ✅ Create contribution guide
4. ✅ Set up CI/CD
5. ✅ Code review and refactoring

---

## 🎯 Priority Recommendations

### High Priority (Do First)
1. **Repository Pattern** - Foundation for everything else
2. **Service Layer** - Separates business logic from API
3. **Error Handling** - Critical for production
4. **Custom Hooks** - Improves component maintainability

### Medium Priority
1. **Dependency Injection** - Makes testing easier
2. **State Management** - If app grows complex
3. **Socket Factory Pattern** - Better organization

### Low Priority (Nice to Have)
1. **Feature-based folder structure** - Can migrate gradually
2. **Advanced patterns** - Only if needed

---

## 📚 Additional Resources

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Next.js Best Practices](https://nextjs.org/docs/app/building-your-application/routing)
- [TypeScript Design Patterns](https://refactoring.guru/design-patterns/typescript)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## 🤝 Contributing Guidelines

When contributing:
1. Follow the established patterns
2. Write tests for new features
3. Update documentation
4. Use TypeScript strictly
5. Follow the code style (Prettier + ESLint)
6. Write meaningful commit messages

---

**Last Updated**: 2024
**Maintained By**: ChatFlow Team

