import * as fs from 'fs';
import * as path from 'path';

// Load and display .env.local contents safely
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local file does not exist');
    return;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  
  console.log('📄 .env.local contents:');
  console.log('==================');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue; // Skip empty lines and comments
    }
    
    // Mask sensitive values
    if (trimmed.startsWith('DATABASE_URL=')) {
      const url = trimmed.substring('DATABASE_URL='.length);
      const masked = url.substring(0, 20) + '...' + url.substring(url.length - 10);
      console.log('DATABASE_URL=' + masked);
    } else if (trimmed.startsWith('JWT_SECRET=')) {
      console.log('JWT_SECRET=***' + trimmed.substring(trimmed.length - 10));
    } else if (trimmed.startsWith('SUPABASE_')) {
      console.log(trimmed.split('=')[0] + '=***');
    } else if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_')) {
      console.log(trimmed.split('=')[0] + '=***');
    } else {
      console.log(trimmed);
    }
  }
  
  console.log('==================');
  
  // Check for required variables
  const hasDatabaseUrl = lines.some(line => 
    line.trim().startsWith('DATABASE_URL=') || 
    line.trim().startsWith('postgresql://') || 
    line.trim().startsWith('postgres://')
  );
  
  const hasJwtSecret = lines.some(line => 
    line.trim().startsWith('JWT_SECRET=')
  );
  
  console.log('\n✅ Status:');
  console.log('DATABASE_URL:', hasDatabaseUrl ? '✅ Found' : '❌ Missing');
  console.log('JWT_SECRET:', hasJwtSecret ? '✅ Found' : '❌ Missing');
  
  if (!hasJwtSecret) {
    console.log('\n⚠️  Add this line to .env.local:');
    console.log('JWT_SECRET=your-super-secret-jwt-key-change-in-production');
  }
}

loadEnvLocal();
