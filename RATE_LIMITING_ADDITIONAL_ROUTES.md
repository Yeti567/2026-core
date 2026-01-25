# Rate Limiting - Additional Routes Implementation

## Summary

Rate limiting has been added to additional routes to prevent spam, abuse, and DoS attacks.

---

## Routes Protected

### ✅ Form Submission Routes

#### 1. Test Form Submission
- **Route:** `POST /api/forms/convert-pdf/[id]/test-submit`
- **Limit:** 20 requests per minute per user
- **Purpose:** Prevent spam test submissions
- **Implementation:** User-based rate limiting

```typescript
// Rate limiting: 20 test submissions per minute per user
const rateLimitResult = await rateLimitByUser(user.id, 20, '1m');
```

---

### ✅ Email Sending Routes

#### 2. Single Invitation
- **Route:** `POST /api/invitations`
- **Limit:** 10 invitations per hour per user
- **Purpose:** Prevent email abuse
- **Implementation:** User-based rate limiting

```typescript
// Rate limiting: 10 invitations per hour per user
const rateLimitResult = await rateLimitByUser(user.userId, 10, '1h');
```

#### 3. Bulk Invitations
- **Route:** `POST /api/invitations/bulk`
- **Limit:** 3 bulk uploads per hour per user
- **Purpose:** Prevent bulk email abuse
- **Implementation:** User-based rate limiting

```typescript
// Rate limiting: 3 bulk uploads per hour per user
const rateLimitResult = await rateLimitByUser(user.userId, 3, '1h');
```

---

### ✅ Search/Filter Routes

#### 4. Document Search
- **Route:** `GET /api/documents/search`
- **Limit:** 60 searches per minute per user
- **Purpose:** Prevent DoS attacks on search
- **Implementation:** User-based rate limiting

```typescript
// Rate limiting: 60 searches per minute per user
const rateLimitResult = await rateLimitByUser(user.id, 60, '1m');
```

#### 5. Advanced Document Search
- **Route:** `POST /api/documents/search/advanced`
- **Limit:** 30 advanced searches per minute per user
- **Purpose:** Prevent DoS attacks on expensive search operations
- **Implementation:** User-based rate limiting

```typescript
// Rate limiting: 30 advanced searches per minute per user
const rateLimitResult = await rateLimitByUser(user.id, 30, '1m');
```

---

### ✅ Email Lookup Routes

#### 6. Worker Emails Lookup
- **Route:** `GET /api/workers/emails`
- **Limit:** 30 requests per minute per user
- **Purpose:** Prevent DoS on email lookup endpoint
- **Implementation:** User-based rate limiting

```typescript
// Rate limiting: 30 requests per minute per user
const rateLimitResult = await rateLimitByUser(user.userId, 30, '1m');
```

---

## Rate Limit Summary

| Route | Method | Limit | Window | Purpose |
|-------|--------|-------|--------|---------|
| `/api/forms/convert-pdf/[id]/test-submit` | POST | 20 | 1 minute | Prevent spam |
| `/api/invitations` | POST | 10 | 1 hour | Prevent email abuse |
| `/api/invitations/bulk` | POST | 3 | 1 hour | Prevent bulk email abuse |
| `/api/documents/search` | GET | 60 | 1 minute | Prevent DoS |
| `/api/documents/search/advanced` | POST | 30 | 1 minute | Prevent DoS |
| `/api/workers/emails` | GET | 30 | 1 minute | Prevent DoS |

---

## Implementation Details

### Rate Limit Headers

All rate-limited routes return standard headers:

```
X-RateLimit-Limit: <total limit>
X-RateLimit-Remaining: <remaining requests>
X-RateLimit-Reset: <unix timestamp>
Retry-After: <seconds until reset>
```

### Error Response

When rate limit is exceeded:

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later."
}
```

Status Code: `429 Too Many Requests`

---

## Previously Protected Routes

These routes were already protected in previous implementation:

1. ✅ `/api/audit/mock-interview/[sessionId]/chat` - 20 requests/min
2. ✅ `/api/pdf-converter/process` - 5 requests/hour
3. ✅ `/api/pdf-converter/convert` - 10 conversions/hour
4. ✅ `/api/documents/reindex` - 3 reindex operations/hour
5. ✅ `/api/documents/bulk-upload` - Rate limited
6. ✅ `/api/invitations/accept-with-auth` - Rate limited
7. ✅ `/api/certifications/upload` - Rate limited
8. ✅ `/api/documents/upload` - Rate limited
9. ✅ `/api/auth/forgot-password` - Rate limited
10. ✅ `/api/register` - Rate limited

---

## Total Routes Protected

**Total:** 16 routes now have rate limiting

- **Critical routes:** 7 (previously protected)
- **Form submission routes:** 1 (new)
- **Email sending routes:** 2 (new)
- **Search/filter routes:** 2 (new)
- **Email lookup routes:** 1 (new)
- **Other routes:** 3 (previously protected)

---

## Security Benefits

1. **Spam Prevention**
   - Form submissions limited to prevent automated spam
   - Test submissions throttled

2. **Email Abuse Prevention**
   - Invitation sending limited to prevent email spam
   - Bulk operations restricted

3. **DoS Protection**
   - Search endpoints protected from excessive requests
   - Expensive operations throttled

4. **Resource Protection**
   - Database queries limited
   - API abuse prevented

---

## Testing

### Test Rate Limiting

```bash
# Test form submission rate limit
for i in {1..25}; do
  curl -X POST http://localhost:3000/api/forms/convert-pdf/[id]/test-submit \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json"
done

# Should return 429 after 20 requests
```

### Monitor Rate Limits

Check response headers:
```bash
curl -I http://localhost:3000/api/documents/search?q=test
```

Look for:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After` (when exceeded)

---

## Configuration

Rate limits can be adjusted in each route file. Current limits are:

- **Form submissions:** 20/min (reasonable for testing)
- **Invitations:** 10/hour (prevents abuse)
- **Bulk invitations:** 3/hour (very restrictive)
- **Search:** 60/min (allows normal usage)
- **Advanced search:** 30/min (more restrictive due to cost)
- **Email lookup:** 30/min (prevents DoS)

---

## Next Steps

1. ✅ **Monitor usage** - Check if limits are too restrictive
2. ✅ **Adjust limits** - Based on actual usage patterns
3. ✅ **Add logging** - Track rate limit hits for analysis
4. ⚠️ **Consider IP-based limits** - For unauthenticated routes

---

*Implementation Date: January 20, 2026*  
*Status: ✅ Complete - 6 additional routes protected*
