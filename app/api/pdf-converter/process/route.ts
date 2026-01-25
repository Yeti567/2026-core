/**
 * PDF Processing API Route
 * 
 * Handles OCR extraction and AI analysis of uploaded PDFs.
 * POST: Process a PDF upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { extractTextFromPDF, analyzePDFContent } from '@/lib/pdf-converter/ocr-service';
import { suggestCORElements } from '@/lib/pdf-converter/cor-mapper';
import type { DetectedField } from '@/lib/pdf-converter/types';
import { rateLimitByUser, createRateLimitResponse } from '@/lib/utils/rate-limit';
import { handleFileError, handleApiError } from '@/lib/utils/error-handling';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limiting: 5 PDF processing requests per hour per user (expensive OCR/AI operation)
    const rateLimitResult = await rateLimitByUser(user.id, 5, '1h');
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }
    
    // Get request body
    const body = await request.json();
    const { upload_id } = body;
    
    if (!upload_id) {
      return NextResponse.json({ error: 'upload_id is required' }, { status: 400 });
    }
    
    // Get PDF upload record
    const { data: pdfUpload, error: uploadError } = await supabase
      .from('pdf_form_uploads')
      .select('*')
      .eq('id', upload_id)
      .single();
    
    if (uploadError || !pdfUpload) {
      return NextResponse.json({ error: 'PDF upload not found' }, { status: 404 });
    }
    
    // Check if already processed
    if (pdfUpload.status !== 'pending' && pdfUpload.status !== 'failed') {
      return NextResponse.json({ error: 'PDF already processed' }, { status: 400 });
    }
    
    // Update status to processing
    await supabase
      .from('pdf_form_uploads')
      .update({ 
        status: 'processing',
        processing_attempts: pdfUpload.processing_attempts + 1,
      })
      .eq('id', upload_id);
    
    try {
      // Download PDF from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(pdfUpload.storage_path);
      
      if (downloadError || !fileData) {
        throw new Error('Failed to download PDF from storage');
      }
      
      // Convert blob to buffer
      const arrayBuffer = await fileData.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);
      
      // Extract text from PDF
      const { text: ocrText, pageCount, info } = await extractTextFromPDF(pdfBuffer);
      
      // Analyze PDF content
      const { analysis, detectedFields } = await analyzePDFContent(
        ocrText,
        pageCount,
        pdfUpload.file_name
      );
      
      // Get COR element suggestions
      const corSuggestions = suggestCORElements(
        analysis,
        detectedFields as DetectedField[],
        ocrText
      );
      
      // Update COR element if suggestions exist
      if (corSuggestions.length > 0 && corSuggestions[0].confidence >= 50) {
        analysis.suggested_cor_element = corSuggestions[0].element_number;
      }
      
      // Calculate OCR confidence based on text quality
      const ocrConfidence = calculateOCRConfidence(ocrText, pageCount);
      
      // Update PDF upload with analysis results
      await supabase
        .from('pdf_form_uploads')
        .update({
          status: 'analyzed',
          ocr_text: ocrText,
          ocr_confidence: ocrConfidence,
          page_count: pageCount,
          ai_analysis: analysis,
          processed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', upload_id);
      
      // Insert detected fields
      if (detectedFields.length > 0) {
        const fieldsToInsert = detectedFields.map((field, index) => ({
          pdf_upload_id: upload_id,
          field_code: field.field_code || `field_${index}`,
          detected_label: field.detected_label,
          suggested_type: field.suggested_type,
          type_confidence: field.type_confidence,
          page_number: field.page_number,
          bbox_x: field.bbox_x,
          bbox_y: field.bbox_y,
          bbox_width: field.bbox_width,
          bbox_height: field.bbox_height,
          suggested_options: field.suggested_options,
          suggested_validation: field.suggested_validation,
          suggested_help_text: field.suggested_help_text,
          section_label: field.section_label,
          section_order: field.section_order,
          field_order: field.field_order,
          is_confirmed: false,
          is_excluded: false,
        }));
        
        const { error: fieldsError } = await supabase
          .from('pdf_detected_fields')
          .insert(fieldsToInsert);
        
        if (fieldsError) {
          console.error('Error inserting detected fields:', fieldsError);
        }
      }
      
      // Update conversion session
      const { data: session } = await supabase
        .from('pdf_conversion_sessions')
        .select('*')
        .eq('pdf_upload_id', upload_id)
        .single();
      
      if (session) {
        await supabase
          .from('pdf_conversion_sessions')
          .update({
            current_step: 'review_ocr',
            form_name: analysis.form_title,
            form_description: analysis.form_description,
            cor_element: analysis.suggested_cor_element,
            sections_config: analysis.detected_sections,
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', session.id);
      }
      
      // Fetch the inserted fields
      const { data: insertedFields } = await supabase
        .from('pdf_detected_fields')
        .select('*')
        .eq('pdf_upload_id', upload_id)
        .order('section_order', { ascending: true })
        .order('field_order', { ascending: true });
      
      return NextResponse.json({
        success: true,
        analysis,
        detected_fields: insertedFields || [],
        cor_suggestions: corSuggestions,
        ocr_confidence: ocrConfidence,
        page_count: pageCount,
      });
      
    } catch (processingError) {
      // Update status to failed
      await supabase
        .from('pdf_form_uploads')
        .update({
          status: 'failed',
          error_message: processingError instanceof Error 
            ? 'Processing failed' 
            : 'Unknown processing error',
        })
        .eq('id', upload_id);
      
      throw processingError;
    }
    
  } catch (error) {
    return handleApiError(error, 'Failed to process PDF');
  }
}

/**
 * Calculate OCR confidence based on text quality indicators
 */
function calculateOCRConfidence(text: string, pageCount: number): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }
  
  let confidence = 50; // Base confidence
  
  // Check text density (chars per page)
  const charsPerPage = text.length / pageCount;
  if (charsPerPage > 500) confidence += 15;
  if (charsPerPage > 1000) confidence += 10;
  
  // Check for common OCR artifacts (low quality indicators)
  const ocrArtifacts = (text.match(/[^\x00-\x7F]/g) || []).length;
  const artifactRatio = ocrArtifacts / text.length;
  if (artifactRatio < 0.01) confidence += 10;
  if (artifactRatio < 0.001) confidence += 5;
  
  // Check for readable words
  const words = text.split(/\s+/).filter(w => /^[a-zA-Z]{3,}$/.test(w));
  const wordRatio = words.length / (text.split(/\s+/).length || 1);
  if (wordRatio > 0.5) confidence += 10;
  
  return Math.min(Math.round(confidence), 95);
}
