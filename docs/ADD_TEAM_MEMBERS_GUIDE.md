# Adding Team Members Guide

## Quick Start

### Option 1: Using the UI (Recommended)

1. **Navigate to Team Management**
   - Go to: `http://localhost:3000/admin/settings/team`
   - Or: Settings → Team tab

2. **Click "Add Team Member"**

3. **Fill out the form for each member:**

#### Robert "Bob" Chen
- **First Name**: Robert
- **Last Name**: Chen
- **Email**: bchen@mapleridgeconcrete.ca
- **Phone**: (613) 555-7801
- **Position**: Health & Safety Coordinator
- **Role**: Admin
- **Responsibilities**: Overall safety program, COR certification lead, training coordination

#### Patricia Williams
- **First Name**: Patricia
- **Last Name**: Williams
- **Email**: pwilliams@mapleridgeconcrete.ca
- **Phone**: (613) 555-7802
- **Position**: Operations Manager
- **Role**: Admin
- **Responsibilities**: Day-to-day operations, equipment management, project scheduling

#### Carlos Mendez
- **First Name**: Carlos
- **Last Name**: Mendez
- **Email**: cmendez@mapleridgeconcrete.ca
- **Phone**: (613) 555-7803
- **Position**: Senior Site Superintendent
- **Role**: Supervisor
- **Responsibilities**: Site inspections, toolbox talks, crew supervision

#### Amanda Foster
- **First Name**: Amanda
- **Last Name**: Foster
- **Email**: afoster@mapleridgeconcrete.ca
- **Phone**: (613) 555-7804
- **Position**: HR/Admin Manager
- **Role**: Admin
- **Responsibilities**: Training records, worker certifications, document control

4. **Click "Send Invitation"** for each member

5. **Verify invitations** appear in the "Pending Invitations" section

### Option 2: Using the Script

1. **Make sure you're logged in** as an admin in your browser

2. **Open browser console** (F12 → Console tab)

3. **Copy and paste this code:**

```javascript
const members = [
  {
    firstName: 'Robert',
    lastName: 'Chen',
    email: 'bchen@mapleridgeconcrete.ca',
    phone: '(613) 555-7801',
    position: 'Health & Safety Coordinator',
    role: 'admin',
    responsibilities: 'Overall safety program, COR certification lead, training coordination',
  },
  {
    firstName: 'Patricia',
    lastName: 'Williams',
    email: 'pwilliams@mapleridgeconcrete.ca',
    phone: '(613) 555-7802',
    position: 'Operations Manager',
    role: 'admin',
    responsibilities: 'Day-to-day operations, equipment management, project scheduling',
  },
  {
    firstName: 'Carlos',
    lastName: 'Mendez',
    email: 'cmendez@mapleridgeconcrete.ca',
    phone: '(613) 555-7803',
    position: 'Senior Site Superintendent',
    role: 'supervisor',
    responsibilities: 'Site inspections, toolbox talks, crew supervision',
  },
  {
    firstName: 'Amanda',
    lastName: 'Foster',
    email: 'afoster@mapleridgeconcrete.ca',
    phone: '(613) 555-7804',
    position: 'HR/Admin Manager',
    role: 'admin',
    responsibilities: 'Training records, worker certifications, document control',
  },
];

for (const member of members) {
  try {
    const response = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member),
    });
    const data = await response.json();
    if (response.ok) {
      console.log(`✅ Added ${member.email}`);
    } else {
      console.log(`❌ Failed ${member.email}:`, data.error);
    }
  } catch (error) {
    console.log(`❌ Error adding ${member.email}:`, error);
  }
}
```

4. **Press Enter** to run

## What Happens Next

1. **Invitation Emails Sent**
   - Each team member receives an email with an invitation link
   - Email includes their role, position, and responsibilities
   - Link expires in 7 days

2. **Pending Invitations**
   - All invitations appear in the "Pending Invitations" section
   - Shows: Name, email, phone, position, role, responsibilities, expiration date

3. **Acceptance**
   - Team members click the invitation link
   - They complete their profile setup
   - They're added to "Active Team Members"

4. **Active Team Members**
   - Once accepted, they appear in the active list
   - They can log in and access the system based on their role

## Verification Checklist

- ✅ All 4 team members added
- ✅ Invitation emails sent (check email logs)
- ✅ Invitations appear in pending list
- ✅ Each member has correct role
- ✅ Phone numbers saved
- ✅ Responsibilities saved
- ✅ Permissions set correctly per role

## Troubleshooting

### "Unauthorized" Error
- Make sure you're logged in as an admin
- Check that your session is valid
- Try refreshing the page

### "Already exists" Error
- The email already has a pending invitation
- Or the user already exists in the company
- Check the pending invitations list

### Email Not Sending
- Check if email service is configured (RESEND_API_KEY)
- Check server logs for email errors
- Invitations are still created even if email fails
- In dev mode, invitation links are logged to console

### Rate Limit Error
- Maximum 10 invitations per hour per user
- Wait an hour or use a different admin account

## Role Permissions Summary

### Admin (Robert, Patricia, Amanda)
- ✅ Full access to company settings
- ✅ Can manage team members
- ✅ Can invite other users
- ✅ Access to all features and reports
- ✅ Can modify company profile

### Supervisor (Carlos)
- ✅ Can manage workers
- ✅ Can conduct inspections
- ✅ Can view reports
- ❌ Cannot modify company settings
- ❌ Cannot invite other users

## Next Steps After Adding

1. **Wait for acceptances** - Team members need to accept invitations
2. **Verify permissions** - Test that each role has correct access
3. **Assign tasks** - Start assigning COR certification tasks
4. **Set up workflows** - Configure who handles what responsibilities
