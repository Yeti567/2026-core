import { test, expect } from '@playwright/test';

test.describe('Registration Debug Test', () => {
  test('debug registration submission', async ({ page }) => {
    // Listen to all console messages
    page.on('console', msg => {
      console.log(`[BROWSER ${msg.type()}]:`, msg.text());
    });

    // Listen to network requests
    page.on('request', request => {
      if (request.url().includes('/api/register')) {
        console.log('>>> API Request:', request.method(), request.url());
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/register')) {
        console.log('<<< API Response:', response.status(), response.statusText());
        try {
          const body = await response.json();
          console.log('<<< Response body:', JSON.stringify(body, null, 2));
        } catch (e) {
          console.log('<<< Could not parse response body');
        }
      }
    });

    // Navigate to registration
    await page.goto('http://localhost:3000/register');
    console.log('Navigated to registration page');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Register Your Company');
    console.log('Page loaded successfully');

    // Generate unique test data
    const timestamp = Date.now();
    const testEmail = `admin${timestamp}@testco${timestamp}.com`;
    const testPassword = 'TestPass123!@#';

    console.log('Filling form with test data...');

    // Fill required fields only
    await page.locator('input').filter({ hasText: '' }).first().fill(`Test Company ${timestamp}`);
    await page.locator('input[placeholder="123456789"]').fill('123456789');
    await page.locator('input[placeholder="info@company.com"]').fill(`info@testco${timestamp}.com`);
    await page.locator('input[placeholder*="Industrial"]').fill('123 Test St');
    await page.locator('input[placeholder="City"]').fill('Toronto');
    await page.locator('input[placeholder="A1A 1A1"]').fill('M5H2N2');
    await page.locator('input[placeholder*="555"]').fill('4165551234');
    
    // Registrant info
    await page.locator('input[placeholder="John Doe"]').fill('Test Admin');
    await page.locator('select').nth(1).selectOption('owner');
    await page.locator('input[type="email"]').nth(2).fill(testEmail);
    
    // Password
    await page.locator('input[type="password"]').first().fill(testPassword);
    await page.locator('input[type="password"]').last().fill(testPassword);

    console.log('Form filled, submitting...');

    // Take screenshot before submit
    await page.screenshot({ path: 'before-submit.png', fullPage: true });

    // Submit
    await page.locator('button[type="submit"]').click();
    console.log('Submit button clicked');

    // Wait for response
    await page.waitForTimeout(8000);

    // Take screenshot after submit
    await page.screenshot({ path: 'after-submit.png', fullPage: true });

    // Check what's on the page
    const url = page.url();
    const title = await page.title();
    const h1Text = await page.locator('h1').first().textContent();
    
    console.log('Current URL:', url);
    console.log('Page title:', title);
    console.log('H1 text:', h1Text);

    // Check for success or error
    const hasSuccess = await page.locator('text=Account Created').count() > 0;
    const hasError = await page.locator('text=/error|failed/i').count() > 0;
    const isStillOnForm = await page.locator('button[type="submit"]').count() > 0;

    console.log('Has success message:', hasSuccess);
    console.log('Has error message:', hasError);
    console.log('Still on form:', isStillOnForm);

    if (hasError) {
      const errorText = await page.locator('text=/error|failed/i').first().textContent();
      console.log('ERROR TEXT:', errorText);
    }

    // The test should show us what happened
    expect(hasSuccess || hasError || isStillOnForm).toBeTruthy();
  });
});
