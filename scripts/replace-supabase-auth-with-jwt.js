/**
 * Script to replace Supabase auth calls with JWT auth
 * 
 * This script will:
 * 1. Find all files using supabase.auth.getUser()
 * 2. Replace with JWT authentication
 * 3. Update imports accordingly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files to update
const filesToUpdate = [
  // API routes
  'app/api/forms/conversions/stats/route.ts',
  'app/api/training/route.ts',
  'app/api/certifications/alerts/check/route.ts',
  'app/api/training/types/route.ts',
  'app/api/certifications/[id]/route.ts',
  'app/api/push/subscribe/route.ts',
  'app/api/push/unsubscribe/route.ts',
  'app/api/push/test/route.ts',
  
  // Server components
  'components/dashboard/phases-widget.tsx',
  'components/dashboard/onboarding-widget.tsx',
  'components/onboarding/OnboardingWizard.tsx',
  'app/onboarding/page.tsx',
  
  // Other components
  'app/api/auth/signout/route.ts'
];

console.log('🔄 Replacing Supabase auth with JWT auth...');

// Replacement patterns
const replacements = [
  {
    pattern: /const supabase = createRouteHandlerClient\(\);[\s\S]*?const \{ data: \{ user \}, error: authError \} = await supabase\.auth\.getUser\(\);[\s\S]*?if \(authError \|\| !user\) \{[\s\S]*?return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\);[\s\S]*?\}/g,
    replacement: `const { user, error } = await authenticateApiRoute(request);
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }`
  },
  {
    pattern: /const supabase = createServerComponentClient\(\);[\s\S]*?const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\);[\s\S]*?if \(!user\) return null;/g,
    replacement: `const { user, error } = await authenticateServerComponent();
    if (!user) return null;`
  },
  {
    pattern: /const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\);/g,
    replacement: `const { user, error } = await authenticateServerComponent();`
  },
  {
    pattern: /import \{ createRouteHandlerClient \} from '@supabase\/auth-helpers-nextjs';/g,
    replacement: `import { authenticateApiRoute } from '@/lib/auth/jwt-middleware';`
  },
  {
    pattern: /import \{ createServerComponentClient \} from '@supabase\/auth-helpers-nextjs';/g,
    replacement: `import { authenticateServerComponent } from '@/lib/auth/jwt-middleware';`
  },
  {
    pattern: /import \{ createClient \} from '@supabase\/supabase-js';/g,
    replacement: `import { authenticateServerComponent } from '@/lib/auth/jwt-middleware';`
  }
];

filesToUpdate.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  console.log(`📝 Updating: ${filePath}`);
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;
  
  replacements.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      changed = true;
      console.log(`  ✅ Applied replacement pattern`);
    }
  });
  
  if (changed) {
    fs.writeFileSync(fullPath, content);
    console.log(`  💾 Saved changes`);
  } else {
    console.log(`  ⏭️  No changes needed`);
  }
});

console.log('\n✅ Supabase auth replacement complete!');
console.log('\n📋 Next steps:');
console.log('1. Review the changed files');
console.log('2. Test authentication flow');
console.log('3. Update any remaining manual cases');
console.log('4. Run TypeScript check: npm run type-check');
