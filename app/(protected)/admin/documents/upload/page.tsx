'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Upload, FileText, FolderOpen, X, ChevronLeft, ChevronRight, 
  Check, AlertTriangle, Clock, Loader2, Book, Shield, ClipboardList,
  GraduationCap, AlertCircle, Plus, Trash2, FileCheck, ArrowRight,
  Sparkles
} from 'lucide-react';
import { 
  extractMetadataFromFile, 
  QUICK_UPLOAD_PRESETS,
  type MetadataExtractionResult,
  type QuickUploadPresetKey 
} from '@/lib/documents/metadata-extractor-client';

// ============================================================================
// TYPES
// ============================================================================

interface FileWithMetadata {
  file: File;
  metadata: MetadataExtractionResult | null;
  isProcessing: boolean;
  error?: string;
  userOverrides: {
    title?: string;
    description?: string;
    document_type?: string;
    folder_id?: string;
    cor_elements?: number[];
    tags?: string[];
    keywords?: string[];
    applicable_to?: string[];
    is_critical?: boolean;
    worker_must_acknowledge?: boolean;
    acknowledgment_deadline_days?: number;
  };
}

interface UploadProgress {
  current: number;
  total: number;
  currentFile: string;
  status: 'idle' | 'uploading' | 'complete' | 'error';
  results: UploadResult[];
}

interface UploadResult {
  success: boolean;
  filename: string;
  document?: {
    id: string;
    control_number: string;
    title: string;
  };
  error?: string;
}

interface Folder {
  id: string;
  name: string;
  folder_code: string;
  icon: string;
  color: string;
  default_document_type?: string;
}

// ============================================================================
// COR ELEMENTS DATA
// ============================================================================

const COR_ELEMENTS = [
  { id: 1, name: 'Management Leadership' },
  { id: 2, name: 'Hazard Identification' },
  { id: 3, name: 'Hazard Control' },
  { id: 4, name: 'Competency & Training' },
  { id: 5, name: 'Workplace Behavior' },
  { id: 6, name: 'PPE' },
  { id: 7, name: 'Maintenance' },
  { id: 8, name: 'Communication' },
  { id: 9, name: 'Inspection' },
  { id: 10, name: 'Incident Investigation' },
  { id: 11, name: 'Emergency Response' },
  { id: 12, name: 'Statistics & Records' },
  { id: 13, name: 'Regulatory Compliance' },
  { id: 14, name: 'Management Review' },
];

const APPLICABLE_TO_OPTIONS = [
  { value: 'all_workers', label: 'All Workers' },
  { value: 'supervisors', label: 'Supervisors' },
  { value: 'management', label: 'Management' },
  { value: 'contractors', label: 'Contractors' },
  { value: 'visitors', label: 'Visitors' },
];

const DOCUMENT_TYPES = [
  { code: 'POL', name: 'Policy' },
  { code: 'PRC', name: 'Procedure' },
  { code: 'SWP', name: 'Safe Work Procedure' },
  { code: 'MAN', name: 'Manual' },
  { code: 'FRM', name: 'Form/Template' },
  { code: 'TRN', name: 'Training Material' },
  { code: 'PLN', name: 'Plan' },
  { code: 'RPT', name: 'Report' },
  { code: 'MIN', name: 'Meeting Minutes' },
  { code: 'CRT', name: 'Certification' },
  { code: 'OTH', name: 'Other' },
];

// ============================================================================
// QUICK UPLOAD PRESET ICONS
// ============================================================================

