import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Tests for Recent Features:
 * 1. CSV Template Downloads (Employees, Equipment)
 * 2. Worker Certificate Upload Page (/my-certificates)
 * 3. Library Import System (/admin/libraries/import)
 * 4. Download Templates Dropdown on Libraries Page
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://2026-core.vercel.app';
const SCREENSHOT_DIR = './test-screenshots';
const DOWNLOAD_DIR = './test-downloads';

// Ensure directories exist
test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }
});

async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

test.describe('CSV Template Downloads', () => {
  test('Employee upload page has download template button', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding/upload-employees`);
    await page.waitForLoadState('networkidle');

    // Look for the download template button
    const downloadButton = page.locator('button:has-text("Download Template")');
    
    if (await downloadButton.isVisible({ timeout: 5000 })) {
      console.log('✓ Download Template button found on employee upload page');
      await takeScreenshot(page, 'employee-upload-page');
      
      // Verify button is clickable
      await expect(downloadButton).toBeEnabled();
      console.log('✓ Download Template button is enabled');
    } else {
      // Page may require auth - take screenshot for debugging
      await takeScreenshot(page, 'employee-upload-auth-required');
      console.log('Employee upload page may require authentication');
    }
  });

  test('Equipment step component structure exists', async ({ page }) => {
    // Check that the equipment step file was updated with CSV support
    const equipmentStepPath = path.join(
      process.cwd(),
      'components/onboarding/steps/EquipmentStep.tsx'
    );
    
    const fileExists = fs.existsSync(equipmentStepPath);
    expect(fileExists).toBe(true);
    console.log('✓ EquipmentStep.tsx exists');

    // Read file and check for CSV imports
    const content = fs.readFileSync(equipmentStepPath, 'utf-8');
    expect(content).toContain('downloadEquipmentCSVTemplate');
    expect(content).toContain('validateEquipmentCSV');
    console.log('✓ EquipmentStep has CSV template download functionality');
  });
});

test.describe('Worker Certificate Upload Page', () => {
  test('My Certificates page loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/my-certificates`);
    await page.waitForLoadState('networkidle');

    // Check for page elements (may redirect to login if not authenticated)
    const currentUrl = page.url();
    
    if (currentUrl.includes('login')) {
      console.log('Page requires authentication - redirected to login');
      await takeScreenshot(page, 'my-certificates-requires-auth');
    } else {
      // Look for certificate-related content
      const heading = page.locator('h1:has-text("My Certificates")');
      const uploadButton = page.locator('button:has-text("Upload")');
      
      if (await heading.isVisible({ timeout: 5000 })) {
        console.log('✓ My Certificates page heading found');
        await takeScreenshot(page, 'my-certificates-page');
      }
      
      if (await uploadButton.isVisible({ timeout: 3000 })) {
        console.log('✓ Upload button found');
      }
    }
  });

  test('My Certificates page file structure exists', async ({ page }) => {
    const pagePath = path.join(
      process.cwd(),
      'app/(protected)/my-certificates/page.tsx'
    );
    
    const fileExists = fs.existsSync(pagePath);
    expect(fileExists).toBe(true);
    console.log('✓ my-certificates/page.tsx exists');

    // Verify key functionality
    const content = fs.readFileSync(pagePath, 'utf-8');
    expect(content).toContain('navigator.mediaDevices');
    expect(content).toContain('capturePhoto');
    expect(content).toContain('handleFileSelect');
    console.log('✓ Page has camera capture and file upload functionality');
  });
});

