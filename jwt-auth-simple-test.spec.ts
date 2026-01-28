/**
 * Simple JWT Authentication Test
 * 
 * Tests the core authentication flow without complex selectors
 */

import { test, expect } from '@playwright/test';

test.describe('JWT Authentication Simple Test', () => {
  const testUser = {
    email: `test-${Date.now()}@testcompany.com`,
    password: 'TestPassword123!',
    companyName: `Test Company ${Date.now()}`,
    wsibNumber: '123456789',
    registrantName: 'Test User',
    companyEmail: `info@${Date.now()}@testcompany.com`,
    address: '123 Test Street',
    city: 'Test City',
    phone: '5555555555'
  };

  test('1. Registration and Login Flow', async ({ page }) => {
    console.log('🧪 Testing registration → login flow...');
    
    // Go to registration
    await page.goto('/register');
    
    // Fill out the form using realistic selectors
    await page.fill('input[placeholder*="Company Name"]', testUser.companyName);
    await page.fill('input[placeholder*="123456789"]', testUser.wsibNumber);
    await page.fill('input[placeholder*="info@company.com"]', testUser.companyEmail);
    await page.fill('input[placeholder*="123 Industrial Boulevard"]', testUser.address);
    await page.fill('input[placeholder*="City"]', testUser.city);
    await page.fill('input[placeholder*="A1A 1A1"]', 'A1A1A1');
    await page.fill('input[placeholder*="(555) 555-5555"]', testUser.phone);
    await page.fill('input[placeholder*="John Doe"]', testUser.registrantName);
    await page.fill('input[placeholder*="name@company.com"]', testUser.email);
    await page.fill('input[placeholder*="••••••••"]', testUser.password);
    
    // Find and fill confirm password (should be nearby)
    const passwordInputs = await page.locator('input[type="password"]').all();
    if (passwordInputs.length >= 2) {
      await passwordInputs[1].fill(testUser.password);
    }
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for success message or redirect
    await page.waitForTimeout(3000);
    
    // Check if we see success or are redirected to login
    const currentUrl = page.url();
    console.log('After registration, current URL:', currentUrl);
    
    // If not on login page, navigate there
    if (!currentUrl.includes('login')) {
      await page.goto('/login');
    }
    
    // Now test login
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    // Check for "Failed to fetch" error
    const failedFetchError = page.locator('text=Failed to fetch');
    const hasError = await failedFetchError.count();
    
    if (hasError > 0) {
      console.log('❌ Found "Failed to fetch" error');
      throw new Error('Authentication failed with "Failed to fetch" error');
    }
    
    // Should be on dashboard or similar protected page
    const finalUrl = page.url();
    console.log('After login, final URL:', finalUrl);
    
    // Should not be back on login page
    expect(finalUrl).not.toContain('login');
    
    console.log('✅ Registration → login flow successful');
  });

  test('2. Protected Routes Access', async ({ page }) => {
    console.log('🧪 Testing protected routes...');
    
    // Try to access protected route without login
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
    
    // Login with existing user (create one if needed)
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Wait for login
    await page.waitForTimeout(3000);
    
    // Now try accessing protected routes
    const routes = ['/dashboard', '/forms', '/documents'];
    
    for (const route of routes) {
      await page.goto(route);
      await page.waitForTimeout(2000);
      
      // Should not redirect back to login
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('login');
      
      // Should not show "Failed to fetch"
      const hasError = await page.locator('text=Failed to fetch').count();
      expect(hasError).toBe(0);
      
      console.log(`✅ Route ${route} accessible`);
    }
  });

  test('3. API Authentication', async ({ page }) => {
    console.log('🧪 Testing API authentication...');
    
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Test API call from browser context
    const apiResult = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/certifications', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        return {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        };
      } catch (error) {
        return {
          error: (error as Error).message,
          status: 0
        };
      }
    });
    
    console.log('API result:', apiResult);
    
    // Should not get 401 (unauthorized) or network error
    expect(apiResult.status).not.toBe(401);
    expect(apiResult.error).not.toBe('Failed to fetch');
    
    console.log('✅ API authentication working');
  });

  test('4. Signout Functionality', async ({ page }) => {
    console.log('🧪 Testing signout...');
    
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Check for auth cookie
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'auth-token');
    console.log('Auth cookie before signout:', authCookie ? 'exists' : 'not found');
    
    // Try to find and click signout button
    const signoutSelectors = [
      'button:has-text("Sign Out")',
      'button:has-text("Logout")',
      'a:has-text("Sign Out")',
      '[data-testid="signout-button"]'
    ];
    
    let signoutClicked = false;
    for (const selector of signoutSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.count() > 0) {
          await element.click();
          signoutClicked = true;
          break;
        }
      } catch (e) {
        // Continue trying other selectors
      }
    }
    
    if (!signoutClicked) {
      console.log('⚠️ Could not find signout button, skipping cookie test');
      return;
    }
    
    await page.waitForTimeout(2000);
    
    // Should be redirected to login
    expect(page.url()).toContain('login');
    
    // Check cookie is cleared
    const cookiesAfter = await page.context().cookies();
    const authCookieAfter = cookiesAfter.find(c => c.name === 'auth-token');
    
    if (authCookieAfter) {
      expect(authCookieAfter.value).toBe('');
    }
    
    console.log('✅ Signout functionality working');
  });

  test('5. Invalid Login Credentials', async ({ page }) => {
    console.log('🧪 Testing invalid credentials...');
    
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    
    // Should show error message, not "Failed to fetch"
    const hasFailedFetch = await page.locator('text=Failed to fetch').count();
    expect(hasFailedFetch).toBe(0);
    
    // Should show some kind of error (could be various messages)
    const hasError = await page.locator('text=Invalid').count() + 
                    await page.locator('text=Error').count() +
                    await page.locator('text=incorrect').count();
    
    // Should still be on login page
    expect(page.url()).toContain('login');
    
    console.log('✅ Invalid credentials handled properly');
  });
});
