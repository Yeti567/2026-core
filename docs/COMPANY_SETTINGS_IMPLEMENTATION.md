# Company Settings Implementation

## Overview
Comprehensive company settings system has been implemented with all requested features:
- Company logo (placeholder generation)
- Business hours configuration
- Notification preferences
- Work locations management
- Fiscal year configuration
- COR audit timeline

## Database Migration

**File:** `supabase/migrations/028_company_settings.sql`

### New Tables Created:

1. **`company_settings`** - Stores company-wide settings
   - `logo_url` - Company logo URL
   - `business_hours` - JSONB object with daily hours
   - `notification_preferences` - JSONB object with notification settings
   - `fiscal_year_start_month` - Integer (1-12)
   - `target_certification_date` - Target date for COR certification
   - `audit_timeline_months` - Timeline in months

2. **`company_locations`** - Stores company work locations
   - `name` - Location name
   - `address`, `city`, `province`, `postal_code` - Address fields
   - `location_type` - 'office', 'shop', 'site', 'mobile'
   - `is_primary` - Boolean flag for primary location
   - `is_active` - Soft delete flag

### Security:
- Row Level Security (RLS) policies implemented
- Only admins can modify settings
- Users can view their company's settings

## API Endpoints

### 1. GET/PATCH `/api/admin/company/settings`
- **GET**: Retrieve company settings (creates default if none exist)
- **PATCH**: Update company settings
- **Auth**: Requires admin role

### 2. POST `/api/admin/company/settings/logo`
- Generates placeholder logo with blue/green mountains and "MRC" text
- Returns SVG data URL
- **Auth**: Requires admin role

### 3. GET/POST/PATCH/DELETE `/api/admin/company/locations`
- **GET**: List all active locations
- **POST**: Create new location
- **PATCH**: Update existing location
- **DELETE**: Soft delete location (sets is_active = false)
- **Auth**: Requires admin role

## UI Components

### Settings Page
**File:** `app/(protected)/admin/settings/page.tsx`

Uses the new `CompanySettingsForm` component which includes:

1. **Company Logo Section**
   - Display current logo or placeholder
   - Button to generate placeholder logo
   - Preview of logo

2. **Business Hours Section**
   - Toggle for each day of the week
   - Time pickers for open/close times
   - Default: Monday-Friday 6:30am-4:30pm

3. **Notification Preferences**
   - Toggle switches for:
     - Email for certification expiries
     - Email for incident reports
     - Push notifications for daily inspections
     - SMS for critical safety alerts

4. **Work Locations**
   - Add/Edit/Delete locations
   - Fields: name, address, city, province, postal code, type
   - Set primary location
   - Default locations can be added:
     - Ottawa Head Office (2500 Industrial Parkway)
     - Kanata Shop (1200 March Road)
     - Barrhaven Site Trailer (Mobile)

5. **Fiscal Year**
   - Dropdown to select start month
   - Default: April (month 4)
   - Shows fiscal year range

6. **COR Audit Timeline**
   - Date picker for target certification date
   - Number input for timeline in months
   - Default: 9 months (October 2026)
   - Auto-calculates target date from months

## Usage Instructions

### 1. Run Database Migration
```bash
# Apply the migration to your Supabase database
supabase migration up
# Or manually run: supabase/migrations/028_company_settings.sql
```

### 2. Access Settings Page
Navigate to: `http://localhost:3000/admin/settings`

### 3. Configure Settings

#### Logo:
1. Click "Generate Placeholder Logo" button
2. Logo will be generated with blue/green mountains and "MRC" text
3. Logo is saved automatically

#### Business Hours:
1. Toggle days on/off
2. Set open/close times for each enabled day
3. Default: Monday-Friday 6:30am-4:30pm

#### Notifications:
1. Toggle each notification preference on/off
2. Settings are saved when you click "Save All Settings"

#### Locations:
1. Click "+ Add Location"
2. Fill in location details:
   - Name (required)
   - Address, City, Province, Postal Code
   - Location Type (Office, Shop, Site, Mobile)
   - Check "Set as primary location" if needed
3. Click "Save" on each location
4. To delete, click "Delete" button

#### Fiscal Year:
1. Select start month from dropdown
2. Default: April (month 4)
3. Fiscal year range is displayed below

#### COR Audit Timeline:
1. Set target certification date OR
2. Enter number of months (default: 9)
3. Target date auto-calculates from months

### 4. Save All Settings
Click "Save All Settings" button at the bottom to persist all changes.

## Testing

Run the test script:
```bash
npx tsx scripts/test-settings.ts
```

Expected results:
- ✅ Server Status: Running
- ✅ Settings Page: Accessible
- ✅ Settings API: Requires authentication
- ✅ Logo API: Requires authentication
- ✅ Locations API: Requires authentication

## Default Configuration for Maple Ridge Concrete Ltd.

When configuring settings, use these values:

- **Business Hours**: Monday-Friday, 6:30am-4:30pm
- **Notifications**:
  - ✅ Email for certification expiries
  - ✅ Email for incident reports
  - ✅ Push notifications for daily inspections
  - ✅ SMS for critical safety alerts
- **Locations**:
  1. Ottawa Head Office - 2500 Industrial Parkway, Ottawa, ON (Primary)
  2. Kanata Shop - 1200 March Road, Kanata, ON
  3. Barrhaven Site Trailer - Mobile location
- **Fiscal Year**: April (Month 4)
- **COR Timeline**: 9 months (Target: October 2026)

## Files Created/Modified

### New Files:
- `supabase/migrations/028_company_settings.sql`
- `app/api/admin/company/settings/route.ts`
- `app/api/admin/company/settings/logo/route.ts`
- `app/api/admin/company/locations/route.ts`
- `components/admin/company-settings-form.tsx`
- `scripts/test-settings.ts`

### Modified Files:
- `app/(protected)/admin/settings/page.tsx`
- `components/admin/index.ts`

## Next Steps

1. ✅ Run database migration
2. ✅ Access settings page
3. ✅ Configure all settings
4. ✅ Verify settings are saved
5. ✅ Test logo generation
6. ✅ Add all three locations
7. ✅ Verify notification toggles work
8. ✅ Confirm fiscal year displays correctly
9. ✅ Verify timeline calculation

## Notes

- Logo generation creates a placeholder SVG. In production, you would upload actual logo files to Supabase Storage.
- Locations are soft-deleted (is_active = false) rather than hard-deleted for audit purposes.
- Business hours are stored as JSONB for flexibility.
- Notification preferences can be extended in the future.
- All settings are company-scoped and respect RLS policies.
