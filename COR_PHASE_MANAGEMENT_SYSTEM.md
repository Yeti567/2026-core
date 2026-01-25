# COR Phase Management System

## Overview

A comprehensive phase management system for tracking company progress through the 12-phase COR (Certificate of Recognition) certification process. This system provides structured guidance, progress tracking, and completion management for each phase and prompt.

## System Architecture

### Database Schema

#### Tables Created

1. **cor_phases** - Stores the 12 main phases
   - Phase identification (number, title, description)
   - Estimated duration
   - Display ordering

2. **cor_prompts** - Stores individual prompts/tasks within phases
   - Links to parent phase
   - Prompt metadata (type, required status, estimated time)
   - Related resources (forms, documents, certifications)

3. **company_phase_progress** - Tracks company progress through phases
   - Status tracking (not_started, in_progress, completed, blocked)
   - Completion metadata (who, when, notes)

4. **company_prompt_progress** - Tracks completion of individual prompts
   - Status tracking
   - Completion data and notes
   - Links to related resources (forms, documents, certifications)

#### Database Functions

- `get_company_progress_percentage(company_id)` - Calculates overall completion percentage
- `get_phase_completion_percentage(company_id, phase_id)` - Calculates phase completion percentage
- `complete_phase(company_id, phase_id, completed_by, notes)` - Marks phase as completed (validates all prompts)
- `update_prompt_progress(...)` - Updates prompt status and completion data

### API Routes

1. **GET /api/phases** - Get all phases with company progress
2. **GET /api/phases/[phaseId]** - Get detailed phase information
3. **PATCH /api/phases/[phaseId]** - Update phase progress (admin only)
4. **PATCH /api/phases/[phaseId]/prompts/[promptId]** - Update prompt progress

### UI Components

1. **PhasesDashboard** (`components/phases/phases-dashboard.tsx`)
   - Overview of all 12 phases
   - Overall progress tracking
   - Phase status indicators
   - Links to detailed phase views

2. **PhaseDetail** (`components/phases/phase-detail.tsx`)
   - Detailed phase view with all prompts
   - Individual prompt status management
   - Completion tracking
   - Phase completion button

3. **PhasesWidget** (`components/dashboard/phases-widget.tsx`)
   - Dashboard widget showing overall progress
   - Quick access to phases page

### Pages

1. **/phases** - Main phases dashboard page
2. **/phases/[phaseId]** - Individual phase detail page

## The 12 Phases

### Phase 1: Company Onboarding (Prompts 1-3)
- Company Registration
- Admin Account Setup
- Company Profile Completion

### Phase 2: Team Setup & Roles (Prompts 4-6)
- Create User Roles
- Invite Team Members
- Verify Team Access

### Phase 3: Safety Program Setup (Prompts 7-10)
- Safety Policy Creation
- Hazard Identification Setup
- Incident Reporting Procedures
- Emergency Response Plan

### Phase 4: Daily Operations (Prompts 11-15)
- Daily Safety Meetings
- Pre-Shift Inspections
- Toolbox Talks
- Work Permits System
- Daily Reporting

### Phase 5: Document Management (Prompts 16-18)
- Document Control System
- Upload Safety Documents
- Document Distribution

### Phase 6: Worker Certifications (Prompts 19-21)
- Certification Types Setup
- Upload Worker Certifications
- Certification Expiry Alerts

### Phase 7: Equipment & Maintenance (Prompts 22-24)
- Equipment Inventory
- Maintenance Schedules
- Inspection Records

### Phase 8: Forms & Inspections (Prompts 25-30)
- Safety Inspection Forms
- Hazard Assessment Forms
- Incident Report Forms
- Near Miss Forms
- Corrective Action Forms
- Form Workflow Testing

### Phase 9: Incident Management (Prompts 31-33)
- Incident Reporting Procedures
- Investigation Process
- Root Cause Analysis

### Phase 10: Audit Preparation (Prompts 34-38)
- Audit Checklist Review
- Evidence Collection
- Documentation Review
- Gap Analysis
- Pre-Audit Action Plan

### Phase 11: Mock Audit (Prompts 39-41)
- Mock Audit Planning
- Mock Audit Execution
- Mock Audit Review

### Phase 12: Certification & Reporting (Prompts 42-45)
- Final Audit Preparation
- Certification Audit
- Reporting Setup
- Continuous Improvement

## Features

### Progress Tracking
- Real-time progress calculation
- Visual progress indicators
- Completion percentage tracking
- Status management (not_started, in_progress, completed, blocked)

### Phase Management
- Phase-level completion validation
- Automatic phase status updates based on prompt completion
- Phase completion requires all required prompts to be completed

### Prompt Management
- Individual prompt status tracking
- Support for different prompt types (task, form, upload, review, approval)
- Optional vs required prompts
- Completion notes and metadata
- Links to related resources

### Security
- Row Level Security (RLS) policies ensure users only see their company's data
- Admin-only phase completion
- All users can update their own prompt progress

## Usage

### For Administrators

1. Navigate to `/phases` to see all phases
2. Click on a phase to view detailed prompts
3. Mark prompts as complete as work is done
4. Complete phases when all required prompts are done

### For Workers

1. View phase progress on dashboard
2. Access assigned prompts
3. Update prompt status as work progresses
4. Add completion notes and link related resources

## Integration Points

- **Dashboard**: Phases widget shows overall progress
- **Onboarding**: Can be integrated into company onboarding flow
- **Forms**: Prompts can link to form submissions
- **Documents**: Prompts can link to uploaded documents
- **Certifications**: Prompts can link to worker certifications

## Database Migration

Run the migration to set up the schema:
```sql
-- Migration file: supabase/migrations/026_cor_phase_management.sql
```

## Seed Data

Populate phases and prompts:
```sql
-- Seed file: supabase/seeds/007_cor_phases_and_prompts.sql
```

## Next Steps

1. Run database migrations
2. Seed phase and prompt data
3. Test phase tracking functionality
4. Customize prompts based on specific company needs
5. Integrate with existing forms, documents, and certification systems

## Future Enhancements

- Email notifications for phase/prompt completions
- Phase dependencies (e.g., Phase 2 requires Phase 1)
- Custom prompt templates per company
- Phase timeline visualization
- Export progress reports
- Integration with audit dashboard
