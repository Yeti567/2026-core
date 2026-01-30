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

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Check authentication using Supabase
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limiting: 5 PDF processing requests per hour per user (expensive OCR/AI operation)
    const rateLimitResult = await rateLimitByUser(authUser.id, 5, '1h');
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
    if (pdfUpload.processing_status === 'completed') {
      return NextResponse.json({ error: 'PDF already processed' }, { status: 400 });
    }
    
    // Update status to processing
    await supabase
      .from('pdf_form_uploads')
      .update({ 
        processing_status: 'processing',
        processing_attempts: (pdfUpload.processing_attempts || 0) + 1,
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
      
      // Convert to buffer for processing
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Extract text from PDF (OCR if needed)
      let extractedText = '';
      let pageCount = 1;
      let ocrConfidence = 85;
      
      try {
        const ocrResult = await extractTextFromPDF(buffer);
        extractedText = ocrResult.text || '';
        pageCount = ocrResult.pageCount || 1;
        ocrConfidence = calculateOCRConfidence(extractedText, pageCount);
      } catch (ocrError) {
        console.error('[PDF Process] OCR error:', ocrError);
        // Continue with empty text - user can manually add fields
        extractedText = '';
        ocrConfidence = 0;
      }
      
      // Analyze content to detect fields
      let detectedFields: DetectedField[] = [];
      let corSuggestions: { element_number: number; confidence: number; reasoning: string }[] = [];
      
      if (extractedText.length > 0) {
        try {
          const analysisResult = await analyzePDFContent(extractedText, pageCount, pdfUpload.file_name);
          detectedFields = (analysisResult.detectedFields || []) as DetectedField[];
          
          // Get COR element suggestions
          const suggestions = suggestCORElements(analysisResult.analysis, detectedFields, extractedText);
          corSuggestions = suggestions.map(s => ({
            element_number: s.element_number,
            confidence: s.confidence,
            reasoning: s.reasoning,
          }));
        } catch (analysisError) {
          console.error('[PDF Process] Analysis error:', analysisError);
          // Continue without AI analysis
        }
      }
      
      // Update PDF upload with results
      await supabase
        .from('pdf_form_uploads')
        .update({
          processing_status: 'completed',
          ocr_text: extractedText,
          ocr_confidence: ocrConfidence,
          page_count: pageCount,
        })
        .eq('id', upload_id);
      
      // Store detected fields
      if (detectedFields.length > 0) {
        const fieldsToInsert = detectedFields.map((field, index) => ({
          pdf_upload_id: upload_id,
          field_code: field.field_code || `field_${index + 1}`,
          detected_label: field.detected_label || `Field ${index + 1}`,
          suggested_type: field.suggested_type || 'text',
          type_confidence: field.type_confidence || 50,
          page_number: field.page_number || 1,
          field_order: index,
          is_confirmed: false,
          is_excluded: false,
        }));
        
        await supabase
          .from('pdf_detected_fields')
          .insert(fieldsToInsert);
      }
      
      // Update conversion session
      const { data: session } = await supabase
        .from('pdf_conversion_sessions')
        .select('id')
        .eq('pdf_upload_id', upload_id)
        .single();
      
      if (session) {
        await supabase
          .from('pdf_conversion_sessions')
          .update({
            current_step: 'review_ocr',
            form_name: pdfUpload.file_name.replace(/\.pdf$/i, ''),
          })
          .eq('id', session.id);
      }
      
      return NextResponse.json({
        success: true,
        detected_fields: detectedFields,
        cor_suggestions: corSuggestions,
        ocr_confidence: ocrConfidence,
        page_count: pageCount,
        text_preview: extractedText.substring(0, 500),
      });
      
    } catch (error) {
      console.error('[PDF Process] Error:', error);
      
      // Mark upload as failed
      await supabase
        .from('pdf_form_uploads')
        .update({
          processing_status: 'failed',
          processing_attempts: (pdfUpload.processing_attempts || 0) + 1,
        })
        .eq('id', upload_id);
      
      return handleApiError(error, 'Failed to process PDF', 500, 'PDF Process');
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
