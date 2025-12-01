# React Hooks Order Fix - Comprehensive Guide

## Problem
React's **Rules of Hooks** require that hooks are called in the same order on every render. Early returns before all hooks are called violate this rule and cause the error:
```
Error: Rendered more hooks than during the previous render.
```

## Root Cause
When we refactored components to use Zustand stores, we added early return checks for `null` user values. However, these checks were placed **before all hooks were called**, causing hooks to be called conditionally.

## Solution Pattern

### ❌ WRONG - Early Return Before All Hooks
```typescript
export function Component() {
  const user = useUserStore((state) => state.user);
  
  // ❌ Early return before all hooks
  if (!user) {
    return null;
  }
  
  // ❌ These hooks won't be called if user is null
  const [state, setState] = useState();
  const ref = useRef();
  useEffect(() => { ... }, []);
}
```

### ✅ CORRECT - All Hooks First, Then Early Return
```typescript
export function Component() {
  // ✅ ALL hooks called first (unconditionally)
  const user = useUserStore((state) => state.user);
  const [state, setState] = useState();
  const ref = useRef();
  useEffect(() => { ... }, []);
  
  // ✅ Early return AFTER all hooks
  if (!user) {
    return <LoadingState />;
  }
  
  // Component logic that uses user
}
```

## Implementation Strategy

### Step 1: Identify All Hooks
List ALL hooks in the component:
- `useState`
- `useEffect`
- `useRef`
- `useCallback`
- `useMemo`
- Custom hooks (e.g., `useUserStore`, `useSocket`)

### Step 2: Move Early Return
Place the early return check **after the last hook** but **before any logic that uses the checked value**.

### Step 3: Handle Null in Hooks
If hooks need the value, use optional chaining or null checks inside the hook:
```typescript
useEffect(() => {
  if (!user) return; // Guard inside hook
  // ... use user
}, [user]);
```

## Files Fixed

### 1. `components/chat/chat-sidebar.tsx`
- ✅ Moved early return after all `useEffect` hooks
- ✅ Added null check inside `useEffect` that uses `user`

### 2. `components/chat/chat-room.tsx`
- ✅ Moved early return after ALL hooks (useState, useEffect, useRef, useCallback)
- ✅ Changed `currentUser.id` to `currentUser?.id` in dependency arrays
- ✅ Early return now happens after line 503 (after last useEffect)

### 3. `components/chat/settings-modal.tsx`
- ✅ Moved early return after all hooks

### 4. `components/chat/create-room-modal.tsx`
- ✅ Moved early return after all hooks

## React Documentation References

### Rules of Hooks
From [React Docs](https://react.dev/reference/rules/rules-of-hooks):
1. **Only call hooks at the top level** - Don't call hooks inside loops, conditions, or nested functions
2. **Only call hooks from React functions** - Call them from React function components or custom hooks
3. **Call hooks in the same order** - React relies on the order of hook calls to preserve state

### Best Practices
- Always call hooks unconditionally
- Use early returns **after** all hooks
- Use optional chaining (`?.`) in dependency arrays when values might be null
- Guard inside hooks if needed: `if (!value) return;`

## Testing Checklist

After fixing hooks order:
- [ ] Component renders without errors
- [ ] No "Rendered more hooks" errors
- [ ] Loading states work correctly
- [ ] User data loads properly
- [ ] All hooks execute in correct order
- [ ] No runtime null reference errors

## Common Patterns

### Pattern 1: Loading State
```typescript
const user = useUserStore((state) => state.user);
// ... all other hooks

if (!user) {
  return <LoadingSpinner />;
}
```

### Pattern 2: Guard Inside Hook
```typescript
useEffect(() => {
  if (!user) return; // Guard inside
  // Use user safely
}, [user]);
```

### Pattern 3: Optional Chaining in Dependencies
```typescript
useEffect(() => {
  // ...
}, [user?.id]); // Safe even if user is null
```

## Summary

**Key Principle**: All hooks must be called **before** any conditional returns. This ensures React can track hook state correctly across renders.

