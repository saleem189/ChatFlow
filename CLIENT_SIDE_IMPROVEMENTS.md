# Client-Side Architecture Improvements

## 📊 Current State Analysis

### Issues Identified

#### 1. **Multiple Socket Connections** 🔴 Critical
**Problem**: Multiple components create their own socket connections instead of sharing one.

**Current State**:
- `chat-room.tsx` uses `getSocket()` (singleton) ✅
- `chat-sidebar.tsx` creates new socket with `io(SOCKET_URL)` ❌
- `use-online-users.ts` creates new socket ❌
- `app/admin/activity/page.tsx` creates new socket ❌

**Impact**:
- Multiple WebSocket connections (wasteful)
- Inconsistent connection state
- Harder to manage connection lifecycle
- Potential race conditions

**Files Affected**:
- `components/chat/chat-sidebar.tsx` (line 102)
- `hooks/use-online-users.ts` (line 87)
- `app/admin/activity/page.tsx` (line 55)

---

#### 2. **No Centralized API Client** 🔴 Critical
**Problem**: Direct `fetch()` calls scattered across components with no abstraction.

**Current State**:
- 17+ components use direct `fetch()` calls
- Inconsistent error handling
- No request/response interceptors
- No retry logic
- No request cancellation
- Duplicate error handling code

**Impact**:
- Hard to maintain
- Inconsistent error messages
- No centralized logging
- Difficult to add authentication headers globally
- Hard to mock for testing

**Files Affected**:
- All components in `components/chat/`
- All components in `components/admin/`

---

#### 3. **No Global State Management** 🟡 Medium
**Problem**: Each component manages its own state, leading to duplication and inconsistency.

**Current State**:
- No Context API or state management library
- Duplicate state (e.g., `onlineUsers` in multiple places)
- No shared state for rooms, messages, user data
- Props drilling for shared data

**Impact**:
- State synchronization issues
- Unnecessary re-renders
- Hard to share state across components
- Difficult to persist state

**Recommendation**: Use Zustand or React Context for:
- User session
- Online users
- Rooms list
- Current room state

---

#### 4. **Tight Coupling** 🟡 Medium
**Problem**: Components directly depend on implementation details.

