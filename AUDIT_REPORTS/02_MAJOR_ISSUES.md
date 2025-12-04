# Major Issues - Medium Priority Improvements

## 🟡 Issue #1: Duplicate Time Components

**Severity:** Major  
**Files:** `components/chat/message-time.tsx`, `components/admin/relative-time.tsx`

### Problem

These two components are 100% identical but serve different purposes.

### Solution

Consolidate into single `TimeDisplay` component (see Issue #1 in Critical Issues).

---

## 🟡 Issue #2: Hook Dependency Array Issues

**Severity:** Major  
**Impact:** Potential bugs, stale closures, unnecessary re-renders

### Problem

Several hooks have incomplete dependency arrays:

**File:** `hooks/use-api.ts`
```typescript
// Line 134 - Missing 'execute' in dependencies
useEffect(() => {
  if (immediate) {
    execute();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [immediate]); // execute is stable, but should be included for clarity
```

**File:** `hooks/use-socket.ts`
```typescript
// Line 170 - Using ref to avoid dependency, but could be cleaner
useEffect(() => {
  if (autoConnect && connectRef.current) {
    connectRef.current();
  }
}, [autoConnect]); // connect function accessed via ref
```

### Solution

**Fix use-api.ts:**
```typescript
useEffect(() => {
  if (immediate) {
    execute();
  }
  return () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };
}, [immediate, execute]); // Include execute - it's memoized with all deps
```

**Fix use-socket.ts:**
```typescript
// Better: Use useCallback with stable dependencies
const connectStable = useCallback(() => {
  connect();
}, [connect]);

useEffect(() => {
  if (autoConnect) {
    connectStable();
  }
}, [autoConnect, connectStable]);
```

---

## 🟡 Issue #3: Mixed API Hook Patterns

**Severity:** Major  
**Impact:** Inconsistent patterns, confusion, maintenance burden

### Problem

Two different API hook patterns coexist:

1. **useApi / useApiPost** - Custom hooks with manual state
2. **useQueryApi / useMutationApi** - React Query based hooks

Both are used throughout the codebase inconsistently.

### Solution

**Standardize on React Query hooks** (better caching, deduplication, background refetching):

```typescript
// Migration guide:

// OLD (useApi)
const { data, loading, error, execute } = useApi<Room[]>('/rooms');

// NEW (useQueryApi)
const { data, loading, error, refetch } = useQueryApi<Room[]>('/rooms');
```

**Create migration script:**
1. Replace all `useApi` with `useQueryApi`
2. Replace all `useApiPost` with `useMutationApi`
3. Update error handling (React Query handles this better)
4. Remove old hooks after migration

---

## 🟡 Issue #4: Inconsistent Error Boundary Usage

**Severity:** Major  
**Files:** Multiple error boundary components

### Problem

1. Three different error boundary implementations:
   - `components/error-boundary.tsx`
   - `components/error-boundaries.tsx`
   - `components/error-boundary-wrapper.tsx`

2. Inconsistent usage:
   - Some components wrapped, others not
   - Different fallback UIs
   - Inconsistent error logging

### Solution

**Consolidate into single error boundary:**

```typescript
// components/error-boundary.tsx
"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'critical';
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to Sentry/file logger
    logger.error(`ErrorBoundary (${this.props.level || 'component'}):`, error, {
      component: 'ErrorBoundary',
      errorInfo,
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          {this.props.level === 'component' && (
            <button onClick={() => this.setState({ hasError: false, error: null })}>
              Try again
            </button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Usage:**
```typescript
// Wrap critical sections
<ErrorBoundary level="component" fallback={<ComponentError />}>
  <MessageList />
</ErrorBoundary>
```

---

## 🟡 Issue #5: Date Serialization Inconsistency

**Severity:** Major  
**Impact:** Type errors, runtime issues

### Problem

Dates are inconsistently handled:
- Sometimes `Date` objects
- Sometimes ISO strings
- Conversion logic scattered

**Example from `app/chat/[roomId]/page.tsx`:**
```typescript
// Line 102 - Assumes Date, but might be string
createdAt: message.createdAt.toISOString(),
```

### Solution

**Create date utility:**
```typescript
// lib/utils/date-helpers.ts
export function toISOString(date: Date | string | null | undefined): string | undefined {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  if (date instanceof Date) return date.toISOString();
  return new Date(date).toISOString();
}
```

**Use consistently:**
```typescript
createdAt: toISOString(message.createdAt) || new Date().toISOString(),
```

---

## 🟡 Issue #6: API Response Type Mismatch

**Severity:** Major  
**Impact:** Type safety issues

### Problem

Message type enum mismatch:
- Database/Prisma: `TEXT | IMAGE | VIDEO | FILE | AUDIO` (uppercase)
- API validation: `"text" | "image" | "video" | "file" | "audio"` (lowercase)
- Frontend: Uses uppercase

### Solution

**Standardize on lowercase** (already fixed in `use-message-operations.ts`):
- Keep API validation as lowercase
- Convert in service layer if needed
- Document the convention

---

## 🟡 Issue #7: Missing Suspense Boundaries

**Severity:** Major  
**Impact:** Next.js 16 warnings, potential hydration issues

### Problem

`useSearchParams()` used without Suspense boundary (Next.js 16 requirement).

**File:** `app/auth/login/page.tsx`

### Solution

```typescript
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams(); // Now safe
  // ...
}
```

---

## 🟡 Issue #8: Inefficient Re-renders

**Severity:** Major  
**Impact:** Performance degradation

### Problem

Some components re-render unnecessarily:

**File:** `components/chat/chat-room.tsx`
```typescript
// Line 103 - Selector might cause unnecessary re-renders
const messages = useMessagesStore((state) => state.messagesByRoom[roomId]);
```

### Solution

**Use shallow equality:**
```typescript
import { shallow } from 'zustand/shallow';

