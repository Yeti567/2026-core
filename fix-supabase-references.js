const fs = require('fs');
const path = require('path');

// Files that need getSupabase function removed
const filesToFix = [
  'app/(protected)/admin/employees/[id]/certifications/page.tsx',
  'app/(protected)/admin/employees/page.tsx',
  'app/(protected)/admin/certifications/training/new/page.tsx',
  'app/(protected)/admin/departments/[id]/page.tsx',
  'app/(protected)/mobile/certifications/capture/page.tsx',
  'app/(protected)/admin/employees/[id]/page.tsx'
];

function fixFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  
  // Remove getSupabase function definition
  content = content.replace(/function getSupabase\(\)\s*\{[\s\S]*?\}/g, '');
  
  // Replace getSupabase() calls with API calls
  content = content.replace(/const\s+supabase\s*=\s*getSupabase\(\);/g, '// Using API endpoints instead of Supabase');
  
  // Replace Supabase data fetching patterns with API calls
  content = content.replace(
    /const\s+\{?\s*data\s*:\s*(\w+)\s*\}?\s*=\s*await\s*supabase\s*\.from\(['"]([^'"]+)['"]\)\.select\([^)]*\)(?:\.eq\([^)]*\))?(?:\.order\([^)]*\))?;/g,
    '// TODO: Replace with API call to fetch $2'
  );
  
  fs.writeFileSync(fullPath, content);
  console.log(`Fixed: ${filePath}`);
}

filesToFix.forEach(fixFile);
console.log('Done fixing Supabase references!');
