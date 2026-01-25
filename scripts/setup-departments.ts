/**
 * Setup Initial Departments Script
 * Creates the 6 departments for Maple Ridge Concrete Ltd.
 * 
 * Usage: Run this from browser console while logged in as admin
 * Or: npx tsx scripts/setup-departments.ts (requires auth token)
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface Department {
  name: string;
  code: string;
  description: string;
  department_type: 'division' | 'department' | 'crew' | 'team' | 'section';
  superintendent_email?: string;
  manager_email?: string;
  display_order: number;
  color_code: string;
}

const DEPARTMENTS: Department[] = [
  {
    name: 'Foundations Division',
    code: 'FND',
    description: 'Specializes in foundation work including excavation, formwork, and concrete placement',
    department_type: 'division',
    superintendent_email: 'cmendez@mapleridgeconcrete.ca', // Carlos Mendez
    display_order: 1,
    color_code: '#3b82f6', // Blue
  },
  {
    name: 'Flatwork Division',
    code: 'FLT',
    description: 'Handles flatwork projects including driveways, sidewalks, and patios',
    department_type: 'division',
    display_order: 2,
    color_code: '#10b981', // Green
  },
  {
    name: 'Structural Division',
    code: 'STR',
    description: 'Focuses on structural concrete work including beams, columns, and slabs',
    department_type: 'division',
    display_order: 3,
    color_code: '#f59e0b', // Amber
  },
  {
    name: 'Decorative Finishes',
    code: 'DEC',
    description: 'Specialized decorative concrete finishes and architectural elements',
    department_type: 'crew',
    display_order: 4,
    color_code: '#8b5cf6', // Purple
  },
  {
    name: 'Equipment & Fleet Management',
    code: 'EQP',
    description: 'Manages all company equipment, vehicles, and maintenance',
    department_type: 'department',
    manager_email: 'pwilliams@mapleridgeconcrete.ca', // Patricia Williams
    display_order: 5,
    color_code: '#ef4444', // Red
  },
  {
    name: 'Administration',
    code: 'ADM',
    description: 'Administrative support, HR, training records, and document control',
    department_type: 'department',
    manager_email: 'afoster@mapleridgeconcrete.ca', // Amanda Foster
    display_order: 6,
    color_code: '#6366f1', // Indigo
  },
];

async function getWorkerIdByEmail(email: string, authToken?: string): Promise<string | null> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // We'll need to fetch workers and find by email
    // For now, return null and let the API handle it
    return null;
  } catch (error) {
    return null;
  }
}

async function createDepartment(dept: Department, authToken?: string) {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const body: any = {
      name: dept.name,
      code: dept.code,
      description: dept.description,
      department_type: dept.department_type,
      display_order: dept.display_order,
      color_code: dept.color_code,
    };

    // Note: superintendent_id and manager_id will need to be set after workers are added
    // For now, we'll create departments without them and update later

    const response = await fetch(`${BASE_URL}/api/admin/departments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return { success: true, department: data.department };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Setting Up Departments for Maple Ridge Concrete Ltd.');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}\n`);

  const authToken = process.env.ADMIN_AUTH_TOKEN;

  if (!authToken) {
    console.log('⚠️  No ADMIN_AUTH_TOKEN found.');
    console.log('   Run this from browser console while logged in as admin, or set ADMIN_AUTH_TOKEN\n');
  }

  const results = [];

  for (const dept of DEPARTMENTS) {
    console.log(`Creating ${dept.name} (${dept.code})...`);
    const result = await createDepartment(dept, authToken);
    results.push({ department: dept.name, ...result });

    if (result.success) {
      console.log(`✅ Created ${dept.name}`);
    } else {
      console.log(`❌ Failed: ${result.error}`);
      if (result.error?.includes('already exists')) {
        console.log('   → Department already exists, skipping');
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

  console.log(`\nTotal: ${DEPARTMENTS.length}`);
  console.log(`✅ Created: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (successful > 0) {
    console.log('\n✅ Successfully created departments:');
    results
      .filter(r => r.success)
      .forEach(r => console.log(`   - ${r.department}`));
  }

  console.log('\n📝 Next Steps:');
  console.log('1. Navigate to: /admin/departments');
  console.log('2. Assign superintendents and managers to departments');
  console.log('3. Assign workers to their departments');
  console.log('4. Assign equipment to departments');
  console.log('5. View the org chart visualization');
}

// Browser console version
if (typeof window !== 'undefined') {
  (window as any).setupDepartments = async () => {
    const results = [];
    for (const dept of DEPARTMENTS) {
      try {
        const response = await fetch('/api/admin/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: dept.name,
            code: dept.code,
            description: dept.description,
            department_type: dept.department_type,
            display_order: dept.display_order,
            color_code: dept.color_code,
          }),
        });
        const data = await response.json();
        if (response.ok) {
          console.log(`✅ Created ${dept.name}`);
          results.push({ success: true, name: dept.name });
        } else {
          console.log(`❌ Failed ${dept.name}:`, data.error);
          results.push({ success: false, name: dept.name, error: data.error });
        }
      } catch (error: any) {
        console.log(`❌ Error creating ${dept.name}:`, error.message);
        results.push({ success: false, name: dept.name, error: error.message });
      }
    }
    return results;
  };
  console.log('💡 Run setupDepartments() in the console to create all departments');
}

// Node.js version
if (typeof window === 'undefined') {
  main().catch(console.error);
}
