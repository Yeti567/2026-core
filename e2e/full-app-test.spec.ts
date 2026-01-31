import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Load credentials
const credentialsPath = path.join(__dirname, 'test-credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));

const BASE_URL = credentials.baseUrl || 'http://localhost:3000';

// Test results tracking
const testResults: { name: string; status: 'pass' | 'fail' | 'skip'; error?: string; duration?: number }[] = [];

// Helper to log in
async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  await page.fill('input[type="email"], input[name="email"]', credentials.email);
  await page.fill('input[type="password"], input[name="password"]', credentials.password);
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL(/\/(dashboard|admin|welcome)/, { timeout: 15000 });
}

// ============================================================================
// AUTH TESTS
// ============================================================================
test.describe('Authentication', () => {
  test('Login page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test('Can log in with valid credentials', async ({ page }) => {
    await login(page);
    // Should be on dashboard or admin page
    expect(page.url()).toMatch(/\/(dashboard|admin|welcome)/);
  });

  test('Register page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });
});

// ============================================================================
// DASHBOARD TESTS
// ============================================================================
// Helper to check for actual server errors (not CSS classes like "indigo-500")
async function checkNoServerError(page: Page) {
  const content = await page.content();
  // Check for actual error messages, not CSS classes
  expect(content).not.toContain('Internal Server Error');
  expect(content).not.toContain('500 Internal');
  expect(content).not.toContain('Application error');
  expect(content).not.toContain('NEXT_NOT_FOUND');
  // Check HTTP status via response
  const response = await page.reload();
  expect(response?.status()).toBeLessThan(500);
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Dashboard loads after login', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });

  test('Admin page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });
});

// ============================================================================
// FORM BUILDER TESTS
// ============================================================================
test.describe('Form Builder', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Form Library page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/forms`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });

  test('Form Templates page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/form-templates`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });

  test('PDF Import page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/forms/import`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });

  test('New Form Template editor loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/form-templates/new/edit`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });
});

// ============================================================================
// DOCUMENTS TESTS
// ============================================================================
test.describe('Documents', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Documents page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/documents`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });

  test('Document Registry loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/document-registry`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });

  test('Document Upload page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/documents/upload`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });
});

// ============================================================================
// EMPLOYEES TESTS
// ============================================================================
test.describe('Employees', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Employees page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/employees`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });

  test('Departments page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/departments`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });
});

// ============================================================================
// CERTIFICATIONS TESTS
// ============================================================================
test.describe('Certifications', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Certifications page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/certifications`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });

  test('New Certification page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/certifications/new`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });

  test('Certification Reports page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/certifications/reports`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });
});

// ============================================================================
// AUDIT TESTS
// ============================================================================
test.describe('Audit', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Audit Dashboard loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/audit-dashboard`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });

  test('Mock Audit page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/mock-audit`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });

  test('Audit Documents page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/audit/documents`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });
});

// ============================================================================
// ACTION PLAN TESTS
// ============================================================================
test.describe('Action Plan', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Action Plan page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/action-plan`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });
});

// ============================================================================
// MAINTENANCE TESTS
// ============================================================================
test.describe('Maintenance', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Maintenance page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/maintenance`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });
});

// ============================================================================
// SETTINGS TESTS
// ============================================================================
test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Settings page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/settings`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });

  test('Team Settings page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/settings/team`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });

  test('Integrations page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/settings/integrations`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });

  test('Profile page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/profile`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });
});

// ============================================================================
// COR ROADMAP TESTS
// ============================================================================
test.describe('COR Roadmap', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('COR Roadmap page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/cor-roadmap`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });

  test('Phases page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/phases`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });
});

// ============================================================================
// LIBRARIES TESTS
// ============================================================================
test.describe('Libraries', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Libraries page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/libraries`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });
});

// ============================================================================
// WORKER PORTAL TESTS
// ============================================================================
test.describe('Worker Portal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Forms page (worker) loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/forms`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });

  test('Documents page (worker) loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/documents`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });

  test('Documents Portal loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/documents/portal`);
    await page.waitForLoadState('networkidle');
    await checkNoServerError(page);
  });
});

// ============================================================================
// API ENDPOINT TESTS
// ============================================================================
test.describe('API Endpoints', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Hazards API works', async ({ page, request }) => {
    // Get cookies from browser context
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    const response = await request.get(`${BASE_URL}/api/hazards`, {
      headers: { Cookie: cookieHeader }
    });
    expect(response.status()).toBeLessThan(500);
  });

  test('Form Templates API works', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    const response = await request.get(`${BASE_URL}/api/form-templates`, {
      headers: { Cookie: cookieHeader }
    });
    expect(response.status()).toBeLessThan(500);
  });

  test('Documents API works', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    const response = await request.get(`${BASE_URL}/api/documents`, {
      headers: { Cookie: cookieHeader }
    });
    expect(response.status()).toBeLessThan(500);
  });
});
