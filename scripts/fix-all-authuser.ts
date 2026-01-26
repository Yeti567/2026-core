import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

async function fixAllAuthUser() {
  const files = await glob('app/api/**/*.ts');
  
  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    
    if (!fs.existsSync(fullPath)) continue;
    
    let content = fs.readFileSync(fullPath, 'utf-8');
    const originalContent = content;
    
    // Fix all authUser references to user
    content = content.replace(/authUser/g, 'user');
    
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log(`✅ Fixed: ${file}`);
    }
  }
  
  console.log('\n✅ All authUser references fixed!');
}

fixAllAuthUser().catch(console.error);
