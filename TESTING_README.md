# 🧪 COR PATHWAYS - COMPREHENSIVE TESTING SUITE

Complete security and feature testing package for pre-production validation.

---

## 📦 What's Included

This testing suite provides:

1. **Security Penetration Tests** (`security-penetration-tests.spec.ts`)
   - Multi-tenant isolation verification
   - Authentication & authorization bypass attempts
   - SQL injection, XSS, and other injection attacks
   - Rate limiting enforcement
   - File upload security
   - Session management
   - Information disclosure prevention

2. **End-to-End Company Journey** (`end-to-end-journey-test.spec.ts`)
   - Complete lifecycle from registration to certification
   - Tests every major feature with realistic data
   - Simulates "Northern Concrete Solutions Inc."
   - 14 phases covering all functionality

3. **Manual Testing Checklist** (`MANUAL_TESTING_CHECKLIST.md`)
   - Browser-based features requiring human interaction
   - UI/UX validation
   - PWA/offline functionality
   - Responsive design verification
   - Accessibility checks

4. **Test Data Generator** (`scripts/generate-test-data.js`)
   - Creates complete test company with realistic data
   - 10 workers across 4 departments
   - 7 documents, 5 equipment items
   - 6 certification types with sample worker certs
   - Ready-to-test environment

5. **Test Runner** (`scripts/run-comprehensive-tests.js`)
   - Orchestrates all automated tests
   - Generates HTML, JSON, and Markdown reports
   - Environment validation
   - Database connectivity checks

---

## 🚀 Quick Start

### Prerequisites

```bash
# Ensure environment is configured
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Install dependencies
npm install

# Run migrations and seeds
npm run db:migrate
npm run db:seed
```

### Option 1: Full Automated Test Suite

```bash
# Run all automated tests
node scripts/run-comprehensive-tests.js

# This will:
# - Check environment variables
# - Verify database connectivity
# - Run security penetration tests
# - Run end-to-end feature tests
# - Generate comprehensive reports
```

### Option 2: Individual Test Suites

```bash
# Security tests only
npx tsx security-penetration-tests.spec.ts

# E2E tests only
npx tsx end-to-end-journey-test.spec.ts

# Existing test suite
npm run test:all
```

### Option 3: Manual Testing Workflow

```bash
# 1. Generate test data
node scripts/generate-test-data.js

# 2. Login and test manually
# Visit: http://localhost:3000
# Credentials: admin@test.local / TestPassword123!@#

# 3. Follow checklist
# Open: MANUAL_TESTING_CHECKLIST.md
# Work through each section systematically
```

---

## 📊 Understanding Test Results

### Automated Test Reports

After running `run-comprehensive-tests.js`, you'll get:

1. **Console Output** - Real-time progress and summary
2. **test-results.json** - Machine-readable results
3. **test-results.html** - Visual HTML report (open in browser)
4. **TEST_RESULTS.md** - Markdown report for documentation

### Success Criteria

✅ **PASS** - All tests should pass before production deployment

⚠️ **PARTIAL** - Some non-critical tests may fail; review and address

❌ **FAIL** - Critical failures block production deployment

---

## 🔒 Security Test Coverage

The security test suite validates:

### Multi-Tenant Isolation
- ✓ Users cannot query other company data
- ✓ Users cannot update other company records
- ✓ API endpoints enforce company isolation
- ✓ Document access is restricted to company members

### Authentication & Authorization
- ✓ Unauthenticated requests blocked
- ✓ Role-based access control enforced
- ✓ JWT token tampering detected
- ✓ Expired sessions rejected

### Injection Attacks
- ✓ SQL injection attempts safely handled
- ✓ XSS payloads stored but not executed
- ✓ Path traversal blocked
- ✓ Command injection prevented

### Rate Limiting
- ✓ Registration endpoint rate limited
- ✓ API endpoints rate limited per user
- ✓ Brute force attacks mitigated

### File Upload Security
- ✓ Malicious file types rejected
- ✓ File size limits enforced
- ✓ File metadata validated

### Session Security
- ✓ CSRF protection active
- ✓ Session fixation prevented
- ✓ Secure cookie settings

### Information Disclosure
- ✓ Error messages don't leak sensitive info
- ✓ User enumeration prevented
- ✓ Internal IDs not exposed

---

