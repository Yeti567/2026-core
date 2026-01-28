/**
 * AuditSoft Settings API
 * 
 * PATCH: Update sync settings
 */

import { NextResponse } from 'next/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import { updateSyncSettings, getSafeConnectionInfo } from '@/lib/integrations/auditsoft';

export const dynamic = 'force-dynamic';


export async function PATCH(req: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'super_admin']);

    const body = await req.json();
    const { sync_enabled, sync_frequency } = body;

    // Validate sync_frequency if provided
    if (sync_frequency && !['realtime', 'daily', 'manual'].includes(sync_frequency)) {
      return NextResponse.json(
        { error: 'Invalid sync frequency. Must be: realtime, daily, or manual' },
        { status: 400 }
      );
    }

    const settings: {
      sync_enabled?: boolean;
      sync_frequency?: 'realtime' | 'daily' | 'manual';
    } = {};

    if (typeof sync_enabled === 'boolean') {
      settings.sync_enabled = sync_enabled;
    }

    if (sync_frequency) {
      settings.sync_frequency = sync_frequency;
    }

    if (Object.keys(settings).length === 0) {
      return NextResponse.json(
        { error: 'No settings to update' },
        { status: 400 }
      );
    }

    const connection = await updateSyncSettings(user.companyId, settings);

    return NextResponse.json({
      success: true,
      connection: getSafeConnectionInfo(connection),
    });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
