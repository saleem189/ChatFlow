# Enhanced Error Handling Guide

## Overview

Enhanced error handling system with:
- ✅ Error categorization and recovery strategies
- ✅ Context-aware error logging
- ✅ User-friendly error messages
- ✅ Automatic retry logic

## New Utilities

### 1. Error Recovery (`lib/errors/error-recovery.ts`)

**Purpose:** Categorize errors and determine recovery strategies

**Usage:**
```typescript
import { categorizeError, getRecoveryStrategy, isRecoverableError } from '@/lib/errors';

// Categorize error
const category = categorizeError(error);
// Returns: ErrorCategory.NETWORK | AUTHENTICATION | VALIDATION | etc.

// Check if error can be retried
if (isRecoverableError(error)) {
  // Retry logic
}

// Get recovery strategy
const strategy = getRecoveryStrategy(error, attemptNumber);
// Returns: { shouldRetry, retryDelay, maxRetries, userMessage }
```

**Error Categories:**
- `NETWORK` - Connection issues (retryable)
- `AUTHENTICATION` - Auth failures (not retryable)
- `VALIDATION` - Invalid input (not retryable)
- `NOT_FOUND` - Resource not found (not retryable)
- `RATE_LIMIT` - Too many requests (retryable with delay)
- `SERVER` - Server errors (retryable)
- `UNKNOWN` - Unknown errors (retryable once)

### 2. Error Context (`lib/errors/error-context.ts`)

**Purpose:** Add context to errors for better debugging

**Usage:**
```typescript
import { logErrorWithContext, createErrorContext, withErrorContext } from '@/lib/errors';

// Log error with context
logErrorWithContext(error, {
  component: 'MessageInput',
  action: 'sendMessage',
  userId: currentUser.id,
  roomId: roomId,
});

// Create context helper
const context = createErrorContext('ChatRoom', 'loadMessages', { roomId });

// Wrap async function
const result = await withErrorContext(
  async () => {
    return await fetchMessages();
  },
  { component: 'ChatRoom', action: 'loadMessages' }
);
```

### 3. User-Friendly Messages (`lib/errors/user-messages.ts`)

**Purpose:** Map errors to user-friendly messages

**Usage:**
```typescript
import { getUserMessage, shouldShowErrorToUser, getErrorSeverity } from '@/lib/errors';

// Get user-friendly message
const message = getUserMessage(error);
// Returns: "Network error. Please check your connection and try again."

// Check if error should be shown
if (shouldShowErrorToUser(error)) {
  toast.error(getUserMessage(error));
}

// Get error severity for UI
const severity = getErrorSeverity(error);
// Returns: "error" | "warning" | "info"
```

## Integration Examples

### Example 1: API Hook with Retry

```typescript
import { getRecoveryStrategy, getUserMessage } from '@/lib/errors';
import { ApiError } from '@/lib/api-client';

async function fetchWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < 3) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const strategy = getRecoveryStrategy(error, attempt);
      
      if (!strategy.shouldRetry) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, strategy.retryDelay));
      attempt++;
    }
  }
  
  throw lastError;
}
```

### Example 2: Component Error Handling

```typescript
import { logErrorWithContext, getUserMessage, shouldShowErrorToUser } from '@/lib/errors';
import { toast } from 'sonner';

async function handleSendMessage() {
  try {
    await sendMessage(content);
  } catch (error) {
    // Log with context
    logErrorWithContext(error, {
      component: 'MessageInput',
      action: 'sendMessage',
      roomId: currentRoomId,
    });
    
    // Show user-friendly message
    if (shouldShowErrorToUser(error)) {
      toast.error(getUserMessage(error));
    }
  }
}
```

### Example 3: API Route Error Handling

```typescript
import { handleError } from '@/lib/errors';
import { logErrorWithContext } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // ... API logic
  } catch (error) {
    // Log with context
    logErrorWithContext(error, {
      component: 'MessagesAPI',
      action: 'POST',
      metadata: { roomId, userId },
    });
    
    // Return standardized error response
    return handleError(error);
  }
}
```

## Migration Guide

### Before:
```typescript
try {
  await apiCall();
} catch (error) {
  console.error('Error:', error);
  toast.error('Something went wrong');
}
```

### After:
```typescript
import { logErrorWithContext, getUserMessage, shouldShowErrorToUser } from '@/lib/errors';

try {
  await apiCall();
} catch (error) {
  logErrorWithContext(error, {
    component: 'ComponentName',
    action: 'actionName',
  });
  
  if (shouldShowErrorToUser(error)) {
    toast.error(getUserMessage(error));
  }
}
```

## Benefits

1. **Consistent Error Handling** - All errors handled the same way
2. **Better Debugging** - Context helps identify issues quickly
3. **User-Friendly** - Messages are clear and actionable
4. **Automatic Recovery** - Retry logic for recoverable errors
5. **Better UX** - Users see appropriate messages, not technical errors

## Next Steps

1. Gradually migrate existing error handling to use new utilities
2. Add error context to critical operations
3. Use recovery strategies for network operations
4. Replace hardcoded error messages with `getUserMessage()`