const PRESET_ICONS: Record<string, React.ReactNode> = {
  Book: <Book className="w-5 h-5" />,
  FileText: <FileText className="w-5 h-5" />,
  ShieldCheck: <Shield className="w-5 h-5" />,
  ClipboardList: <ClipboardList className="w-5 h-5" />,
  GraduationCap: <GraduationCap className="w-5 h-5" />,
  AlertTriangle: <AlertTriangle className="w-5 h-5" />,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DocumentUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk' | 'folder'>('bulk');
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    current: 0,
    total: 0,
    currentFile: '',
    status: 'idle',
    results: [],
  });
  const [activePreset, setActivePreset] = useState<QuickUploadPresetKey | null>(null);
  const [bulkMetadata, setBulkMetadata] = useState({
    folder_id: '',
    cor_elements: [] as number[],
    applicable_to: ['all_workers'] as string[],
  });
  const [companyInitials, setCompanyInitials] = useState('NCCI');

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    fetchFolders();
    fetchCompanyInitials();
  }, []);

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/documents/folders');
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const fetchCompanyInitials = async () => {
    try {
      const response = await fetch('/api/company/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.initials) {
          setCompanyInitials(data.initials);
        }
      }
    } catch (error) {
      console.error('Failed to fetch company profile:', error);
    }
  };

  // ============================================================================
  // FILE HANDLING
  // ============================================================================

  const handleFilesSelected = useCallback(async (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    
    // Filter valid files
    const validFiles = fileArray.filter(file => {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
      ];
      return validTypes.includes(file.type) && file.size <= 25 * 1024 * 1024;
    });

    if (validFiles.length === 0) return;

    // Create file entries
    const newFiles: FileWithMetadata[] = validFiles.map(file => ({
      file,
      metadata: null,
      isProcessing: true,
      userOverrides: {},
    }));

    setFiles(prev => [...prev, ...newFiles]);
    setCurrentFileIndex(0);

    // Extract metadata for each file
    for (let i = 0; i < validFiles.length; i++) {
      // Safe: i is a numeric loop index bounded by validFiles.length, standard array access
      // eslint-disable-next-line security/detect-object-injection
      const file = validFiles[i];
      try {
        const metadata = await extractMetadataFromFile(file, companyInitials);
        
        setFiles(prev => {
          const updated = [...prev];
          const fileIndex = prev.findIndex(f => f.file === file);
          if (fileIndex !== -1) {
            // Safe: fileIndex is validated as !== -1, derived from findIndex on same array
            // eslint-disable-next-line security/detect-object-injection
            updated[fileIndex] = {
              // eslint-disable-next-line security/detect-object-injection
              ...updated[fileIndex],
              metadata,
              isProcessing: false,
              userOverrides: {
                title: metadata.metadata.title,
                document_type: metadata.metadata.document_type,
                cor_elements: metadata.metadata.cor_elements,
                keywords: metadata.metadata.keywords,
                applicable_to: metadata.metadata.applicable_to,
                is_critical: metadata.metadata.is_critical,
                worker_must_acknowledge: metadata.metadata.requires_acknowledgment,
              },
            };
          }
          return updated;
        });
      } catch (error) {
        setFiles(prev => {
          const updated = [...prev];
          const fileIndex = prev.findIndex(f => f.file === file);
          if (fileIndex !== -1) {
            // Safe: fileIndex is validated as !== -1, derived from findIndex on same array
            // eslint-disable-next-line security/detect-object-injection
            updated[fileIndex] = {
              // eslint-disable-next-line security/detect-object-injection
              ...updated[fileIndex],
              isProcessing: false,
              error: error instanceof Error ? error.message : 'Failed to extract metadata',
            };
          }
          return updated;
        });
      }
    }
  }, [companyInitials]);

  // ============================================================================
  // DRAG & DROP
  // ============================================================================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const readDirectory = useCallback(async (directory: FileSystemDirectoryEntry, fileList: File[]): Promise<void> => {
    return new Promise((resolve) => {
      const reader = directory.createReader();
      const readEntries = () => {
        reader.readEntries(async (entries) => {
          if (entries.length === 0) {
            resolve();
            return;
          }
          
          for (const entry of entries) {
            if (entry.isFile) {
              const fileEntry = entry as FileSystemFileEntry;
              const file = await new Promise<File>((res) => fileEntry.file(res));
              fileList.push(file);
            } else if (entry.isDirectory) {
              // Note: We need to use a reference that's available at runtime
              const readDir = async (dir: FileSystemDirectoryEntry, list: File[]): Promise<void> => {
                return new Promise((res) => {
                  const r = dir.createReader();
                  const read = () => {
                    r.readEntries(async (ent) => {
                      if (ent.length === 0) { res(); return; }
                      for (const e of ent) {
                        if (e.isFile) {
                          const f = await new Promise<File>((r) => (e as FileSystemFileEntry).file(r));
                          list.push(f);
                        } else if (e.isDirectory) {
                          await readDir(e as FileSystemDirectoryEntry, list);
                        }
                      }
                      read();
                    });
                  };
                  read();
                });
              };
              await readDir(entry as FileSystemDirectoryEntry, fileList);
            }
          }
          
          readEntries();
        });
      };
      readEntries();
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const items = e.dataTransfer.items;
    const fileList: File[] = [];

    // Handle both files and folders
    const processEntries = async () => {
      for (let i = 0; i < items.length; i++) {
        // Safe: i is a numeric loop index bounded by items.length, standard array access
        // eslint-disable-next-line security/detect-object-injection
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            if (entry.isFile) {
              const file = item.getAsFile();
              if (file) fileList.push(file);
            } else if (entry.isDirectory) {
              await readDirectory(entry as FileSystemDirectoryEntry, fileList);
            }
          } else {
            const file = item.getAsFile();
            if (file) fileList.push(file);
          }
        }
      }
      
      if (fileList.length > 0) {
        handleFilesSelected(fileList);
      }
    };

    processEntries();
  }, [handleFilesSelected, readDirectory]);

  // ============================================================================
  // QUICK UPLOAD PRESETS
  // ============================================================================

  const handleQuickUpload = (presetKey: QuickUploadPresetKey) => {
    setActivePreset(presetKey);
    const preset = QUICK_UPLOAD_PRESETS.find(p => p.key === presetKey);
    
    if (!preset) return;
    
    // Find folder by code
    const folder = folders.find(f => f.folder_code === preset.folder_code);
    
    setBulkMetadata({
      folder_id: folder?.id || '',
      cor_elements: [],
      applicable_to: preset.applicable_to,
    });

    // Update all files with preset defaults
    setFiles(prev => prev.map(f => ({
      ...f,
      userOverrides: {
        ...f.userOverrides,
        folder_id: folder?.id,
        document_type: preset.document_type,
        cor_elements: [],
        is_critical: preset.is_critical,
        worker_must_acknowledge: preset.requires_acknowledgment,
        applicable_to: preset.applicable_to,
      },
    })));

    fileInputRef.current?.click();
  };

  // ============================================================================
  // APPLY BULK METADATA
  // ============================================================================

  const applyBulkMetadata = () => {
    setFiles(prev => prev.map(f => ({
      ...f,
      userOverrides: {
        ...f.userOverrides,
        folder_id: bulkMetadata.folder_id || f.userOverrides.folder_id,
        cor_elements: bulkMetadata.cor_elements.length > 0 
          ? bulkMetadata.cor_elements 
          : f.userOverrides.cor_elements,
        applicable_to: bulkMetadata.applicable_to.length > 0 
          ? bulkMetadata.applicable_to 
          : f.userOverrides.applicable_to,
      },
    })));
  };

  // ============================================================================
  // UPDATE FILE METADATA
  // ============================================================================

  const updateFileMetadata = (index: number, updates: Partial<FileWithMetadata['userOverrides']>) => {
    setFiles(prev => {
      const updated = [...prev];
      // Safe: index is a numeric parameter used for array access within bounds
      // eslint-disable-next-line security/detect-object-injection
      updated[index] = {
        // eslint-disable-next-line security/detect-object-injection
        ...updated[index],
        userOverrides: {
          // eslint-disable-next-line security/detect-object-injection
          ...updated[index].userOverrides,
          ...updates,
        },
      };
      return updated;
    });
  };

  // ============================================================================
  // REMOVE FILE
  // ============================================================================

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (currentFileIndex >= files.length - 1 && currentFileIndex > 0) {
      setCurrentFileIndex(currentFileIndex - 1);
    }
  };

  // ============================================================================
  // UPLOAD
  // ============================================================================

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploadProgress({
      current: 0,
      total: files.length,
      currentFile: files[0].file.name,
      status: 'uploading',
      results: [],
    });

    const formData = new FormData();
    const metadata = files.map(f => ({
      title: f.userOverrides.title || f.metadata?.metadata.title,
      description: f.userOverrides.description,
      document_type: f.userOverrides.document_type || f.metadata?.metadata.document_type || 'OTH',
      folder_id: f.userOverrides.folder_id,
      cor_elements: f.userOverrides.cor_elements || f.metadata?.metadata.cor_elements,
      tags: f.userOverrides.tags,
      keywords: f.userOverrides.keywords || f.metadata?.metadata.keywords,
      applicable_to: f.userOverrides.applicable_to || f.metadata?.metadata.applicable_to,
      is_critical: f.userOverrides.is_critical ?? f.metadata?.metadata.is_critical,
      worker_must_acknowledge: f.userOverrides.worker_must_acknowledge ?? f.metadata?.metadata.requires_acknowledgment,
      acknowledgment_deadline_days: f.userOverrides.acknowledgment_deadline_days,
    }));

    files.forEach(f => formData.append('files', f.file));
    formData.append('metadata', JSON.stringify(metadata));

    try {
      const response = await fetch('/api/documents/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadProgress({
          current: files.length,
          total: files.length,
          currentFile: '',
          status: 'complete',
          results: data.results || [],
        });
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      setUploadProgress(prev => ({
        ...prev,
        status: 'error',
        results: [{
          success: false,
          filename: 'All files',
          error: error instanceof Error ? error.message : 'Upload failed',
        }],
      }));
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  // Safe: currentFileIndex is a React state controlled by component logic, bounded by files.length
  // eslint-disable-next-line security/detect-object-injection
  const currentFile = files[currentFileIndex];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30">
              <Upload className="w-8 h-8 text-violet-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Upload Documents</h1>
              <p className="text-slate-400 mt-1">Upload and organize your safety documents</p>
            </div>
          </div>
        </div>

        {/* Upload Mode Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'single', label: 'Single Upload', icon: FileText },
            { id: 'bulk', label: 'Bulk Upload', icon: FolderOpen },
            { id: 'folder', label: 'Folder Upload', icon: FolderOpen },
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => setUploadMode(mode.id as typeof uploadMode)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                ${uploadMode === mode.id
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }
              `}
            >
              <mode.icon className="w-4 h-4" />
              {mode.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        {uploadProgress.status === 'idle' ? (
          <>
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative rounded-2xl border-2 border-dashed p-12 text-center transition-all
                ${isDragOver
                  ? 'border-violet-400 bg-violet-500/10'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple={uploadMode !== 'single'}
                accept=".pdf,.docx,.xlsx,.pptx,.txt"
                onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
                className="hidden"
              />
              <input
                ref={folderInputRef}
                type="file"
                // @ts-expect-error webkitdirectory is not in standard types
                webkitdirectory=""
                directory=""
                onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
                className="hidden"
              />

              <div className="flex flex-col items-center gap-4">
                <div className={`
                  p-4 rounded-full transition-all
                  ${isDragOver ? 'bg-violet-500/20' : 'bg-slate-800'}
                `}>
                  <Upload className={`w-12 h-12 ${isDragOver ? 'text-violet-400' : 'text-slate-500'}`} />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Drag & Drop Files or Folders Here
                  </h3>
                  <p className="text-slate-400 mb-4">
                    Or click to browse your computer
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg font-medium transition-colors"
                    >
                      Browse Files
                    </button>
                    {uploadMode === 'folder' && (
                      <button
                        onClick={() => folderInputRef.current?.click()}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Browse Folders
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-500">
                  Supported: PDF, DOCX, XLSX, PPTX, TXT • Max size: 25MB per file
                </p>
              </div>
            </div>

            {/* Quick Upload Presets */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Quick Upload
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {QUICK_UPLOAD_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => handleQuickUpload(preset.key)}
                    className={`
                      flex items-center gap-3 p-4 rounded-xl border transition-all text-left
                      ${activePreset === preset.key
                        ? 'border-violet-500/50 bg-violet-500/10'
                        : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
                      }
                    `}
                  >
                    <div 
                      className="p-2 rounded-lg bg-slate-800"
                    >
                      <span className="text-xl">
                        {preset.icon}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-white">{preset.label}</p>
                      <p className="text-xs text-slate-500">
                        {preset.is_critical ? 'Critical' : 'Standard'} • 
                        {preset.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Files Selected */}
            {files.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Document Metadata — {files.length} file{files.length > 1 ? 's' : ''} selected
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFiles([])}
                      className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Bulk Apply Section */}
                {files.length > 1 && (
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 mb-4">
                    <p className="text-sm font-medium text-slate-300 mb-3">Apply to all files:</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Folder</label>
                        <select
                          value={bulkMetadata.folder_id}
                          onChange={(e) => setBulkMetadata(prev => ({ ...prev, folder_id: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
                        >
                          <option value="">Select folder...</option>
                          {folders.map(folder => (
                            <option key={folder.id} value={folder.id}>{folder.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">COR Elements</label>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-2 bg-slate-900 border border-slate-700 rounded-lg">
                          {COR_ELEMENTS.slice(0, 7).map(el => (
                            <button
                              key={el.id}
                              onClick={() => {
                                setBulkMetadata(prev => ({
                                  ...prev,
                                  cor_elements: prev.cor_elements.includes(el.id)
                                    ? prev.cor_elements.filter(e => e !== el.id)
                                    : [...prev.cor_elements, el.id]
                                }));
                              }}
                              className={`
                                px-2 py-0.5 text-xs rounded-md transition-colors
                                ${bulkMetadata.cor_elements.includes(el.id)
                                  ? 'bg-violet-500/30 text-violet-300 border border-violet-500/50'
                                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }
                              `}
                            >
                              {el.id}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={applyBulkMetadata}
                          className="px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-lg text-sm font-medium transition-colors"
                        >
                          Apply to All
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Individual File Metadata */}
                {currentFile && (
                  <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-700">
                    {/* File Navigation */}
                    {files.length > 1 && (
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700">
                        <button
                          onClick={() => setCurrentFileIndex(Math.max(0, currentFileIndex - 1))}
                          disabled={currentFileIndex === 0}
                          className="p-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-slate-400">
                          File {currentFileIndex + 1} of {files.length}
                        </span>
                        <button
                          onClick={() => setCurrentFileIndex(Math.min(files.length - 1, currentFileIndex + 1))}
                          disabled={currentFileIndex === files.length - 1}
                          className="p-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}

                    {/* File Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                          <FileText className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{currentFile.file.name}</h4>
                          <p className="text-sm text-slate-400">
                            {formatFileSize(currentFile.file.size)}
                            {currentFile.metadata?.page_count && ` • ${currentFile.metadata.page_count} pages`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentFile.isProcessing && (
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing...
                          </div>
                        )}
                        {currentFile.metadata?.metadata.confidence && !currentFile.isProcessing && (
                          <div className={`
                            px-3 py-1 rounded-full text-sm
                            ${currentFile.metadata.metadata.confidence >= 70
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : currentFile.metadata.metadata.confidence >= 40
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-slate-500/20 text-slate-400'
                            }
                          `}>
                            {currentFile.metadata.metadata.confidence}% confidence
                          </div>
                        )}
                        <button
                          onClick={() => removeFile(currentFileIndex)}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Form */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Control Number */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Control Number
                          {currentFile.metadata?.metadata.control_number_detected && (
                            <span className="ml-2 text-xs text-emerald-400">✓ Auto-detected</span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={currentFile.metadata?.metadata.control_number || ''}
                          readOnly
                          placeholder="Will be auto-generated"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-500"
                        />
                      </div>

                      {/* Title */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                        <input
                          type="text"
                          value={currentFile.userOverrides.title || ''}
                          onChange={(e) => updateFileMetadata(currentFileIndex, { title: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                        />
                      </div>

                      {/* Folder */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Folder
                          {currentFile.metadata?.metadata.suggested_folder_name && (
                            <span className="ml-2 text-xs text-violet-400">
                              Suggested: {currentFile.metadata.metadata.suggested_folder_name}
                            </span>
                          )}
                        </label>
                        <select
                          value={currentFile.userOverrides.folder_id || ''}
                          onChange={(e) => updateFileMetadata(currentFileIndex, { folder_id: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-violet-500"
                        >
                          <option value="">Select folder...</option>
                          {folders.map(folder => (
                            <option key={folder.id} value={folder.id}>{folder.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Document Type */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Document Type
                          {currentFile.metadata?.metadata.document_type_confidence === 'high' && (
                            <span className="ml-2 text-xs text-emerald-400">✓ Auto-suggested</span>
                          )}
                        </label>
                        <select
                          value={currentFile.userOverrides.document_type || ''}
                          onChange={(e) => updateFileMetadata(currentFileIndex, { document_type: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-violet-500"
                        >
                          {DOCUMENT_TYPES.map(type => (
                            <option key={type.code} value={type.code}>{type.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Description */}
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                        <textarea
                          value={currentFile.userOverrides.description || ''}
                          onChange={(e) => updateFileMetadata(currentFileIndex, { description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm resize-none focus:border-violet-500"
                          placeholder="Brief description of the document..."
                        />
                      </div>

                      {/* COR Elements */}
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">COR Elements</label>
                        <div className="flex flex-wrap gap-2">
                          {COR_ELEMENTS.map(el => (
                            <button
                              key={el.id}
                              onClick={() => {
                                const current = currentFile.userOverrides.cor_elements || [];
                                updateFileMetadata(currentFileIndex, {
                                  cor_elements: current.includes(el.id)
                                    ? current.filter(e => e !== el.id)
                                    : [...current, el.id]
                                });
                              }}
                              className={`
                                px-3 py-1.5 text-sm rounded-lg transition-all
                                ${(currentFile.userOverrides.cor_elements || []).includes(el.id)
                                  ? 'bg-violet-500/30 text-violet-300 border border-violet-500/50'
                                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                                }
                              `}
                              title={el.name}
                            >
                              {el.id}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Keywords */}
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Keywords
                          {(currentFile.metadata?.metadata.keywords?.length || 0) > 0 && (
                            <span className="ml-2 text-xs text-slate-400">Detected from content</span>
                          )}
                        </label>
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-800 rounded-lg border border-slate-700 min-h-[60px]">
                          {(currentFile.userOverrides.keywords || []).map((kw, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 text-slate-300 rounded-md text-sm"
                            >
                              {kw}
                              <button
                                onClick={() => {
                                  const updated = (currentFile.userOverrides.keywords || []).filter((_, idx) => idx !== i);
                                  updateFileMetadata(currentFileIndex, { keywords: updated });
                                }}
                                className="hover:text-red-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          <input
                            type="text"
                            placeholder="Add keyword..."
                            className="flex-1 min-w-[100px] bg-transparent border-0 text-white text-sm focus:outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                const newKw = e.currentTarget.value.trim().toLowerCase();
                                const current = currentFile.userOverrides.keywords || [];
                                if (!current.includes(newKw)) {
                                  updateFileMetadata(currentFileIndex, { keywords: [...current, newKw] });
                                }
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Applicable To */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Applicable To</label>
                        <div className="space-y-2">
                          {APPLICABLE_TO_OPTIONS.map(opt => (
                            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(currentFile.userOverrides.applicable_to || []).includes(opt.value)}
                                onChange={(e) => {
                                  const current = currentFile.userOverrides.applicable_to || [];
                                  updateFileMetadata(currentFileIndex, {
                                    applicable_to: e.target.checked
                                      ? [...current, opt.value]
                                      : current.filter(v => v !== opt.value)
                                  });
                                }}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500"
                              />
                              <span className="text-sm text-slate-300">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Document Settings */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Settings</label>
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={currentFile.userOverrides.is_critical || false}
                              onChange={(e) => updateFileMetadata(currentFileIndex, { is_critical: e.target.checked })}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500"
                            />
                            <span className="text-sm text-slate-300">Critical Document</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={currentFile.userOverrides.worker_must_acknowledge || false}
                              onChange={(e) => updateFileMetadata(currentFileIndex, { worker_must_acknowledge: e.target.checked })}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500"
                            />
                            <span className="text-sm text-slate-300">Requires Worker Acknowledgment</span>
                          </label>
                          {currentFile.userOverrides.worker_must_acknowledge && (
                            <div className="ml-6">
                              <label className="block text-xs text-slate-400 mb-1">Deadline (days)</label>
                              <input
                                type="number"
                                value={currentFile.userOverrides.acknowledgment_deadline_days || 7}
                                onChange={(e) => updateFileMetadata(currentFileIndex, { acknowledgment_deadline_days: parseInt(e.target.value) })}
                                min={1}
                                max={90}
                                className="w-24 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Navigation Buttons */}
                    {files.length > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
                        <button
                          onClick={() => setCurrentFileIndex(Math.max(0, currentFileIndex - 1))}
                          disabled={currentFileIndex === 0}
                          className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => removeFile(currentFileIndex)}
                            className="px-4 py-2 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            Skip
                          </button>
                          <button
                            onClick={() => setCurrentFileIndex(Math.min(files.length - 1, currentFileIndex + 1))}
                            disabled={currentFileIndex === files.length - 1}
                            className="flex items-center gap-2 px-4 py-2 text-violet-400 hover:text-violet-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Next
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Progress Bar */}
                <div className="mt-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">
                      Progress: {files.filter(f => !f.isProcessing).length}/{files.length} files ready
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                      style={{ width: `${(files.filter(f => !f.isProcessing).length / files.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={() => setFiles([])}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={files.some(f => f.isProcessing) || files.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25"
                  >
                    <Upload className="w-5 h-5" />
                    Upload All & Process
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : uploadProgress.status === 'uploading' ? (
          /* Upload Progress */
          <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-700">
            <div className="text-center mb-8">
              <div className="inline-flex p-4 rounded-full bg-violet-500/20 mb-4">
                <Loader2 className="w-12 h-12 text-violet-400 animate-spin" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Uploading Documents</h3>
              <p className="text-slate-400">Please wait while we process your files...</p>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {files.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50"
                >
                  {index < uploadProgress.current ? (
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : index === uploadProgress.current ? (
                    <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                  ) : (
                    <Clock className="w-5 h-5 text-slate-500" />
                  )}
                  <span className={`flex-1 text-sm ${index <= uploadProgress.current ? 'text-white' : 'text-slate-500'}`}>
                    {file.file.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {index < uploadProgress.current ? 'Uploaded' : index === uploadProgress.current ? 'Processing...' : 'Queued'}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">
                  Overall: {uploadProgress.current}/{uploadProgress.total} complete
                </span>
                <span className="text-sm text-slate-400">
                  {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                </span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Upload Complete / Error */
          <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-700">
            <div className="text-center mb-8">
              <div className={`
                inline-flex p-4 rounded-full mb-4
                ${uploadProgress.status === 'complete' ? 'bg-emerald-500/20' : 'bg-red-500/20'}
              `}>
                {uploadProgress.status === 'complete' ? (
                  <FileCheck className="w-12 h-12 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-12 h-12 text-red-400" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {uploadProgress.status === 'complete' ? 'Upload Complete' : 'Upload Failed'}
              </h3>
              <p className="text-slate-400">
                {uploadProgress.status === 'complete'
                  ? `Successfully uploaded ${uploadProgress.results.filter(r => r.success).length} documents`
                  : 'There was an error uploading your documents'
                }
              </p>
            </div>

            {/* Results */}
            <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
              {uploadProgress.results.map((result, index) => (
                <div 
                  key={index}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg
                    ${result.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}
                  `}
                >
                  {result.success ? (
                    <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <X className="w-5 h-5 text-red-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${result.success ? 'text-white' : 'text-red-300'}`}>
                      {result.document?.control_number ? (
                        <span className="font-mono">{result.document.control_number}: </span>
                      ) : null}
                      {result.document?.title || result.filename}
                    </p>
                    {result.error && (
                      <p className="text-xs text-red-400">{result.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            {uploadProgress.status === 'complete' && (
              <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-800/50 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-400">
                    {uploadProgress.results.filter(r => r.success).length}
                  </p>
                  <p className="text-xs text-slate-400">Successful</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">
                    {uploadProgress.results.filter(r => !r.success).length}
                  </p>
                  <p className="text-xs text-slate-400">Failed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {formatFileSize(files.reduce((sum, f) => sum + f.file.size, 0))}
                  </p>
                  <p className="text-xs text-slate-400">Total Size</p>
                </div>
              </div>
            )}

            {/* Next Steps */}
            {uploadProgress.status === 'complete' && uploadProgress.results.some(r => r.success) && (
              <div className="p-4 rounded-xl bg-slate-800/50 mb-6">
                <p className="text-sm font-medium text-white mb-3">Next steps:</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-800" />
                    Submit documents for approval (if required)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-800" />
                    Distribute to workers
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-800" />
                    Update H&S Manual index
                  </label>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => router.push('/admin/document-registry')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                View in Registry
              </button>
              <button
                onClick={() => {
                  setFiles([]);
                  setUploadProgress({ current: 0, total: 0, currentFile: '', status: 'idle', results: [] });
                }}
                className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg font-medium transition-colors"
              >
                Upload More
              </button>
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
