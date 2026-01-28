import { test, expect } from '@playwright/test';

test.describe('Company Registration Flow', () => {
  test('should successfully register a new company and redirect to success page', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Register Your Company');

    // Generate unique test data
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@testcompany${timestamp}.com`;
    const testCompanyName = `Test Company ${timestamp}`;
    const testPassword = 'TestPass123!@#';

    // Fill out company details
    await page.fill('input[placeholder*="Northern Construction"]', testCompanyName);
    await page.fill('input[placeholder="123456789"]', '123456789');
    await page.fill('input[placeholder="info@company.com"]', `info@testcompany${timestamp}.com`);
    await page.fill('input[placeholder*="123 Industrial"]', '123 Test Street');
    await page.fill('input[placeholder="City"]', 'Toronto');
    await page.selectOption('select', 'ON');
    await page.fill('input[placeholder="A1A 1A1"]', 'M5H2N2');
    await page.fill('input[placeholder="(555) 555-5555"]', '4165551234');

    // Fill out registrant details
    await page.fill('input[placeholder="John Doe"]', 'Test Admin');
    await page.selectOption('select >> nth=1', 'owner');
    await page.fill('input[placeholder*="name@"]', testEmail);

    // Fill out password
    const passwordInputs = await page.locator('input[type="password"]').all();
    await passwordInputs[0].fill(testPassword);
    await passwordInputs[1].fill(testPassword);

    // Listen for console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
      console.log('Browser console:', msg.text());
    });

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for either success or error
    await page.waitForTimeout(5000);

    // Check console logs for debugging
    console.log('All console logs:', consoleLogs);

    // Check if we're on success page or if there's an error
    const currentUrl = page.url();
    const pageContent = await page.content();
    
    console.log('Current URL:', currentUrl);
    console.log('Page title:', await page.title());

    // Look for success indicators
    const hasSuccessHeading = await page.locator('h1:has-text("Account Created")').count() > 0;
    const hasSignInButton = await page.locator('a[href="/login"]:has-text("Sign In")').count() > 0;
    const hasErrorMessage = await page.locator('text=/Registration Error|error|failed/i').count() > 0;

    console.log('Success heading found:', hasSuccessHeading);
    console.log('Sign in button found:', hasSignInButton);
    console.log('Error message found:', hasErrorMessage);

    // Take screenshot for debugging
    await page.screenshot({ path: 'registration-result.png', fullPage: true });

    // Assertions
    if (hasErrorMessage) {
      const errorText = await page.locator('text=/error|failed/i').first().textContent();
      console.error('Registration failed with error:', errorText);
      throw new Error(`Registration failed: ${errorText}`);
    }

    expect(hasSuccessHeading || hasSignInButton).toBeTruthy();
  });

  test('should show validation errors for invalid data', async ({ page }) => {
    await page.goto('/register');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await page.waitForTimeout(1000);
    
    const errorCount = await page.locator('text=/required|invalid/i').count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test('should validate password requirements', async ({ page }) => {
    await page.goto('/register');
    
    // Fill minimal data to get to password validation
    await page.fill('input[placeholder*="Northern Construction"]', 'Test Company');
    await page.fill('input[placeholder="123456789"]', '123456789');
    
    // Try weak password
    const passwordInputs = await page.locator('input[type="password"]').all();
    await passwordInputs[0].fill('weak');
    
    // Check that password requirements are shown
    const requirementsList = await page.locator('text=/At least 12 characters/i').count();
    expect(requirementsList).toBeGreaterThan(0);
  });
});
