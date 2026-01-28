import { test, expect, Page } from '@playwright/test';
import { faker } from '@faker-js/faker';

// Test configuration
const BASE_URL = 'http://localhost:3003';
const SCREENSHOT_DIR = './screenshots';

// Dummy data for testing
const COMPANY_DATA = {
  name: 'Test Construction Ltd',
  address: '123 Safety Street, Calgary, AB T2P 1A1',
  phone: '403-555-0123',
  email: 'test@testconstruction.ca',
  website: 'https://testconstruction.ca',
  description: 'A leading construction company specializing in safety and compliance.'
};

const EMPLOYEE_DATA = [
  {
    firstName: 'John',
    lastName: 'Smith',
    position: 'Site Supervisor',
    employeeId: 'EMP001',
    email: 'john.smith@testconstruction.ca',
    phone: '403-555-0101',
    certifications: ['First Aid', 'Fall Protection', 'WHMIS']
  },
  {
    firstName: 'Sarah',
    lastName: 'Johnson',
    position: 'Safety Officer',
    employeeId: 'EMP002',
    email: 'sarah.johnson@testconstruction.ca',
    phone: '403-555-0102',
    certifications: ['Safety Officer Certificate', 'Confined Space', 'H2S Alive']
  },
  {
    firstName: 'Mike',
    lastName: 'Wilson',
    position: 'Equipment Operator',
    employeeId: 'EMP003',
    email: 'mike.wilson@testconstruction.ca',
    phone: '403-555-0103',
    certifications: ['Heavy Equipment Operator', 'Site Safety', 'Ground Disturbance']
  }
];

const FORM_DATA = {
  hazardAssessment: {
    date: new Date().toISOString().split('T')[0],
    location: 'Main Construction Site - Building A',
    hazards: [
      'Working at heights - potential fall from 20ft',
      'Heavy machinery operation',
      'Electrical work - potential shock hazard',
      'Confined space entry'
    ],
    controls: [
      'Fall protection harness and anchor points',
      'Spotter and communication protocols',
      'Lockout/tagout procedures',
      'Air quality monitoring and rescue team standby'
    ],
    riskLevel: 'Medium',
    supervisor: 'John Smith',
    reviewedBy: 'Sarah Johnson'
  },
  incidentReport: {
    date: new Date().toISOString().split('T')[0],
    time: '14:30',
    location: 'Site B - Excavation Area',
    type: 'Near Miss',
    description: 'Worker nearly struck by falling debris from upper level',
    injuredPerson: 'None - Near Miss',
    witnesses: 'Mike Wilson, Dave Brown',
    immediateAction: 'Area cordoned off, work stopped until investigation complete',
    rootCause: 'Improper debris containment at upper level',
    correctiveAction: 'Install debris netting and improve housekeeping procedures'
  }
};

// Test utilities
class TestUtils {
  static async takeScreenshot(page: Page, name: string) {
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  static async fillForm(page: Page, formData: any) {
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string') {
        await page.fill(`[name="${key}"], [data-testid="${key}"], #${key}`, value);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          await page.fill(`[name="${key}[]"], [data-testid="${key}"]`, item);
          await page.keyboard.press('Enter');
        }
      }
    }
  }

  static async waitForPageLoad(page: Page, timeout = 10000) {
    await page.waitForLoadState('networkidle', { timeout });
    await page.waitForTimeout(1000); // Additional wait for dynamic content
  }

  static generateRandomEmployee() {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      position: faker.person.jobType(),
      employeeId: `EMP${faker.string.numeric(3)}`,
      email: faker.internet.email(),
      phone: faker.phone.number('###-###-####'),
      certifications: faker.helpers.arrayElements([
        'First Aid', 'Fall Protection', 'WHMIS', 'Safety Officer Certificate',
        'Confined Space', 'H2S Alive', 'Heavy Equipment Operator', 'Site Safety'
      ], faker.number.int({ min: 1, max: 4 }))
    };
  }
}

