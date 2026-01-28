import { test, expect } from '@playwright/test';

test.describe('Authenticated Production Smoke', () => {
  test('Logs in and checks protected routes', async ({ page }) => {
    const email = process.env.PW_USER_EMAIL;
    const password = process.env.PW_USER_PASSWORD;

    if (!email || !password) {
      throw new Error('Missing PW_USER_EMAIL or PW_USER_PASSWORD environment variables.');
    }

    await page.goto('/login');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/dashboard/, { timeout: 20000 });
    await expect(page).not.toHaveURL(/\/login/);

    const protectedRoutes = ['/dashboard', '/forms', '/documents', '/phases'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator('text=Failed to fetch')).not.toBeVisible();
    }
  });
});
