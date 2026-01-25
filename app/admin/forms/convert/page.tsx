'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Clock,
  FileCheck,
  ArrowRight
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'analyzing' | 'complete' | 'error';

interface UploadProgress {
  status: UploadStatus;
  message: string;
  progress: number;
  conversionId?: string;
  error?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function ConvertPDFPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: 'idle',
    message: '',
    progress: 0,
  });

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
      } else {
        setUploadProgress({
          status: 'error',
          message: 'Please upload a PDF file',
          progress: 0,
          error: 'Invalid file type',
        });
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setUploadProgress({ status: 'idle', message: '', progress: 0 });
      } else {
        setUploadProgress({
          status: 'error',
          message: 'Please upload a PDF file',
          progress: 0,
          error: 'Invalid file type',
        });
      }
    }
  }, []);

  // Upload and process PDF
  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      // Step 1: Upload
      setUploadProgress({
        status: 'uploading',
        message: 'Uploading PDF...',
        progress: 10,
      });

      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch('/api/forms/convert-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      const conversionId = uploadResult.conversion_id;

      // Step 2: Processing
      setUploadProgress({
        status: 'processing',
        message: 'Processing PDF pages...',
        progress: 30,
        conversionId,
      });

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

        const statusResponse = await fetch(`/api/forms/convert-pdf/${conversionId}`);
        if (!statusResponse.ok) continue;

        const statusResult = await statusResponse.json();
        const conversion = statusResult.conversion;

        if (conversion.ocr_status === 'processing') {
          const progress = Math.min(30 + (attempts * 1.5), 70);
          setUploadProgress({
            status: 'analyzing',
            message: 'Analyzing form structure with AI...',
            progress,
            conversionId,
          });
        } else if (conversion.ocr_status === 'completed') {
          setUploadProgress({
            status: 'complete',
            message: 'Analysis complete! Redirecting...',
            progress: 100,
            conversionId,
          });

          // Redirect to editor
          setTimeout(() => {
            router.push(`/admin/forms/convert/${conversionId}`);
          }, 1000);
          return;
        } else if (conversion.ocr_status === 'failed') {
          throw new Error(conversion.ocr_error || 'Processing failed');
        }
      }

      // Timeout - but still redirect to allow manual editing
      setUploadProgress({
        status: 'complete',
        message: 'Processing taking longer than expected. Redirecting to editor...',
        progress: 100,
        conversionId,
      });

      setTimeout(() => {
        router.push(`/admin/forms/convert/${conversionId}`);
      }, 1500);

    } catch (error) {
      setUploadProgress({
        status: 'error',
        message: error instanceof Error ? error.message : 'An error occurred',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadProgress({ status: 'idle', message: '', progress: 0 });
  };

  const isProcessing = ['uploading', 'processing', 'analyzing'].includes(uploadProgress.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/forms')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Forms Library
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Convert PDF to Digital Form</h1>
          <p className="text-gray-600 mt-2">
            Upload a paper form PDF and our AI will automatically detect fields and convert it to a digital form.
          </p>
        </div>

        {/* Main Upload Card */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            {/* Upload Area */}
            {!isProcessing && uploadProgress.status !== 'complete' && (
              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer',
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : selectedFile
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                )}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {selectedFile ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                      <FileCheck className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="flex justify-center gap-3">
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          resetUpload();
                        }}
                      >
                        Choose Different File
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpload();
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Start Conversion
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {isDragging ? 'Drop your PDF here' : 'Drag and drop your PDF here'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        or click to browse files
                      </p>
                    </div>
                    <p className="text-xs text-gray-400">
                      Supports PDF files up to 25MB
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Processing State */}
            {isProcessing && (
              <div className="py-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 relative">
                  <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-25" />
                  <div className="relative w-full h-full bg-blue-100 rounded-full flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {uploadProgress.message}
                </h3>
                
                <p className="text-sm text-gray-500 mb-6">
                  {uploadProgress.status === 'uploading' && 'Uploading your PDF to our servers...'}
                  {uploadProgress.status === 'processing' && 'Running OCR to extract text from your form...'}
                  {uploadProgress.status === 'analyzing' && 'AI is detecting form fields and suggesting metadata...'}
                </p>

                {/* Progress bar */}
                <div className="max-w-md mx-auto">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${uploadProgress.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {Math.round(uploadProgress.progress)}% complete
                  </p>
                </div>

                <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>This usually takes 30-60 seconds</span>
                </div>
              </div>
            )}

            {/* Complete State */}
            {uploadProgress.status === 'complete' && (
              <div className="py-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {uploadProgress.message}
                </h3>
                <p className="text-sm text-gray-500">
                  Please wait while we redirect you to the editor...
                </p>
              </div>
            )}

            {/* Error State */}
            {uploadProgress.status === 'error' && (
              <div className="py-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload Failed
                </h3>
                <p className="text-sm text-red-600 mb-6">
                  {uploadProgress.error}
                </p>
                <Button onClick={resetUpload}>
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Field Detection</h3>
              <p className="text-sm text-gray-500">
                Automatically detects text fields, checkboxes, signatures, and more
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">COR Element Mapping</h3>
              <p className="text-sm text-gray-500">
                AI suggests relevant COR elements for automatic audit evidence
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Mobile Ready</h3>
              <p className="text-sm text-gray-500">
                Published forms work seamlessly on mobile devices
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Conversions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Recent Conversions</CardTitle>
            <CardDescription>Continue working on your previous PDF conversions</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentConversions />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// RECENT CONVERSIONS COMPONENT
// =============================================================================

function RecentConversions() {
  const router = useRouter();
  const [conversions, setConversions] = useState<Array<{
    id: string;
    form_name: string;
    original_pdf_name: string;
    status: string;
    created_at: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    async function fetchConversions() {
      try {
        const response = await fetch('/api/forms/conversions/stats');
        if (response.ok) {
          const data = await response.json();
          setConversions(data.recent_conversions || []);
        }
      } catch (error) {
        console.error('Failed to load recent conversions:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchConversions();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (conversions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        <p>No recent conversions</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversions.filter(c => c.status !== 'published').slice(0, 5).map((conversion) => (
        <button
          key={conversion.id}
          onClick={() => router.push(`/admin/forms/convert/${conversion.id}`)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">{conversion.form_name}</p>
              <p className="text-xs text-gray-500">{conversion.original_pdf_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-2 py-1 rounded text-xs font-medium',
              conversion.status === 'published' ? 'bg-green-100 text-green-700' :
              conversion.status === 'mapping_fields' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-700'
            )}>
              {conversion.status === 'mapping_fields' ? 'In Progress' : 
               conversion.status === 'published' ? 'Published' : 'Draft'}
            </span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </div>
        </button>
      ))}
    </div>
  );
}