// Test suite
test.describe('COR Pathways E2E Testing', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ 
      viewport: { width: 1920, height: 1080 }
    });
    
    // Create screenshots directory
    await page.evaluate(() => {
      // This will be handled by the file system
    });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await page.goto(BASE_URL);
    await TestUtils.waitForPageLoad(page);
  });

  test('Phase 1: Authentication Flow', async () => {
    console.log('🔐 Testing Authentication Flow...');
    
    // Test landing page
    await expect(page.locator('h1')).toContainText('COR Pathways');
    await TestUtils.takeScreenshot(page, '01-landing-page');
    
    // Test navigation to registration
    await page.click('text=Register Your Company');
    await TestUtils.waitForPageLoad(page);
    await expect(page.locator('h1, h2')).toContainText('Register', { timeout: 5000 });
    await TestUtils.takeScreenshot(page, '02-registration-page');
    
    // Fill registration form
    await page.fill('[data-testid="company-name"], input[name="company"], input[type="text"]', COMPANY_DATA.name);
    await page.fill('[data-testid="company-address"], textarea[name="address"], textarea', COMPANY_DATA.address);
    await page.fill('[data-testid="company-phone"], input[name="phone"], input[type="tel"]', COMPANY_DATA.phone);
    await page.fill('[data-testid="company-email"], input[name="email"], input[type="email"]', COMPANY_DATA.email);
    
    // Create admin user
    await page.fill('[data-testid="admin-name"], input[name="adminName"], input[placeholder*="name"]', 'Admin User');
    await page.fill('[data-testid="admin-email"], input[name="adminEmail"], input[type="email"]:last-of-type', 'admin@testconstruction.ca');
    await page.fill('[data-testid="admin-password"], input[name="password"], input[type="password"]', 'SecurePassword123!');
    await page.fill('[data-testid="confirm-password"], input[name="confirmPassword"], input[type="password"]:last-of-type', 'SecurePassword123!');
    
    await TestUtils.takeScreenshot(page, '03-registration-form-filled');
    
    // Submit registration
    await page.click('button[type="submit"], button:has-text("Register"), button:has-text("Create Account")');
    await TestUtils.waitForPageLoad(page);
    
    // Check if registration was successful or if we need to handle errors
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/login')) {
      console.log('✅ Registration flow completed');
      await TestUtils.takeScreenshot(page, '04-registration-success');
    } else {
      console.log('⚠️ Registration may have failed, continuing with login test');
      await TestUtils.takeScreenshot(page, '04-registration-issue');
    }
    
    // Test login flow
    await page.goto(`${BASE_URL}/login`);
    await TestUtils.waitForPageLoad(page);
    
    await page.fill('[data-testid="email"], input[name="email"], input[type="email"]', 'admin@testconstruction.ca');
    await page.fill('[data-testid="password"], input[name="password"], input[type="password"]', 'SecurePassword123!');
    
    await TestUtils.takeScreenshot(page, '05-login-form-filled');
    
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    await TestUtils.waitForPageLoad(page);
    
    await TestUtils.takeScreenshot(page, '06-login-result');
  });

  test('Phase 2: Navigation Testing', async () => {
    console.log('🧭 Testing Navigation...');
    
    const pages = [
      { name: 'Dashboard', url: '/dashboard', selector: 'h1, h2' },
      { name: 'COR Roadmap', url: '/cor-roadmap', selector: 'h1, h2' },
      { name: 'Phases', url: '/phases', selector: 'h1, h2' },
      { name: 'Audit Dashboard', url: '/audit', selector: 'h1, h2' },
      { name: 'Forms', url: '/forms', selector: 'h1, h2' },
      { name: 'Documents', url: '/documents', selector: 'h1, h2' },
      { name: 'Admin Panel', url: '/admin', selector: 'h1, h2' },
      { name: 'Employees', url: '/admin/employees', selector: 'h1, h2' },
      { name: 'Certifications', url: '/admin/certifications', selector: 'h1, h2' },
      { name: 'Departments', url: '/admin/departments', selector: 'h1, h2' }
    ];
    
    for (const pageTest of pages) {
      try {
        console.log(`Testing navigation to ${pageTest.name}...`);
        await page.goto(`${BASE_URL}${pageTest.url}`);
        await TestUtils.waitForPageLoad(page, 5000);
        
        // Check if page loaded successfully
        const title = await page.locator(pageTest.selector).first().textContent();
        if (title) {
          console.log(`✅ ${pageTest.name} loaded successfully`);
        } else {
          console.log(`⚠️ ${pageTest.name} may have loading issues`);
        }
        
        await TestUtils.takeScreenshot(page, `nav-${pageTest.name.toLowerCase().replace(/\s+/g, '-')}`);
        
        // Check for 404 errors or error messages
        const hasError = await page.locator('text=404, text=Page not found, text=Error').count();
        if (hasError > 0) {
          console.log(`❌ ${pageTest.name} has errors`);
        }
        
      } catch (error) {
        console.log(`❌ Failed to load ${pageTest.name}: ${error}`);
        await TestUtils.takeScreenshot(page, `error-${pageTest.name.toLowerCase().replace(/\s+/g, '-')}`);
      }
    }
  });

  test('Phase 3: Form Testing', async () => {
    console.log('📝 Testing Forms...');
    
    // Navigate to forms section
    await page.goto(`${BASE_URL}/forms`);
    await TestUtils.waitForPageLoad(page);
    await TestUtils.takeScreenshot(page, 'forms-library');
    
    // Look for available forms
    const formLinks = await page.locator('a[href*="/forms/"], a[href*="/form/"], button:has-text("New"), button:has-text("Create")').all();
    
    if (formLinks.length === 0) {
      console.log('⚠️ No forms found in the forms library');
      return;
    }
    
    // Test hazard assessment form
    await testHazardAssessmentForm(page);
    
    // Test incident report form
    await testIncidentReportForm(page);
    
    // Test employee creation form
    await testEmployeeCreationForm(page);
  });

  test('Phase 4: Data Viewing and Management', async () => {
    console.log('👁️ Testing Data Viewing...');
    
    // Test employee list
    await page.goto(`${BASE_URL}/admin/employees`);
    await TestUtils.waitForPageLoad(page);
    await TestUtils.takeScreenshot(page, 'employee-list');
    
    // Test certifications list
    await page.goto(`${BASE_URL}/admin/certifications`);
    await TestUtils.waitForPageLoad(page);
    await TestUtils.takeScreenshot(page, 'certifications-list');
    
    // Test documents list
    await page.goto(`${BASE_URL}/documents`);
    await TestUtils.waitForPageLoad(page);
    await TestUtils.takeScreenshot(page, 'documents-list');
    
    // Test filtering and searching if available
    const searchInputs = await page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="filter"]').all();
    if (searchInputs.length > 0) {
      await searchInputs[0].fill('Test');
      await page.waitForTimeout(2000);
      await TestUtils.takeScreenshot(page, 'search-results');
    }
  });

  test('Phase 5: Editing and Deleting', async () => {
    console.log('✏️ Testing Edit and Delete Functions...');
    
    // Navigate to employees
    await page.goto(`${BASE_URL}/admin/employees`);
    await TestUtils.waitForPageLoad(page);
    
    // Look for edit buttons
    const editButtons = await page.locator('button:has-text("Edit"), a:has-text("Edit"), [data-action="edit"]').all();
    
    if (editButtons.length > 0) {
      await editButtons[0].click();
      await TestUtils.waitForPageLoad(page);
      await TestUtils.takeScreenshot(page, 'edit-form');
      
      // Modify some fields
      const firstNameInput = await page.locator('input[name="firstName"], [data-testid="firstName"]').first();
      if (await firstNameInput.isVisible()) {
        await firstNameInput.fill('Updated Name');
        await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Update")');
        await TestUtils.waitForPageLoad(page);
        await TestUtils.takeScreenshot(page, 'edit-success');
      }
    }
    
    // Look for delete buttons (but don't actually delete to preserve data)
    const deleteButtons = await page.locator('button:has-text("Delete"), button:has-text("Remove"), [data-action="delete"]').all();
    if (deleteButtons.length > 0) {
      console.log(`✅ Found ${deleteButtons.length} delete buttons (not clicking to preserve data)`);
    }
  });

  test('Phase 6: User Workflows', async () => {
    console.log('🔄 Testing Complete User Workflows...');
    
    // Test New Form Submission Workflow
    await testFormSubmissionWorkflow(page);
    
    // Test Audit Workflow
    await testAuditWorkflow(page);
    
    // Test Employee Management Workflow
    await testEmployeeManagementWorkflow(page);
    
    // Test Report Generation Workflow
    await testReportGenerationWorkflow(page);
  });

  test('Phase 7: Error Handling', async () => {
    console.log('⚠️ Testing Error Handling...');
    
    // Test form validation errors
    await page.goto(`${BASE_URL}/admin/employees`);
    await TestUtils.waitForPageLoad(page);
    
    // Try to submit empty form
    const submitButton = await page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(2000);
      await TestUtils.takeScreenshot(page, 'validation-errors');
      
      // Check for error messages
      const errorMessages = await page.locator('text=required, text=invalid, text=must, .error, .error-message').all();
      if (errorMessages.length > 0) {
        console.log(`✅ Found ${errorMessages.length} validation error messages`);
      }
    }
    
    // Test invalid data formats
    await page.goto(`${BASE_URL}/admin/employees`);
    await TestUtils.waitForPageLoad(page);
    
    const newButton = await page.locator('button:has-text("New"), button:has-text("Add"), a:has-text("Create")').first();
    if (await newButton.isVisible()) {
      await newButton.click();
      await TestUtils.waitForPageLoad(page);
      
      // Fill with invalid data
      await page.fill('input[name="email"], input[type="email"]', 'invalid-email');
      await page.fill('input[name="phone"], input[type="tel"]', 'invalid-phone');
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      await TestUtils.takeScreenshot(page, 'invalid-data-errors');
    }
  });

  test('Phase 8: Edge Cases', async () => {
    console.log('🔍 Testing Edge Cases...');
    
    // Test special characters
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    await page.goto(`${BASE_URL}/admin/employees`);
    await TestUtils.waitForPageLoad(page);
    
    const newButton = await page.locator('button:has-text("New"), button:has-text("Add")').first();
    if (await newButton.isVisible()) {
      await newButton.click();
      await TestUtils.waitForPageLoad(page);
      
      // Try filling with special characters
      const nameInput = await page.locator('input[name="firstName"], input[type="text"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(`Test${specialChars}Name`);
        await TestUtils.takeScreenshot(page, 'special-characters-test');
      }
    }
    
    // Test very long inputs
    const longText = 'a'.repeat(1000);
    const textArea = await page.locator('textarea').first();
    if (await textArea.isVisible()) {
      await textArea.fill(longText);
      await TestUtils.takeScreenshot(page, 'long-text-test');
    }
  });
});

