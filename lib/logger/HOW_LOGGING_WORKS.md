# How Logging Works - Current Architecture

**Date:** December 2024  
**Status:** 🟡 **Hybrid** (New DI Pattern + Old Singleton Pattern)

---

## 📐 Current Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Services Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │MessageService│  │ UserService  │  │EmailService  │      │
│  │ (NEW - DI)   │  │ (NEW - DI)   │  │ (OLD - Import)│     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         │ (injected)      │ (injected)       │ (direct import)│
│         ▼                 ▼                  ▼               │
└─────────────────────────────────────────────────────────────┘
         │                 │                  │
         │                 │                  │
    ┌────┴─────────────────┴──────────────────┴────┐
    │                                                 │
    ▼                                                 ▼
┌─────────────────────────┐              ┌─────────────────────────┐
│   NEW: DI Pattern       │              │   OLD: Singleton Pattern │
│   (MessageService,      │              │   (EmailService, etc.)  │
│    UserService)         │              │                          │
└───────────┬─────────────┘              └───────────┬─────────────┘
            │                                          │
            ▼                                          ▼
┌─────────────────────────────────────────────────────────────┐
│              ILogger Interface                              │
│              - log(), info(), warn(), error(), performance() │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              SentryLogger (implements ILogger)              │
│              Uses: IErrorTrackingAdapter                    │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         IErrorTrackingAdapter (Generic Interface)          │
│         - captureException()                                │
│         - captureMessage()                                  │
│         - addBreadcrumb()                                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              SentryAdapter (Sentry Implementation)          │
│              Wraps Sentry SDK calls                         │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Sentry SDK (@sentry/nextjs)                    │
│              - captureException()                           │
│              - captureMessage()                             │
│              - addBreadcrumb()                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 How It Works - Step by Step

### Scenario 1: MessageService (NEW - Using DI)

#### Step 1: Service Calls Logger

```typescript
// lib/services/message.service.ts
export class MessageService {
  constructor(
    private messageRepo: MessageRepository,
    private roomRepo: RoomRepository,
    private logger: ILogger, // ✅ Injected via DI
  ) {}

  async sendMessage(...) {
    try {
      // ... business logic
    } catch (error) {
      this.logger.error('Failed to send push notifications:', error, {
        component: 'MessageService',
        roomId,
        userId,
      });
    }
  }
}
```

#### Step 2: Logger Implementation (SentryLogger)

```typescript
// lib/logger/sentry-logger.ts
export class SentryLogger implements ILogger {
  constructor(private errorTrackingAdapter: IErrorTrackingAdapter) {}

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    // 1. Always log to console
    console.error(`[ERROR] ${message}`, error || '', context || '');

    // 2. Send to error tracking via adapter
    if (error instanceof Error) {
      this.errorTrackingAdapter.captureException(error, {
        message,
        ...context,
      });
    }
  }
}
```

#### Step 3: Adapter Wraps Sentry

```typescript
// lib/logger/sentry-adapter.ts
export class SentryAdapter implements IErrorTrackingAdapter {
  captureException(error: Error, context?: Record<string, unknown>): void {
    // Calls Sentry SDK
    captureException(error, context);
  }
}
```

#### Step 4: Sentry SDK Sends to Sentry

```typescript
// lib/monitoring/sentry.ts
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
    Sentry.captureException(error, { extra: context });
  }
}
```

**Result:** Error appears in Sentry dashboard ✅

---

### Scenario 2: EmailService (OLD - Using Singleton)

#### Step 1: Service Imports Logger Directly

```typescript
// lib/services/email.service.ts
import { logger } from '@/lib/logger'; // ❌ Direct import (old pattern)

export class EmailService {
  async sendEmail(...) {
    try {
      // ... business logic
    } catch (error) {
      logger.error('Failed to send email:', error); // ❌ Direct usage
    }
  }
}
```

#### Step 2: Singleton Logger

```typescript
// lib/logger/logger-singleton.ts
import { SentryAdapter } from './sentry-adapter';
import { SentryLogger } from './sentry-logger';

// Create singleton instances
const errorTrackingAdapter = new SentryAdapter();
const logger = new SentryLogger(errorTrackingAdapter);

export { logger };
```

