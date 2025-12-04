# Logger Adapter Pattern Explanation

## 🎯 What is the Adapter Pattern?

The **Adapter Pattern** is a design pattern that allows incompatible interfaces to work together. In our logger architecture, it decouples the logger implementation from the error tracking provider (Sentry).

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Services (MessageService, etc.)          │
│                    Uses: ILogger interface                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              SentryLogger (implements ILogger)              │
│              - log(), info(), warn(), error(), etc.         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         SentryAdapter (implements ISentryAdapter)           │
│         - captureException()                                │
│         - captureMessage()                                  │
│         - addBreadcrumb()                                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Sentry SDK (@sentry/nextjs)                    │
│              - Direct Sentry API calls                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Current Implementation

### 1. **ISentryAdapter Interface** (`sentry-adapter.interface.ts`)

This interface defines the contract for error tracking providers:

```typescript
export interface ISentryAdapter {
  captureException(error: Error, context?: Record<string, unknown>): void;
  captureMessage(message: string, level: 'info' | 'warning' | 'error' | 'fatal', context?: Record<string, unknown>): void;
  addBreadcrumb(message: string, category: string, level: 'info' | 'warning' | 'error', data?: Record<string, unknown>): void;
}
```

**Purpose:**
- ✅ Abstracts error tracking functionality
- ✅ Allows swapping Sentry for other providers
- ✅ Makes testing easier (can mock the adapter)

### 2. **SentryAdapter Implementation** (`sentry-adapter.ts`)

This wraps Sentry's API to match our interface:

```typescript
export class SentryAdapter implements ISentryAdapter {
  captureException(error: Error, context?: Record<string, unknown>): void {
    captureException(error, context); // Calls Sentry SDK
  }
  
  captureMessage(message: string, level: string, context?: Record<string, unknown>): void {
    captureMessage(message, level, context); // Calls Sentry SDK
  }
  
  addBreadcrumb(message: string, category: string, level: string, data?: Record<string, unknown>): void {
    addBreadcrumb(message, category, level, data); // Calls Sentry SDK
  }
}
```

**Purpose:**
- ✅ Wraps Sentry-specific code
- ✅ Implements ISentryAdapter interface
- ✅ Isolates Sentry dependencies

### 3. **SentryLogger** (`sentry-logger.ts`)

This implements the ILogger interface using the adapter:

```typescript
export class SentryLogger implements ILogger {
  constructor(private sentryAdapter: ISentryAdapter) {} // ✅ Receives adapter via DI
  
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    // Business logic for logging
    if (error instanceof Error) {
      this.sentryAdapter.captureException(error, { message, ...context }); // ✅ Uses adapter
    }
  }
}
```

**Purpose:**
- ✅ Implements ILogger (what services use)
- ✅ Uses ISentryAdapter (not directly Sentry)
- ✅ Can swap adapters without changing logger code

---

## 🚀 How to Add Other Loggers in the Future

### Scenario 1: Add Datadog Logger

#### Step 1: Create Datadog Adapter

```typescript
// lib/logger/datadog-adapter.ts
import { ISentryAdapter } from './sentry-adapter.interface';
import * as datadog from 'dd-trace'; // Datadog SDK

export class DatadogAdapter implements ISentryAdapter {
  captureException(error: Error, context?: Record<string, unknown>): void {
    datadog.tracer.setError(error); // Datadog-specific API
    datadog.logger.error(error.message, context);
  }
  
  captureMessage(message: string, level: string, context?: Record<string, unknown>): void {
    datadog.logger[level](message, context); // Datadog-specific API
  }
  
  addBreadcrumb(message: string, category: string, level: string, data?: Record<string, unknown>): void {
    datadog.logger.addContext({ [category]: message, ...data }); // Datadog-specific API
  }
}
```

#### Step 2: Create Datadog Logger (Optional - can reuse SentryLogger)

```typescript
// lib/logger/datadog-logger.ts
import { ILogger } from './logger.interface';
import { ISentryAdapter } from './sentry-adapter.interface';

// Can reuse SentryLogger logic, just swap the adapter!
export class DatadogLogger extends SentryLogger {
  // Same implementation, different adapter
  // Or create custom implementation if needed
}
```

#### Step 3: Register in DI Container

```typescript
// lib/di/providers.ts
import { DatadogAdapter } from '@/lib/logger/datadog-adapter';
import { SentryLogger } from '@/lib/logger/sentry-logger';

export function setupDI(): void {
  // Choose adapter based on config
  const errorTrackingProvider = process.env.ERROR_TRACKING_PROVIDER || 'sentry';
  
  if (errorTrackingProvider === 'datadog') {
    container.register('errorTrackingAdapter', () => new DatadogAdapter(), true);
  } else {
    container.register('errorTrackingAdapter', () => new SentryAdapter(), true);
  }
  
  // Logger uses whichever adapter is registered
  container.register<ILogger>('logger', () => {
    const adapter = container.resolveSync<ISentryAdapter>('errorTrackingAdapter');
    return new SentryLogger(adapter); // Same logger, different adapter!
  }, true);
}
```

**Result:** ✅ Services don't need to change! They still use `ILogger`.

---

### Scenario 2: Add LogRocket Logger

#### Step 1: Create LogRocket Adapter

