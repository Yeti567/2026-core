# Sentry Error Tracking Setup

## Overview

Sentry has been installed and configured for error tracking, performance monitoring, and user session replay in your Next.js application.

---

## Installation Complete ✅

- ✅ `@sentry/nextjs` package installed
- ✅ Client configuration (`sentry.client.config.ts`)
- ✅ Server configuration (`sentry.server.config.ts`)
- ✅ Edge configuration (`sentry.edge.config.ts`)
- ✅ Next.js integration (`next.config.js`)
- ✅ Instrumentation file (`instrumentation.ts`)

---

## Setup Steps

### Step 1: Create Sentry Account

1. Go to https://sentry.io/signup/
2. Sign up for a free account
3. Create a new project
4. Select **Next.js** as your platform

### Step 2: Get Your DSN

1. In Sentry dashboard, go to **Settings** → **Projects** → **[Your Project]**
2. Navigate to **Client Keys (DSN)**
3. Copy your DSN (looks like: `https://xxxxx@sentry.io/xxxxx`)

### Step 3: Configure Environment Variables

Add to your `.env.local` file:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token
```

**To get your auth token:**
1. Go to https://sentry.io/settings/account/api/auth-tokens/
2. Create a new token with `project:releases` scope
3. Copy the token

**To find your org/project slugs:**
- Check the URL in Sentry dashboard: `https://sentry.io/organizations/[org-slug]/projects/[project-slug]/`

### Step 4: Enable Instrumentation

The `instrumentation.ts` file is already created. Next.js will automatically load it.

**Note:** If you're using Next.js 13+, instrumentation is enabled by default. For older versions, ensure `instrumentation.ts` is in your root directory.

---

## Features Configured

### ✅ Error Tracking

- Captures unhandled errors
- Captures unhandled promise rejections
- Filters sensitive data (passwords, tokens, API keys, cookies)
- Ignores expected errors (rate limits, validation errors)
- **Production-only:** Only enabled in production environment

### ✅ Performance Monitoring

- **Client:** 10% sample rate (production only)
- **Server:** 10% sample rate (production only)
- **Edge:** 5% sample rate (production only)

### ✅ Session Replay

- Enabled for client-side
- Masks all text content for privacy
- Blocks all media content

### ✅ Source Maps

- Automatically uploads source maps during build
- Enables readable stack traces in Sentry

### ✅ Security

- Filters sensitive headers (authorization, cookies, API keys)
- Removes sensitive query parameters
- Removes sensitive user data (email, IP)
- Doesn't send events in development (unless explicitly enabled)

---

## Configuration Files

### `sentry.client.config.ts`

Client-side configuration for browser errors and performance.

**Key Features:**
- Session replay with privacy protection
- Browser performance monitoring
- Error filtering

### `sentry.server.config.ts`

Server-side configuration for API routes and server components.

**Key Features:**
- Server performance monitoring
- Database error filtering
- Rate limit error filtering

### `sentry.edge.config.ts`

Edge runtime configuration for middleware and edge functions.

**Key Features:**
- Lower sample rate (edge functions run frequently)
- Minimal configuration for performance

---

## Usage

### Manual Error Reporting

```typescript
import * as Sentry from '@sentry/nextjs';

// Capture exception
try {
  // Your code
} catch (error) {
  Sentry.captureException(error);
}

// Capture message
Sentry.captureMessage('Something went wrong', 'warning');

// Add context
Sentry.setUser({ id: '123', username: 'john' });
Sentry.setTag('page', 'dashboard');
Sentry.setContext('custom', { key: 'value' });
```

### API Route Error Tracking

```typescript
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  try {
    // Your code
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: '/api/example' },
      extra: { requestBody: await request.json() },
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### React Component Error Boundary

```typescript
'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function ErrorBoundary({ error }: { error: Error }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <div>Something went wrong</div>;
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Yes | Public DSN for client-side |
| `SENTRY_DSN` | Yes | Server-side DSN |
| `SENTRY_ORG` | Yes | Organization slug |
| `SENTRY_PROJECT` | Yes | Project slug |
| `SENTRY_AUTH_TOKEN` | Yes | Auth token for source maps |
| `SENTRY_ENABLE_DEV` | No | Enable Sentry in development |
| `SENTRY_RELEASE` | No | Release version (auto-detected) |

---

## Production-Only Mode

Sentry is configured to **only log errors in production** (`NODE_ENV === 'production'`).

This means:
- ✅ Errors are tracked in production
- ❌ Errors are NOT tracked in development (reduces noise)
- ❌ Errors are NOT tracked in test environments

**Note:** This is the recommended configuration for production applications. If you need to test Sentry in development, you can temporarily modify the `enabled` flag in the config files, but it's not recommended for regular development work.

---

## Production Deployment

### Vercel

Sentry automatically integrates with Vercel:

1. Add environment variables in Vercel dashboard
2. Deploy your application
3. Source maps are automatically uploaded

### Other Platforms

1. Set environment variables
2. Build your application: `npm run build`
3. Source maps are automatically uploaded during build

---

## Monitoring & Alerts

### Set Up Alerts

1. Go to Sentry dashboard → **Alerts**
2. Create alert rules for:
   - New errors
   - Error rate spikes
   - Performance degradation

### View Errors

1. Go to Sentry dashboard → **Issues**
2. View error details, stack traces, and user context
3. Assign issues to team members
4. Mark issues as resolved

---

## Security Considerations

### ✅ Implemented

- Sensitive data filtering (passwords, tokens, API keys)
- Header sanitization
- Query parameter sanitization
- User data privacy (email, IP removed)
- Development mode disabled by default

### ⚠️ Review

- Check `beforeSend` filters match your data structure
- Review ignored errors list
- Adjust sample rates based on traffic
- Monitor Sentry quota usage

---

## Troubleshooting

### Errors Not Appearing

1. **Check DSN:** Verify `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. **Check Environment:** Ensure not in development mode (or enable dev mode)
3. **Check Filters:** Review `beforeSend` and `ignoreErrors` settings
4. **Check Network:** Verify Sentry API is accessible

### Source Maps Not Working

1. **Check Auth Token:** Verify `SENTRY_AUTH_TOKEN` is set
2. **Check Build:** Ensure source maps are generated (`npm run build`)
3. **Check Upload:** Verify source maps are uploaded (check Sentry dashboard)

### Performance Issues

1. **Reduce Sample Rate:** Lower `tracesSampleRate` if needed
2. **Disable Replay:** Remove `replayIntegration` if causing issues
3. **Check Quota:** Monitor Sentry usage in dashboard

---

## Next Steps

1. ✅ **Set up Sentry account** and get DSN
2. ✅ **Add environment variables** to `.env.local`
3. ✅ **Test error tracking** by triggering a test error
4. ✅ **Set up alerts** in Sentry dashboard
5. ✅ **Monitor errors** and performance in production

---

## Resources

- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Dashboard:** https://sentry.io/
- **Support:** https://sentry.io/support/

---

*Setup Date: January 20, 2026*  
*Status: ✅ Installed - Awaiting DSN Configuration*
