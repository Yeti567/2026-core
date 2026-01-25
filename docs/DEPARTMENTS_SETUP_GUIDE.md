# Departments & Organization Structure Setup Guide

## Overview
Complete department management system for organizing your company into divisions, departments, crews, and teams. Supports hierarchy, worker assignments, equipment assignments, and org chart visualization.

## Quick Start

### Step 1: Run Database Migration
```bash
# Apply the migration to add departments table
supabase migration up
# Or manually run: supabase/migrations/030_departments_system.sql
```

### Step 2: Access Departments Page
Navigate to: `http://localhost:3000/admin/departments`

### Step 3: Create Departments

#### Option A: Use the UI
1. Click "Add Department"
2. Fill out the form for each department
3. Save

#### Option B: Use Browser Console Script
While logged in as admin, open browser console (F12) and run:
```javascript
setupDepartments()
```

This will create all 6 departments automatically.

## Department Structure for Maple Ridge Concrete Ltd.

### 1. Foundations Division
- **Code**: FND
- **Type**: Division
- **Superintendent**: Carlos Mendez (cmendez@mapleridgeconcrete.ca)
- **Workers**: 10 employees
- **Equipment**: 2 excavators, 1 skid steer
- **Description**: Specializes in foundation work including excavation, formwork, and concrete placement

### 2. Flatwork Division
- **Code**: FLT
- **Type**: Division
- **Superintendent**: TBD (hiring in progress)
- **Workers**: 8 employees
- **Equipment**: 1 power screed, 2 plate compactors
- **Description**: Handles flatwork projects including driveways, sidewalks, and patios

### 3. Structural Division
- **Code**: STR
- **Type**: Division
- **Superintendent**: TBD
- **Workers**: 7 employees
- **Equipment**: 1 concrete pump truck
- **Description**: Focuses on structural concrete work including beams, columns, and slabs

### 4. Decorative Finishes
- **Code**: DEC
- **Type**: Crew
- **Lead**: TBD
- **Workers**: 3 employees
- **Equipment**: Specialized tools
- **Description**: Specialized decorative concrete finishes and architectural elements

### 5. Equipment & Fleet Management
- **Code**: EQP
- **Type**: Department
- **Manager**: Patricia Williams (pwilliams@mapleridgeconcrete.ca)
- **Workers**: 2 mechanics, 1 parts clerk
- **Description**: Manages all company equipment, vehicles, and maintenance

### 6. Administration
- **Code**: ADM
- **Type**: Department
- **Manager**: Amanda Foster (afoster@mapleridgeconcrete.ca)
- **Staff**: 1 admin assistant
- **Description**: Administrative support, HR, training records, and document control

## Features

### Department Management
- ✅ Create/edit/delete departments
- ✅ Set parent departments (hierarchy)
- ✅ Assign superintendents and managers
- ✅ Set department type (division, department, crew, team, section)
- ✅ Color coding for visualization
- ✅ Display order control

### Worker Assignment
- ✅ Assign workers to departments
- ✅ View workers by department
- ✅ Worker count per department
- ✅ Bulk assignment support

### Equipment Assignment
- ✅ Assign equipment to departments
- ✅ View equipment by department
- ✅ Equipment count per department
- ✅ Track equipment location by department

### Organization Chart
- ✅ Visual org chart display
- ✅ Hierarchical structure visualization
- ✅ Color-coded departments
- ✅ Shows leadership and stats

## API Endpoints

### GET `/api/admin/departments`
- Returns all departments with stats
- Includes hierarchy and leadership info

### POST `/api/admin/departments`
- Creates a new department
- Requires: name, department_type
- Optional: code, description, parent_department_id, superintendent_id, manager_id

### PATCH `/api/admin/departments`
- Updates a department
- Requires: id

### DELETE `/api/admin/departments?id={id}`
- Soft deletes (deactivates) a department

### GET `/api/admin/departments/[id]/workers`
- Returns all workers in a department

### POST `/api/admin/departments/[id]/workers`
- Assigns workers to a department
- Body: `{ worker_ids: string[] }`

### GET `/api/admin/departments/[id]/equipment`
- Returns all equipment in a department

### POST `/api/admin/departments/[id]/equipment`
- Assigns equipment to a department
- Body: `{ equipment_ids: string[] }`

## Assigning Workers to Departments

### Method 1: Via Department Details
1. Click on a department card to expand
2. Click "Assign Workers"
3. Select workers from the list
4. Click "Assign"

### Method 2: Via Worker Profile
1. Go to worker's profile
2. Edit department assignment
3. Select department from dropdown

## Assigning Equipment to Departments

### Method 1: Via Department Details
1. Click on a department card to expand
2. Click "Assign Equipment"
3. Select equipment from the list
4. Click "Assign"

### Method 2: Via Equipment Management
1. Go to equipment inventory
2. Edit equipment
3. Select department from dropdown

## Organization Chart View

1. Click "View Org Chart" button
2. See hierarchical structure
3. Departments are color-coded
4. Shows worker and equipment counts
5. Displays leadership (superintendents/managers)

## Database Schema

### departments table
- `id` - UUID primary key
- `company_id` - Foreign key to companies
- `name` - Department name (required)
- `code` - Short code (optional)
- `description` - Description (optional)
- `parent_department_id` - For hierarchy (optional)
- `superintendent_id` - Foreign key to workers (optional)
- `manager_id` - Foreign key to workers (optional)
- `department_type` - division/department/crew/team/section
- `display_order` - For sorting
- `color_code` - Hex color for visualization
- `is_active` - Soft delete flag

### workers table (updated)
- `department_id` - Foreign key to departments (added)

### equipment_inventory table (updated)
- `department_id` - Foreign key to departments (added)

## Testing Checklist

- ✅ Department creation works
- ✅ Superintendents can be assigned
- ✅ Managers can be assigned
- ✅ Department hierarchy displays correctly
- ✅ Workers can be grouped by department
- ✅ Equipment can be linked to departments
- ✅ Org chart visualization works
- ✅ Department stats calculate correctly
- ✅ Parent-child relationships work
- ✅ Edit/delete functionality works

## Files Created/Modified

### New Files:
- `supabase/migrations/030_departments_system.sql` - Database migration
- `app/api/admin/departments/route.ts` - Department CRUD API
- `app/api/admin/departments/[id]/workers/route.ts` - Worker assignment API
- `app/api/admin/departments/[id]/equipment/route.ts` - Equipment assignment API
- `app/api/admin/equipment/route.ts` - Equipment listing API
- `app/(protected)/admin/departments/page.tsx` - Departments page
- `components/admin/departments-manager.tsx` - Main manager component
- `components/admin/department-form.tsx` - Department form
- `components/admin/org-chart.tsx` - Org chart visualization
- `components/admin/assign-workers-to-department.tsx` - Worker assignment component
- `components/admin/assign-equipment-to-department.tsx` - Equipment assignment component
- `scripts/setup-departments.ts` - Setup script

### Modified Files:
- `components/admin/index.ts` - Added exports

## Next Steps

1. ✅ Run database migration
2. ✅ Create departments (use UI or script)
3. ✅ Assign superintendents and managers
4. ✅ Assign workers to departments
5. ✅ Assign equipment to departments
6. ✅ View org chart
7. ✅ Verify hierarchy displays correctly

## Notes

- Departments support unlimited hierarchy levels
- Workers and equipment can be reassigned between departments
- Department deletion is soft (is_active = false)
- Stats (worker count, equipment count) are calculated dynamically
- Org chart automatically builds hierarchy from parent relationships
- Color codes help visualize department relationships
