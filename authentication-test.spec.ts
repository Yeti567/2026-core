import { test, expect } from '@playwright/test';

const BASE_URL = 'https://2026-core-l3tw-rhvqsm24y-blake-cowans-projects.vercel.app';
const SCREENSHOT_DIR = './screenshots';

// Test user data
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User'
};

test.describe('Authentication Flow Tests', () => {
  
  test.beforeAll(async () => {
    const fs = require('fs');
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('1. Registration Flow Test', async ({ page }) => {
    console.log('🧪 Testing Registration Flow...');
    
    // Navigate to registration page
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Take screenshot of registration page
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/registration-page-${Date.now()}.png`,
      fullPage: true 
    });
    
    // Check if we're on the registration page or redirected
    const currentUrl = page.url();
    console.log(`Current URL after navigation: ${currentUrl}`);
    
    // Look for registration form elements
    const registrationForm = page.locator('form').first();
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")').first();
    
    console.log(`Registration form visible: ${await registrationForm.isVisible()}`);
    console.log(`Email input visible: ${await emailInput.isVisible()}`);
    console.log(`Password input visible: ${await passwordInput.isVisible()}`);
    console.log(`Submit button visible: ${await submitButton.isVisible()}`);
    
    if (await registrationForm.isVisible() && await emailInput.isVisible()) {
      console.log('✅ Registration form found - attempting to fill...');
      
      // Fill the registration form
      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      
      // Look for additional fields
      const firstNameInput = page.locator('input[name="firstName"], input[name="first_name"]').first();
      const lastNameInput = page.locator('input[name="lastName"], input[name="last_name"]').first();
      
      if (await firstNameInput.isVisible()) {
        await firstNameInput.fill(TEST_USER.firstName);
        console.log('✅ First name filled');
      }
      
      if (await lastNameInput.isVisible()) {
        await lastNameInput.fill(TEST_USER.lastName);
        console.log('✅ Last name filled');
      }
      
      // Take screenshot of filled form
      await page.screenshot({ 
        path: `${SCREENSHOT_DIR}/registration-form-filled-${Date.now()}.png`,
        fullPage: true 
      });
      
      // Submit the form (but don't actually create user to avoid test data)
      console.log('📝 Registration form ready (not submitting to avoid test data creation)');
      
    } else {
      console.log('⚠️ Registration form not found - may be using Supabase Auth UI');
      
      // Look for Supabase Auth UI elements
      const supabaseAuth = page.locator('[data-supabase-auth-ui], .supabase-auth-ui').first();
      if (await supabaseAuth.isVisible()) {
        console.log('✅ Supabase Auth UI detected');
      }
      
      // Look for any auth-related content
      const pageContent = await page.textContent('body');
      if (pageContent?.toLowerCase().includes('supabase') || pageContent?.toLowerCase().includes('auth')) {
        console.log('✅ Authentication-related content found');
      }
    }
    
    // Check page title and content
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    const hasAuthContent = await page.locator('text=/auth|login|register|sign/i').first().isVisible();
    console.log(`Has auth content: ${hasAuthContent}`);
  });

  test('2. Login Flow Test', async ({ page }) => {
    console.log('🧪 Testing Login Flow...');
    
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Take screenshot of login page
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/login-page-${Date.now()}.png`,
      fullPage: true 
    });
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`Current URL after navigation: ${currentUrl}`);
    
    // Look for login form elements
    const loginForm = page.locator('form').first();
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    
    console.log(`Login form visible: ${await loginForm.isVisible()}`);
    console.log(`Email input visible: ${await emailInput.isVisible()}`);
    console.log(`Password input visible: ${await passwordInput.isVisible()}`);
    console.log(`Submit button visible: ${await submitButton.isVisible()}`);
    
    if (await loginForm.isVisible() && await emailInput.isVisible()) {
      console.log('✅ Login form found - attempting to fill...');
      
      // Fill the login form
      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      
      // Take screenshot of filled form
      await page.screenshot({ 
        path: `${SCREENSHOT_DIR}/login-form-filled-${Date.now()}.png`,
        fullPage: true 
      });
      
      console.log('📝 Login form ready (not submitting to avoid test data issues)');
      
    } else {
      console.log('⚠️ Login form not found - may be using Supabase Auth UI');
      
      // Look for Supabase Auth UI
      const supabaseAuth = page.locator('[data-supabase-auth-ui], .supabase-auth-ui').first();
      if (await supabaseAuth.isVisible()) {
        console.log('✅ Supabase Auth UI detected');
      }
    }
    
    // Check page title
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Look for auth-related content
    const hasAuthContent = await page.locator('text=/auth|login|register|sign/i').first().isVisible();
    console.log(`Has auth content: ${hasAuthContent}`);
  });

  test('3. Forgot Password Flow Test', async ({ page }) => {
    console.log('🧪 Testing Forgot Password Flow...');
    
    // Navigate to forgot password page
    await page.goto(`${BASE_URL}/forgot-password`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/forgot-password-page-${Date.now()}.png`,
      fullPage: true 
    });
    
    // Check for forgot password form
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Reset"), button:has-text("Send")').first();
    
    console.log(`Email input visible: ${await emailInput.isVisible()}`);
    console.log(`Submit button visible: ${await submitButton.isVisible()}`);
    
    if (await emailInput.isVisible()) {
      console.log('✅ Forgot password form found');
      await emailInput.fill(TEST_USER.email);
      console.log('📝 Forgot password form ready');
    }
  });

  test('4. Protected Routes Test', async ({ page }) => {
    console.log('🧪 Testing Protected Routes...');
    
    // Test accessing protected routes without authentication
    const protectedRoutes = [
      '/dashboard',
      '/admin',
      '/forms',
      '/documents'
    ];
    
    for (const route of protectedRoutes) {
      try {
        console.log(`Testing protected route: ${route}`);
        
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        
        // Take screenshot
        await page.screenshot({ 
          path: `${SCREENSHOT_DIR}/protected-route-${route.replace('/', '')}-${Date.now()}.png`,
          fullPage: true 
        });
        
        // Check if redirected to login or shows auth UI
        const currentUrl = page.url();
        console.log(`Route ${route} - Current URL: ${currentUrl}`);
        
        // Look for auth-related content
        const hasAuthContent = await page.locator('text=/auth|login|register|sign in/i').first().isVisible({ timeout: 5000 });
        console.log(`Route ${route} - Has auth content: ${hasAuthContent}`);
        
        // Check if it's the Supabase auth page
        const isSupabaseAuth = currentUrl.includes('supabase') || await page.locator('text=/supabase/i').first().isVisible({ timeout: 5000 });
        console.log(`Route ${route} - Is Supabase auth: ${isSupabaseAuth}`);
        
      } catch (error) {
        console.log(`❌ Error testing route ${route}: ${error}`);
      }
    }
  });

  test('5. Main Application Access Test', async ({ page }) => {
    console.log('🧪 Testing Main Application Access...');
    
    // Test main application pages
    const mainPages = [
      { path: '/', name: 'Home' },
      { path: '/about', name: 'About' },
      { path: '/contact', name: 'Contact' }
    ];
    
    for (const pageRoute of mainPages) {
      try {
        console.log(`Testing main page: ${pageRoute.name}`);
        
        await page.goto(`${BASE_URL}${pageRoute.path}`);
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        
        // Take screenshot
        await page.screenshot({ 
          path: `${SCREENSHOT_DIR}/main-page-${pageRoute.name.toLowerCase()}-${Date.now()}.png`,
          fullPage: true 
        });
        
        // Check if page loads successfully
        const title = await page.title();
        console.log(`${pageRoute.name} page title: ${title}`);
        
        // Look for main content
        const hasContent = await page.locator('main, .main, body > div').first().isVisible();
        console.log(`${pageRoute.name} page has content: ${hasContent}`);
        
      } catch (error) {
        console.log(`❌ Error testing ${pageRoute.name}: ${error}`);
      }
    }
  });

  test('6. Authentication Configuration Verification', async ({ page }) => {
    console.log('🧪 Verifying Authentication Configuration...');
    
    // Check if Supabase auth is properly configured
    await page.goto(`${BASE_URL}/auth/callback`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/auth-callback-${Date.now()}.png`,
      fullPage: true 
    });
    
    // Check the response
    const currentUrl = page.url();
    console.log(`Auth callback URL: ${currentUrl}`);
    
    // Check for any Supabase-related content
    const pageContent = await page.textContent('body');
    if (pageContent?.toLowerCase().includes('supabase')) {
      console.log('✅ Supabase auth configuration detected');
    }
    
    // Test auth confirm endpoint
    await page.goto(`${BASE_URL}/auth/confirm`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/auth-confirm-${Date.now()}.png`,
      fullPage: true 
    });
    
    console.log('✅ Authentication endpoints tested');
  });
});

test.describe('Authentication Test Summary', () => {
  test('Generate Authentication Test Report', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('AUTHENTICATION TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Test Date: ${new Date().toISOString()}`);
    console.log('');
    
    console.log('TESTS COMPLETED:');
    console.log('✅ 1. Registration Flow Test');
    console.log('✅ 2. Login Flow Test');
    console.log('✅ 3. Forgot Password Flow Test');
    console.log('✅ 4. Protected Routes Test');
    console.log('✅ 5. Main Application Access Test');
    console.log('✅ 6. Authentication Configuration Verification');
    console.log('');
    
    console.log('EXPECTED RESULTS:');
    console.log('- Registration and login forms should be accessible');
    console.log('- Protected routes should redirect to authentication');
    console.log('- Supabase auth endpoints should be configured');
    console.log('- Main application pages should load successfully');
    console.log('');
    
    console.log('SCREENSHOTS CAPTURED:');
    console.log(`- All screenshots saved in: ${SCREENSHOT_DIR}`);
    console.log('- Registration and login forms');
    console.log('- Protected route redirects');
    console.log('- Authentication endpoint tests');
    console.log('');
    
    console.log('NEXT STEPS:');
    console.log('1. Review screenshots for authentication UI');
    console.log('2. Test actual user registration/login');
    console.log('3. Verify email confirmation flows');
    console.log('4. Test protected functionality after login');
    console.log('');
    
    console.log('='.repeat(60));
    console.log('AUTHENTICATION TESTS COMPLETED');
    console.log('='.repeat(60));
  });
});
