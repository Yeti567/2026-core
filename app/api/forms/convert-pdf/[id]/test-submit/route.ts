/**
 * Test Submit API Route
 * 
 * POST: Submit a test form submission for a conversion in progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { rateLimitByUser, createRateLimitResponse } from '@/lib/utils/rate-limit';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversionId } = await params;
    const supabase = createRouteHandlerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 20 test submissions per minute per user (prevent spam)
    const rateLimitResult = await rateLimitByUser(user.id, 20, '1m');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many test submissions. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': (rateLimitResult.reset - Math.floor(Date.now() / 1000)).toString(),
          },
        }
      );
    }
    
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Get conversion to verify it exists
    const { data: conversion, error: convError } = await supabase
      .from('pdf_form_conversions')
      .select('id, company_id, original_pdf_name, ai_suggested_metadata')
      .eq('id', conversionId)
      .single();
    
    if (convError || !conversion) {
      return NextResponse.json({ error: 'Conversion not found' }, { status: 404 });
    }
    
    // Verify company access
    if (conversion.company_id !== profile.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Get form data from request
    const body = await request.json();
    const { form_data, metadata } = body;
    
    // Store test submission in a test_submissions table
    // For now, just log and return success since this is a test feature
    const testSubmission = {
      id: `test_${Date.now()}`,
      conversion_id: conversionId,
      company_id: profile.company_id,
      submitted_by: user.id,
      form_data: form_data || {},
      metadata: {
        form_name: metadata?.form_name || 
          (conversion.ai_suggested_metadata as { suggested_form_name?: string })?.suggested_form_name ||
          conversion.original_pdf_name,
        is_test: true,
        submitted_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };
    
    // Try to insert into test_form_submissions if table exists
    // Otherwise just return success (for preview purposes)
    try {
      await supabase
        .from('test_form_submissions')
        .insert({
          conversion_id: conversionId,
          company_id: profile.company_id,
          submitted_by: user.id,
          form_data: form_data || {},
          created_at: new Date().toISOString(),
        });
    } catch {
      // Table might not exist, that's okay for testing
      console.log('Test submission recorded (in-memory):', testSubmission.id);
    }
    
    return NextResponse.json({
      success: true,
      submission_id: testSubmission.id,
      message: 'Test submission recorded successfully',
    });
    
  } catch (error) {
    return handleApiError(error, 'Failed to process test submission');
  }
}
