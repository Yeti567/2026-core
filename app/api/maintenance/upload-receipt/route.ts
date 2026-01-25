/**
 * Receipt Upload API
 * POST - Upload receipt/document with optional maintenance record creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  validateFileUpload,
  createSecureStoragePath,
  sanitizeFilename,
} from '@/lib/utils/file-upload-validation';
import { handleApiError, handleFileError } from '@/lib/utils/error-handling';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const equipmentId = formData.get('equipment_id') as string;
    const attachmentType = formData.get('attachment_type') as string || 'receipt';
    const createMaintenanceRecord = formData.get('create_maintenance_record') === 'true';
    const maintenanceRecordId = formData.get('maintenance_record_id') as string;
    const description = formData.get('description') as string;
    const vendorName = formData.get('vendor_name') as string;
    const amount = formData.get('amount') as string;
    const attachmentDate = formData.get('attachment_date') as string;
    const tagsStr = formData.get('tags') as string;
    const uploadedVia = (formData.get('uploaded_via') as string) || 'web';
    
    // Validate required fields
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }
    if (!equipmentId) {
      return NextResponse.json({ error: 'equipment_id is required' }, { status: 400 });
    }
    
    // Verify equipment belongs to company
    const { data: equipment } = await supabase
      .from('equipment_inventory')
      .select('id, equipment_number, name')
      .eq('id', equipmentId)
      .eq('company_id', profile.company_id)
      .single();
    
    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }
    
    // Validate file upload (type, size, content validation)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const validation = await validateFileUpload(file, allowedTypes);
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // Generate secure file path using UUID-based filename
    const secureFilename = validation.filename!;
    const filePath = createSecureStoragePath(
      profile.company_id,
      `maintenance/${equipmentId}`,
      secureFilename
    );
    
    // Store original filename for display (sanitized)
    const originalFilename = sanitizeFilename(file.name);
    
    // Get file buffer for upload
    const buffer = await file.arrayBuffer();
    
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }
    
    // Generate thumbnail for images
    let thumbnailPath: string | null = null;
    // Note: In production, you'd generate thumbnail here or via edge function
    
    // Parse tags
    let tags: string[] = [];
    if (tagsStr) {
      try {
        tags = JSON.parse(tagsStr);
      } catch {
        tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
      }
    }
    
    // Create attachment record
    const { data: attachment, error: attachmentError } = await supabase
      .from('maintenance_attachments')
      .insert({
        equipment_id: equipmentId,
        company_id: profile.company_id,
        maintenance_record_id: maintenanceRecordId || null,
        attachment_type: attachmentType,
        file_name: originalFilename, // Store sanitized original name for display
        file_path: filePath,
        file_size_bytes: file.size,
        file_type: file.type,
        thumbnail_path: thumbnailPath,
        description: description || null,
        attachment_date: attachmentDate || null,
        vendor_name: vendorName || null,
        amount: amount ? parseFloat(amount) : null,
        tags: tags,
        uploaded_by: profile.id,
        uploaded_via: uploadedVia
      })
      .select()
      .single();
    
    if (attachmentError) {
      console.error('Attachment record error:', attachmentError);
      // Try to clean up uploaded file
      await supabase.storage.from('attachments').remove([filePath]);
      return NextResponse.json(
        { error: 'Failed to create attachment record' },
        { status: 500 }
      );
    }
    
    // If creating maintenance record
    let maintenanceRecord = null;
    if (createMaintenanceRecord) {
      const maintenanceDataStr = formData.get('maintenance_data') as string;
      
      if (maintenanceDataStr) {
        try {
          const maintenanceData = JSON.parse(maintenanceDataStr);
          
          // Create maintenance record
          const { data: record, error: recordError } = await supabase
            .from('maintenance_records')
            .insert({
              equipment_id: equipmentId,
              company_id: profile.company_id,
              maintenance_type: maintenanceData.maintenance_type || 'corrective',
              maintenance_category: maintenanceData.maintenance_category || 'general',
              actual_date: maintenanceData.actual_date || new Date().toISOString().split('T')[0],
              work_description: maintenanceData.work_description || description || 'Maintenance performed',
              vendor_name: maintenanceData.vendor_name || vendorName || null,
              technician_name: maintenanceData.technician_name || null,
              cost_labour: maintenanceData.cost_labour || 0,
              cost_parts: maintenanceData.cost_parts || 0,
              odometer_hours: maintenanceData.odometer_hours || null,
              condition_after_service: maintenanceData.condition_after_service || 'good',
              status: 'completed',
              notes: maintenanceData.notes || null,
              created_by: profile.id
            })
            .select()
            .single();
          
          if (recordError) {
            console.error('Maintenance record error:', recordError);
          } else {
            maintenanceRecord = record;
            
            // Link attachment to maintenance record
            await supabase
              .from('maintenance_attachments')
              .update({ maintenance_record_id: record.id })
              .eq('id', attachment.id);
            
            attachment.maintenance_record_id = record.id;
          }
        } catch (err) {
          console.error('Failed to parse maintenance data:', err);
        }
      }
    }
    
    // Get signed URL for immediate display
    const { data: urlData } = await supabase.storage
      .from('attachments')
      .createSignedUrl(filePath, 3600);
    
    return NextResponse.json({
      success: true,
      attachment: {
        ...attachment,
        url: urlData?.signedUrl
      },
      maintenance_record: maintenanceRecord,
      equipment: {
        id: equipment.id,
        equipment_number: equipment.equipment_number,
        name: equipment.name
      }
    }, { status: 201 });
  } catch (error) {
    return handleFileError(error, 'upload receipt');
  }
}

/**
 * GET - List attachments for equipment or maintenance record
 */
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
    const equipmentId = searchParams.get('equipment_id');
    const maintenanceRecordId = searchParams.get('maintenance_record_id');
    const attachmentType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    let query = supabase
      .from('maintenance_attachments')
      .select('*', { count: 'exact' })
      .eq('company_id', profile.company_id)
      .eq('is_archived', false)
      .order('uploaded_at', { ascending: false });
    
    if (equipmentId) {
      query = query.eq('equipment_id', equipmentId);
    }
    if (maintenanceRecordId) {
      query = query.eq('maintenance_record_id', maintenanceRecordId);
    }
    if (attachmentType) {
      query = query.eq('attachment_type', attachmentType);
    }
    
    const { data: attachments, count, error } = await query.range(offset, offset + limit - 1);
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Get signed URLs for all attachments
    const attachmentsWithUrls = await Promise.all(
      (attachments || []).map(async (attachment) => {
        const { data: urlData } = await supabase.storage
          .from('attachments')
          .createSignedUrl(attachment.file_path, 3600);
        
        let thumbnailUrl = null;
        if (attachment.thumbnail_path) {
          const { data: thumbData } = await supabase.storage
            .from('attachments')
            .createSignedUrl(attachment.thumbnail_path, 3600);
          thumbnailUrl = thumbData?.signedUrl;
        }
        
        return {
          ...attachment,
          url: urlData?.signedUrl,
          thumbnail_url: thumbnailUrl
        };
      })
    );
    
    return NextResponse.json({
      attachments: attachmentsWithUrls,
      total: count || 0,
      limit,
      offset
    });
  } catch (error) {
    return handleApiError(error, 'Failed to list attachments');
  }
}
