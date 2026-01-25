'use client';

/**
 * PDF Uploader Component
 * 
 * Drag-and-drop PDF upload with progress indicator.
 */

import { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import type { PDFUpload } from '@/lib/pdf-converter/types';

interface PDFUploaderProps {
  onUploadComplete: (upload: PDFUpload, sessionId: string) => void;
  onError: (error: string) => void;
}

export function PDFUploader({ onUploadComplete, onError }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setSelectedFile(file);
      } else {
        onError('Please upload a PDF file');
      }
    }
  }, [onError]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setSelectedFile(file);
      } else {
        onError('Please upload a PDF file');
      }
    }
  }, [onError]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      setUploadProgress(30);
      
      const response = await fetch('/api/pdf-converter/upload', {
        method: 'POST',
        body: formData,
      });
      
      setUploadProgress(70);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      
      setUploadProgress(100);
      
      // Small delay to show completion
      setTimeout(() => {
        onUploadComplete(data.upload, data.session?.id);
      }, 500);
      
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Upload failed');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative rounded-2xl border-2 border-dashed p-12 transition-all duration-300
          ${isDragging 
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' 
            : 'border-slate-600 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50'
          }
        `}
      >
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        <div className="text-center">
          <div className={`
            mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6
            transition-all duration-300
            ${isDragging 
              ? 'bg-indigo-500/20 text-indigo-400 scale-110' 
              : 'bg-slate-700/50 text-slate-400'
            }
          `}>
            <Upload className="w-10 h-10" />
          </div>
          
          <h3 className="text-xl font-semibold text-slate-200 mb-2">
            {isDragging ? 'Drop your PDF here' : 'Upload PDF Form'}
          </h3>
          <p className="text-slate-400 mb-4">
            Drag and drop or click to browse
          </p>
          <p className="text-sm text-slate-500">
            Supports scanned paper forms or fillable PDFs • Max 50MB
          </p>
        </div>
      </div>

      {/* Selected File Preview */}
      {selectedFile && !isUploading && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-200 truncate">
                {selectedFile.name}
              </p>
              <p className="text-sm text-slate-400">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              onClick={handleRemoveFile}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Upload Button */}
          <button
            onClick={handleUpload}
            className="w-full mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Upload and Analyze
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              {uploadProgress < 100 ? (
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-200">
                {uploadProgress < 100 ? 'Uploading...' : 'Upload Complete'}
              </p>
              <p className="text-sm text-slate-400">
                {selectedFile?.name}
              </p>
            </div>
            <span className="text-lg font-semibold text-indigo-400">
              {uploadProgress}%
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InstructionCard
          icon="1"
          title="Upload PDF"
          description="Upload any PDF form - scanned paper forms or fillable PDFs"
        />
        <InstructionCard
          icon="2"
          title="AI Analysis"
          description="Our AI will extract text and detect form fields automatically"
        />
        <InstructionCard
          icon="3"
          title="Customize"
          description="Review and customize the detected fields before publishing"
        />
      </div>
    </div>
  );
}

function InstructionCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: string; 
  title: string; 
  description: string; 
}) {
  return (
    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold mb-3">
        {icon}
      </div>
      <h4 className="font-medium text-slate-200 mb-1">{title}</h4>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}

export default PDFUploader;
