# Upstash Redis Rate Limiting Setup

## Overview

Rate limiting has been upgraded to support **Upstash Redis** for distributed, persistent rate limiting. This ensures rate limits work correctly across:

- ✅ Multiple server instances (Vercel, serverless functions)
- ✅ Server restarts (limits persist in Redis)
- ✅ Distributed deployments (shared state across all instances)

---

## Installation Complete ✅

- ✅ `@upstash/ratelimit` package installed
- ✅ `@upstash/redis` package installed
- ✅ Rate limiting utility updated with Upstash support
- ✅ Automatic backend selection (Upstash → Database → Memory)

---

## Setup Steps

### Step 1: Create Upstash Redis Instance

1. **Go to Upstash Console:**
   - Visit https://console.upstash.com/
   - Sign up or log in

2. **Create Redis Database:**
   - Click **Create Database**
   - Choose **Global** or **Regional** (Global recommended for distributed systems)
   - Select **REST API** (required for serverless)
   - Click **Create**

3. **Get Connection Details:**
   - Copy **UPSTASH_REDIS_REST_URL**
   - Copy **UPSTASH_REDIS_REST_TOKEN**

### Step 2: Configure Environment Variables

Add to your `.env.local` file:

```bash
# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token-here
```

**For Production:**
- Add these to your hosting platform's environment variables
- Vercel: Project Settings → Environment Variables
- Other platforms: Add to production environment config

---

## How It Works

### Backend Selection (Automatic)

The rate limiting utility automatically selects the best available backend:

1. **Upstash Redis** (if `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set)
   - ✅ Distributed (works across multiple instances)
   - ✅ Persistent (survives server restarts)
   - ✅ Fast (Redis performance)
   - ✅ Recommended for production

2. **Database (Supabase)** (fallback)
   - ✅ Distributed (works across multiple instances)
   - ✅ Persistent (stored in database)
   - ⚠️ Slower than Redis
   - ✅ Good fallback option

3. **In-Memory** (final fallback)
   - ❌ Not distributed (each instance has separate limits)
   - ❌ Resets on server restart
   - ✅ Fastest (no network calls)
   - ✅ Good for development

### Current Behavior

- **If Upstash configured:** Uses Upstash Redis automatically
- **If Upstash not configured:** Falls back to database (for user-based limits) or memory (for IP-based limits)
- **No code changes needed:** Existing rate limit calls work automatically

---

## Benefits of Upstash Redis

### ✅ Distributed Rate Limiting

**Before (In-Memory):**
- Each serverless function has its own rate limit counter
- User can exceed limits by hitting different instances
- Limits reset on each deployment

**After (Upstash Redis):**
- All instances share the same rate limit counter
- User cannot exceed limits across instances
- Limits persist across deployments

### ✅ Production Ready

- **Global Redis:** Low latency worldwide
- **Serverless Compatible:** REST API works in serverless environments
- **Automatic Scaling:** Upstash handles scaling automatically
- **Free Tier:** 10,000 commands/day free (sufficient for most apps)

---

## Usage Examples

### Automatic Backend Selection (Recommended)

```typescript
import { rateLimitByUser } from '@/lib/utils/rate-limit';

// Automatically uses Upstash if configured, otherwise falls back
const result = await rateLimitByUser(userId, 10, '1h');
```

### Force Specific Backend

```typescript
import { rateLimit } from '@/lib/utils/rate-limit';

// Force Upstash Redis
const result = await rateLimit({
  identifier: userId,
  limit: 10,
  window: '1h',
  backend: 'upstash', // or 'database' or 'memory'
});
```

---

## Migration Guide

### No Code Changes Required

The upgrade is **backward compatible**. Existing code continues to work:

```typescript
// This code works with all backends
const result = await rateLimitByUser(userId, 10, '1h');
```

### Recommended: Add Upstash Configuration

Simply add Upstash environment variables to enable distributed rate limiting:

```bash
# .env.local (development)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Production environment variables
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Testing

### Test Rate Limiting

```typescript
// Test in your API route
import { rateLimitByUser } from '@/lib/utils/rate-limit';

export async function POST(request: Request) {
  const { userId } = await getUserId(request);
  
  const result = await rateLimitByUser(userId, 5, '1m');
  
  if (!result.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
        },
      }
    );
  }
  
  // Continue with request...
}
```

### Verify Backend Selection

Check logs to see which backend is being used:

```typescript
// The utility will log warnings if Upstash fails and falls back
// Check your server logs for:
// "Upstash rate limit failed, falling back to database"
```

---

## Cost Considerations

### Upstash Free Tier

- **10,000 commands/day** free
- **1 database** free
- **Global replication** included

### Rate Limit Command Usage

Each rate limit check = ~2-3 Redis commands
- 10,000 commands/day ≈ 3,000-5,000 rate limit checks/day
- Sufficient for most small-to-medium applications

### Upgrade Options

If you exceed free tier:
- **Pay-as-you-go:** $0.20 per 100K commands
- **Pro Plan:** $10/month for 1M commands/day

---

## Troubleshooting

### Rate Limits Not Working Across Instances

**Issue:** Rate limits reset on each request (in-memory fallback)

**Solution:**
1. Verify `UPSTASH_REDIS_REST_URL` is set
2. Verify `UPSTASH_REDIS_REST_TOKEN` is set
3. Check server logs for Upstash connection errors
4. Ensure environment variables are set in production

### Upstash Connection Errors

**Issue:** "Failed to initialize Upstash Redis"

**Solution:**
1. Verify environment variables are correct
2. Check Upstash dashboard for database status
3. Verify REST API is enabled (not just Redis protocol)
4. Check network connectivity (firewall, VPN)

### Fallback to In-Memory

**Issue:** Rate limits work but reset on restart

**Solution:**
- Upstash is not configured or connection failed
- Check environment variables
- Review server logs for errors
- Verify Upstash database is active

---

## Performance Comparison

| Backend | Latency | Distributed | Persistent | Cost |
|---------|---------|-------------|------------|------|
| **Upstash Redis** | ~10-50ms | ✅ Yes | ✅ Yes | Free tier available |
| **Database** | ~50-200ms | ✅ Yes | ✅ Yes | Included with Supabase |
| **In-Memory** | ~0.1ms | ❌ No | ❌ No | Free |

**Recommendation:** Use Upstash Redis for production, in-memory for development.

---

## Next Steps

1. ✅ **Create Upstash account** and Redis database
2. ✅ **Add environment variables** to `.env.local`
3. ✅ **Test rate limiting** in development
4. ✅ **Add to production** environment variables
5. ✅ **Monitor usage** in Upstash dashboard

---

## Resources

- **Upstash Console:** https://console.upstash.com/
- **Upstash Docs:** https://docs.upstash.com/
- **Rate Limiting Guide:** https://docs.upstash.com/redis/features/ratelimit
- **Pricing:** https://upstash.com/pricing

---

*Setup Date: January 20, 2026*  
*Status: ✅ Installed - Awaiting Upstash Configuration*