#### Step 3: Same Flow as New Pattern

The singleton logger uses the same `SentryLogger` → `SentryAdapter` → Sentry SDK flow.

**Result:** Error appears in Sentry dashboard ✅ (but not using DI)

---

## 🎯 Current State: Hybrid Architecture

### ✅ **NEW Pattern (Using DI)** - 2 Services

1. **MessageService**
   - ✅ Logger injected via constructor
   - ✅ Uses `this.logger.error(...)`
   - ✅ Registered in DI container

2. **UserService**
   - ✅ Logger injected via constructor
   - ✅ Uses `this.logger.error(...)`
   - ✅ Registered in DI container

### ⚠️ **OLD Pattern (Direct Import)** - 25+ Services

3. **EmailService** - Direct import
4. **PushService** - Direct import
5. **MessageNotificationService** - Direct import
6. **EventBus** - Direct import
7. **ConfigService** - Direct import
8. **QueueService** - Custom logger (doesn't use Sentry)
9. And 20+ more files...

---

## 🔍 Detailed Flow Example

### Example: MessageService Logs an Error

```typescript
// 1. Service receives logger via DI
const messageService = new MessageService(
  messageRepo,
  roomRepo,
  logger, // ✅ Injected
);

// 2. Service calls logger
messageService.sendMessage(...)
  .catch(error => {
    this.logger.error('Failed to send message', error, {
      component: 'MessageService',
      roomId: 'room123',
    });
  });

// 3. SentryLogger processes the call
// lib/logger/sentry-logger.ts
error(message: string, error?: Error, context?: LogContext) {
  console.error(`[ERROR] ${message}`, error, context);
  
  this.errorTrackingAdapter.captureException(error, {
    message,
    component: 'MessageService',
    roomId: 'room123',
  });
}

// 4. SentryAdapter wraps Sentry call
// lib/logger/sentry-adapter.ts
captureException(error: Error, context?: Record<string, unknown>) {
  captureException(error, context); // Calls lib/monitoring/sentry.ts
}

// 5. Sentry monitoring function
// lib/monitoring/sentry.ts
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (shouldSendToSentry()) {
    Sentry.captureException(error, { extra: context });
  }
}

// 6. Sentry SDK sends to Sentry servers
// @sentry/nextjs
Sentry.captureException(...) → Sentry Dashboard ✅
```

---

## 📊 What Happens When You Log

### `logger.error('Message', error, { component: 'Service' })`

1. **Console Output** (Always)
   ```
   [ERROR] Message Error: ... { component: 'Service' }
   ```

2. **Sentry Breadcrumb** (If enabled)
   - Added to error context
   - Shows in Sentry dashboard

3. **Sentry Exception** (If enabled)
   - Sent to Sentry dashboard
   - Includes stack trace, context, breadcrumbs
   - Appears in Issues page

### `logger.info('User logged in', { userId: '123' })`

1. **Console Output** (Development only)
   ```
   [INFO] User logged in { userId: '123' }
   ```

2. **Sentry Breadcrumb** (Always)
   - Added as context
   - Shows in error breadcrumbs

3. **NOT sent as event** (Info is just context)

### `logger.warn('Slow query', { duration: 1500 }, true)`

1. **Console Output** (Development only)
   ```
   [WARN] Slow query { duration: 1500 }
   ```

2. **Sentry Breadcrumb** (Always)
   - Added as context

3. **Sentry Message** (If `sendToSentry = true`)
   - Sent as warning-level message
   - Appears in Sentry dashboard

---

## 🔧 DI Container Registration

```typescript
// lib/di/providers.ts
export function setupDI(): void {
  // 1. Register error tracking adapter
  container.register('errorTrackingAdapter', () => new SentryAdapter(), true);
  
  // 2. Register logger (uses adapter)
  container.register<ILogger>('logger', () => {
    const adapter = container.resolveSync<IErrorTrackingAdapter>('errorTrackingAdapter');
    return new SentryLogger(adapter);
  }, true);
  
  // 3. Register services with logger injection
  container.register('messageService', () => {
    return new MessageService(
      container.resolveSync('messageRepository'),
      container.resolveSync('roomRepository'),
      container.resolveSync<ILogger>('logger'), // ✅ Logger injected
    );
  }, true);
}
```

---

## 🆚 Comparison: New vs Old Pattern

### NEW Pattern (MessageService, UserService)

```typescript
// ✅ Uses DI
export class MessageService {
  constructor(private logger: ILogger) {} // ✅ Injected
  
  async sendMessage() {
    this.logger.error('Error', error); // ✅ Uses injected logger
  }
}
```

**Benefits:**
- ✅ Testable (can inject mock logger)
- ✅ Decoupled (doesn't know about Sentry)
- ✅ Consistent with app architecture
- ✅ Can swap logger implementations

### OLD Pattern (EmailService, etc.)

```typescript
// ❌ Direct import
import { logger } from '@/lib/logger';

export class EmailService {
  async sendEmail() {
    logger.error('Error', error); // ❌ Direct usage
  }
}
```

**Issues:**
- ❌ Not testable (hard to mock)
- ❌ Tightly coupled (direct import)
- ❌ Inconsistent with app architecture
- ❌ Cannot swap implementations

---

## 🎯 Current Logging Flow Summary

```
Service Code
    │
    ├─→ NEW: this.logger.error() (MessageService, UserService)
    │   └─→ Injected ILogger (SentryLogger)
    │       └─→ IErrorTrackingAdapter (SentryAdapter)
    │           └─→ Sentry SDK
    │               └─→ Sentry Dashboard ✅
    │
    └─→ OLD: logger.error() (EmailService, etc.)
        └─→ Singleton logger (SentryLogger)
            └─→ IErrorTrackingAdapter (SentryAdapter)
                └─→ Sentry SDK
                    └─→ Sentry Dashboard ✅
```

**Both paths work, but:**
- ✅ NEW path is decoupled and testable
- ⚠️ OLD path still works but needs migration

---

## 📝 Key Points

1. **Both patterns work** - Errors are logged to Sentry in both cases
2. **Same implementation** - Both use `SentryLogger` → `SentryAdapter` → Sentry SDK
3. **DI is better** - More testable, decoupled, consistent
4. **Migration in progress** - 2 services migrated, 25+ remaining
5. **No breaking changes** - Old code still works during migration

---

## 🔮 Future State (After Full Migration)

```
All Services
    │
    └─→ this.logger.error() (All services use DI)
        └─→ Injected ILogger (SentryLogger)
            └─→ IErrorTrackingAdapter (SentryAdapter or DatadogAdapter, etc.)
                └─→ Error Tracking Provider
                    └─→ Dashboard ✅
```

**Benefits:**
- ✅ All services testable
- ✅ Can swap error tracking providers
- ✅ Consistent architecture
- ✅ Easy to mock in tests

---

## 🧪 Testing Example

### With NEW Pattern (Testable)

```typescript
// Test
const mockLogger = new TestLogger();
const service = new MessageService(repo, roomRepo, mockLogger);

service.sendMessage(...);

// Verify logging
expect(mockLogger.getErrors()).toHaveLength(1);
expect(mockLogger.getErrors()[0].message).toContain('Failed');
```

### With OLD Pattern (Hard to Test)

```typescript
// Test - Hard to verify logging
const service = new EmailService(); // Logger is imported internally

service.sendEmail(...);

// ❌ Cannot verify what was logged
// ❌ Cannot mock logger
```

---

## 📊 Summary

| Aspect | NEW Pattern (DI) | OLD Pattern (Singleton) |
|--------|------------------|-------------------------|
| **Services Using** | MessageService, UserService | EmailService, PushService, etc. (25+) |
| **How It Works** | Injected via constructor | Direct import |
| **Testable?** | ✅ Yes (inject mock) | ❌ No (hard to mock) |
| **Decoupled?** | ✅ Yes | ❌ No |
| **Sentry Integration** | ✅ Works | ✅ Works |
| **Status** | ✅ Recommended | ⚠️ Needs migration |

**Current State:** Hybrid - Both patterns work, but DI pattern is preferred for new code and migration.

