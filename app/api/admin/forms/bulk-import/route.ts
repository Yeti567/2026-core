/**
 * Admin Forms Bulk Import API Route
 * 
 * POST: Import forms from JSON configurations
 * 
 * This endpoint allows administrators to bulk import form templates,
 * sections, fields, and workflows from JSON configuration objects.
 */

import { NextResponse } from 'next/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import { 
  bulkImportForms, 
  bulkImportFormsIfNotExists,
  type FormConfig, 
  type ImportResult 
} from '@/lib/form-builder/import-forms';

export const dynamic = 'force-dynamic';

interface BulkImportRequest {
  /** Array of form configurations to import */
  configs: FormConfig[];
  /** Company ID to import forms for. If null, creates global templates */
  companyId?: string | null;
  /** If true, skip forms that already exist (default: true) */
  skipExisting?: boolean;
}

interface BulkImportResponse extends ImportResult {
  message: string;
}

/**
 * POST /api/admin/forms/bulk-import
 * 
 * Bulk imports form templates from JSON configurations.
 * 
 * Request body:
 * {
 *   configs: FormConfig[], // Array of form configurations
 *   companyId?: string | null, // Target company (null for global)
 *   skipExisting?: boolean // Skip forms that already exist (default: true)
 * }
 * 
 * Response:
 * {
 *   message: string,
 *   total: number,
 *   successful: number,
 *   failed: number,
 *   errors: Array<{ form: string; error: string }>,
 *   imported_ids: string[]
 * }
 */
export async function POST(request: Request) {
  try {
    // Verify user is admin
    const user = await requireAuthWithRole(['admin', 'super_admin']);

    // Parse request body
    const body: BulkImportRequest = await request.json();
    const { configs, companyId, skipExisting = true } = body;

    // Validate request
    if (!configs || !Array.isArray(configs)) {
      return NextResponse.json(
        { error: 'Invalid request: configs must be an array' },
        { status: 400 }
      );
    }

    if (configs.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: at least one form configuration is required' },
        { status: 400 }
      );
    }

    if (configs.length > 50) {
      return NextResponse.json(
        { error: 'Invalid request: maximum 50 forms per import' },
        { status: 400 }
      );
    }

    // Determine target company ID
    // If companyId is explicitly null, create global templates
    // If companyId is undefined, use the authenticated user's company
    // If companyId is provided, verify the user has access (super_admin only)
    let targetCompanyId: string | null;

    if (companyId === null) {
      // Global templates - only super_admin can create
      if (user.role !== 'super_admin') {
        return NextResponse.json(
          { error: 'Forbidden: Only super admins can create global templates' },
          { status: 403 }
        );
      }
      targetCompanyId = null;
    } else if (companyId === undefined) {
      // Use authenticated user's company
      targetCompanyId = user.companyId;
    } else {
      // Specific company ID provided
      // Only super_admin can import for other companies
      if (companyId !== user.companyId && user.role !== 'super_admin') {
        return NextResponse.json(
          { error: 'Forbidden: Cannot import forms for other companies' },
          { status: 403 }
        );
      }
      targetCompanyId = companyId;
    }

    // Perform the import
    console.log(`📦 Starting bulk import of ${configs.length} forms...`);
    console.log(`   Target: ${targetCompanyId ? `Company ${targetCompanyId}` : 'Global templates'}`);
    console.log(`   Skip existing: ${skipExisting}`);

    const result: ImportResult = skipExisting
      ? await bulkImportFormsIfNotExists(configs, targetCompanyId, true)
      : await bulkImportForms(configs, targetCompanyId);

    // Build response message
    let message: string;
    if (result.failed === 0) {
      message = `Successfully imported ${result.successful} form(s)`;
    } else if (result.successful === 0) {
      message = `Failed to import all ${result.total} form(s)`;
    } else {
      message = `Imported ${result.successful} of ${result.total} form(s), ${result.failed} failed`;
    }

    console.log(`📊 Import complete: ${message}`);

    const response: BulkImportResponse = {
      message,
      ...result,
    };

    // Return appropriate status code
    const statusCode = result.failed === result.total ? 500 : 200;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    // Handle auth errors
    const authError = error as AuthError;
    if (authError.status) {
      return NextResponse.json(
        { error: authError.message },
        { status: authError.status }
      );
    }

    // Handle other errors
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { error: 'Internal server error during import' },
      { status: 500 }
    );
  }
}