## 🏗️ End-to-End Test Coverage

The E2E test simulates a construction company through:

### Phase 1: Registration (3 tests)
- Request registration token
- Complete registration via token
- Admin user creation and login

### Phase 2: Admin Setup (3 tests)
- Update company profile
- Configure settings
- Add company locations

### Phase 3: Team Onboarding (3 tests)
- Send bulk invitations
- Simulate invitation acceptance
- Verify team roster

### Phase 4: Organizational Structure (2 tests)
- Create departments
- Assign workers to departments

### Phase 5: Document Control (5 tests)
- Create document folders
- Upload safety documents
- Create approval workflow
- Distribute documents
- Test document search

### Phase 6: Forms & Templates (2 tests)
- Create custom form template
- Submit form responses

### Phase 7: PDF Conversion (1 test)
- Upload PDF for conversion (requires manual file)

### Phase 8: Audit & Compliance (5 tests)
- Initialize COR audit questions
- Submit audit responses
- Check compliance score
- Create action plans
- Run mock audit interview

### Phase 9: Certifications & Training (4 tests)
- Create certification types
- Upload worker certifications
- Record training sessions
- Check certification alerts

### Phase 10: Equipment & Maintenance (4 tests)
- Register equipment inventory
- Create maintenance schedules
- Record maintenance work
- Log equipment downtime

### Phase 11: COR Phase Journey (3 tests)
- Load COR phases
- Complete phase 1 tasks
- Submit prompt responses

### Phase 12: Integrations (1 test)
- Check AuditSoft integration status

### Phase 13: PWA & Offline (1 test)
- Test offline data caching (browser-only)

### Phase 14: Notifications (2 tests)
- Subscribe to push notifications (browser-only)
- Verify email notifications

### Final: Reports & Dashboards (3 tests)
- Generate audit readiness report
- Export certifications report
- View dashboard stats

**Total: 48+ automated tests**

---

## 🎯 Manual Testing Workflow

### Step 1: Generate Test Data

```bash
node scripts/generate-test-data.js
```

This creates:
- Test company "Automated Test Construction Co."
- 10 workers with different roles
- 4 departments
- 7 documents
- 5 equipment items
- 6 certification types
- Sample certifications and maintenance schedules

### Step 2: Login

Navigate to `http://localhost:3000/login`

**Test Credentials:**
```
Admin: admin@test.local / TestPassword123!@#
Safety Manager: safety@test.local / TestPassword123!@#
Worker: labour1@test.local / TestPassword123!@#
```

### Step 3: Follow Manual Checklist

Open `MANUAL_TESTING_CHECKLIST.md` and work through each section:

- [ ] Authentication & Registration Flow
- [ ] Team Management
- [ ] Document Control System
- [ ] Forms & PDF Conversion
- [ ] Audit & Compliance
- [ ] Certifications & Training
- [ ] Equipment & Maintenance
- [ ] COR Phase Journey
- [ ] Integrations
- [ ] PWA & Offline Features
- [ ] Notifications
- [ ] UI/UX & Responsiveness
- [ ] Security Edge Cases
- [ ] Reports & Exports
- [ ] Error Handling

### Step 4: Record Results

Use the table at the end of the manual checklist to track issues:

| Date | Tester | Feature | Issue | Severity | Status |
|------|--------|---------|-------|----------|--------|
|      |        |         |       |          |        |

---

## 🐛 Troubleshooting

### Tests Failing: "Missing environment variables"

**Solution:**
```bash
# Ensure .env.local has required variables
cat .env.local | grep SUPABASE

# Required:
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### Tests Failing: "Database connection error"

**Solution:**
```bash
# Check Supabase status
curl https://your-project.supabase.co/rest/v1/

# Verify service key permissions
# Service key should have full access

# Run migrations if needed
npm run db:migrate
```

### Tests Failing: "RLS policies blocking queries"

**Solution:**
```bash
# Check if RLS is properly configured
# Service role key should bypass RLS

# Verify policy existence
npm run db:migrate  # Re-runs migrations including RLS
```

### Test Data Generator: "User already exists"

**Solution:**
```bash
# Use custom company name to avoid conflicts
COMPANY_NAME="My Test Corp 2" node scripts/generate-test-data.js
```

### Manual Tests: "Cannot access features"

**Solution:**
```bash
# Ensure you're logged in with appropriate role
# Admin: Full access
# Internal Auditor: Audit features
# Supervisor: Team management
# Worker: Limited access

