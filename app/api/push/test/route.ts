/**
 * Test Push Notification API
 * 
 * POST: Send a test notification to verify push is working
 * Requires authentication - users can only send test notifications to themselves
 */

import { NextRequest, NextResponse } from 'next/server';
import { createNeonWrapper } from '@/lib/db/neon-wrapper';
import { sendTestNotification } from '@/lib/push-notifications/triggers';
import { testPushSchema } from '@/lib/validation/schemas';
import { safeValidateRequestBody, isValidationErrorResponse } from '@/lib/validation/utils';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const supabase = createNeonWrapper();
    // TODO: Implement user authentication without Supabase
      const authResult: { data: { user: { id: string } | null }; error: Error | null } = { data: { user: null }, error: new Error('Auth not implemented') };
      const { data: { user }, error: authError } = authResult;
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Validate request body with Zod schema
    const validation = await safeValidateRequestBody(req, testPushSchema);
    if (!validation.success) {
      return validation.response;
    }
    
    const { userId } = validation.data;
    
    // Users can only send test notifications to themselves
    // Prevent unauthorized users from sending notifications to other users
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'You can only send test notifications to yourself' },
        { status: 403 }
      );
    }
    
    const result = await sendTestNotification(userId);
    
    console.log('[Push Test] Result:', result);
    
    return NextResponse.json({ 
      success: true, 
      result 
    });
    
  } catch (error) {
    // Handle validation errors
    if (isValidationErrorResponse(error)) {
      return error;
    }
    
    console.error('[Push Test] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}
