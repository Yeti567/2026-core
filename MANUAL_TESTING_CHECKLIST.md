# MANUAL TESTING CHECKLIST
## COR Pathways Platform - Pre-Production Testing

This checklist covers features that require human interaction and cannot be fully automated. Work through each section systematically.

---

## 🔐 AUTHENTICATION & REGISTRATION FLOW

### Registration Process
- [ ] Navigate to `/signup`
- [ ] Fill out company registration form with test data
- [ ] Submit and verify "check email" message appears
- [ ] Check email inbox for magic link
- [ ] Click magic link and verify redirect to dashboard
- [ ] Verify company profile appears in admin settings

### Login/Logout Flow
- [ ] Sign out from dashboard
- [ ] Navigate to `/login`
- [ ] Attempt login with wrong password → verify error message
- [ ] Login with correct credentials → verify successful redirect
- [ ] Verify session persists on page refresh
- [ ] Click logout → verify redirect to landing page
- [ ] Verify cannot access protected routes when logged out

### Password Reset
- [ ] Click "Forgot Password" on login page
- [ ] Enter email and submit
- [ ] Check email for reset link
- [ ] Click link and set new password
- [ ] Login with new password → verify success

### Invitation Flow
- [ ] Admin: Send invitation to new worker email
- [ ] Check email inbox for invitation
- [ ] Click invitation link
- [ ] Complete worker signup
- [ ] Verify worker appears in team roster
- [ ] Test invitation expiration (set short expiry in settings)

---

## 👥 TEAM MANAGEMENT

### Worker CRUD
- [ ] Navigate to Workers/Employees section
- [ ] Add new worker manually (not via invitation)
- [ ] Edit worker details (position, phone, department)
- [ ] Upload worker photo/avatar
- [ ] Deactivate worker → verify status change
- [ ] Reactivate worker
- [ ] Attempt to delete worker with existing records → verify blocked

### Bulk Operations
- [ ] Upload CSV with 10+ test workers
- [ ] Verify all workers imported correctly
- [ ] Export workers to CSV
- [ ] Open CSV and verify data matches
- [ ] Bulk update department assignments via UI
- [ ] Bulk send training reminders

### Department Management
- [ ] Create parent department "Operations"
- [ ] Create child department "Field Crew" under Operations
- [ ] Assign workers to departments via drag-drop (if available)
- [ ] View department hierarchy visualization
- [ ] Move department to different parent
- [ ] Delete empty department → verify success
- [ ] Attempt delete of department with workers → verify warning

---

## 📄 DOCUMENT CONTROL SYSTEM

### Document Upload
- [ ] Create folder "Test Folder"
- [ ] Upload PDF document (use real safety policy PDF)
- [ ] Verify thumbnail generates
- [ ] Upload JPEG/PNG image
- [ ] Try uploading .exe file → verify rejection
- [ ] Try uploading 15MB file → verify size limit error
- [ ] Upload multiple files at once (batch upload)

### Document Metadata
- [ ] Edit document control number
- [ ] Change document status (draft → active → archived)
- [ ] Add version notes
- [ ] Set review date 30 days from now
- [ ] Assign document owner
- [ ] Add tags/keywords

### Document Viewer
- [ ] Click document to open viewer
- [ ] Navigate through multi-page PDF
- [ ] Zoom in/out
- [ ] Download document
- [ ] Print document (verify print dialog opens)
- [ ] Close viewer with ESC key

### Approval Workflow
- [ ] Submit document for approval
- [ ] Login as different user (approver role)
- [ ] See pending approval notification
- [ ] Review document
- [ ] Approve with comments
- [ ] Verify document status updates to "Approved"
- [ ] Test rejection workflow

