/**
 * Comprehensive JWT Authentication Test
 * 
 * Tests the complete authentication flow after JWT migration:
 * 1. Registration creates real users
 * 2. Login works with JWT authentication
 * 3. Protected routes are accessible after login
 * 4. API routes work with JWT auth
 * 5. Signout clears JWT cookies
 * 6. No "Failed to fetch" errors anywhere
 */

import { test, expect } from '@playwright/test';

test.describe('JWT Authentication Comprehensive Test', () => {
  let testUser = {
    email: `test-${Date.now()}@testcompany.com`,
    password: 'TestPassword123!',
    companyName: `Test Company ${Date.now()}`,
    wsibNumber: '123456789',
    registrantName: 'Test User',
    registrantPosition: 'owner',
    companyEmail: `info@${Date.now()}.com`,
    address: '123 Test Street',
    city: 'Test City',
    province: 'ON',
    postalCode: 'A1A1A1',
    phone: '555-555-5555'
  };

  test.beforeEach(async ({ page }) => {
    // Clear cookies before each test
    await page.context().clearCookies();
  });

  test('1. Registration creates JWT user successfully', async ({ page }) => {
    console.log('🧪 Testing registration with JWT auth...');
    
    await page.goto('/register');
    
    // Fill out registration form
    await page.fill('[data-testid="company_name"]', testUser.companyName);
    await page.fill('[data-testid="wsib_number"]', testUser.wsibNumber);
    await page.fill('[data-testid="company_email"]', testUser.companyEmail);
    await page.fill('[data-testid="address"]', testUser.address);
    await page.fill('[data-testid="city"]', testUser.city);
    await page.selectOption('[data-testid="province"]', testUser.province);
    await page.fill('[data-testid="postal_code"]', testUser.postalCode);
    await page.fill('[data-testid="phone"]', testUser.phone);
    await page.fill('[data-testid="registrant_name"]', testUser.registrantName);
    await page.selectOption('[data-testid="registrant_position"]', testUser.registrantPosition);
    await page.fill('[data-testid="registrant_email"]', testUser.email);
    await page.fill('[data-testid="password"]', testUser.password);
    await page.fill('[data-testid="confirm_password"]', testUser.password);
    
    // Submit registration
    await page.click('[data-testid="register-button"]');
    
    // Should show success message
    await expect(page.locator('text=Account Created!')).toBeVisible();
    await expect(page.locator(`text=${testUser.email}`)).toBeVisible();
    
    console.log('✅ Registration successful with JWT auth');
  });

  test('2. Login works with JWT authentication', async ({ page }) => {
    console.log('🧪 Testing JWT login...');
    
    // First register a user
    await page.goto('/register');
    await page.fill('[data-testid="company_name"]', testUser.companyName);
    await page.fill('[data-testid="wsib_number"]', testUser.wsibNumber);
    await page.fill('[data-testid="company_email"]', testUser.companyEmail);
    await page.fill('[data-testid="address"]', testUser.address);
    await page.fill('[data-testid="city"]', testUser.city);
    await page.selectOption('[data-testid="province"]', testUser.province);
    await page.fill('[data-testid="postal_code"]', testUser.postalCode);
    await page.fill('[data-testid="phone"]', testUser.phone);
    await page.fill('[data-testid="registrant_name"]', testUser.registrantName);
    await page.selectOption('[data-testid="registrant_position"]', testUser.registrantPosition);
    await page.fill('[data-testid="registrant_email"]', testUser.email);
    await page.fill('[data-testid="password"]', testUser.password);
    await page.fill('[data-testid="confirm_password"]', testUser.password);
    await page.click('[data-testid="register-button"]');
    
    // Wait for success, then go to login
    await page.waitForSelector('text=Account Created!');
    await page.click('[data-testid="sign-in-button"]');
    
    // Should be on login page
    await expect(page).toHaveURL(/.*login/);
    
    // Fill login form
    await page.fill('[data-testid="email"]', testUser.email);
    await page.fill('[data-testid="password"]', testUser.password);
    
    // Submit login - check for no "Failed to fetch" error
    await page.click('[data-testid="sign-in-button"]');
    
    // Should redirect to dashboard (not show error)
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Failed to fetch')).not.toBeVisible();
    
    console.log('✅ JWT login successful - no "Failed to fetch" error');
  });

  test('3. Protected routes work after JWT login', async ({ page }) => {
    console.log('🧪 Testing protected routes with JWT...');
    
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email"]', testUser.email);
    await page.fill('[data-testid="password"]', testUser.password);
    await page.click('[data-testid="sign-in-button"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Test various protected routes
    const protectedRoutes = [
      '/dashboard',
      '/forms',
      '/documents',
      '/phases',
      '/admin/employees',
      '/admin/certifications'
    ];
    
    for (const route of protectedRoutes) {
      console.log(`Testing route: ${route}`);
      await page.goto(route);
      
      // Should not redirect to login (which would happen if auth failed)
      await expect(page).not.toHaveURL(/.*login/);
      
      // Should not show "Failed to fetch" error
      await expect(page.locator('text=Failed to fetch')).not.toBeVisible();
      
      // Should show some content (not error page)
      await expect(page.locator('body')).toBeVisible();
    }
    
    console.log('✅ All protected routes work with JWT auth');
  });

  test('4. API routes work with JWT authentication', async ({ page }) => {
    console.log('🧪 Testing API routes with JWT...');
    
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email"]', testUser.email);
    await page.fill('[data-testid="password"]', testUser.password);
    await page.click('[data-testid="sign-in-button"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Test API calls that would use JWT auth
    const apiTests = [
      async () => {
        // Test certifications API
        const response = await page.evaluate(async () => {
          try {
            const res = await fetch('/api/certifications', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            return { status: res.status, ok: res.ok };
          } catch (error) {
            return { error: (error as Error).message };
          }
        });
        
        expect(response.status).not.toBe(401);
        expect(response.error).not.toBe('Failed to fetch');
      },
      
      async () => {
        // Test training API
        const response = await page.evaluate(async () => {
          try {
            const res = await fetch('/api/training', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            return { status: res.status, ok: res.ok };
          } catch (error) {
            return { error: (error as Error).message };
          }
        });
        
        expect(response.status).not.toBe(401);
        expect(response.error).not.toBe('Failed to fetch');
      }
    ];
    
    for (const test of apiTests) {
      await test();
    }
    
    console.log('✅ API routes work with JWT authentication');
  });

  test('5. Signout clears JWT cookies', async ({ page }) => {
    console.log('🧪 Testing JWT signout...');
    
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email"]', testUser.email);
    await page.fill('[data-testid="password"]', testUser.password);
    await page.click('[data-testid="sign-in-button"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Check JWT cookie exists
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'auth-token');
    expect(authCookie).toBeTruthy();
    
    // Signout
    await page.click('[data-testid="signout-button"]');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
    
    // JWT cookie should be cleared
    const cookiesAfter = await page.context().cookies();
    const authCookieAfter = cookiesAfter.find(c => c.name === 'auth-token');
    expect(authCookieAfter?.value).toBe('');
    
    console.log('✅ JWT signout works correctly');
  });

  test('6. No "Failed to fetch" errors anywhere in app', async ({ page }) => {
    console.log('🧪 Testing for "Failed to fetch" errors...');
    
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', testUser.email);
    await page.fill('[data-testid="password"]', testUser.password);
    await page.click('[data-testid="sign-in-button"]');
    
    // Monitor for "Failed to fetch" errors
    page.on('console', msg => {
      if (msg.text().includes('Failed to fetch')) {
        console.log('❌ Found "Failed to fetch" error:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      if (error.message.includes('Failed to fetch')) {
        console.log('❌ Found "Failed to fetch" page error:', error.message);
      }
    });
    
    // Navigate through all major sections
    const sections = [
      '/dashboard',
      '/forms',
      '/documents', 
      '/phases',
      '/admin/employees',
      '/admin/certifications',
      '/admin/departments'
    ];
    
    for (const section of sections) {
      await page.goto(section);
      await page.waitForLoadState('networkidle');
      
      // Check no "Failed to fetch" text on page
      await expect(page.locator('text=Failed to fetch')).not.toBeVisible();
    }
    
    console.log('✅ No "Failed to fetch" errors found');
  });

  test('7. Invalid credentials show proper error', async ({ page }) => {
    console.log('🧪 Testing invalid credentials...');
    
    await page.goto('/login');
    await page.fill('[data-testid="email"]', testUser.email);
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await page.click('[data-testid="sign-in-button"]');
    
    // Should show error message, not "Failed to fetch"
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
    await expect(page.locator('text=Failed to fetch')).not.toBeVisible();
    
    console.log('✅ Invalid credentials show proper error message');
  });
});
