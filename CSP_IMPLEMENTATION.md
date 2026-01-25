# Content-Security-Policy (CSP) Implementation

## Overview

Content-Security-Policy (CSP) headers have been implemented in the middleware to provide XSS protection. The implementation uses a **nonce-based approach** with `strict-dynamic` for maximum security.

## Implementation Details

### Location
- **File:** `middleware.ts`
- **Type:** Next.js Middleware (runs on every request)

### CSP Policy

```javascript
default-src 'self';
script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data: https://*.supabase.co;
font-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

### Key Features

1. **Nonce Generation**
   - Unique nonce generated per request using `crypto.randomUUID()`
   - Base64 encoded for use in CSP header
   - Available via `x-nonce` request header

2. **Strict Dynamic**
   - `'strict-dynamic'` allows scripts loaded by nonce-approved scripts
   - Enables Next.js's script loading mechanism
   - Prevents inline scripts without nonce

3. **Coverage**
   - CSP headers set for **all routes** (public, authenticated, API errors, redirects)
   - Ensures consistent security across the application

## Using the Nonce in Components

### Server Components

The nonce is available via the `x-nonce` header:

```typescript
import { headers } from 'next/headers';

export default async function MyComponent() {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce');
  
  return (
    <script nonce={nonce}>
      {/* Your inline script */}
    </script>
  );
}
```

### Client Components

For client components, you may need to pass the nonce as a prop or use a different approach (e.g., external scripts).

## CSP Directives Explained

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'self'` | Default source for all resource types |
| `script-src` | `'self' 'nonce-...' 'strict-dynamic'` | Allows scripts from same origin and nonce-approved scripts |
| `style-src` | `'self' 'unsafe-inline'` | Allows styles from same origin and inline styles (needed for Next.js) |
| `img-src` | `'self' blob: data: https://*.supabase.co` | Allows images from same origin, blob/data URLs, and Supabase storage |
| `font-src` | `'self'` | Allows fonts from same origin |
| `object-src` | `'none'` | Blocks plugins (Flash, etc.) |
| `base-uri` | `'self'` | Restricts `<base>` tag to same origin |
| `form-action` | `'self'` | Restricts form submissions to same origin |
| `frame-ancestors` | `'none'` | Prevents embedding in frames (clickjacking protection) |
| `upgrade-insecure-requests` | - | Upgrades HTTP requests to HTTPS |

## Testing CSP

### Browser Console

Check for CSP violations in the browser console:
- Open DevTools → Console
- Look for CSP violation warnings
- Common issues: missing nonces, blocked external resources

### Testing Tools

1. **CSP Evaluator**
   - https://csp-evaluator.withgoogle.com/
   - Paste your CSP header to check for issues

2. **Browser DevTools**
   - Network tab → Headers → Response Headers
   - Verify `Content-Security-Policy` header is present

## Common Issues & Solutions

### Issue: Scripts Blocked

**Symptom:** Scripts don't load, console shows CSP violations

**Solution:**
- Ensure scripts have `nonce` attribute
- Use `'strict-dynamic'` for dynamically loaded scripts
- Move inline scripts to external files when possible

### Issue: Styles Not Loading

**Symptom:** Styles appear broken

**Solution:**
- `'unsafe-inline'` is already allowed for styles
- Check if styles are being loaded from external domains (not allowed)
- Verify `style-src` directive includes necessary sources

### Issue: Images Not Loading

**Symptom:** Images from Supabase storage don't display

**Solution:**
- Verify `img-src` includes `https://*.supabase.co`
- Check if images are using correct Supabase storage URLs
- Ensure blob/data URLs are needed (already allowed)

## Security Benefits

1. **XSS Protection**
   - Prevents execution of unauthorized scripts
   - Blocks inline scripts without nonce

2. **Data Exfiltration Prevention**
   - Restricts where data can be sent
   - Prevents unauthorized form submissions

3. **Clickjacking Protection**
   - `frame-ancestors 'none'` prevents embedding

4. **HTTPS Enforcement**
   - `upgrade-insecure-requests` forces HTTPS

## Next Steps

1. ✅ CSP headers implemented
2. ⚠️ **Review inline scripts** - Ensure all inline scripts use nonce
3. ⚠️ **Test in production** - Verify CSP doesn't break functionality
4. ⚠️ **Monitor violations** - Set up CSP violation reporting (optional)

## CSP Violation Reporting (Optional)

To receive CSP violation reports, add:

```javascript
report-uri /api/csp-report;
```

Then create an API route at `/api/csp-report` to log violations.

---

*Implementation Date: January 20, 2026*  
*Status: ✅ Implemented - Ready for Testing*
