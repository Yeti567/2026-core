import * as fs from 'fs';
import * as path from 'path';

// Files that likely need updating
const filesToCheck = [
  'lib/supabase/server.ts',
  'app/api/db/route.ts',
  'lib/db.ts'
];

// Common Supabase patterns to replace
const replacements = [
  {
    pattern: /import\s*\{?\s*(createClient|SupabaseClient)\s*\}?\s*from\s*['"]@supabase\/supabase-js['"]/g,
    replacement: 'import { Client } from \'pg\''
  },
  {
    pattern: /const\s+supabase\s*=\s*createClient\(.*?\)/g,
    replacement: 'const client = new Client({ connectionString: process.env.DATABASE_URL })'
  },
  {
    pattern: /await\s+supabase\.from\((['"]\w+['"])\)\.(select|insert|update|delete)/g,
    replacement: 'await client.query(`SELECT * FROM $1`)'
  }
];

async function updateFiles() {
  for (const filePath of filesToCheck) {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      let updated = false;
      
      for (const { pattern, replacement } of replacements) {
        if (pattern.test(content)) {
          content = content.replace(pattern, replacement);
          updated = true;
        }
      }
      
      if (updated) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${filePath}`);
      }
    }
  }
}

updateFiles().catch(console.error);
