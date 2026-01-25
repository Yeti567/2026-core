# Quick Start: Supabase RLS Audit

## 🚀 Fastest Way to Run Audit

### Option 1: Automated Script (Recommended)

```bash
# Install dependencies (if not already installed)
npm install pg @types/pg dotenv

# Add DATABASE_URL to .env.local
# Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# Run audit
npm run audit:rls
```

**Get Database URL:**
1. Supabase Dashboard → Settings → Database
2. Copy connection string or use: `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres`

---

### Option 2: Manual Review (Most Reliable)

```bash
# Open Supabase SQL Editor
# 1. Go to https://supabase.com/dashboard
# 2. Select your project
# 3. Click SQL Editor → New Query

# Copy queries from:
scripts/manual-rls-review.sql

# Run each query section
# Document findings in:
MANUAL_REVIEW_CHECKLIST.md
```

---

## 📋 Critical Checks (Run These First)

### 1. Tables Without RLS ⚠️ CRITICAL

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;
```

**Expected:** 0 rows  
**If rows found:** Enable RLS immediately!

---

### 2. Public Access ⚠️ CRITICAL

```sql
SELECT table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' AND grantee = 'anon';
```

**Expected:** 0 rows  
**If rows found:** Revoke anon access!

---

### 3. Security Summary ✅

```sql
-- See Query 10 in scripts/manual-rls-review.sql
```

**Expected:** All checks show ✅ status

---

## 📁 Files Created

- `SUPABASE_MANUAL_REVIEW_GUIDE.md` - Detailed step-by-step guide
- `scripts/manual-rls-review.sql` - All SQL queries ready to run
- `MANUAL_REVIEW_CHECKLIST.md` - Checklist to track findings
- `scripts/run-rls-audit-direct.ts` - Automated script (requires DATABASE_URL)
- `RUN_RLS_AUDIT_INSTRUCTIONS.md` - Full instructions for all options

---

## ⚡ Quick Commands

```bash
# Run automated audit
npm run audit:rls

# View manual guide
cat SUPABASE_MANUAL_REVIEW_GUIDE.md

# View SQL queries
cat scripts/manual-rls-review.sql
```

---

## 🎯 Next Steps

1. ✅ Run critical checks (above)
2. ✅ Review all queries in `scripts/manual-rls-review.sql`
3. ✅ Document findings in `MANUAL_REVIEW_CHECKLIST.md`
4. ✅ Fix any critical issues found
5. ✅ Create migrations for fixes

---

*Need help? See `RUN_RLS_AUDIT_INSTRUCTIONS.md` for detailed instructions.*
