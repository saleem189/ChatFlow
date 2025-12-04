# Bundle Optimization Guide

## Current State

**Large Dependencies Identified:**
- `recharts` (~200KB) - Already code split in admin dashboard ✅
- `framer-motion` (~150KB) - Used in chat components
- `@tanstack/react-query` (~50KB) - Core dependency
- `date-fns` (~80KB) - Could be tree-shaken better
- `socket.io-client` (~100KB) - Core dependency
- `@sentry/nextjs` (~150KB) - Only needed in production

## Optimization Recommendations

### 1. Conditional DevTools Loading

**Current:** React Query DevTools always imported
**Fix:** Load only in development

```typescript
// lib/providers/react-query-provider.tsx
const ReactQueryDevtools = process.env.NODE_ENV === 'development'
  ? require('@tanstack/react-query-devtools').ReactQueryDevtools
  : () => null;
```

### 2. Tree-Shake date-fns

**Current:** Full library imported
**Fix:** Import specific functions

```typescript
// ❌ Bad
import { format, formatDistance } from 'date-fns';

// ✅ Good
import format from 'date-fns/format';
import formatDistance from 'date-fns/formatDistance';
```

### 3. Lazy Load Framer Motion

**Current:** Imported in chat components
**Fix:** Lazy load animation components

```typescript
// components/chat/message-item.tsx
const motion = dynamic(
  () => import('framer-motion').then(mod => ({ default: mod.motion })),
  { ssr: false }
);
```

### 4. Sentry Conditional Loading

**Current:** Always loaded
**Fix:** Only load in production

Already handled by Next.js Sentry integration ✅

## Bundle Analysis Setup

To analyze bundle size:

1. **Install bundle analyzer:**
```bash
npm install --save-dev @next/bundle-analyzer
```

2. **Update next.config.js:**
```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

3. **Add script to package.json:**
```json
"analyze": "ANALYZE=true npm run build"
```

4. **Run analysis:**
```bash
npm run analyze
```

## Priority Actions

1. ✅ **Code splitting** - Already done for admin charts and tables
2. ✅ **Lazy loading** - Already done for modals
3. 📋 **Conditional DevTools** - Load only in development
4. 📋 **Tree-shake date-fns** - Use specific imports
5. 📋 **Lazy load framer-motion** - Only when needed

## Expected Impact

- **Current bundle size:** ~500-600KB (estimated)
- **After optimizations:** ~400-450KB (estimated)
- **Reduction:** ~15-20%

## Notes

- Most heavy dependencies are already code split
- Admin dashboard components are lazy loaded
- Chat modals are lazy loaded
- Further optimization requires careful testing

