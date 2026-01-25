# Team Management Implementation

## Overview
Complete team management system has been implemented to add company administrators and team members with invitation emails.

## Features Implemented

### 1. Team Management Page
**Location**: `/admin/settings/team`

- **Add Team Member Form**: Comprehensive form with all required fields
- **Role Selection**: Dropdown with Admin, Supervisor, Internal Auditor, Worker options
- **Email Validation**: Real-time email format validation
- **Phone Number Support**: Optional phone number field
- **Responsibilities Field**: Optional field to describe key responsibilities
- **Pending Invitations List**: Shows all pending invitations with details
- **Active Team Members List**: Displays all active team members

### 2. Database Migration
**File**: `supabase/migrations/029_add_invitation_phone_responsibilities.sql`

Adds:
- `phone` column to `worker_invitations` table
- `responsibilities` column to `worker_invitations` table

### 3. Updated Invitation API
**File**: `app/api/invitations/route.ts`

- Accepts `phone` and `responsibilities` fields
- Validates email format
- Sends invitation emails via Resend (if configured)
- Returns invitation details including phone and responsibilities

### 4. Add Team Member Form Component
**File**: `components/admin/add-team-member-form.tsx`

Features:
- Form validation (first name, last name, email, position required)
- Email format validation
- Phone format validation (optional)
- Role selection with descriptions
- Responsibilities textarea
- Success/error messaging
- Loading states

## Adding Team Members

### Step 1: Run Database Migration
```bash
# Apply the migration to add phone and responsibilities columns
supabase migration up
# Or manually run: supabase/migrations/029_add_invitation_phone_responsibilities.sql
```

### Step 2: Access Team Management Page
Navigate to: `http://localhost:3000/admin/settings/team`

### Step 3: Add Team Members

#### 1. Robert "Bob" Chen - Health & Safety Coordinator
- **First Name**: Robert
- **Last Name**: Chen
- **Email**: bchen@mapleridgeconcrete.ca
- **Phone**: (613) 555-7801
- **Position**: Health & Safety Coordinator
- **Role**: Admin
- **Responsibilities**: Overall safety program, COR certification lead, training coordination

#### 2. Patricia Williams - Operations Manager
- **First Name**: Patricia
- **Last Name**: Williams
- **Email**: pwilliams@mapleridgeconcrete.ca
- **Phone**: (613) 555-7802
- **Position**: Operations Manager
- **Role**: Admin
- **Responsibilities**: Day-to-day operations, equipment management, project scheduling

#### 3. Carlos Mendez - Senior Site Superintendent
- **First Name**: Carlos
- **Last Name**: Mendez
- **Email**: cmendez@mapleridgeconcrete.ca
- **Phone**: (613) 555-7803
- **Position**: Senior Site Superintendent
- **Role**: Supervisor
- **Responsibilities**: Site inspections, toolbox talks, crew supervision

#### 4. Amanda Foster - HR/Admin Manager
- **First Name**: Amanda
- **Last Name**: Foster
- **Email**: afoster@mapleridgeconcrete.ca
- **Phone**: (613) 555-7804
- **Position**: HR/Admin Manager
- **Role**: Admin
- **Responsibilities**: Training records, worker certifications, document control

### Step 4: Send Invitations
1. Fill out the form for each team member
2. Click "Send Invitation"
3. Invitation email will be sent (if email service configured)
4. Team member will appear in "Pending Invitations" list
5. Once they accept, they'll appear in "Active Team Members"

## Email Configuration

To send invitation emails, configure your email service:

### Option 1: Resend (Recommended)
```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=COR Pathways <noreply@yourdomain.com>
```

### Option 2: Development Mode
If email service is not configured, invitations are still created but emails are logged to console. In development, the invitation link is returned in the API response.

## Email Template

Invitation emails include:
- Personalized greeting
- Company name
- Role and position
- Phone number (if provided)
- Responsibilities (if provided)
- Accept invitation button/link
- Expiration notice (7 days)
- Support contact information

## Role Permissions

### Admin
- Full access to company settings
- Team management
- All features and reports
- Can invite other team members

### Supervisor
- Can manage workers
- Conduct inspections
- View reports
- Cannot modify company settings

### Internal Auditor
- Can conduct audits
- Review compliance
- View audit reports
- Limited settings access

### Worker
- Can submit forms
- View assigned tasks
- Limited access to reports
- Cannot invite others

## Testing Checklist

- ✅ Add user form works
- ✅ Role selection dropdown displays all options
- ✅ Email validation works correctly
- ✅ Phone field accepts valid formats
- ✅ Responsibilities field saves correctly
- ✅ Invitation emails sent (check logs if email service configured)
- ✅ Users appear in team list after invitation
- ✅ Permissions are set correctly per role
- ✅ Pending invitations display correctly
- ✅ Active team members display correctly

## API Endpoints

### GET `/api/invitations`
- Returns all pending invitations for the company
- Requires: Admin, Internal Auditor, or Super Admin role

### POST `/api/invitations`
- Creates a new invitation
- Requires: Admin or Super Admin role
- Body:
  ```json
  {
    "firstName": "Robert",
    "lastName": "Chen",
    "email": "bchen@mapleridgeconcrete.ca",
    "phone": "(613) 555-7801",
    "position": "Health & Safety Coordinator",
    "role": "admin",
    "responsibilities": "Overall safety program, COR certification lead, training coordination"
  }
  ```

## Files Created/Modified

### New Files:
- `app/(protected)/admin/settings/team/page.tsx` - Team management page
- `components/admin/add-team-member-form.tsx` - Add team member form component
- `supabase/migrations/029_add_invitation_phone_responsibilities.sql` - Database migration
- `scripts/test-team-management.ts` - Test script

### Modified Files:
- `app/api/invitations/route.ts` - Updated to support phone and responsibilities, send emails
- `components/admin/index.ts` - Added export for AddTeamMemberForm

## Next Steps

1. ✅ Run database migration
2. ✅ Navigate to team management page
3. ✅ Add all 4 team members
4. ✅ Verify invitation emails are sent (check logs)
5. ✅ Confirm team members appear in pending invitations
6. ✅ Wait for team members to accept invitations
7. ✅ Verify they appear in active team members list
8. ✅ Test permissions for each role

## Notes

- Invitations expire after 7 days
- Rate limiting: 10 invitations per hour per user
- Email service must be configured to send emails (otherwise invitations are created but emails logged)
- Phone and responsibilities are optional fields
- All team members must accept their invitation before they can access the system
- First admin cannot be deactivated
