import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// List of files to migrate
const filesToMigrate = [
  'app/api/register/route.ts',
  'app/api/workers/route.ts',
  'app/api/workers/emails/route.ts',
  'app/api/push/subscribe/route.ts',
  'app/api/push/unsubscribe/route.ts',
  'app/api/push/test/route.ts',
  'app/api/phases/route.ts',
  'app/api/phases/[phaseId]/route.ts',
  'app/api/phases/[phaseId]/prompts/[promptId]/route.ts',
  'app/api/pdf-converter/upload/route.ts',
  'app/api/pdf-converter/process/route.ts',
  'app/api/pdf-converter/session/route.ts',
  'app/api/pdf-converter/fields/route.ts',
  'app/api/pdf-converter/convert/route.ts'
];

async function migrateFile(filePath: string) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;
  
  // Replace imports
  content = content.replace(
    /import\s*\{\s*createRouteHandlerClient[^}]*\}\s*from\s*['"]@\/lib\/supabase\/server['"];?/g,
    "import { createNeonWrapper } from '@/lib/db/neon-wrapper';"
  );
  
  content = content.replace(
    /import\s*\{\s*createServerActionClient[^}]*\}\s*from\s*['"]@\/lib\/supabase\/server['"];?/g,
    "import { createNeonWrapper } from '@/lib/db/neon-wrapper';"
  );
  
  // Replace service client creation
  content = content.replace(
    /function\s+getServiceClient\(\)\s*\{[^}]*\}/gs,
    "function getServiceClient() {\n  return createNeonWrapper();\n}"
  );
  
  // Replace client instantiation
  content = content.replace(
    /const\s+supabase\s*=\s*createRouteHandlerClient\(\);?/g,
    "const supabase = createNeonWrapper();"
  );
  
  content = content.replace(
    /const\s+supabase\s*=\s*createServerActionClient\(\);?/g,
    "const supabase = createNeonWrapper();"
  );
  
  content = content.replace(
    /const\s+supabase\s*=\s*getServiceClient\(\);?/g,
    "const supabase = getServiceClient();"
  );
  
  // Replace Supabase auth admin calls with placeholders
  content = content.replace(
    /await\s+supabase\.auth\.admin\.createUser\([^)]*\)/g,
    "// TODO: Implement user creation without Supabase Auth\n      const newUser = { user: { id: 'placeholder' } };"
  );
  
  content = content.replace(
    /await\s+supabase\.auth\.admin\.deleteUser\([^)]*\)/g,
    "// TODO: Implement user deletion without Supabase Auth\n      // await deleteUser(userId);"
  );
  
  content = content.replace(
    /await\s+supabase\.auth\.getUser\(\)/g,
    "// TODO: Implement user authentication without Supabase\n      const { data: { user: authUser }, error: authError } = { data: { user: null }, error: new Error('Auth not implemented') };"
  );
  
  // Write the file back if changed
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ Migrated: ${filePath}`);
  } else {
    console.log(`ℹ️  No changes needed: ${filePath}`);
  }
}

async function main() {
  console.log('🔄 Starting Supabase to Neon migration...\n');
  
  for (const file of filesToMigrate) {
    await migrateFile(file);
  }
  
  console.log('\n✅ Migration completed!');
  console.log('\n⚠️  IMPORTANT: Auth functionality needs to be implemented separately.');
  console.log('   - User creation/authentication');
  console.log('   - Session management');
  console.log('   - JWT token handling');
}

main().catch(console.error);
