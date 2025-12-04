# Logger Naming Convention Explanation

## ❌ Previous Naming (Confusing)

**Problem:** The interface was named `ISentryAdapter`, but it's actually a **generic** interface that any error tracking provider can implement.

```typescript
// ❌ Confusing: DatadogAdapter implements ISentryAdapter? That doesn't make sense!
export class DatadogAdapter implements ISentryAdapter { ... }
```

## ✅ New Naming (Clear)

**Solution:** Renamed to `IErrorTrackingAdapter` - a generic interface for any error tracking provider.

```typescript
// ✅ Clear: DatadogAdapter implements the generic error tracking interface
export class DatadogAdapter implements IErrorTrackingAdapter { ... }
export class SentryAdapter implements IErrorTrackingAdapter { ... }
export class LogRocketAdapter implements IErrorTrackingAdapter { ... }
```

---

## 📐 Architecture with New Naming

```
┌─────────────────────────────────────────────────────────────┐
│                    Services (MessageService, etc.)          │
│                    Uses: ILogger interface                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              SentryLogger (implements ILogger)             │
│              Uses: IErrorTrackingAdapter                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         IErrorTrackingAdapter (Generic Interface)          │
│         - captureException()                                │
│         - captureMessage()                                  │
│         - addBreadcrumb()                                  │
└──────────┬───────────────────────┬──────────────────────────┘
           │                       │
           ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐
│   SentryAdapter     │  │   DatadogAdapter    │
│   (implements)      │  │   (implements)      │
└─────────────────────┘  └─────────────────────┘
```

---

## 🔄 How It Works

### 1. **IErrorTrackingAdapter** (Generic Interface)

This is the **contract** that all error tracking providers must follow:

```typescript
export interface IErrorTrackingAdapter {
  captureException(error: Error, context?: Record<string, unknown>): void;
  captureMessage(message: string, level: string, context?: Record<string, unknown>): void;
  addBreadcrumb(message: string, category: string, level: string, data?: Record<string, unknown>): void;
}
```

**Key Point:** This is **NOT** Sentry-specific. It's a generic interface.

### 2. **SentryAdapter** (Sentry Implementation)

```typescript
export class SentryAdapter implements IErrorTrackingAdapter {
  captureException(error: Error, context?: Record<string, unknown>): void {
    // Sentry-specific code
    captureException(error, context);
  }
  // ... other methods
}
```

**Key Point:** This is the **Sentry-specific** implementation of the generic interface.

### 3. **DatadogAdapter** (Datadog Implementation)

```typescript
export class DatadogAdapter implements IErrorTrackingAdapter {
  captureException(error: Error, context?: Record<string, unknown>): void {
    // Datadog-specific code
    datadog.logger.error(error, context);
  }
  // ... other methods
}
```

**Key Point:** Datadog also implements the **same generic interface**. It's not a "Sentry adapter" - it's an error tracking adapter.

### 4. **SentryLogger** (Uses Any Adapter)

```typescript
export class SentryLogger implements ILogger {
  constructor(private errorTrackingAdapter: IErrorTrackingAdapter) {}
  //                                    ^^^^^^^^^^^^^^^^^^^^^^^^
  //                                    Generic interface, not Sentry-specific!
  
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    this.errorTrackingAdapter.captureException(error, { message, ...context });
    //     ^^^^^^^^^^^^^^^^^^^^^^^^
    //     Works with ANY adapter (Sentry, Datadog, LogRocket, etc.)
  }
}
```

**Key Point:** The logger accepts **any** error tracking adapter, not just Sentry.

---

## 🎯 Why This Naming is Better

### ✅ **Clear Intent**
- `IErrorTrackingAdapter` = Generic interface for error tracking
- `SentryAdapter` = Sentry-specific implementation
- `DatadogAdapter` = Datadog-specific implementation

### ✅ **Makes Sense**
```typescript
// ✅ This makes sense: Datadog implements the error tracking interface
export class DatadogAdapter implements IErrorTrackingAdapter { ... }

// ❌ This was confusing: Datadog implements Sentry interface?
export class DatadogAdapter implements ISentryAdapter { ... }
```

### ✅ **Future-Proof**
- Easy to add new providers
- Clear that it's a generic interface
- No confusion about what implements what

---

## 📝 Summary

| Old Name | New Name | Purpose |
|----------|----------|---------|
| `ISentryAdapter` | `IErrorTrackingAdapter` | Generic interface for error tracking providers |
| `sentryAdapter` (variable) | `errorTrackingAdapter` | Generic adapter instance (can be any provider) |
| `SentryAdapter` | `SentryAdapter` | Sentry-specific implementation (name stays the same) |

**Key Insight:** The interface is **generic**, but the implementation is **specific**. That's why we renamed the interface but kept `SentryAdapter` as the class name (since it IS Sentry-specific).

---

## 🔄 Migration Notes

- ✅ `ISentryAdapter` → `IErrorTrackingAdapter` (renamed)
- ✅ `sentryAdapter` → `errorTrackingAdapter` (variable renamed)
- ✅ `SentryAdapter` class name stays the same (it IS Sentry-specific)
- ✅ Backward compatibility: `ISentryAdapter` still exported as alias