const messages = useMessagesStore(
  (state) => state.messagesByRoom[roomId] || [],
  shallow
);
```

**Or use selector with equality:**
```typescript
const messages = useMessagesStore(
  (state) => state.messagesByRoom[roomId],
  (a, b) => a?.length === b?.length && a?.every((msg, i) => msg.id === b?.[i]?.id)
);
```

---

## 🟡 Issue #9: Console Logging in Production

**Severity:** Major  
**Impact:** Performance, security, noise

### Problem

Debug console.logs left in production code:

**Files:**
- `components/chat/voice-recorder.tsx` - Multiple console.log/warn
- `components/chat/chat-room.tsx` - logger.log calls
- Various other files

### Solution

**Use logger consistently:**
```typescript
// Instead of console.log
console.log('Debug info');

// Use logger (only logs in dev)
logger.log('Debug info');

// For errors, always use logger
logger.error('Error occurred', error, { context });
```

**Add ESLint rule:**
```json
{
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

---

## 🟡 Issue #10: Missing Type Safety

**Severity:** Major  
**Impact:** Runtime errors, poor DX

### Problem

Some `any` types that could be more specific:

**File:** `app/chat/[roomId]/page.tsx`
```typescript
// Line 21
const roomService = await getService<any>('roomService');
```

### Solution

**Create proper service types:**
```typescript
// lib/di/service-types.ts
export interface IRoomService {
  getRoomWithMessages(roomId: string, userId: string, limit: number): Promise<RoomWithMessages>;
  // ... other methods
}

// Usage
const roomService = await getService<IRoomService>('roomService');
```

---

## Summary

**Total Major Issues:** 10  
**Priority:** Address in Phase 2 (Weeks 2-3)

**Quick Wins:**
1. Consolidate error boundaries (Issue #4)
2. Fix hook dependencies (Issue #2)
3. Remove console.logs (Issue #9)
4. Add Suspense boundaries (Issue #7)