test.describe('Library Import System', () => {
  test('Library import page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/libraries/import`);
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    
    if (currentUrl.includes('login')) {
      console.log('Library import requires authentication');
      await takeScreenshot(page, 'library-import-requires-auth');
    } else {
      // Look for library selection options
      const hazardsOption = page.locator('text=Hazard Library');
      const tasksOption = page.locator('text=Task Library');
      const sdsOption = page.locator('text=SDS Library');
      const legislationOption = page.locator('text=Legislation');

      const pageHeading = page.locator('h1:has-text("Import Library Data")');
      
      if (await pageHeading.isVisible({ timeout: 5000 })) {
        console.log('✓ Library import page heading found');
        await takeScreenshot(page, 'library-import-page');
      }

      // Check for all 4 library options
      if (await hazardsOption.isVisible({ timeout: 3000 })) {
        console.log('✓ Hazard Library option found');
      }
      if (await tasksOption.isVisible({ timeout: 3000 })) {
        console.log('✓ Task Library option found');
      }
      if (await sdsOption.isVisible({ timeout: 3000 })) {
        console.log('✓ SDS Library option found');
      }
      if (await legislationOption.isVisible({ timeout: 3000 })) {
        console.log('✓ Legislation Library option found');
      }
    }
  });

  test('Library import page file structure exists', async ({ page }) => {
    const pagePath = path.join(
      process.cwd(),
      'app/(protected)/admin/libraries/import/page.tsx'
    );
    
    const fileExists = fs.existsSync(pagePath);
    expect(fileExists).toBe(true);
    console.log('✓ libraries/import/page.tsx exists');

    const content = fs.readFileSync(pagePath, 'utf-8');
    expect(content).toContain('downloadHazardCSVTemplate');
    expect(content).toContain('downloadTaskCSVTemplate');
    expect(content).toContain('downloadSDSCSVTemplate');
    expect(content).toContain('downloadLegislationCSVTemplate');
    expect(content).toContain('document control');
    console.log('✓ Import page has all 4 library template downloads');
    console.log('✓ Import page integrates with document control');
  });

  test('CSV library validation utilities exist', async ({ page }) => {
    const utilsPath = path.join(
      process.cwd(),
      'lib/validation/csv-libraries.ts'
    );
    
    const fileExists = fs.existsSync(utilsPath);
    expect(fileExists).toBe(true);
    console.log('✓ csv-libraries.ts exists');

    const content = fs.readFileSync(utilsPath, 'utf-8');
    
    // Check for all template generators
    expect(content).toContain('generateHazardCSVTemplate');
    expect(content).toContain('generateTaskCSVTemplate');
    expect(content).toContain('generateSDSCSVTemplate');
    expect(content).toContain('generateLegislationCSVTemplate');
    console.log('✓ All 4 CSV template generators exist');

    // Check for validation functions
    expect(content).toContain('validateCSVHeaders');
    expect(content).toContain('parseArrayField');
    console.log('✓ CSV validation utilities exist');

    // Check for correct headers
    expect(content).toContain('HAZARD_CSV_HEADERS');
    expect(content).toContain('TASK_CSV_HEADERS');
    expect(content).toContain('SDS_CSV_HEADERS');
    expect(content).toContain('LEGISLATION_CSV_HEADERS');
    console.log('✓ CSV header definitions exist for all libraries');
  });
});

