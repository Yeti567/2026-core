import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

async function fixAllAuthRoutes() {
  const files = await glob('app/api/**/*.ts');
  
  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    
    if (!fs.existsSync(fullPath)) continue;
    
    let content = fs.readFileSync(fullPath, 'utf-8');
    const originalContent = content;
    
    // Fix the malformed auth pattern
    content = content.replace(
      /const \{ data: \{ user \}, error: authError \} = \/\/ TODO: Implement user authentication without Supabase\s*\n\s*const \{ data: \{ user: authUser \}, error: authError \} = \{ data: \{ user: null \}, error: new Error\('Auth not implemented'\) \};/gs,
      `// TODO: Implement user authentication without Supabase\n      const { data: { user: authUser }, error: authError } = { data: { user: null }, error: new Error('Auth not implemented') };`
    );
    
    // Fix the variable reference
    content = content.replace(
      /if \(authError \|\| !user\) \{/g,
      `if (authError || !authUser) {`
    );
    
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log(`✅ Fixed: ${file}`);
    }
  }
  
  console.log('\n✅ All auth routes fixed!');
}

fixAllAuthRoutes().catch(console.error);
