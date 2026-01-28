/**
 * Maintenance Receipts API
 * GET - List receipts
 * POST - Create receipt
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createReceipt,
  listReceipts,
  approveReceipt,
  type CreateReceiptInput,
} from '@/lib/maintenance';
import { handleApiError } from '@/lib/utils/error-handling';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    const { searchParams } = new URL(request.url);
    const equipmentId = searchParams.get('equipment_id') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const { receipts, total } = await listReceipts(
      profile.company_id,
      equipmentId,
      limit,
      offset
    );
    
    return NextResponse.json({ receipts, total, limit, offset });
  } catch (error) {
    return handleApiError(error, 'Failed to list receipts');
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    const body = await request.json();
    
    if (!body.source) {
      return NextResponse.json({ error: 'source is required' }, { status: 400 });
    }
    
    const input: CreateReceiptInput = {
      equipment_id: body.equipment_id,
      maintenance_record_id: body.maintenance_record_id,
      work_order_id: body.work_order_id,
      source: body.source,
      receipt_number: body.receipt_number,
      receipt_date: body.receipt_date,
      vendor_name: body.vendor_name,
      total_amount: body.total_amount,
      tax_amount: body.tax_amount,
      line_items: body.line_items,
      expense_category: body.expense_category,
      notes: body.notes,
    };
    
    const receipt = await createReceipt(profile.company_id, input, profile.id);
    
    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create receipt');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Only admin/supervisor can approve
    if (!['super_admin', 'admin', 'supervisor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await request.json();
    
    if (body.approve && body.receipt_id) {
      const receipt = await approveReceipt(body.receipt_id, profile.id);
      return NextResponse.json(receipt);
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    return handleApiError(error, 'Failed to approve receipt');
  }
}
