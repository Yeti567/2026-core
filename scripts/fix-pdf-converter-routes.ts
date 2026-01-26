import * as fs from 'fs';
import * as path from 'path';

const filesToFix = [
  'app/api/pdf-converter/convert/route.ts',
  'app/api/pdf-converter/fields/route.ts',
  'app/api/pdf-converter/process/route.ts',
  'app/api/pdf-converter/session/route.ts',
  'app/api/pdf-converter/upload/route.ts'
];

function fixFile(filePath: string) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  
  // Fix the malformed auth line
  content = content.replace(
    /const \{ data: \{ user \}, error: authError \} = \/\/ TODO: Implement user authentication without Supabase\s*\n\s*const \{ data: \{ user: authUser \}, error: authError \} = \{ data: \{ user: null \}, error: new Error\('Auth not implemented'\) \};/,
    `// TODO: Implement user authentication without Supabase\n      const { data: { user: authUser }, error: authError } = { data: { user: null }, error: new Error('Auth not implemented') };`
  );
  
  // Fix the variable reference
  content = content.replace(
    /if \(authError \|\| !user\) \{/,
    `if (authError || !authUser) {`
  );
  
  fs.writeFileSync(fullPath, content, 'utf-8');
  console.log(`✅ Fixed: ${filePath}`);
}

async function main() {
  console.log('🔧 Fixing PDF converter route syntax errors...\n');
  
  for (const file of filesToFix) {
    fixFile(file);
  }
  
  console.log('\n✅ All PDF converter routes fixed!');
}

main().catch(console.error);
