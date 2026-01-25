# How to Run Supabase RLS Audit

## Option 1: Manual Review (Recommended)

**Best for:** One-time review, detailed analysis

1. **Open Supabase SQL Editor**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Click **SQL Editor** → **New Query**

2. **Run Queries**
   - Open `scripts/manual-rls-review.sql`
   - Copy and paste each query section
   - Review results

3. **Document Findings**
   - Use `MANUAL_REVIEW_CHECKLIST.md` to track issues
   - Create migrations to fix any problems

**See:** `SUPABASE_MANUAL_REVIEW_GUIDE.md` for detailed instructions

---

## Option 2: Automated Script (Direct PostgreSQL)

**Best for:** Regular audits, CI/CD integration

### Prerequisites

```bash
npm install pg @types/pg dotenv
npm install -D tsx
```

### Setup

1. **Get Database Connection String**
   - In Supabase Dashboard → Settings → Database
   - Copy the connection string (or construct it)
   - Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

2. **Add to .env.local**
   ```bash
   DATABASE_URL=postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres
   ```

3. **Run Script**
   ```bash
   npx tsx scripts/run-rls-audit-direct.ts
   ```

### Output

- Console output with results
- `supabase-rls-audit-results.json` with detailed data

---

## Option 3: Supabase MCP (If Available)

**Best for:** Quick queries, if MCP connection is stable

The MCP Supabase tools can run queries directly, but may timeout on complex queries.

---

## Quick Reference

### Critical Queries to Run

1. **Tables without RLS** (CRITICAL)
   ```sql
   SELECT tablename FROM pg_tables 
   WHERE schemaname = 'public' AND rowsecurity = false;
   ```
   Expected: 0 rows

2. **Weak Policies** (REVIEW)
   ```sql
   SELECT tablename, policyname, qual 
   FROM pg_policies 
   WHERE schemaname = 'public' AND qual = 'true';
   ```
   Expected: 0-5 rows (review each)

3. **Public Access** (CRITICAL)
   ```sql
   SELECT table_name, privilege_type
   FROM information_schema.table_privileges
   WHERE table_schema = 'public' AND grantee = 'anon';
   ```
   Expected: 0 rows

4. **Security Summary**
   ```sql
   -- See scripts/manual-rls-review.sql Query 10
   ```
   Expected: All ✅ status

---

## Troubleshooting

### Connection Timeout (MCP)
- **Issue:** MCP queries timing out
- **Solution:** Use Option 1 (Manual) or Option 2 (Direct PostgreSQL)

### Missing DATABASE_URL
- **Issue:** Script can't connect
- **Solution:** Add DATABASE_URL to .env.local with PostgreSQL connection string

### Permission Errors
- **Issue:** Query fails with permission error
- **Solution:** Ensure connection string uses service role or has proper permissions

---

## Next Steps After Audit

1. ✅ Document findings in `MANUAL_REVIEW_CHECKLIST.md`
2. ✅ Fix critical issues immediately
3. ✅ Create migrations for fixes
4. ✅ Update security audit report
5. ✅ Schedule regular audits (monthly recommended)

---

*Last updated: January 20, 2026*
