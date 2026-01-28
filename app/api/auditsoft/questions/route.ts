/**
 * AuditSoft Questions API
 * 
 * Retrieves audit questions/requirements from AuditSoft for mapping.
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthWithRole, type AuthError } from '@/lib/auth/helpers';
import { createAuditSoftClient, decryptApiKey } from '@/lib/auditsoft';

export const dynamic = 'force-dynamic';


export async function GET(request: Request) {
  try {
    const user = await requireAuthWithRole(['admin', 'internal_auditor', 'super_admin']);
    const supabase = createRouteHandlerClient();

    const url = new URL(request.url);
    const element = url.searchParams.get('element');

    // Get credentials
    const { data: credentials } = await supabase
      .from('auditsoft_credentials')
      .select('*')
      .eq('company_id', user.companyId)
      .single();

    if (!credentials?.is_valid) {
      return NextResponse.json(
        { error: 'Not connected to AuditSoft' },
        { status: 400 }
      );
    }

    // Create client and fetch questions
    const apiKey = decryptApiKey(credentials.api_key_encrypted);
    const client = createAuditSoftClient(apiKey, credentials.environment);
    const questions = await client.getAuditQuestions();

    // Filter by element if specified
    const filteredQuestions = element
      ? questions.filter(q => q.element === parseInt(element))
      : questions;

    return NextResponse.json({ questions: filteredQuestions });
  } catch (error) {
    const authError = error as AuthError;
    return NextResponse.json(
      { error: authError.message },
      { status: authError.status || 500 }
    );
  }
}
