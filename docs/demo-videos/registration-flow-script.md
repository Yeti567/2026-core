# Registration Flow Demo Script

**Video Title:** Complete Registration Demo  
**Duration:** 3 minutes  
**Output File:** `docs/demo-videos/registration-flow.mp4`

---

## Pre-Recording Checklist

- [ ] Dev server running (`npm run dev`)
- [ ] Supabase project active
- [ ] Resend API configured (or use Supabase email logs)
- [ ] Test CSV file ready (`test-employees.csv`)
- [ ] Browser in incognito/private mode
- [ ] Screen recording software ready (OBS, Loom, etc.)
- [ ] Resolution: 1920x1080 recommended

---

## Scene 1: Company Registration (0:00 - 0:30)

### Actions:
1. **Open browser** → Navigate to `http://localhost:3000/register`
2. **Show the registration form** (pause 2 seconds to show UI)
3. **Fill in company details:**
   - Company Name: `SafeBuild Construction Ltd`
   - WSIB Number: `1234567`
   - Company Email: `safety@safebuild-demo.com`
   - Address: `456 Construction Way`
   - City: `Ottawa`
   - Province: `Ontario`
   - Postal Code: `K1A 0B1`
   - Phone: `(613) 555-0100`

4. **Fill in registrant details:**
   - Your Name: `Sarah Johnson`
   - Position: `Safety Manager`
   - Email: `sarah.johnson@safebuild-demo.com`

5. **Check the terms checkbox**
6. **Click "Register Company"**
7. **Show success message** (pause to read)

### Narration Points:
- "Companies register through our secure portal"
- "WSIB verification ensures only legitimate businesses can join"
- "A magic link is sent to verify the registrant's email"

---

## Scene 2: Admin Activation (0:30 - 1:00)

### Actions:
1. **Open email client** (or Supabase Auth logs in dashboard)
2. **Find the activation email** from COR Pathways
3. **Show the email content** (pause 2 seconds)
4. **Click the activation link**
5. **Land on the Set Password page** (`/reset-password?type=invite`)
6. **Enter a password:**
   - Password: `SafePassword123!`
   - Confirm: `SafePassword123!`
7. **Show password requirements turning green**
8. **Click "Create Password"**
9. **Show success message**
10. **Auto-redirect to login page**
11. **Log in with email and password**
12. **Show the admin dashboard**

### Narration Points:
- "The admin receives a secure activation link"
- "Password requirements ensure account security"
- "After activation, the admin can immediately access the dashboard"

---

## Scene 3: CSV Employee Upload (1:00 - 1:30)

### Actions:
1. **Navigate to** `/admin/employees` or `/onboarding/upload-employees`
2. **Click "Download Template"** (show file downloads)
3. **Click "Upload Employees"** or drag-and-drop the test CSV
4. **Use this test file content:**

```csv
first_name,last_name,email,position,role,phone,hire_date
John,Smith,john.smith@safebuild-demo.com,Site Supervisor,supervisor,(613) 555-1001,2024-01-15
Jane,Doe,jane.doe@safebuild-demo.com,Concrete Finisher,worker,(613) 555-1002,2024-02-01
Mike,Johnson,mike.j@safebuild-demo.com,Safety Coordinator,internal_auditor,(613) 555-1003,2023-11-10
Invalid,Row,not-an-email,Worker,invalid_role,,2025-12-31
```

5. **Show the preview table:**
   - Point out valid rows (green checkmarks)
   - Point out invalid rows (red background with error messages)
6. **Show the count:** "3 valid / 4 total"
7. **Remove the invalid row** (click X)
8. **Click "Send 3 Invitations"**
9. **Show success message with count**

### Narration Points:
- "Bulk upload supports hundreds of employees at once"
- "Invalid data is clearly highlighted before sending"
- "Admins can fix errors before invitations go out"

---

## Scene 4: Worker Receives Invitation (1:30 - 2:00)

### Actions:
1. **Open email client** (as worker - john.smith@safebuild-demo.com)
2. **Find the invitation email** from COR Pathways
3. **Show the email content:**
   - Company name
   - Role assignment
   - "Accept Invitation" button
4. **Highlight key information:**
   - Invited by: Sarah Johnson
   - Position: Site Supervisor
   - Expires in: 7 days
5. **Click "Accept Invitation"** button in email
6. **Land on the acceptance page** (`/accept-invite/{token}`)

### Narration Points:
- "Workers receive professional invitation emails"
- "Clear information about who invited them and their role"
- "One-click acceptance from any device"

---

## Scene 5: Worker Accepts Invitation (2:00 - 2:30)

### Actions:
1. **On the acceptance page**, show:
   - Company logo/name at top
   - Pre-filled readonly fields (name, email, position, role)
2. **Fill in required fields:**
   - Phone: `(613) 555-1001`
   - Emergency Contact Name: `Mary Smith`
   - Emergency Contact Phone: `(613) 555-9999`
3. **Optionally upload profile photo** (click, select image)
4. **Check the terms acceptance checkbox**
5. **Click "Complete Setup & Accept Invitation"**
6. **Show processing state** with progress indicators
7. **Show success page:**
   - "Welcome Aboard!" message
   - "Check your email to set your password"
8. **Check email for password setup link**
9. **Click link → Set password page**
10. **Set password and complete**

### Narration Points:
- "Profile completion takes under a minute"
- "Emergency contacts are captured for safety compliance"
- "Passwordless setup via email link"

---

## Scene 6: Worker Login & Dashboard (2:30 - 3:00)

### Actions:
1. **Navigate to** `/login`
2. **Enter worker email:** `john.smith@safebuild-demo.com`
3. **Enter password**
4. **Click "Sign In"**
5. **Show the worker dashboard:**
   - Welcome message with name
   - Quick action buttons (Hazard Assessment, Incident Report)
   - Recent activity (empty for new user)
6. **Show mobile-responsive view:**
   - Open browser dev tools (F12)
   - Toggle device toolbar (Ctrl+Shift+M)
   - Select mobile device (iPhone 12 Pro)
7. **Show mobile dashboard layout**
8. **Navigate to a form** (tap Hazard Assessment)
9. **Show mobile-optimized form**

### Narration Points:
- "Workers can log in from any device"
- "Mobile-first design for field workers"
- "Forms work offline and sync when connected"

---

## Closing Shot (last 5 seconds)

Show the admin employee list with the newly accepted worker, demonstrating:
- Status changed from "Pending" to "Active"
- Real-time update visible

---

## Recording Tips

1. **Pace:** Move slowly enough for viewers to read UI elements
2. **Cursor:** Use a cursor highlighter tool
3. **Clicks:** Pause briefly after each click to show result
4. **Errors:** When showing errors, pause 3+ seconds
5. **Transitions:** Use smooth scrolling, not jumping
6. **Audio:** Record narration separately for cleaner edit

## Post-Production

1. Add intro title card (5 sec)
2. Add section labels at scene transitions
3. Speed up typing/waiting sections (1.5x-2x)
4. Add background music (optional, low volume)
5. Export at 1080p, 30fps minimum

---

## Test Data Summary

| Role | Email | Password |
|------|-------|----------|
| Admin | sarah.johnson@safebuild-demo.com | SafePassword123! |
| Supervisor | john.smith@safebuild-demo.com | WorkerPass123! |
| Worker | jane.doe@safebuild-demo.com | WorkerPass123! |
| Auditor | mike.j@safebuild-demo.com | WorkerPass123! |

---

*Script Version: 1.0*  
*Last Updated: January 2026*