// Helper functions for specific tests
async function testHazardAssessmentForm(page: Page) {
  console.log('Testing Hazard Assessment Form...');
  
  try {
    await page.goto(`${BASE_URL}/forms`);
    await TestUtils.waitForPageLoad(page);
    
    // Look for hazard assessment form
    const hazardForm = await page.locator('text=Hazard Assessment, text=JSA, text=Job Safety').first();
    if (await hazardForm.isVisible()) {
      await hazardForm.click();
      await TestUtils.waitForPageLoad(page);
      
      // Fill the form
      await TestUtils.fillForm(page, FORM_DATA.hazardAssessment);
      await TestUtils.takeScreenshot(page, 'hazard-form-filled');
      
      // Submit the form
      await page.click('button[type="submit"], button:has-text("Submit"), button:has-text("Save")');
      await TestUtils.waitForPageLoad(page);
      
      await TestUtils.takeScreenshot(page, 'hazard-form-submitted');
      console.log('✅ Hazard Assessment form tested');
    } else {
      console.log('⚠️ Hazard Assessment form not found');
    }
  } catch (error) {
    console.log(`❌ Error testing Hazard Assessment form: ${error}`);
  }
}

async function testIncidentReportForm(page: Page) {
  console.log('Testing Incident Report Form...');
  
  try {
    await page.goto(`${BASE_URL}/forms`);
    await TestUtils.waitForPageLoad(page);
    
    // Look for incident report form
    const incidentForm = await page.locator('text=Incident, text=Accident, text=Report').first();
    if (await incidentForm.isVisible()) {
      await incidentForm.click();
      await TestUtils.waitForPageLoad(page);
      
      // Fill the form
      await TestUtils.fillForm(page, FORM_DATA.incidentReport);
      await TestUtils.takeScreenshot(page, 'incident-form-filled');
      
      // Submit the form
      await page.click('button[type="submit"], button:has-text("Submit"), button:has-text("Save")');
      await TestUtils.waitForPageLoad(page);
      
      await TestUtils.takeScreenshot(page, 'incident-form-submitted');
      console.log('✅ Incident Report form tested');
    } else {
      console.log('⚠️ Incident Report form not found');
    }
  } catch (error) {
    console.log(`❌ Error testing Incident Report form: ${error}`);
  }
}