### Distribution & Acknowledgments
- [ ] Distribute document to 5 workers
- [ ] Login as worker 1
- [ ] See "Documents to Acknowledge" notification
- [ ] Open document and click "Acknowledge"
- [ ] Verify acknowledgment timestamp recorded
- [ ] Login as admin
- [ ] View acknowledgment report (who acknowledged, who didn't)

### Document Search
- [ ] Search for "safety" in search bar
- [ ] Filter by document type "Policy"
- [ ] Filter by status "Active"
- [ ] Filter by date range
- [ ] Test autocomplete/typeahead
- [ ] Search with no results → verify "no documents found" message

---

## 📝 FORMS & PDF CONVERSION

### Form Builder
- [ ] Click "Create New Form"
- [ ] Add text input field
- [ ] Add dropdown with 5 options
- [ ] Add date picker
- [ ] Add file upload field
- [ ] Add signature field
- [ ] Reorder fields via drag-drop
- [ ] Mark fields as required vs optional
- [ ] Add conditional logic (if field X = Y, show field Z)
- [ ] Preview form
- [ ] Publish form

### Form Submission
- [ ] Fill out created form
- [ ] Test required field validation
- [ ] Upload file in file field
- [ ] Draw signature in signature field
- [ ] Submit form
- [ ] View submission confirmation
- [ ] Login as admin
- [ ] View all form submissions
- [ ] Export submissions to CSV
- [ ] Filter submissions by date

### PDF-to-Form Conversion
- [ ] Upload existing PDF form (use sample inspection checklist)
- [ ] Auto-detect fields
- [ ] Manually adjust field boundaries
- [ ] Map field types (text, checkbox, signature)
- [ ] Preview converted form
- [ ] Save as template
- [ ] Test filling out converted form
- [ ] Verify submission saves correctly

---

## ✅ AUDIT & COMPLIANCE

### Compliance Dashboard
- [ ] View overall compliance score
- [ ] See breakdown by COR element (1-14)
- [ ] Identify elements with <80% compliance
- [ ] Click element to see detailed questions
- [ ] View progress chart/visualization

### Audit Questions
- [ ] Navigate to Element 1 questions
- [ ] Answer first 5 questions (Yes/No/NA)
- [ ] Add evidence notes
- [ ] Link document as evidence
- [ ] Upload photo as evidence
- [ ] Save responses
- [ ] Return later → verify responses persisted
- [ ] Mark question for follow-up
- [ ] Add auditor comment

### Gap Analysis
- [ ] View gap analysis report
- [ ] See list of unanswered questions
- [ ] See list of "No" answers requiring action
- [ ] Export gap report to PDF
- [ ] Share gap report with team

### Mock Audit Interview
- [ ] Start new mock interview session
- [ ] Select worker to interview
- [ ] Select audit element
- [ ] Ask 5 interview questions
- [ ] Record worker responses
- [ ] Rate responses (satisfactory/needs improvement)
- [ ] Add interviewer notes
- [ ] Complete interview
- [ ] View interview transcript
- [ ] Identify training needs from interview

### Action Plans
- [ ] Create action plan from gap
- [ ] Assign to safety manager
- [ ] Set due date 2 weeks out
- [ ] Add description and priority
- [ ] Link to COR element
- [ ] Attach supporting documents
- [ ] Worker: View assigned action plans
- [ ] Update progress (25%, 50%, 75%)
- [ ] Add progress notes
- [ ] Mark complete
- [ ] Admin: View action plan dashboard
- [ ] Filter by status/priority/assignee

---

## 🎓 CERTIFICATIONS & TRAINING

### Certification Types
- [ ] Create certification type "First Aid"
- [ ] Set validity period 36 months
- [ ] Mark as mandatory
- [ ] Specify applicable positions
- [ ] Save certification type

### Worker Certifications
- [ ] Navigate to worker profile
- [ ] Add "First Aid" certification
- [ ] Enter issue date and expiry date
- [ ] Upload certification PDF
- [ ] Enter certification number
- [ ] Save certification
- [ ] View certification on worker profile
- [ ] Edit certification (extend expiry date)
- [ ] Delete certification

### Expiry Alerts
- [ ] Navigate to certification dashboard
- [ ] View "Expiring Soon" section
- [ ] See certifications expiring in next 60 days
- [ ] Click worker name → navigate to profile
- [ ] Send renewal reminder email
- [ ] Mark certification as renewed

### Training Records
- [ ] Schedule new training session
- [ ] Select training type "WHMIS"
- [ ] Set date and duration
- [ ] Select trainer
- [ ] Select attendees (5 workers)
- [ ] Save training session
- [ ] After session: Mark attendance
- [ ] Upload training materials
- [ ] Generate certificates for attendees
- [ ] View training history for worker
- [ ] Export training report to Excel

---

## 🔧 EQUIPMENT & MAINTENANCE

### Equipment Inventory
- [ ] Add new equipment "Concrete Mixer #3"
- [ ] Enter make, model, serial number
- [ ] Upload equipment photo
- [ ] Set purchase date and value
- [ ] Assign to department
- [ ] Mark if requires certification to operate
- [ ] Generate QR code for equipment
- [ ] Print QR code label

### Maintenance Schedules
- [ ] Create preventive maintenance schedule
- [ ] Set frequency (monthly/quarterly/annually)
- [ ] Add maintenance checklist items
- [ ] Assign to maintenance person
- [ ] Save schedule
- [ ] View upcoming maintenance calendar
- [ ] Get reminder 7 days before due date

### Work Orders
- [ ] Create new work order
- [ ] Link to equipment
- [ ] Describe work needed
- [ ] Set priority (emergency/high/normal/low)
- [ ] Assign technician
- [ ] Attach photos of issue
- [ ] Save work order
- [ ] Technician: View assigned work orders
- [ ] Update work order with labor hours
- [ ] Upload parts receipts
- [ ] Add completion notes
- [ ] Mark complete
- [ ] Admin: Approve work order

### Equipment History
- [ ] View equipment detail page
- [ ] See all maintenance history
- [ ] See all work orders
- [ ] See downtime logs
- [ ] Export equipment history to PDF

---

## 🚀 COR PHASE JOURNEY

### Phase Dashboard
- [ ] View all 12 phases
- [ ] See current phase highlighted
- [ ] View progress percentage per phase
- [ ] Click phase to view details

### Phase Tasks
- [ ] Open Phase 1
- [ ] See list of tasks/prompts
- [ ] Complete first task
- [ ] Upload required evidence
- [ ] Submit task
- [ ] See checkmark on completed task
- [ ] View phase completion percentage update

### Phase Prompts
- [ ] Answer AI-generated prompt
- [ ] Submit response
- [ ] Receive feedback
- [ ] Revise and resubmit
- [ ] Get approval
- [ ] Move to next prompt

### Phase Completion
- [ ] Complete all tasks in Phase 1
- [ ] See "Phase Complete" message
- [ ] Unlock Phase 2
- [ ] View timeline of completed phases

---

## 🔗 INTEGRATIONS

### AuditSoft Integration
- [ ] Navigate to Integrations → AuditSoft
- [ ] Enter AuditSoft credentials
- [ ] Click "Connect"
- [ ] Verify connection success
- [ ] Map COR elements to AuditSoft sections
- [ ] Sync audit questions
- [ ] View sync status
- [ ] Export package to AuditSoft
- [ ] Verify data appears in AuditSoft portal
- [ ] Disconnect integration

---

## 📱 PWA & OFFLINE FEATURES

### PWA Installation
**Desktop (Chrome):**
- [ ] Visit site in Chrome
- [ ] See install prompt in address bar
- [ ] Click install
- [ ] Verify app opens in standalone window
- [ ] Close and reopen from desktop/start menu

**Mobile (Chrome Android):**
- [ ] Visit site in mobile Chrome
- [ ] See "Add to Home Screen" prompt
- [ ] Install PWA
- [ ] Verify icon appears on home screen
- [ ] Open from home screen
- [ ] Verify full-screen experience

### Offline Mode
- [ ] Open PWA while online
- [ ] Navigate to several pages to cache data
- [ ] Enable airplane mode / disconnect WiFi
- [ ] Refresh page → verify page still loads
- [ ] View cached documents
- [ ] Fill out form offline
- [ ] Submit form → verify "queued for sync" message
- [ ] Reconnect to internet
- [ ] Verify form submission syncs automatically
- [ ] Check for sync success notification

### Service Worker Update
- [ ] Developer: Deploy new version with changes
- [ ] User: App shows "Update Available" notification
- [ ] Click "Update"
- [ ] Verify app reloads with new version
- [ ] Check that user data persists

---

## 🔔 NOTIFICATIONS

### Push Notifications (Browser)
- [ ] Click "Enable Notifications" button
- [ ] Allow browser notification permission
- [ ] Trigger test notification from settings
- [ ] Verify notification appears
- [ ] Click notification → verify navigates to correct page
- [ ] Disable notifications
- [ ] Verify no longer receiving notifications

### Email Notifications
- [ ] Trigger certification expiry (set cert to expire tomorrow)
- [ ] Check email inbox for expiry reminder
- [ ] Verify email content is correct
- [ ] Click link in email → verify navigates to cert page
- [ ] Mark certification as renewed
- [ ] Verify no further reminder emails

### In-App Notifications
- [ ] View notification bell icon
- [ ] See unread count badge
- [ ] Click bell → see notification list
- [ ] Click notification → navigate to item
- [ ] Mark notification as read
- [ ] Mark all as read
- [ ] Clear all notifications

---

## 🎨 UI/UX & RESPONSIVENESS

### Desktop Experience (1920x1080)
- [ ] All pages render without horizontal scroll
- [ ] Tables are readable
- [ ] Forms are properly aligned
- [ ] Modals are centered
- [ ] Sidebar navigation is visible

### Tablet Experience (iPad - 768x1024)
- [ ] Sidebar collapses to hamburger menu
- [ ] Tables become scrollable or reflow
- [ ] Forms remain usable
- [ ] Touch targets are adequate size (44x44px minimum)

### Mobile Experience (iPhone - 375x667)
- [ ] All text is readable without zooming
- [ ] Buttons are finger-friendly
- [ ] Forms are easy to fill
- [ ] Navigation is accessible
- [ ] No content is cut off

### Accessibility
- [ ] Tab through entire page with keyboard
- [ ] All interactive elements reachable
- [ ] Focus indicators visible
- [ ] Skip to content link works
- [ ] Test with screen reader (NVDA/JAWS)
- [ ] All images have alt text
- [ ] Forms have proper labels
- [ ] Color contrast meets WCAG AA (use browser extension)

### Dark Mode (if implemented)
- [ ] Toggle dark mode
- [ ] All pages render correctly
- [ ] Text is readable
- [ ] Images/logos display properly
- [ ] No white flashes during navigation

---

## 🔒 SECURITY EDGE CASES

### Session Management
- [ ] Login on Browser A
- [ ] Login on Browser B with same account
- [ ] Logout on Browser A
- [ ] Verify Browser B still has session (or gets logged out if single-session enforced)

### Role-Based Access
- [ ] Login as Worker
- [ ] Try accessing admin URL directly → verify redirect/error
- [ ] Try accessing API endpoint via browser console → verify 403
- [ ] Login as Admin
- [ ] Verify can access all sections

### CSRF Protection
- [ ] Open browser dev tools
- [ ] Attempt to submit form without CSRF token
- [ ] Verify request is rejected
- [ ] Submit with valid token → verify success

### XSS Prevention
- [ ] Enter `<script>alert('XSS')</script>` in worker name field
- [ ] Save and view worker list
- [ ] Verify script does NOT execute
- [ ] Verify text is displayed as-is or sanitized

---

## 📊 REPORTS & EXPORTS

### Audit Reports
- [ ] Generate compliance scorecard PDF
- [ ] Verify all 14 elements included
- [ ] Check formatting and page breaks
- [ ] Verify company logo appears
- [ ] Download and save

### Certification Reports
- [ ] Export all certifications to Excel
- [ ] Open in Excel/Google Sheets
- [ ] Verify all columns present
- [ ] Verify data accuracy
- [ ] Test filtering and sorting

### Training Reports
- [ ] Generate training history report
- [ ] Filter by date range (last 90 days)
- [ ] Filter by worker
- [ ] Export to PDF
- [ ] Verify charts render correctly

---

## 🚨 ERROR HANDLING

### Network Errors
- [ ] Disconnect internet mid-form-fill
- [ ] Attempt to submit
- [ ] Verify user-friendly error message
- [ ] Reconnect internet
- [ ] Retry submission → verify success

### Validation Errors
- [ ] Submit form with missing required fields
- [ ] Verify error messages appear
- [ ] Verify focus moves to first error
- [ ] Correct errors and resubmit
- [ ] Verify success

### 404 Pages
- [ ] Navigate to `/nonexistent-page`
- [ ] Verify custom 404 page appears
- [ ] Click "Return to Dashboard" → verify works

### 500 Errors
- [ ] Trigger server error (if test endpoint exists)
- [ ] Verify error boundary catches error
- [ ] Verify user sees friendly error page
- [ ] Verify error is logged to Sentry
- [ ] Click "Reload" → verify page recovers

---

## ✅ FINAL CHECKLIST

Before declaring the app production-ready:

- [ ] All automated tests passing
- [ ] All manual tests completed
- [ ] No console errors on any page
- [ ] Performance: Lighthouse score >90 in all categories
- [ ] Security: No critical vulnerabilities in npm audit
- [ ] Cross-browser testing: Chrome, Firefox, Safari, Edge
- [ ] Mobile testing: iOS Safari, Android Chrome
- [ ] Data validation: Sample company tested all features
- [ ] Backup/restore: Database backup successful
- [ ] Monitoring: Sentry capturing errors
- [ ] Documentation: User guide and admin guide completed
- [ ] Support: Help/contact page functional

---

## 📝 TESTING NOTES

**Testers:** Record issues, bugs, and feedback below or in issue tracker.

| Date | Tester | Feature | Issue | Severity | Status |
|------|--------|---------|-------|----------|--------|
|      |        |         |       |          |        |

**Legend:**
- Severity: Critical / High / Medium / Low
- Status: Open / In Progress / Fixed / Won't Fix
