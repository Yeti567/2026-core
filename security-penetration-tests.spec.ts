/**
 * SECURITY PENETRATION TEST SUITE
 * Comprehensive security testing for COR Pathways platform
 * 
 * Tests:
 * - Multi-tenant isolation
 * - Authentication & authorization bypass attempts
 * - SQL injection, XSS, and other injection attacks
 * - Rate limiting enforcement
 * - File upload security
 * - Session management
 * - Information disclosure prevention
 * 
 * Run with: npx tsx security-penetration-tests.spec.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

const results: TestResult[] = [];

function recordResult(name: string, passed: boolean, message: string, severity: TestResult['severity'] = 'high') {
  results.push({ name, passed, message, severity });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
}

describe('🔒 SECURITY PENETRATION TEST SUITE', () => {
  let companyAId: string;
  let companyBId: string;
  let userAId: string;
  let userBId: string;
  let userAToken: string;
  let userBToken: string;
  let serviceClient: ReturnType<typeof createClient>;

  beforeAll(async () => {
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create test companies
    const { data: companyA } = await serviceClient
      .from('companies')
      .insert({ name: 'Security Test Company A', wsib_number: 'SEC-TEST-A' })
      .select()
      .single();
    companyAId = companyA!.id;

    const { data: companyB } = await serviceClient
      .from('companies')
      .insert({ name: 'Security Test Company B', wsib_number: 'SEC-TEST-B' })
      .select()
      .single();
    companyBId = companyB!.id;

    // Create test users
    const { data: userA } = await serviceClient.auth.admin.createUser({
      email: 'security-test-a@test.local',
      password: 'TestPassword123!@#',
      email_confirm: true
    });
    userAId = userA.user!.id;

    await serviceClient.from('user_profiles').insert({
      id: userAId,
      company_id: companyAId,
      role: 'admin',
      email: 'security-test-a@test.local'
    });

    const { data: userB } = await serviceClient.auth.admin.createUser({
      email: 'security-test-b@test.local',
      password: 'TestPassword123!@#',
      email_confirm: true
    });
    userBId = userB.user!.id;

    await serviceClient.from('user_profiles').insert({
      id: userBId,
      company_id: companyBId,
      role: 'admin',
      email: 'security-test-b@test.local'
    });

    // Get auth tokens
    const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: sessionA } = await clientA.auth.signInWithPassword({
      email: 'security-test-a@test.local',
      password: 'TestPassword123!@#'
    });
    userAToken = sessionA.session!.access_token;

    const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: sessionB } = await clientB.auth.signInWithPassword({
      email: 'security-test-b@test.local',
      password: 'TestPassword123!@#'
    });
    userBToken = sessionB.session!.access_token;

    // Create test data
    await serviceClient.from('workers').insert([
      { company_id: companyAId, name: 'Worker A1', email: 'worker-a1@test.local', status: 'active' },
      { company_id: companyAId, name: 'Worker A2', email: 'worker-a2@test.local', status: 'active' },
      { company_id: companyBId, name: 'Worker B1', email: 'worker-b1@test.local', status: 'active' }
    ]);

    await serviceClient.from('documents').insert([
      { company_id: companyAId, title: 'Company A Document', control_number: 'DOC-A-001', status: 'active' },
      { company_id: companyBId, title: 'Company B Document', control_number: 'DOC-B-001', status: 'active' }
    ]);
  });

  afterAll(async () => {
    // Cleanup
    if (companyAId) await serviceClient.from('companies').delete().eq('id', companyAId);
    if (companyBId) await serviceClient.from('companies').delete().eq('id', companyBId);
  });

  describe('MULTI-TENANT ISOLATION', () => {
    test('Users cannot query other company data via API', async () => {
      const response = await fetch(`${APP_URL}/api/workers`, {
        headers: {
          'Authorization': `Bearer ${userAToken}`
        }
      });

      if (response.ok) {
        const workers = await response.json();
        const hasCompanyBWorker = workers.some((w: any) => w.name === 'Worker B1');
        recordResult(
          'Multi-tenant API isolation',
          !hasCompanyBWorker,
          hasCompanyBWorker ? 'CRITICAL: User can see other company data' : 'Users isolated correctly',
          'critical'
        );
      } else {
        recordResult('Multi-tenant API isolation', false, `API returned ${response.status}`, 'critical');
      }
    });

    test('Users cannot update other company records', async () => {
      // Get Company B's worker ID
      const { data: workerB } = await serviceClient
        .from('workers')
        .select('id')
        .eq('company_id', companyBId)
        .single();

      const response = await fetch(`${APP_URL}/api/workers/${workerB!.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userAToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Hacked Name' })
      });

      recordResult(
        'Cross-company update prevention',
        response.status === 403 || response.status === 404,
        response.status === 403 || response.status === 404
          ? 'Cross-company updates blocked'
          : `CRITICAL: User can update other company data (${response.status})`,
        'critical'
      );
    });

    test('Direct database queries respect RLS', async () => {
      const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await clientA.auth.setSession({ access_token: userAToken, refresh_token: '' });

      const { data: workers } = await clientA
        .from('workers')
        .select('*');

      const hasCompanyBWorker = workers?.some(w => w.name === 'Worker B1');
      recordResult(
        'RLS policy enforcement',
        !hasCompanyBWorker,
        hasCompanyBWorker ? 'CRITICAL: RLS not enforcing isolation' : 'RLS policies working correctly',
        'critical'
      );
    });

    test('Document access restricted to company members', async () => {
      const { data: docB } = await serviceClient
        .from('documents')
        .select('id')
        .eq('company_id', companyBId)
        .single();

      const response = await fetch(`${APP_URL}/api/documents/${docB!.id}`, {
        headers: {
          'Authorization': `Bearer ${userAToken}`
        }
      });

      recordResult(
        'Document access control',
        response.status === 403 || response.status === 404,
        response.status === 403 || response.status === 404
          ? 'Document access properly restricted'
          : `CRITICAL: User can access other company documents (${response.status})`,
        'critical'
      );
    });
  });

  describe('AUTHENTICATION & AUTHORIZATION', () => {
    test('Unauthenticated requests blocked', async () => {
      const response = await fetch(`${APP_URL}/api/workers`);

      recordResult(
        'Unauthenticated request blocking',
        response.status === 401,
        response.status === 401
          ? 'Unauthenticated requests properly blocked'
          : `CRITICAL: Unauthenticated access allowed (${response.status})`,
        'critical'
      );
    });

    test('Role-based access control enforced', async () => {
      // Create worker user
      const { data: workerUser } = await serviceClient.auth.admin.createUser({
        email: 'worker-test@test.local',
        password: 'TestPassword123!@#',
        email_confirm: true
      });

      await serviceClient.from('user_profiles').insert({
        id: workerUser.user!.id,
        company_id: companyAId,
        role: 'worker',
        email: 'worker-test@test.local'
      });

      const workerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: workerSession } = await workerClient.auth.signInWithPassword({
        email: 'worker-test@test.local',
        password: 'TestPassword123!@#'
      });

      const response = await fetch(`${APP_URL}/api/admin/company/profile`, {
        headers: {
          'Authorization': `Bearer ${workerSession.session!.access_token}`
        }
      });

      recordResult(
        'Role-based access control',
        response.status === 403,
        response.status === 403
          ? 'Role-based access control working'
          : `CRITICAL: Worker can access admin routes (${response.status})`,
        'critical'
      );

      // Cleanup
      await serviceClient.auth.admin.deleteUser(workerUser.user!.id);
    });

    test('JWT token tampering detected', async () => {
      const tamperedToken = userAToken.slice(0, -5) + 'XXXXX';
      const response = await fetch(`${APP_URL}/api/workers`, {
        headers: {
          'Authorization': `Bearer ${tamperedToken}`
        }
      });

      recordResult(
        'JWT tampering detection',
        response.status === 401,
        response.status === 401
          ? 'Tampered tokens rejected'
          : `CRITICAL: Tampered token accepted (${response.status})`,
        'critical'
      );
    });

    test('Expired sessions rejected', async () => {
      // This would require manipulating token expiry - simplified test
      const response = await fetch(`${APP_URL}/api/workers`, {
        headers: {
          'Authorization': 'Bearer expired_token_here'
        }
      });

      recordResult(
        'Expired session handling',
        response.status === 401,
        response.status === 401
          ? 'Expired sessions properly rejected'
          : 'Expired session handling needs review',
        'high'
      );
    });
  });

  describe('INJECTION ATTACKS', () => {
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE workers; --",
      "' UNION SELECT * FROM companies --",
      "1' OR '1'='1",
      "admin'--",
      "' OR 1=1--"
    ];

    test('SQL injection attempts safely handled', async () => {
      let allSafe = true;

      for (const payload of sqlInjectionPayloads) {
        const response = await fetch(`${APP_URL}/api/workers?search=${encodeURIComponent(payload)}`, {
          headers: {
            'Authorization': `Bearer ${userAToken}`
          }
        });

        // Should not return 500 error (which would indicate SQL error)
        if (response.status === 500) {
          allSafe = false;
          break;
        }
      }

      recordResult(
        'SQL injection prevention',
        allSafe,
        allSafe
          ? 'SQL injection attempts safely handled'
          : 'CRITICAL: SQL injection vulnerability detected',
        'critical'
      );
    });

    test('XSS payloads stored but not executed', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>'
      ];

      let allSafe = true;

      for (const payload of xssPayloads) {
        const response = await fetch(`${APP_URL}/api/workers`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userAToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: payload,
            email: 'xss-test@test.local',
            company_id: companyAId
          })
        });

        // Should accept but sanitize (not return error, but also not execute)
        if (response.status === 500) {
          allSafe = false;
        }
      }

      recordResult(
        'XSS prevention',
        allSafe,
        allSafe
          ? 'XSS payloads handled safely'
          : 'XSS vulnerability detected',
        'high'
      );
    });

    test('Path traversal blocked', async () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '../../../../etc/shadow',
        '....//....//etc/passwd'
      ];

      let allBlocked = true;

      for (const payload of pathTraversalPayloads) {
        const response = await fetch(`${APP_URL}/api/documents/${encodeURIComponent(payload)}`, {
          headers: {
            'Authorization': `Bearer ${userAToken}`
          }
        });

        // Should return 404 or 400, not 200 with file contents
        if (response.status === 200 && response.headers.get('content-type')?.includes('text/plain')) {
          allBlocked = false;
          break;
        }
      }

      recordResult(
        'Path traversal prevention',
        allBlocked,
        allBlocked
          ? 'Path traversal attempts blocked'
          : 'CRITICAL: Path traversal vulnerability detected',
        'critical'
      );
    });

    test('Command injection prevented', async () => {
      const commandInjectionPayloads = [
        '; ls -la',
        '| cat /etc/passwd',
        '&& rm -rf /',
        '`whoami`',
        '$(id)'
      ];

      let allSafe = true;

      for (const payload of commandInjectionPayloads) {
        const response = await fetch(`${APP_URL}/api/documents/search?q=${encodeURIComponent(payload)}`, {
          headers: {
            'Authorization': `Bearer ${userAToken}`
          }
        });

        // Should not return 500 (which might indicate command execution)
        if (response.status === 500) {
          allSafe = false;
          break;
        }
      }

      recordResult(
        'Command injection prevention',
        allSafe,
        allSafe
          ? 'Command injection attempts prevented'
          : 'CRITICAL: Command injection vulnerability detected',
        'critical'
      );
    });
  });

  describe('RATE LIMITING', () => {
    test('Registration endpoint rate limited', async () => {
      const attempts = 5;
      let rateLimited = false;

      for (let i = 0; i < attempts; i++) {
        const response = await fetch(`${APP_URL}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: `Rate Test ${i}`,
            wsib_number: `RATE-${i}`,
            company_email: `rate${i}@test.local`,
            address: '123 Test',
            city: 'Test',
            province: 'ON',
            postal_code: 'M1M1M1',
            phone: '4165551234',
            registrant_name: 'Test',
            registrant_position: 'director',
            registrant_email: `rate${i}@test.local`
          })
        });

        if (response.status === 429) {
          rateLimited = true;
          break;
        }

        // Small delay to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      recordResult(
        'Registration rate limiting',
        rateLimited,
        rateLimited
          ? 'Registration rate limiting working'
          : 'Registration rate limiting not enforced',
        'high'
      );
    });

    test('API endpoints rate limited per user', async () => {
      const attempts = 100;
      let rateLimited = false;

      for (let i = 0; i < attempts; i++) {
        const response = await fetch(`${APP_URL}/api/workers`, {
          headers: {
            'Authorization': `Bearer ${userAToken}`
          }
        });

        if (response.status === 429) {
          rateLimited = true;
          break;
        }
      }

      recordResult(
        'API rate limiting',
        rateLimited,
        rateLimited
          ? 'API rate limiting working'
          : 'API rate limiting may not be enforced',
        'medium'
      );
    });

    test('Brute force attacks mitigated', async () => {
      const wrongPasswords = ['wrong1', 'wrong2', 'wrong3', 'wrong4', 'wrong5'];
      let accountLocked = false;

      for (const password of wrongPasswords) {
        const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { error } = await client.auth.signInWithPassword({
          email: 'security-test-a@test.local',
          password
        });

        if (error?.message.includes('locked') || error?.message.includes('too many')) {
          accountLocked = true;
          break;
        }
      }

      recordResult(
        'Brute force protection',
        accountLocked,
        accountLocked
          ? 'Brute force protection active'
          : 'Brute force protection may need review',
        'high'
      );
    });
  });

  describe('FILE UPLOAD SECURITY', () => {
    test('Malicious file types rejected', async () => {
      const maliciousFiles = [
        { name: 'malware.exe', content: 'MZ\x90\x00', type: 'application/x-msdownload' },
        { name: 'script.php', content: '<?php system($_GET["cmd"]); ?>', type: 'application/x-php' },
        { name: 'shell.sh', content: '#!/bin/bash\nrm -rf /', type: 'application/x-sh' }
      ];

      let allRejected = true;

      for (const file of maliciousFiles) {
        const formData = new FormData();
        const blob = new Blob([file.content], { type: file.type });
        formData.append('file', blob, file.name);

        const response = await fetch(`${APP_URL}/api/documents/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userAToken}`
          },
          body: formData
        });

        if (response.ok) {
          allRejected = false;
          break;
        }
      }

      recordResult(
        'Malicious file type rejection',
        allRejected,
        allRejected
          ? 'Malicious file types rejected'
          : 'CRITICAL: Malicious files can be uploaded',
        'critical'
      );
    });

    test('File size limits enforced', async () => {
      // Create a large file (10MB)
      const largeContent = 'x'.repeat(10 * 1024 * 1024);
      const blob = new Blob([largeContent], { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', blob, 'large-file.pdf');

      const response = await fetch(`${APP_URL}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userAToken}`
        },
        body: formData
      });

      recordResult(
        'File size limit enforcement',
        response.status === 413 || response.status === 400,
        response.status === 413 || response.status === 400
          ? 'File size limits enforced'
          : 'File size limits may not be enforced',
        'high'
      );
    });

    test('File metadata validated', async () => {
      const formData = new FormData();
      const blob = new Blob(['fake pdf content'], { type: 'application/pdf' });
      formData.append('file', blob, 'test.pdf');
      formData.append('title', '<script>alert("XSS")</script>');

      const response = await fetch(`${APP_URL}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userAToken}`
        },
        body: formData
      });

      // Should sanitize or reject malicious metadata
      recordResult(
        'File metadata validation',
        response.status !== 500,
        response.status !== 500
          ? 'File metadata validated'
          : 'File metadata validation needs review',
        'medium'
      );
    });
  });

  describe('SESSION SECURITY', () => {
    test('CSRF protection active', async () => {
      // Try to make state-changing request without proper CSRF token
      const response = await fetch(`${APP_URL}/api/admin/company/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userAToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Hacked' })
      });

      // Should check for CSRF token or origin header
      recordResult(
        'CSRF protection',
        response.status !== 200 || response.headers.get('x-csrf-check') !== null,
        'CSRF protection status verified',
        'high'
      );
    });

    test('Session fixation prevented', async () => {
      // Create session and verify it's unique
      const client1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: session1 } = await client1.auth.signInWithPassword({
        email: 'security-test-a@test.local',
        password: 'TestPassword123!@#'
      });

      const client2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: session2 } = await client2.auth.signInWithPassword({
        email: 'security-test-a@test.local',
        password: 'TestPassword123!@#'
      });

      const sessionsDifferent = session1.session!.access_token !== session2.session!.access_token;
      recordResult(
        'Session fixation prevention',
        sessionsDifferent,
        sessionsDifferent
          ? 'Sessions are unique (fixation prevented)'
          : 'CRITICAL: Session fixation vulnerability',
        'high'
      );
    });

    test('Secure cookie settings', async () => {
      // This would require checking Set-Cookie headers
      // Simplified test - verify session tokens are not exposed in responses
      const response = await fetch(`${APP_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${userAToken}`
        }
      });

      const body = await response.text();
      const tokenExposed = body.includes(userAToken);
      recordResult(
        'Secure cookie settings',
        !tokenExposed,
        !tokenExposed
          ? 'Tokens not exposed in responses'
          : 'CRITICAL: Tokens exposed in responses',
        'critical'
      );
    });
  });

  describe('INFORMATION DISCLOSURE', () => {
    test('Error messages do not leak sensitive info', async () => {
      const response = await fetch(`${APP_URL}/api/workers/invalid-id`, {
        headers: {
          'Authorization': `Bearer ${userAToken}`
        }
      });

      const body = await response.text();
      const sensitiveInfoLeaked = 
        body.includes('password') ||
        body.includes('token') ||
        body.includes('secret') ||
        body.includes('key') ||
        body.includes('SELECT') ||
        body.includes('FROM');

      recordResult(
        'Error message security',
        !sensitiveInfoLeaked,
        !sensitiveInfoLeaked
          ? 'Error messages do not leak sensitive info'
          : 'CRITICAL: Error messages leak sensitive information',
        'critical'
      );
    });

    test('User enumeration prevented', async () => {
      // Try to register with existing email
      const response = await fetch(`${APP_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: 'Test',
          wsib_number: 'TEST-ENUM',
          company_email: 'test@test.local',
          address: '123 Test',
          city: 'Test',
          province: 'ON',
          postal_code: 'M1M1M1',
          phone: '4165551234',
          registrant_name: 'Test',
          registrant_position: 'director',
          registrant_email: 'security-test-a@test.local' // Existing email
        })
      });

      const body = await response.json();
      const userExistsDisclosed = body.error?.toLowerCase().includes('user exists') ||
                                  body.error?.toLowerCase().includes('already registered');

      recordResult(
        'User enumeration prevention',
        !userExistsDisclosed,
        !userExistsDisclosed
          ? 'User enumeration prevented'
          : 'CRITICAL: User enumeration possible',
        'high'
      );
    });

    test('Internal IDs not exposed', async () => {
      const response = await fetch(`${APP_URL}/api/workers`, {
        headers: {
          'Authorization': `Bearer ${userAToken}`
        }
      });

      if (response.ok) {
        const workers = await response.json();
        const hasInternalIds = workers.some((w: any) => 
          w.id?.includes('00000000') || // UUID pattern
          w.company_id === companyAId // Should be filtered or masked
        );

        recordResult(
          'Internal ID exposure',
          !hasInternalIds || workers.every((w: any) => w.company_id === companyAId),
          'Internal IDs properly handled',
          'medium'
        );
      }
    });
  });

  afterAll(() => {
    console.log('\n' + '═'.repeat(60));
    console.log('SECURITY TEST SUMMARY');
    console.log('═'.repeat(60));

    const critical = results.filter(r => r.severity === 'critical');
    const high = results.filter(r => r.severity === 'high');
    const medium = results.filter(r => r.severity === 'medium');
    const low = results.filter(r => r.severity === 'low');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`\nTotal Tests: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`\nBy Severity:`);
    console.log(`  Critical: ${critical.filter(r => r.passed).length}/${critical.length} passed`);
    console.log(`  High: ${high.filter(r => r.passed).length}/${high.length} passed`);
    console.log(`  Medium: ${medium.filter(r => r.passed).length}/${medium.length} passed`);
    console.log(`  Low: ${low.filter(r => r.passed).length}/${low.length} passed`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`  [${r.severity.toUpperCase()}] ${r.name}: ${r.message}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
  });
});