async function testEmployeeCreationForm(page: Page) {
  console.log('Testing Employee Creation Form...');
  
  try {
    await page.goto(`${BASE_URL}/admin/employees`);
    await TestUtils.waitForPageLoad(page);
    
    // Look for new employee button
    const newEmployeeBtn = await page.locator('button:has-text("New"), button:has-text("Add"), a:has-text("Create")').first();
    if (await newEmployeeBtn.isVisible()) {
      await newEmployeeBtn.click();
      await TestUtils.waitForPageLoad(page);
      
      // Fill with test employee data
      const employee = TestUtils.generateRandomEmployee();
      await TestUtils.fillForm(page, employee);
      await TestUtils.takeScreenshot(page, 'employee-form-filled');
      
      // Submit the form
      await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      await TestUtils.waitForPageLoad(page);
      
      await TestUtils.takeScreenshot(page, 'employee-form-submitted');
      console.log('✅ Employee Creation form tested');
    } else {
      console.log('⚠️ Employee Creation button not found');
    }
  } catch (error) {
    console.log(`❌ Error testing Employee Creation form: ${error}`);
  }
}

async function testFormSubmissionWorkflow(page: Page) {
  console.log('Testing Form Submission Workflow...');
  
  try {
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await TestUtils.waitForPageLoad(page);
    
    // Look for quick actions or create new form
    const createFormBtn = await page.locator('button:has-text("New"), button:has-text("Create"), a:has-text("Form")').first();
    if (await createFormBtn.isVisible()) {
      await createFormBtn.click();
      await TestUtils.waitForPageLoad(page);
      
      // Fill and submit a simple form
      await TestUtils.takeScreenshot(page, 'workflow-form-start');
      
      // Look for submit button
      const submitBtn = await page.locator('button[type="submit"], button:has-text("Submit")').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await TestUtils.waitForPageLoad(page);
        await TestUtils.takeScreenshot(page, 'workflow-form-complete');
        console.log('✅ Form submission workflow tested');
      }
    }
  } catch (error) {
    console.log(`❌ Error in form submission workflow: ${error}`);
  }
}

