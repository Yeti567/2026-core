# Deployment Checklist

## Pre-Deployment

### Database
- [ ] Run migration `027_add_company_industry.sql`
- [ ] Verify migration successful: `scripts/verify-migration.sql`
- [ ] Check no errors in migration logs
- [ ] Verify indexes created
- [ ] Verify function updated

### Code Review
- [ ] All TypeScript types correct
- [ ] No linter errors
- [ ] All imports resolved
- [ ] Components exported correctly
- [ ] API routes have error handling

### Testing
- [ ] Registration form works
- [ ] Industry fields save correctly
- [ ] Email verification works
- [ ] Welcome page displays
- [ ] Profile completion works
- [ ] Dashboard integration works

## Deployment Steps

### 1. Database Migration
```bash
# Using Supabase CLI
supabase migration up

# Or manually in Supabase Dashboard
# Run: supabase/migrations/027_add_company_industry.sql
```

### 2. Verify Migration
```sql
-- Run in Supabase SQL Editor
\i scripts/verify-migration.sql
```

### 3. Deploy Application
```bash
# Build and deploy
npm run build
npm run deploy

# Or using your deployment platform (Vercel, etc.)
```

### 4. Post-Deployment Verification

#### Test Registration
- [ ] Navigate to `/register`
- [ ] Fill out form with test data
- [ ] Submit registration
- [ ] Check email received

#### Test Email Verification
- [ ] Click verification link
- [ ] Verify redirect to `/welcome`
- [ ] Check company created in database
- [ ] Verify user profile created

#### Test Welcome Page
- [ ] Welcome page loads
- [ ] Company info displays
- [ ] COR elements show correctly
- [ ] Links work

#### Test Profile Completion
- [ ] Navigate to `/admin/profile`
- [ ] Form loads
- [ ] Can update industry info
- [ ] Changes save correctly

#### Test Dashboard
- [ ] Dashboard loads
- [ ] Phases widget shows
- [ ] Links work correctly

## Rollback Plan

If issues occur:

1. **Database Rollback:**
   ```sql
   -- Remove columns (if needed)
   ALTER TABLE companies 
   DROP COLUMN IF EXISTS industry,
   DROP COLUMN IF EXISTS industry_code,
   DROP COLUMN IF EXISTS employee_count,
   DROP COLUMN IF EXISTS years_in_business,
   DROP COLUMN IF EXISTS main_services;
   
   ALTER TABLE registration_tokens
   DROP COLUMN IF EXISTS industry,
   DROP COLUMN IF EXISTS employee_count,
   DROP COLUMN IF EXISTS years_in_business,
   DROP COLUMN IF EXISTS main_services;
   ```

2. **Code Rollback:**
   - Revert to previous commit
   - Redeploy previous version

## Monitoring

After deployment, monitor:

- [ ] Error logs for registration issues
- [ ] Email delivery rates
- [ ] Database query performance
- [ ] User registration success rate
- [ ] API endpoint response times

## Success Metrics

Track these metrics:

- Registration completion rate
- Email verification rate
- Profile completion rate
- Time to complete registration
- Error rates by step

## Support Documentation

Ensure these are updated:

- [ ] User guide updated
- [ ] API documentation updated
- [ ] Admin guide updated
- [ ] Troubleshooting guide updated