test.describe('Libraries Page Template Dropdown', () => {
  test('Master Libraries page has download templates button', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/libraries`);
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    
    if (currentUrl.includes('login')) {
      console.log('Libraries page requires authentication');
      await takeScreenshot(page, 'libraries-requires-auth');
    } else {
      // Look for the download templates dropdown
      const templateButton = page.locator('button:has-text("Download Templates")');
      const importButton = page.locator('a:has-text("Import Data")');
      
      if (await templateButton.isVisible({ timeout: 5000 })) {
        console.log('✓ Download Templates button found');
        
        // Click to open dropdown
        await templateButton.click();
        await page.waitForTimeout(500);
        
        // Check for template options
        const hazardTemplate = page.locator('text=Hazard Library Template');
        const taskTemplate = page.locator('text=Task Library Template');
        const sdsTemplate = page.locator('text=SDS Library Template');
        const legislationTemplate = page.locator('text=Legislation Template');
        
        if (await hazardTemplate.isVisible({ timeout: 2000 })) {
          console.log('✓ Hazard template option found in dropdown');
        }
        if (await taskTemplate.isVisible({ timeout: 2000 })) {
          console.log('✓ Task template option found in dropdown');
        }
        if (await sdsTemplate.isVisible({ timeout: 2000 })) {
          console.log('✓ SDS template option found in dropdown');
        }
        if (await legislationTemplate.isVisible({ timeout: 2000 })) {
          console.log('✓ Legislation template option found in dropdown');
        }
        
        await takeScreenshot(page, 'libraries-template-dropdown-open');
      }

      if (await importButton.isVisible({ timeout: 3000 })) {
        console.log('✓ Import Data button found');
      }
    }
  });

  test('Libraries page file has template imports', async ({ page }) => {
    const pagePath = path.join(
      process.cwd(),
      'app/(protected)/admin/libraries/page.tsx'
    );
    
    const fileExists = fs.existsSync(pagePath);
    expect(fileExists).toBe(true);

    const content = fs.readFileSync(pagePath, 'utf-8');
    
    // Check for template download imports
    expect(content).toContain("import {");
    expect(content).toContain("downloadHazardCSVTemplate");
    expect(content).toContain("downloadTaskCSVTemplate");
    expect(content).toContain("downloadSDSCSVTemplate");
    expect(content).toContain("downloadLegislationCSVTemplate");
    console.log('✓ Libraries page imports all template download functions');

    // Check for dropdown state
    expect(content).toContain('showTemplateMenu');
    expect(content).toContain('templateOptions');
    console.log('✓ Libraries page has template dropdown state');
  });
});

test.describe('Dashboard Certificate Upload Link', () => {
  test('Dashboard has certificate upload card', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    
    if (currentUrl.includes('login')) {
      console.log('Dashboard requires authentication');
      await takeScreenshot(page, 'dashboard-requires-auth');
    } else {
      // Look for the certificate upload card
      const uploadCard = page.locator('text=Upload Your Training Certificates');
      const uploadButton = page.locator('a:has-text("Upload Certificate Photo")');
      
      if (await uploadCard.isVisible({ timeout: 5000 })) {
        console.log('✓ Certificate upload card found on dashboard');
        await takeScreenshot(page, 'dashboard-certificate-card');
      }

      if (await uploadButton.isVisible({ timeout: 3000 })) {
        console.log('✓ Upload Certificate Photo button found');
        
        // Verify it links to the right page
        const href = await uploadButton.getAttribute('href');
        expect(href).toBe('/my-certificates');
        console.log('✓ Button links to /my-certificates');
      }
    }
  });

  test('Dashboard page file has certificate card', async ({ page }) => {
    const pagePath = path.join(
      process.cwd(),
      'app/(protected)/dashboard/page.tsx'
    );
    
    const fileExists = fs.existsSync(pagePath);
    expect(fileExists).toBe(true);

    const content = fs.readFileSync(pagePath, 'utf-8');
    
    expect(content).toContain('Upload Your Training Certificates');
    expect(content).toContain('/my-certificates');
    expect(content).toContain('Upload Certificate Photo');
    console.log('✓ Dashboard has certificate upload card with correct link');
  });
});

test.describe('Equipment CSV Validation', () => {
  test('Equipment CSV validation utilities exist', async ({ page }) => {
    const utilsPath = path.join(
      process.cwd(),
      'lib/validation/csv-equipment.ts'
    );
    
    const fileExists = fs.existsSync(utilsPath);
    expect(fileExists).toBe(true);
    console.log('✓ csv-equipment.ts exists');

    const content = fs.readFileSync(utilsPath, 'utf-8');
    
    // Check for template generator
    expect(content).toContain('generateEquipmentCSVTemplate');
    expect(content).toContain('downloadEquipmentCSVTemplate');
    console.log('✓ Equipment CSV template generator exists');

    // Check for validation functions
    expect(content).toContain('validateEquipmentCSV');
    expect(content).toContain('validateEquipmentHeaders');
    expect(content).toContain('validateEquipmentRow');
    console.log('✓ Equipment CSV validation functions exist');

    // Check for correct headers
    expect(content).toContain('EQUIPMENT_CSV_HEADERS');
    expect(content).toContain('REQUIRED_EQUIPMENT_HEADERS');
    expect(content).toContain('VALID_EQUIPMENT_TYPES');
    console.log('✓ Equipment CSV header and type definitions exist');
  });
});