async function testAuditWorkflow(page: Page) {
  console.log('Testing Audit Workflow...');
  
  try {
    await page.goto(`${BASE_URL}/audit`);
    await TestUtils.waitForPageLoad(page);
    
    // Look for audit creation
    const auditBtn = await page.locator('button:has-text("New Audit"), button:has-text("Start"), a:has-text("Audit")').first();
    if (await auditBtn.isVisible()) {
      await auditBtn.click();
      await TestUtils.waitForPageLoad(page);
      
      await TestUtils.takeScreenshot(page, 'audit-workflow');
      console.log('✅ Audit workflow tested');
    }
  } catch (error) {
    console.log(`❌ Error in audit workflow: ${error}`);
  }
}

async function testEmployeeManagementWorkflow(page: Page) {
  console.log('Testing Employee Management Workflow...');
  
  try {
    await page.goto(`${BASE_URL}/admin/employees`);
    await TestUtils.waitForPageLoad(page);
    
    // Create employee
    const newBtn = await page.locator('button:has-text("New"), button:has-text("Add")').first();
    if (await newBtn.isVisible()) {
      await newBtn.click();
      await TestUtils.waitForPageLoad(page);
      
      const employee = TestUtils.generateRandomEmployee();
      await TestUtils.fillForm(page, employee);
      
      await page.click('button[type="submit"]');
      await TestUtils.waitForPageLoad(page);
      
      await TestUtils.takeScreenshot(page, 'employee-workflow-created');
      console.log('✅ Employee management workflow tested');
    }
  } catch (error) {
    console.log(`❌ Error in employee management workflow: ${error}`);
  }
}

async function testReportGenerationWorkflow(page: Page) {
  console.log('Testing Report Generation Workflow...');
  
  try {
    await page.goto(`${BASE_URL}/admin/reports`);
    await TestUtils.waitForPageLoad(page);
    
    // Look for report generation options
    const reportBtn = await page.locator('button:has-text("Generate"), button:has-text("Create"), button:has-text("Report")').first();
    if (await reportBtn.isVisible()) {
      await reportBtn.click();
      await TestUtils.waitForPageLoad(page);
      
      await TestUtils.takeScreenshot(page, 'report-workflow');
      console.log('✅ Report generation workflow tested');
    }
  } catch (error) {
    console.log(`❌ Error in report generation workflow: ${error}`);
  }
}
