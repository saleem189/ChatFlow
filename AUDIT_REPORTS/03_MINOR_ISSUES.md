# Minor Issues - Low Priority Improvements

## 🟢 Issue #1: Outdated Comments

**Severity:** Minor  
**Impact:** Developer confusion

### Examples

- Some comments reference old patterns
- TODO comments without context
- Outdated migration notes

### Solution

Review and update all comments, remove outdated ones.

---

## 🟢 Issue #2: File Organization

**Severity:** Minor  
**Impact:** Developer experience

### Problem

Some utilities could be better organized:
- `lib/utils.ts` is large (could be split)
- Date utilities mixed with general utilities

### Solution

Split into focused modules:
- `lib/utils/date.ts` - Date utilities
- `lib/utils/string.ts` - String utilities
- `lib/utils/validation.ts` - Validation helpers

---

## 🟢 Issue #3: Inconsistent Naming

**Severity:** Minor  
**Impact:** Code readability

### Examples

- Some files use `-` (kebab-case), others use camelCase
- Inconsistent component naming

### Solution

Standardize on kebab-case for files, PascalCase for components.

---

## 🟢 Issue #4: Missing JSDoc Comments

**Severity:** Minor  
**Impact:** Developer experience, IDE support

### Solution

Add JSDoc to public APIs:
```typescript
/**
 * Formats a timestamp for display in chat messages
 * @param timestamp - ISO timestamp string or Date object
 * @param options - Formatting options
 * @returns Formatted time string
 */
export function formatTime(timestamp: string | Date, options?: FormatTimeOptions): string {
  // ...
}
```

---

## 🟢 Issue #5: Unused Imports

**Severity:** Minor  
**Impact:** Bundle size

### Solution

Run ESLint with `--fix` to remove unused imports.

---

## Summary

**Total Minor Issues:** 5+  
**Priority:** Address during refactoring sprints

These are nice-to-have improvements that can be addressed incrementally.