# Check role in user profile:
# Dashboard → User Profile → Role
```

### PWA Tests: "Install button not appearing"

**Solution:**
```bash
# Ensure running in supported browser (Chrome/Edge)
# PWA requires HTTPS (use ngrok for local testing)

# Check PWA manifest
curl http://localhost:3000/manifest.json

# Check service worker registration
# Open DevTools → Application → Service Workers
```

---

## 📈 Performance Testing

While not included in this suite, consider these performance tests:

### Load Testing
```bash
# Use Apache Bench for simple load tests
ab -n 1000 -c 10 http://localhost:3000/api/workers

# Use k6 for advanced scenarios
k6 run load-test.js
```

### Database Performance
```bash
# Check slow queries in Supabase dashboard
# Query > Performance > Slow Queries

# Analyze query plans
# Run EXPLAIN ANALYZE on complex queries
```

### Lighthouse Audit
```bash
# Generate Lighthouse report
lighthouse http://localhost:3000 --view

# Target scores:
# Performance: >90
# Accessibility: >90
# Best Practices: >90
# SEO: >90
```

---

## ✅ Pre-Deployment Checklist

Before pushing to production:

### Automated Tests
- [ ] All security tests passing
- [ ] All E2E tests passing
- [ ] Existing test suite passing
- [ ] No console errors in test runs

### Manual Tests
- [ ] Manual testing checklist completed
- [ ] All critical features tested
- [ ] UI/UX validated on multiple devices
- [ ] Accessibility verified (WCAG AA)

### Security
- [ ] npm audit shows no critical vulnerabilities
- [ ] Snyk scan shows no high-severity issues
- [ ] Sentry configured and capturing errors
- [ ] Rate limiting tested and working

### Performance
- [ ] Lighthouse score >90 all categories
- [ ] Load testing passed (if applicable)
- [ ] Database queries optimized
- [ ] Images optimized and lazy-loaded

### Data
- [ ] Database migrations tested
- [ ] Seed data verified
- [ ] Backup/restore tested
- [ ] Data retention policies configured

### Documentation
- [ ] README updated
- [ ] API documentation complete
- [ ] User guide written
- [ ] Admin guide written

### Monitoring
- [ ] Sentry error tracking active
- [ ] Uptime monitoring configured
- [ ] Performance monitoring set up
- [ ] Alert thresholds defined

### Infrastructure
- [ ] Environment variables set in production
- [ ] SSL certificate active
- [ ] CDN configured (if applicable)
- [ ] Cron jobs scheduled (Vercel)

---

## 🎓 Additional Resources

### COR Certification Context
This platform supports Ontario's COR (Certificate of Recognition) 2020 certification process:
- 14 COR elements (audit criteria)
- IHSA (Infrastructure Health & Safety Association) standards
- Ontario OH&S Act compliance
- Construction Regulation 213/91

### Testing Best Practices
- **Run tests frequently** - Integrate into CI/CD pipeline
- **Update test data** - Keep test scenarios realistic
- **Test in production-like environment** - Staging server recommended
- **Security tests first** - Never skip security validation
- **Monitor in production** - Tests don't catch everything

### Getting Help
- **GitHub Issues** - Report bugs and request features
- **Documentation** - See /docs folder for detailed guides
- **Supabase Support** - For database and auth issues
- **Sentry Dashboard** - For production error tracking

---

## 📝 Test Maintenance

### Updating Tests

When adding new features:

1. **Add security tests** for new endpoints/data access
2. **Add E2E tests** for new user workflows
3. **Update manual checklist** for new UI components
4. **Regenerate test data** if schema changes

### Version History

- **v1.0** - Initial comprehensive test suite
- **v1.1** - Add NCCI-specific test scenarios
- **v1.2** - Enhanced security penetration tests

---

## 🎉 Success!

If all tests pass and manual validation is complete, your COR Pathways platform is ready for production deployment!

**Next Steps:**
1. Deploy to staging environment
2. Run tests against staging
3. Conduct user acceptance testing (UAT)
4. Deploy to production
5. Monitor closely for first 48 hours

**Questions?** Review the troubleshooting section or check project documentation.

Good luck with your launch! 🚀
