# Quick Start: Register Jennifer Martinez

## To Actually Register (When Server is Running)

### Option 1: Use the Registration Script

```bash
# Start your development server first
npm run dev

# In another terminal, run the registration script
npx tsx scripts/register-jennifer-martinez.ts
```

### Option 2: Manual Registration via Browser

1. **Start Server:**
   ```bash
   npm run dev
   ```

2. **Navigate to Registration:**
   ```
   http://localhost:3000/register
   ```

3. **Fill Out Form:**
   - Company Name: `Maple Ridge Concrete Ltd.`
   - WSIB Number: `123456789`
   - Company Email: `info@mapleridgeconcrete.ca`
   - Address: `2500 Industrial Parkway`
   - City: `Ottawa`
   - Province: `Ontario`
   - Postal Code: `K1G 4K9`
   - Phone: `(613) 555-7800`
   - Your Name: `Jennifer Martinez`
   - Your Position: `Director`
   - Your Email: `jennifer@mapleridgeconcrete.ca`
   - **Click "Add Industry Info"**
   - Industry: `Concrete Construction`
   - Employees: `32`
   - Years: `5`
   - Services: `Foundations`, `Flatwork`, `Structural Concrete`, `Decorative Finishes`

4. **Submit Registration**

5. **Check Email:**
   - Look for email at `jennifer@mapleridgeconcrete.ca`
   - Click verification link

6. **Welcome Page:**
   - Should redirect to `/welcome`
   - See company information
   - View 14 COR elements

7. **Dashboard:**
   - Navigate to `/dashboard`
   - See progress widgets
   - Access phases

---

## What Happens After Registration

1. ✅ **Email Sent** → Check inbox
2. ✅ **Click Link** → Verify email
3. ✅ **Company Created** → In database
4. ✅ **User Profile Created** → Admin role
5. ✅ **Welcome Page** → Shows company info
6. ✅ **Dashboard Ready** → Start working

---

## Verification Checklist

After registration, verify:

- [ ] Company exists in `companies` table
- [ ] Industry data saved correctly
- [ ] User profile created with admin role
- [ ] Worker record created
- [ ] Welcome page accessible
- [ ] Dashboard shows phases widget
- [ ] Can access `/phases` page
- [ ] Can access `/admin/profile` page

---

## Troubleshooting

**If registration fails:**
- Check server logs
- Verify database migration ran
- Check email service configured
- Verify environment variables

**If welcome page doesn't load:**
- Check user authentication
- Verify company_id in user_profiles
- Check database queries

**If industry data missing:**
- Check registration_tokens table
- Verify API route saves industry fields
- Check use_registration_token function

---

## Ready to Test!

Everything is set up and ready. Just:
1. Run the migration
2. Start the server
3. Register Jennifer Martinez
4. Follow the flow!

🎉 **Good luck with testing!**
