'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { FieldWrapper } from './field-wrapper';
import { FormField, FieldValue, FileAttachment } from '../types';
import { Upload, X, FileIcon, FileText, FileImage, File } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileFieldProps {
  field: FormField;
  value: FieldValue;
  onChange: (value: FileAttachment[]) => void;
  error?: string;
  disabled?: boolean;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return FileImage;
  if (type.includes('pdf') || type.includes('document')) return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileField({
  field,
  value,
  onChange,
  error,
  disabled,
}: FileFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  
  const files: FileAttachment[] = useMemo(() => 
    Array.isArray(value)
      ? (value as unknown[]).filter((v): v is FileAttachment => {
          return !!v && typeof v === 'object' && 'name' in v && 'type' in v && 'size' in v;
        })
      : [],
    [value]
  );
  
  const allowedExtensions = field.validation_rules?.allowed_extensions;
  const maxFileSize = (field.validation_rules?.max_file_size_mb || 10) * 1024 * 1024;
  
  const processFiles = useCallback(async (fileList: FileList) => {
    const newFiles: FileAttachment[] = [];
    
    for (const file of Array.from(fileList)) {
      // Check file size
      if (file.size > maxFileSize) {
        console.warn(`File ${file.name} exceeds maximum size`);
        continue;
      }
      
      // Check extension
      if (allowedExtensions) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext && !allowedExtensions.includes(ext)) {
          console.warn(`File ${file.name} has disallowed extension`);
          continue;
        }
      }
      
      // Read file as base64
      const data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      
      newFiles.push({
        field_code: field.field_code,
        data,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }
    
    onChange([...files, ...newFiles]);
  }, [field.field_code, files, maxFileSize, allowedExtensions, onChange]);
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      processFiles(fileList);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled) return;
    
    const fileList = e.dataTransfer.files;
    if (fileList && fileList.length > 0) {
      processFiles(fileList);
    }
  }, [disabled, processFiles]);
  
  const removeFile = useCallback((index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onChange(newFiles);
  }, [files, onChange]);
  
  const acceptTypes = allowedExtensions
    ? allowedExtensions.map(ext => `.${ext}`).join(',')
    : undefined;
  
  return (
    <FieldWrapper
      label={field.label}
      fieldCode={field.field_code}
      required={field.validation_rules?.required}
      helpText={field.help_text}
      error={error}
    >
      <div className="space-y-3">
        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, index) => {
              const Icon = getFileIcon(file.type);
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30"
                >
                  <Icon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Drop zone */}
        {!disabled && (
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
              dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
              'cursor-pointer hover:border-primary/50'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptTypes}
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Drag and drop files here, or{' '}
              <span className="text-primary font-medium">browse</span>
            </p>
            {allowedExtensions && (
              <p className="text-xs text-muted-foreground mt-1">
                Allowed: {allowedExtensions.join(', ')}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Max size: {field.validation_rules?.max_file_size_mb || 10} MB
            </p>
          </div>
        )}
      </div>
    </FieldWrapper>
  );
}

export default FileField;
