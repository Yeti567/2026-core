# Rate Limiting - Upstash Redis Update

## Summary

Rate limiting has been updated to use **Upstash Redis** as the primary backend with a simplified implementation pattern.

---

## Changes Made

### ✅ Updated Implementation

1. **Simplified Upstash Initialization**
   - Uses `Redis.fromEnv()` for automatic configuration
   - Uses `Ratelimit.slidingWindow` pattern
   - Maintains backward compatibility

2. **Automatic Backend Selection**
   - **Upstash Redis** (if `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set)
   - **Database** (Supabase RPC) - fallback
   - **In-Memory** - final fallback

3. **Dynamic Limiter Creation**
   - Creates sliding window limiter per call with specific limit/window
   - Uses the pattern: `Ratelimit.slidingWindow(limit, 'Xs')`

---

## Implementation Details

### Upstash Client Initialization

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Uses environment variables automatically
const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10s'), // Default (overridden per call)
  analytics: true,
});
```

### Rate Limit Function

```typescript
async function getUpstashRateLimit(
  key: string,
  limit: number,
  window: string
): Promise<RateLimitResult> {
  const ratelimit = getUpstashRatelimit();
  if (!ratelimit) {
    throw new Error('Upstash Redis not configured');
  }

  // Convert window to seconds
  const windowSeconds = parseWindow(window) / 1000;
  
  // Create sliding window limiter for this specific limit/window
  const limiter = Ratelimit.slidingWindow(limit, `${windowSeconds}s`);
  
  const result = await ratelimit.limit(key, {
    limiter,
  });

  return {
    success: result.success,
    limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}
```

---

## Usage (No Changes Required)

Existing code continues to work:

```typescript
import { rateLimitByUser } from '@/lib/utils/rate-limit';

// Automatically uses Upstash if configured
const result = await rateLimitByUser(userId, 10, '1h');
```

---

## Configuration

### Environment Variables

```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token-here
```

### Get from Upstash Console

1. Go to https://console.upstash.com/
2. Select your Redis database
3. Copy **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**

---

## Benefits

### ✅ Simplified Code
- Uses `Redis.fromEnv()` for automatic configuration
- Cleaner initialization pattern

### ✅ Distributed Rate Limiting
- Works across multiple serverless instances
- Limits persist across deployments
- Shared state across all instances

### ✅ Backward Compatible
- Existing code works without changes
- Automatic fallback to database/memory if Upstash not configured

---

## Testing

### Verify Upstash is Working

```typescript
// In your API route
import { rateLimitByUser } from '@/lib/utils/rate-limit';

export async function POST(request: Request) {
  const { userId } = await getUserId(request);
  
  const result = await rateLimitByUser(userId, 5, '1m');
  
  // Check server logs - should NOT see "falling back" messages
  // if Upstash is configured correctly
}
```

### Check Logs

- **Success:** No warnings, rate limits work across instances
- **Fallback:** "Upstash rate limit failed, falling back" - check environment variables

---

## Migration Status

- ✅ Upstash packages installed
- ✅ Rate limit utility updated
- ✅ Backward compatibility maintained
- ⚠️ **Action Required:** Add Upstash environment variables

---

*Update Date: January 20, 2026*  
*Status: ✅ Complete - Ready for Upstash Configuration*
