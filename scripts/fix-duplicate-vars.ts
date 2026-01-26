import * as fs from 'fs';
import * as path from 'path';

const filesToFix = [
  'app/api/push/subscribe/route.ts',
  'app/api/push/unsubscribe/route.ts'
];

function fixFile(filePath: string) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  
  // Fix duplicate variable declaration
  content = content.replace(
    /const \{ data: \{ user: authUser \}, error: authError \} = \/\/ TODO: Implement user authentication without Supabase\s*\n\s*const \{ data: \{ user: authUser \}, error: authError \} = \{ data: \{ user: null \}, error: new Error\('Auth not implemented'\) \};/,
    `// TODO: Implement user authentication without Supabase\n      const { data: { user: authUser }, error: authError } = { data: { user: null }, error: new Error('Auth not implemented') };`
  );
  
  fs.writeFileSync(fullPath, content, 'utf-8');
  console.log(`✅ Fixed: ${filePath}`);
}

async function main() {
  console.log('🔧 Fixing duplicate variable declarations...\n');
  
  for (const file of filesToFix) {
    fixFile(file);
  }
  
  console.log('\n✅ All duplicate variable issues fixed!');
}

main().catch(console.error);
