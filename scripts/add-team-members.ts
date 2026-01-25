/**
 * Add Team Members Script
 * Adds the 4 requested team members via the invitation API
 * 
 * Usage: npx tsx scripts/add-team-members.ts
 * 
 * Note: Requires authentication. You'll need to:
 * 1. Be logged in as an admin
 * 2. Have a valid session cookie
 * 3. Or use an API key if configured
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface TeamMember {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  role: 'admin' | 'supervisor';
  responsibilities: string;
}

const TEAM_MEMBERS: TeamMember[] = [
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

async function addTeamMember(member: TeamMember, authToken?: string) {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // If auth token provided, add it
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${BASE_URL}/api/invitations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        position: member.position,
        role: member.role,
        responsibilities: member.responsibilities,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return {
      success: true,
      member: member.email,
      invitation: data.invitation,
      invitationLink: data.invitationLink, // Only in dev mode
    };
  } catch (error: any) {
    return {
      success: false,
      member: member.email,
      error: error.message,
    };
  }
}

async function main() {
  console.log('🚀 Adding Team Members to COR Pathways');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}\n`);

  // Check if server is running
  try {
    const healthCheck = await fetch(`${BASE_URL}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    if (healthCheck.status >= 500) {
      console.log('❌ Server is not responding properly');
      return;
    }
  } catch (error) {
    console.log('❌ Server is not running!');
    console.log('\nPlease start the server first:');
    console.log('   npm run dev');
    return;
  }

  console.log('⚠️  Note: This script requires admin authentication.');
  console.log('You can either:');
  console.log('1. Run this from the browser console while logged in');
  console.log('2. Use the UI at /admin/settings/team');
  console.log('3. Provide an auth token (if API auth is configured)\n');

  // Check for auth token in environment
  const authToken = process.env.ADMIN_AUTH_TOKEN;

  if (!authToken) {
    console.log('ℹ️  No ADMIN_AUTH_TOKEN found in environment.');
    console.log('   Attempting to add members (will fail if not authenticated)...\n');
  }

  const results = [];

  for (const member of TEAM_MEMBERS) {
    console.log(`Adding ${member.firstName} ${member.lastName} (${member.email})...`);
    const result = await addTeamMember(member, authToken);
    results.push(result);

    if (result.success) {
      console.log(`✅ Successfully invited ${member.email}`);
      if (result.invitationLink) {
        console.log(`   Invitation link: ${result.invitationLink}`);
      }
    } else {
      console.log(`❌ Failed: ${result.error}`);
      if (result.error?.includes('Unauthorized') || result.error?.includes('401')) {
        console.log('   → Authentication required. Please use the UI or provide auth token.');
      } else if (result.error?.includes('already exists')) {
        console.log('   → This member already has a pending invitation or exists.');
      }
    }
    console.log('');
  }

  // Summary
  console.log('='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\nTotal: ${TEAM_MEMBERS.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (successful > 0) {
    console.log('\n✅ Successfully invited members:');
    results
      .filter(r => r.success)
      .forEach(r => console.log(`   - ${r.member}`));
  }

  if (failed > 0) {
    console.log('\n❌ Failed invitations:');
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`   - ${r.member}: ${r.error}`));
  }

  console.log('\n📝 Next Steps:');
  console.log('1. Check invitation emails (if email service configured)');
  console.log('2. View pending invitations at: /admin/settings/team');
  console.log('3. Team members will appear in active list once they accept');
}

// Run the script
main().catch(console.error);