**Current State**:
- Components directly import `io` from `socket.io-client`
- Components directly call API endpoints
- Hard to test (can't easily mock)
- Hard to swap implementations

**Impact**:
- Difficult to test
- Hard to refactor
- Tight coupling to external libraries

---

#### 5. **Missing Custom Hooks** 🟡 Medium
**Problem**: Common operations not abstracted into reusable hooks.

**Missing Hooks**:
- `useSocket` - Socket connection and event handling
- `useApi` / `useFetch` - API calls with loading/error states
- `useRooms` - Room management (fetch, create, update)
- `useMessages` - Message management (send, edit, delete)
- `useTyping` - Typing indicator logic
- `useFileUpload` - File upload logic
- `useSession` - User session management

**Current State**:
- Logic duplicated across components
- Inconsistent patterns
- Hard to reuse

---

#### 6. **Code Duplication** 🟡 Medium
**Problem**: Similar patterns repeated across multiple files.

**Examples**:
- Socket connection setup (4+ places)
- API error handling (17+ places)
- Loading states management
- Online users tracking

---

## 🎯 Recommended Improvements

### Priority 1: Critical (Do First)

#### 1.1 Centralize Socket Connection
**Create**: `hooks/use-socket.ts`

```typescript
// Single hook for all socket operations
export function useSocket() {
  const socket = getSocket(); // Use singleton
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [socket]);
  
  return { socket, isConnected };
}
```

**Benefits**:
- Single connection point
- Consistent connection state
- Easy to manage lifecycle

---

#### 1.2 Create API Client
**Create**: `lib/api-client.ts`

```typescript
class ApiClient {
  private baseURL = '/api';
  
  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(error.error || 'Request failed', response.status);
    }
    
    return response.json();
  }
  
  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }
  
  post<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  // ... patch, delete, etc.
}

export const apiClient = new ApiClient();
```

**Benefits**:
- Centralized error handling
- Consistent request format
- Easy to add interceptors
- Easy to mock for tests

---

#### 1.3 Create API Hooks
**Create**: `hooks/use-api.ts`, `hooks/use-rooms.ts`, `hooks/use-messages.ts`

```typescript
// hooks/use-api.ts
export function useApi<T>(endpoint: string, options?: RequestInit) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    apiClient.get<T>(endpoint)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [endpoint]);
  
  return { data, loading, error };
}

// hooks/use-rooms.ts
export function useRooms() {
  const { data: rooms, loading, error, refetch } = useApi<Room[]>('/rooms');
  
  const createRoom = useCallback(async (data: CreateRoomData) => {
    const room = await apiClient.post<Room>('/rooms', data);
    refetch();
    return room;
  }, [refetch]);
  
  return { rooms, loading, error, createRoom, refetch };
}
```

**Benefits**:
- Reusable API logic
- Consistent loading/error states
- Easy to use in components

---

### Priority 2: High (Do Next)

#### 2.1 Global State Management
**Create**: `lib/store/` using Zustand

```typescript
// lib/store/use-user-store.ts
import { create } from 'zustand';

interface UserStore {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));

// lib/store/use-rooms-store.ts
export const useRoomsStore = create<RoomsStore>((set) => ({
  rooms: [],
  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((state) => ({ rooms: [...state.rooms, room] })),
  updateRoom: (id, updates) => set((state) => ({
    rooms: state.rooms.map((r) => r.id === id ? { ...r, ...updates } : r),
  })),
}));
```

**Benefits**:
- Shared state across components
- No props drilling
- Easy to persist
- Better performance

---

#### 2.2 Custom Hooks for Common Operations
**Create**: Multiple specialized hooks

```typescript
// hooks/use-typing.ts
export function useTyping(roomId: string, userId: string, userName: string) {
  const { socket } = useSocket();
  
  const startTyping = useCallback(() => {
    socket.emit('typing', { roomId, userId, userName });
  }, [socket, roomId, userId, userName]);
  
  const stopTyping = useCallback(() => {
    socket.emit('stop-typing', { roomId, userId });
  }, [socket, roomId, userId]);
  
  return { startTyping, stopTyping };
}

// hooks/use-file-upload.ts
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiClient.post<UploadResult>('/upload', formData);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);
  
  return { upload, uploading, error };
}
```

---

### Priority 3: Medium (Nice to Have)

#### 3.1 Error Boundary Component
**Create**: `components/error-boundary.tsx`

```typescript
export class ErrorBoundary extends React.Component {
  // Catch and display errors gracefully
}
```

---

#### 3.2 Request Cancellation
**Enhance**: API client with AbortController support

```typescript
class ApiClient {
  private abortControllers = new Map<string, AbortController>();
  
  request<T>(endpoint: string, options?: RequestInit & { signalKey?: string }): Promise<T> {
    const controller = new AbortController();
    if (options?.signalKey) {
      // Cancel previous request with same key
      this.abortControllers.get(options.signalKey)?.abort();
      this.abortControllers.set(options.signalKey, controller);
    }
    
    return fetch(..., { ...options, signal: controller.signal });
  }
}
```

---

#### 3.3 Optimistic Updates Pattern
**Create**: Utility for optimistic updates

```typescript
// lib/utils/optimistic-updates.ts
export function useOptimisticUpdate<T>(
  current: T[],
  updateFn: (item: T) => T,
  rollbackFn: () => Promise<void>
) {
  const [optimistic, setOptimistic] = useState<T[]>(current);
  
  const applyUpdate = useCallback(async (item: T) => {
    // Optimistically update
    setOptimistic((prev) => updateFn(prev));
    
    try {
      await rollbackFn();
    } catch {
      // Rollback on error
      setOptimistic(current);
    }
  }, [current, updateFn, rollbackFn]);
  
  return { data: optimistic, applyUpdate };
}
```

---

## 📋 Implementation Plan

### Phase 1: Critical Fixes (Week 1)
1. ✅ Create `hooks/use-socket.ts` - Centralize socket connection
2. ✅ Create `lib/api-client.ts` - Centralized API client
3. ✅ Create `hooks/use-api.ts` - Generic API hook
4. ✅ Refactor components to use centralized socket
5. ✅ Refactor components to use API client

### Phase 2: State Management (Week 2)
1. ✅ Install Zustand
2. ✅ Create user store
3. ✅ Create rooms store
4. ✅ Create messages store
5. ✅ Refactor components to use stores

### Phase 3: Specialized Hooks (Week 3)
1. ✅ Create `hooks/use-rooms.ts`
2. ✅ Create `hooks/use-messages.ts`
3. ✅ Create `hooks/use-typing.ts`
4. ✅ Create `hooks/use-file-upload.ts`
5. ✅ Create `hooks/use-session.ts`

### Phase 4: Polish (Week 4)
1. ✅ Add error boundaries
2. ✅ Add request cancellation
3. ✅ Add optimistic updates
4. ✅ Add loading skeletons
5. ✅ Add retry logic

---

## 🎨 Design Patterns to Apply

### 1. **Repository Pattern** (Client-Side)
Similar to backend, create client-side repositories:

```typescript
// lib/repositories/room.repository.ts (client-side)
export class RoomRepository {
  constructor(private api: ApiClient) {}
  
  async getAll(): Promise<Room[]> {
    return this.api.get('/rooms');
  }
  
  async create(data: CreateRoomData): Promise<Room> {
    return this.api.post('/rooms', data);
  }
}
```

### 2. **Service Layer** (Client-Side)
Business logic separation:

```typescript
// lib/services/room.service.ts (client-side)
export class RoomService {
  constructor(
    private roomRepo: RoomRepository,
    private socket: Socket
  ) {}
  
  async createRoom(data: CreateRoomData): Promise<Room> {
    const room = await this.roomRepo.create(data);
    this.socket.emit('room-created', room);
    return room;
  }
}
```

### 3. **Observer Pattern**
For socket events:

```typescript
// lib/events/event-emitter.ts
export class EventEmitter {
  private listeners = new Map<string, Set<Function>>();
  
  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }
  
  emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(handler => handler(data));
  }
}
```

### 4. **Factory Pattern**
For creating hooks:

```typescript
// hooks/factory.ts
export function createApiHook<T>(endpoint: string) {
  return function useApiHook() {
    return useApi<T>(endpoint);
  };
}
```

---

## 📊 Expected Benefits

### Before
- ❌ Multiple socket connections (4+)
- ❌ 17+ direct fetch calls
- ❌ Duplicate state management
- ❌ Tight coupling
- ❌ Hard to test
- ❌ Inconsistent error handling

### After
- ✅ Single socket connection
- ✅ Centralized API client
- ✅ Global state management
- ✅ Loose coupling
- ✅ Easy to test
- ✅ Consistent error handling
- ✅ Reusable hooks
- ✅ Better performance
- ✅ Easier to maintain
- ✅ Scalable architecture

---

## 🔧 Migration Strategy

### Step 1: Create New Infrastructure
1. Create API client
2. Create socket hook
3. Create base hooks

### Step 2: Migrate One Component at a Time
1. Start with `chat-sidebar.tsx`
2. Replace socket connection
3. Replace fetch calls
4. Test thoroughly

### Step 3: Roll Out Gradually
1. Migrate chat components
2. Migrate admin components
3. Remove old code
4. Update tests

---

## 📝 Code Examples

### Before (chat-sidebar.tsx)
```typescript
// Multiple socket connections
const newSocket = io(SOCKET_URL, { ... });

// Direct fetch
const response = await fetch("/api/rooms");
const data = await response.json();
```

### After
```typescript
// Single socket hook
const { socket, isConnected } = useSocket();

// API hook
const { rooms, loading, error, refetch } = useRooms();

// Or with store
const { rooms, setRooms } = useRoomsStore();
```

---

## ✅ Checklist

### Infrastructure
- [ ] Create `lib/api-client.ts`
- [ ] Create `hooks/use-socket.ts`
- [ ] Create `hooks/use-api.ts`
- [ ] Create error handling utilities

### State Management
- [ ] Install Zustand
- [ ] Create user store
- [ ] Create rooms store
- [ ] Create messages store

### Hooks
- [ ] Create `hooks/use-rooms.ts`
- [ ] Create `hooks/use-messages.ts`
- [ ] Create `hooks/use-typing.ts`
- [ ] Create `hooks/use-file-upload.ts`
- [ ] Create `hooks/use-session.ts`

### Refactoring
- [ ] Refactor `chat-sidebar.tsx`
- [ ] Refactor `chat-room.tsx`
- [ ] Refactor `use-online-users.ts`
- [ ] Refactor admin components
- [ ] Remove duplicate code

### Testing
- [ ] Add unit tests for hooks
- [ ] Add integration tests
- [ ] Test socket connection
- [ ] Test API client

---

## 🚀 Next Steps

1. **Review this document** - Confirm priorities
2. **Start with Phase 1** - Critical fixes first
3. **Migrate incrementally** - One component at a time
4. **Test thoroughly** - Ensure no regressions
5. **Document changes** - Update architecture docs

---

## 📚 Additional Resources

- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [React Query](https://tanstack.com/query/latest) (Alternative to custom API hooks)
- [Socket.io Best Practices](https://socket.io/docs/v4/best-practices/)
- [React Hooks Patterns](https://reactpatterns.com/)

