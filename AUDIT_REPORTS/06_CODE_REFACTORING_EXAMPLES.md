# Code Refactoring Examples

## Example 1: Consolidate Time Components

### Before

```typescript
// components/chat/message-time.tsx
"use client";
import { useEffect, useState } from "react";
import { formatMessageTime } from "@/lib/utils";

export function MessageTime({ timestamp }: MessageTimeProps) {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");

  useEffect(() => {
    setMounted(true);
    setTime(formatMessageTime(timestamp));
    const interval = setInterval(() => {
      setTime(formatMessageTime(timestamp));
    }, 60000);
    return () => clearInterval(interval);
  }, [timestamp]);

  if (!mounted) {
    return <span className="opacity-0">--</span>;
  }
  return <span>{time}</span>;
}
```

```typescript
// components/admin/relative-time.tsx (IDENTICAL)
"use client";
import { useEffect, useState } from "react";
import { formatMessageTime } from "@/lib/utils";

export function RelativeTime({ timestamp }: RelativeTimeProps) {
  // ... EXACT SAME CODE ...
}
```

### After

```typescript
// components/shared/time-display.tsx
"use client";
import { useEffect, useState } from "react";
import { formatTime, FormatTimeOptions } from "@/lib/utils/date-formatter";

interface TimeDisplayProps {
  timestamp: string | Date;
  format?: FormatTimeOptions['format'];
  className?: string;
  updateInterval?: number;
}

export function TimeDisplay({
  timestamp,
  format = 'relative',
  className,
  updateInterval = 60000,
}: TimeDisplayProps) {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");

  useEffect(() => {
    setMounted(true);
    setTime(formatTime(timestamp, { format }));

    const interval = setInterval(() => {
      setTime(formatTime(timestamp, { format }));
    }, updateInterval);

    return () => clearInterval(interval);
  }, [timestamp, format, updateInterval]);

  if (!mounted) {
    return <span className={className || "opacity-0"}>--</span>;
  }

  return <span className={className}>{time}</span>;
}
```

```typescript
// components/chat/message-time.tsx
export function MessageTime({ timestamp }: MessageTimeProps) {
  return <TimeDisplay timestamp={timestamp} format="relative" />;
}

// components/admin/relative-time.tsx
export function RelativeTime({ timestamp }: RelativeTimeProps) {
  return <TimeDisplay timestamp={timestamp} format="relative" />;
}
```

**Benefits:**
- ✅ Eliminates 40+ lines of duplicate code
- ✅ Single source of truth
- ✅ Easier to maintain
- ✅ Consistent behavior

---

## Example 2: Refactor Voice Recorder with Permissions System

### Before

```typescript
// components/chat/voice-recorder.tsx
export function VoiceRecorder({ ... }: VoiceRecorderProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  useEffect(() => {
    // 100+ lines of permission checking logic
    const checkPermission = async () => {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ 
          name: 'microphone' as PermissionName 
        });
        // ... complex logic ...
      }
    };
    checkPermission();
  }, []);

  const startRecording = async () => {
    // More permission checking...
    try {
      if (navigator.permissions && navigator.permissions.query) {
        // ... duplicate logic ...
      }
      const stream = await navigator.mediaDevices.getUserMedia({ ... });
      // ...
    } catch (error) {
      // Error handling...
    }
  };
}
```

### After

```typescript
// components/chat/voice-recorder.tsx
import { useMicrophone } from '@/lib/permissions/hooks/use-microphone';

export function VoiceRecorder({ ... }: VoiceRecorderProps) {
  const { 
    status, 
    request, 
    isGranted, 
    isRequesting 
  } = useMicrophone({
    onGranted: () => {
      // Optional: Show success toast
    },
    onDenied: () => {
      toast.error("Microphone permission denied");
    },
  });

  const startRecording = async () => {
    // Request permission if not granted
    if (!isGranted) {
      await request();
      if (!isGranted) return; // Still not granted after request
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Start recording...
    } catch (error) {
      logger.error("Error starting recording:", error);
      toast.error("Failed to start recording");
    }
  };

  return (
    <button 
      onClick={startRecording}
      disabled={!isGranted && isRequesting}
    >
      <Mic />
    </button>
  );
}
```

**Benefits:**
- ✅ Reduced from 400+ lines to ~150 lines
- ✅ Reusable permission logic
- ✅ Consistent UX
- ✅ Better error handling

---

## Example 3: Standardize API Hooks

### Before

```typescript
// Mixed usage
const { data, loading, error } = useApi<Room[]>('/rooms');
const { data: rooms } = useQueryApi<Room[]>('/rooms');
```

### After

```typescript
// Standardized on React Query
const { data, loading, error, refetch } = useQueryApi<Room[]>('/rooms', {
  staleTime: 30000,
  refetchInterval: 60000,
});
```

**Migration Script:**
```typescript
// scripts/migrate-api-hooks.ts
// Find and replace:
// useApi<Type>('/endpoint') -> useQueryApi<Type>('/endpoint')
// useApiPost<Type>('/endpoint') -> useMutationApi<Type>('/endpoint')
```

---

## Example 4: Improve Date Handling

### Before

```typescript
// app/chat/[roomId]/page.tsx
const messages = room.messages.map((message) => ({
  // ...
  createdAt: message.createdAt.toISOString(), // Might fail if string
  // ...
}));
```

### After

```typescript
// lib/utils/date-helpers.ts
export function toISOString(
  date: Date | string | null | undefined
): string | undefined {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  if (date instanceof Date) return date.toISOString();
  return new Date(date).toISOString();
}

// Usage
const messages = room.messages.map((message) => ({
  // ...
  createdAt: toISOString(message.createdAt) || new Date().toISOString(),
  // ...
}));
```

---

## Example 5: Consolidate Error Boundaries

### Before

```typescript
// Three different error boundary files
// components/error-boundary.tsx
// components/error-boundaries.tsx
// components/error-boundary-wrapper.tsx
```

### After

```typescript
// components/error-boundary.tsx (single, comprehensive)
export class ErrorBoundary extends Component<Props, State> {
  // ... unified implementation ...
}

// Usage
<ErrorBoundary level="component" fallback={<ErrorUI />}>
  <Component />
</ErrorBoundary>
```

---

## Example 6: Optimize Zustand Selectors

### Before

```typescript
// components/chat/chat-room.tsx
const messages = useMessagesStore((state) => state.messagesByRoom[roomId]);
// Might cause unnecessary re-renders
```

### After

```typescript
import { shallow } from 'zustand/shallow';

const messages = useMessagesStore(
  (state) => state.messagesByRoom[roomId] || [],
  shallow // Only re-render if array reference changes
);
```

---

## Example 7: Add React 19 Server Actions

### Before

```typescript
// app/auth/login/page.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    // ... handle result ...
  } catch (error) {
    // ... handle error ...
  } finally {
    setLoading(false);
  }
};
```

### After

```typescript
// app/auth/login/actions.ts
"use server";

export async function loginAction(
  prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  const result = await signIn("credentials", {
    email,
    password,
    redirect: false,
  });

  if (result?.error) {
    return { error: "Invalid credentials" };
  }

  redirect("/chat");
}

// app/auth/login/page.tsx
"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, null);

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      {state?.error && <p>{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
```

**Benefits:**
- ✅ Less client-side JavaScript
- ✅ Automatic pending state
- ✅ Better UX
- ✅ Type-safe

---

## Summary

These refactoring examples demonstrate:
- Code deduplication
- Modern React patterns
- Better type safety
- Improved maintainability
- Performance optimizations

Apply these patterns incrementally, starting with the highest-impact changes.