```typescript
// lib/logger/logrocket-adapter.ts
import { ISentryAdapter } from './sentry-adapter.interface';
import LogRocket from 'logrocket'; // LogRocket SDK

export class LogRocketAdapter implements ISentryAdapter {
  captureException(error: Error, context?: Record<string, unknown>): void {
    LogRocket.captureException(error, { extra: context }); // LogRocket-specific API
  }
  
  captureMessage(message: string, level: string, context?: Record<string, unknown>): void {
    LogRocket.log(message, { level, ...context }); // LogRocket-specific API
  }
  
  addBreadcrumb(message: string, category: string, level: string, data?: Record<string, unknown>): void {
    LogRocket.addBreadcrumb({ message, category, level, data }); // LogRocket-specific API
  }
}
```

#### Step 2: Register in DI Container

```typescript
// lib/di/providers.ts
const provider = process.env.ERROR_TRACKING_PROVIDER || 'sentry';

switch (provider) {
  case 'sentry':
    container.register('errorTrackingAdapter', () => new SentryAdapter(), true);
    break;
  case 'datadog':
    container.register('errorTrackingAdapter', () => new DatadogAdapter(), true);
    break;
  case 'logrocket':
    container.register('errorTrackingAdapter', () => new LogRocketAdapter(), true);
    break;
}
```

**Result:** ✅ Runtime selection of error tracking provider!

---

### Scenario 3: Add Multiple Loggers (Send to Both Sentry and Datadog)

#### Step 1: Create Composite Adapter

```typescript
// lib/logger/composite-adapter.ts
import { ISentryAdapter } from './sentry-adapter.interface';

export class CompositeAdapter implements ISentryAdapter {
  constructor(private adapters: ISentryAdapter[]) {}
  
  captureException(error: Error, context?: Record<string, unknown>): void {
    // Send to all adapters
    this.adapters.forEach(adapter => {
      try {
        adapter.captureException(error, context);
      } catch (e) {
        // Don't fail if one adapter fails
        console.error('Adapter error:', e);
      }
    });
  }
  
  captureMessage(message: string, level: string, context?: Record<string, unknown>): void {
    this.adapters.forEach(adapter => {
      try {
        adapter.captureMessage(message, level, context);
      } catch (e) {
        console.error('Adapter error:', e);
      }
    });
  }
  
  addBreadcrumb(message: string, category: string, level: string, data?: Record<string, unknown>): void {
    this.adapters.forEach(adapter => {
      try {
        adapter.addBreadcrumb(message, category, level, data);
      } catch (e) {
        console.error('Adapter error:', e);
      }
    });
  }
}
```

#### Step 2: Register Composite Adapter

```typescript
// lib/di/providers.ts
container.register('errorTrackingAdapter', () => {
  const sentryAdapter = new SentryAdapter();
  const datadogAdapter = new DatadogAdapter();
  return new CompositeAdapter([sentryAdapter, datadogAdapter]); // ✅ Both!
}, true);
```

**Result:** ✅ Errors sent to multiple providers simultaneously!

---

### Scenario 4: Add Console-Only Logger (No Error Tracking)

#### Step 1: Create Console Adapter

```typescript
// lib/logger/console-adapter.ts
import { ISentryAdapter } from './sentry-adapter.interface';

export class ConsoleAdapter implements ISentryAdapter {
  captureException(error: Error, context?: Record<string, unknown>): void {
    console.error('[Error Tracking]', error, context); // Just console
  }
  
  captureMessage(message: string, level: string, context?: Record<string, unknown>): void {
    console[level]('[Error Tracking]', message, context); // Just console
  }
  
  addBreadcrumb(message: string, category: string, level: string, data?: Record<string, unknown>): void {
    console.log('[Breadcrumb]', { message, category, level, data }); // Just console
  }
}
```

#### Step 2: Use for Development/Testing

```typescript
// lib/di/providers.ts
const adapter = process.env.NODE_ENV === 'production' 
  ? new SentryAdapter() 
  : new ConsoleAdapter(); // ✅ No external service in dev

container.register('errorTrackingAdapter', () => adapter, true);
```

**Result:** ✅ No external dependencies in development!

---

## 🎨 Benefits of This Architecture

### ✅ **Decoupling**
- Services don't know about Sentry
- Services only depend on `ILogger` interface
- Error tracking provider can be swapped

### ✅ **Testability**
- Easy to mock `ISentryAdapter` in tests
- Can use `TestLogger` for unit tests
- No external service calls in tests

### ✅ **Flexibility**
- Runtime selection of providers
- Multiple providers simultaneously
- Easy to add new providers

### ✅ **Maintainability**
- Clear separation of concerns
- Each adapter is isolated
- Changes to one provider don't affect others

---

## 📋 Summary

1. **ISentryAdapter** = Contract for error tracking providers
2. **SentryAdapter** = Wraps Sentry SDK to match the contract
3. **SentryLogger** = Uses adapter to implement ILogger
4. **Services** = Use ILogger (don't care about adapter)

**To add a new logger:**
1. Create new adapter implementing `ISentryAdapter`
2. Register adapter in DI container
3. ✅ Done! Services don't need to change.

---

## 🔄 Migration Path

Current: `SentryAdapter` → `SentryLogger` → Services

Future: `[SentryAdapter | DatadogAdapter | LogRocketAdapter]` → `SentryLogger` → Services

Services never change! 🎉

