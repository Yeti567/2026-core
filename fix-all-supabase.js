const fs = require('fs');
const path = require('path');

// Find all TypeScript/JSX files that might contain Supabase references
function findFiles(dir, extensions = ['.ts', '.tsx']) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function fixSupabaseInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;
  
  // Remove Supabase imports
  if (content.includes('createClient') && (content.includes('supabase') || content.includes('NEON'))) {
    // Remove createClient function definitions
    content = content.replace(/function\s+(getSupabase|createClient)\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g, '');
    content = content.replace(/const\s+(getSupabase|createClient)\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n\}/g, '');
    
    // Replace getSupabase() calls
    content = content.replace(/const\s+supabase\s*=\s*getSupabase\(\);?/g, '// Using API endpoints instead of Supabase');
    content = content.replace(/const\s+supabase\s*=\s*createClient\([^)]*\);?/g, '// Using API endpoints instead of Supabase');
    
    // Replace supabase.from() calls with comments
    content = content.replace(/await\s+supabase\s*\.from\([^)]+\)\.select\([^)]+\)(?:\s*\.eq\([^)]+\))*(?:\s*\.order\([^)]+\))?[^;]*;/g, '// TODO: Replace with API call');
    content = content.replace(/const\s+\{?\s*data[^}]*\}?\s*=\s*await\s+supabase[^;]*;/g, '// TODO: Replace with API call');
    
    // Remove any remaining supabase variable references
    content = content.replace(/supabase\./g, '// API.');
    
    if (content !== fs.readFileSync(filePath, 'utf-8')) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${filePath}`);
      changed = true;
    }
  }
  
  return changed;
}

const files = findFiles(process.cwd());
let fixedCount = 0;

for (const file of files) {
  if (fixSupabaseInFile(file)) {
    fixedCount++;
  }
}

console.log(`\nFixed ${fixedCount} files with Supabase references!`);
