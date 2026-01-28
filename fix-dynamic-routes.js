const fs = require('fs');
const path = require('path');

// Find all route.ts files in app/api
function findRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findRouteFiles(filePath, fileList);
    } else if (file === 'route.ts') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Add dynamic export if not present
function addDynamicExport(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has dynamic export
  if (content.includes("export const dynamic = 'force-dynamic'") || 
      content.includes('export const dynamic = "force-dynamic"')) {
    console.log(`✓ Skipped (already has dynamic): ${filePath}`);
    return false;
  }
  
  // Skip public routes that don't need dynamic
  if (filePath.includes('/api/register') || 
      filePath.includes('/api/public') ||
      filePath.includes('/api/auth/callback')) {
    console.log(`✓ Skipped (public route): ${filePath}`);
    return false;
  }
  
  // Add dynamic export after imports, before first export function
  const lines = content.split('\n');
  let insertIndex = -1;
  
  // Find the last import or the first export function
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].startsWith('import{')) {
      insertIndex = i + 1;
    } else if (lines[i].startsWith('export async function') || 
               lines[i].startsWith('export function')) {
      if (insertIndex === -1) insertIndex = i;
      break;
    }
  }
  
  if (insertIndex === -1) {
    insertIndex = 0;
  }
  
  // Insert the dynamic export
  lines.splice(insertIndex, 0, '', "export const dynamic = 'force-dynamic';", '');
  
  const newContent = lines.join('\n');
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`✓ Added dynamic export: ${filePath}`);
  return true;
}

// Main
const apiDir = path.join(__dirname, 'app', 'api');
const routeFiles = findRouteFiles(apiDir);

console.log(`Found ${routeFiles.length} route files\n`);

let modified = 0;
routeFiles.forEach(file => {
  if (addDynamicExport(file)) {
    modified++;
  }
});

console.log(`\n✓ Modified ${modified} files`);
