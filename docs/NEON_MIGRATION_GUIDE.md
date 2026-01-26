# NEON Database Migration Guide

## Prerequisites
1. NEON account (https://console.neon.tech/)
2. Node.js and npm installed
3. PostgreSQL client (psql) installed

## Migration Steps

### 1. Create NEON Database
1. Go to [NEON Console](https://console.neon.tech/)
2. Create a new project
3. Note the connection string from Project Settings

### 2. Set Up Schema
```bash
npm run db:neon-setup
# Follow prompts to enter your NEON connection string
```

### 3. Update Environment Variables
Edit `.env.local` and replace:
```
# Remove Supabase variables
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Add NEON connection
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]
```

### 4. Update Application Code
1. Remove Supabase client imports
2. Replace with direct PostgreSQL client usage

### 5. Verify Migration
```bash
npm run db:neon-migrate
# Check for any errors
```

## Post-Migration Checks
- [ ] All tables created successfully
- [ ] Application connects to NEON
- [ ] All CRUD operations work
- [ ] Authentication flows work

## Troubleshooting
- Connection issues: Verify DATABASE_URL format
- Schema errors: Check neon-schema.sql for syntax
- Performance: Monitor NEON dashboard for queries
