// Debug script to check authentication routes
// Run this with: npx tsx debug-auth-routes.ts

import { chromium } from '@playwright/test';

const BASE_URL = 'https://2026-core-l3tw-rhvqsm24y-blake-cowans-projects.vercel.app';

async function debugAuthRoutes() {
  console.log('🔍 Debugging Authentication Routes...\n');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Test each auth route
  const authRoutes = [
    '/login',
    '/register', 
    '/signup',
    '/auth/signin',
    '/auth/signup',
    '/forgot-password',
    '/reset-password'
  ];
  
  for (const route of authRoutes) {
    try {
      console.log(`Testing: ${BASE_URL}${route}`);
      
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
      
      // Wait a bit for any redirects
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      const title = await page.title();
      
      console.log(`  Final URL: ${currentUrl}`);
      console.log(`  Page Title: ${title}`);
      
      // Look for any form elements
      const forms = await page.locator('form').count();
      const inputs = await page.locator('input').count();
      const emailInputs = await page.locator('input[type="email"], input[name*="email"]').count();
      const passwordInputs = await page.locator('input[type="password"], input[name*="password"]').count();
      
      console.log(`  Forms found: ${forms}`);
      console.log(`  Inputs found: ${inputs}`);
      console.log(`  Email inputs: ${emailInputs}`);
      console.log(`  Password inputs: ${passwordInputs}`);
      
      // Look for Supabase auth UI
      const supabaseAuth = await page.locator('[data-supabase-auth-ui], .supabase-auth-ui, [class*="supabase"]').count();
      console.log(`  Supabase auth elements: ${supabaseAuth}`);
      
      // Look for Vercel auth
      const vercelAuth = currentUrl.includes('vercel.com') ? 'Yes' : 'No';
      console.log(`  Vercel auth redirect: ${vercelAuth}`);
      
      // Take screenshot
      await page.screenshot({ path: `./screenshots/debug-${route.replace('/', '-')}-${Date.now()}.png`, fullPage: true });
      
      console.log('  ✅ Screenshot captured\n');
      
    } catch (error) {
      console.log(`  ❌ Error: ${error}\n`);
    }
  }
  
  await browser.close();
  console.log('🎯 Debug complete! Check screenshots in ./screenshots/');
}

debugAuthRoutes().catch(console.error);
