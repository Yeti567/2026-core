/**
 * Browser Console Script to Setup Departments
 * 
 * Copy and paste this entire script into your browser console
 * while logged in as admin at http://localhost:3000/admin/departments
 */

(async function setupDepartments() {
  console.log('🚀 Setting Up Departments for Maple Ridge Concrete Ltd.');
  console.log('='.repeat(60));

  const departments = [
    {
      name: 'Foundations Division',
      code: 'FND',
      description: 'Specializes in foundation work including excavation, formwork, and concrete placement',
      department_type: 'division',
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
      display_order: 5,
      color_code: '#ef4444', // Red
    },
    {
      name: 'Administration',
      code: 'ADM',
      description: 'Administrative support, HR, training records, and document control',
      department_type: 'department',
      display_order: 6,
      color_code: '#6366f1', // Indigo
    },
  ];

  const results = [];

  for (const dept of departments) {
    try {
      console.log(`Creating ${dept.name} (${dept.code})...`);
      
      const response = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dept),
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Created ${dept.name}`);
        results.push({ success: true, name: dept.name, data });
      } else {
        if (data.error?.includes('already exists') || data.error?.includes('unique')) {
          console.log(`⚠️  ${dept.name} already exists, skipping`);
          results.push({ success: true, name: dept.name, skipped: true });
        } else {
          console.log(`❌ Failed ${dept.name}:`, data.error);
          results.push({ success: false, name: dept.name, error: data.error });
        }
      }
    } catch (error) {
      console.log(`❌ Error creating ${dept.name}:`, error.message);
      results.push({ success: false, name: dept.name, error: error.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\nTotal: ${departments.length}`);
  console.log(`✅ Created/Skipped: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (successful > 0) {
    console.log('\n✅ Departments:');
    results
      .filter(r => r.success)
      .forEach(r => console.log(`   - ${r.name}${r.skipped ? ' (already exists)' : ''}`));
  }

  if (failed > 0) {
    console.log('\n❌ Failed:');
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`   - ${r.name}: ${r.error}`));
  }

  console.log('\n📝 Next Steps:');
  console.log('1. Refresh the page to see the new departments');
  console.log('2. Assign superintendents and managers');
  console.log('3. Assign workers to departments');
  console.log('4. Assign equipment to departments');
  console.log('5. Click "View Org Chart" to see the visualization');

  return results;
})();
