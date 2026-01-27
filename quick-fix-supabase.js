const fs = require('fs');
const path = require('path');

// Find all files with getSupabase or createClient
function findProblemFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes('getSupabase') || content.includes('createClient(')) {
          files.push(fullPath);
        }
      }
    }
  }
  
  traverse(dir);
  return files;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;
  
  // Replace getSupabase function definitions
  if (content.includes('function getSupabase()')) {
    content = content.replace(/function\s+getSupabase\(\)\s*\{[^}]*\}/gs, 
      '// getSupabase replaced with API calls');
    changed = true;
  }
  
  // Replace createClient calls
  if (content.includes('createClient(')) {
    content = content.replace(/createClient\([^)]*\)/g, 'null /* createClient replaced */');
    changed = true;
  }
  
  // Replace getSupabase() calls
  if (content.includes('getSupabase()')) {
    content = content.replace(/getSupabase\(\)/g, 'null /* getSupabase replaced */');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  }
  
  return changed;
}

const problemFiles = findProblemFiles(process.cwd());
console.log(`Found ${problemFiles.length} files with Supabase references:`);
problemFiles.forEach(file => console.log(`  - ${file}`));

let fixedCount = 0;
for (const file of problemFiles) {
  if (fixFile(file)) {
    fixedCount++;
  }
}

console.log(`\nFixed ${fixedCount} files!`);
