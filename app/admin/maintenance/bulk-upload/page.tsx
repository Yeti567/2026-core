'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================================
// TYPES
// ============================================================================

interface Equipment {
  id: string;
  equipment_code: string;
  equipment_number?: string;
  name: string;
  equipment_type: string;
}

interface UploadItem {
  id: string;
  file: File;
  preview: string | null;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  
  // Form data
  equipment_id: string;
  attachment_type: string;
  vendor_name: string;
  receipt_date: string;
  amount: string;
  description: string;
  
  // Auto-detected
  detected_vendor?: string;
  detected_date?: string;
  detected_amount?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BulkUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  
  // Fetch equipment list
  useEffect(() => {
    async function fetchEquipment() {
      try {
        const res = await fetch('/api/admin/equipment');
        if (res.ok) {
          const data = await res.json();
          setEquipment(data.equipment || []);
        }
      } catch (err) {
        console.error('Failed to fetch equipment:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchEquipment();
  }, []);
  
  // Handle file selection
  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    
    const newItems: UploadItem[] = fileArray
      .filter(file => allowedTypes.includes(file.type) && file.size <= 10 * 1024 * 1024)
      .map(file => {
        const item: UploadItem = {
          id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          file,
          preview: null,
          status: 'pending',
          progress: 0,
          equipment_id: '',
          attachment_type: 'receipt',
          vendor_name: '',
          receipt_date: new Date().toISOString().split('T')[0],
          amount: '',
          description: ''
        };
        
        // Generate preview for images
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setUploadItems(prev => prev.map(i => 
              i.id === item.id ? { ...i, preview: e.target?.result as string } : i
            ));
          };
          reader.readAsDataURL(file);
        }
        
        return item;
      });
    
    setUploadItems(prev => [...prev, ...newItems]);
  }, []);
  
  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  };
  
  // Update item field
  const updateItem = (id: string, updates: Partial<UploadItem>) => {
    setUploadItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };
  
  // Remove item
  const removeItem = (id: string) => {
    setUploadItems(prev => prev.filter(item => item.id !== id));
  };
  
  // Upload single item
  const uploadItem = async (item: UploadItem): Promise<boolean> => {
    if (!item.equipment_id) {
      updateItem(item.id, { status: 'error', error: 'Equipment is required' });
      return false;
    }
    
    updateItem(item.id, { status: 'uploading', progress: 10 });
    
    try {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('equipment_id', item.equipment_id);
      formData.append('attachment_type', item.attachment_type);
      formData.append('vendor_name', item.vendor_name);
      formData.append('attachment_date', item.receipt_date);
      formData.append('amount', item.amount);
      formData.append('description', item.description);
      formData.append('uploaded_via', 'bulk');
      
      updateItem(item.id, { progress: 50 });
      
      const res = await fetch('/api/maintenance/upload-receipt', {
        method: 'POST',
        body: formData
      });
      
      updateItem(item.id, { progress: 90 });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      
      updateItem(item.id, { status: 'success', progress: 100 });
      return true;
    } catch (err) {
      updateItem(item.id, { 
        status: 'error', 
        progress: 0,
        error: err instanceof Error ? err.message : 'Upload failed'
      });
      return false;
    }
  };
  
  // Upload all items
  const uploadAll = async () => {
    const pendingItems = uploadItems.filter(i => i.status === 'pending');
    if (pendingItems.length === 0) return;
    
    setIsUploading(true);
    setCompletedCount(0);
    
    // Upload sequentially to avoid overwhelming the server
    for (const item of pendingItems) {
      const success = await uploadItem(item);
      if (success) {
        setCompletedCount(prev => prev + 1);
      }
    }
    
    setIsUploading(false);
  };
  
  // Check if ready to upload
  const pendingCount = uploadItems.filter(i => i.status === 'pending').length;
  const readyToUpload = pendingCount > 0 && uploadItems
    .filter(i => i.status === 'pending')
    .every(i => i.equipment_id);
  
  const successCount = uploadItems.filter(i => i.status === 'success').length;
  const errorCount = uploadItems.filter(i => i.status === 'error').length;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-[var(--muted)]">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button 
            onClick={() => router.back()}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-2"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">📁 Bulk Receipt Upload</h1>
          <p className="text-[var(--muted)]">Upload multiple receipts at once</p>
        </div>
        
        <div className="flex gap-2">
          {uploadItems.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setUploadItems([])}
              disabled={isUploading}
            >
              Clear All
            </Button>
          )}
          <Button 
            onClick={uploadAll}
            disabled={!readyToUpload || isUploading}
          >
            {isUploading 
              ? `⏳ Uploading ${completedCount}/${pendingCount}...` 
              : `Upload All (${pendingCount})`
            }
          </Button>
        </div>
      </div>
      
      {/* Stats */}
      {uploadItems.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{uploadItems.length}</div>
              <div className="text-sm text-[var(--muted)]">Total Files</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-500">{pendingCount}</div>
              <div className="text-sm text-[var(--muted)]">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-500">{successCount}</div>
              <div className="text-sm text-[var(--muted)]">Uploaded</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-500">{errorCount}</div>
              <div className="text-sm text-[var(--muted)]">Failed</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors mb-6 ${
          dragActive 
            ? 'border-[var(--primary)] bg-[var(--primary)]/5' 
            : 'border-[var(--border)] hover:border-[var(--primary)]/50'
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="text-5xl mb-4">📄</div>
        <p className="text-lg font-medium">Drop receipts here</p>
        <p className="text-sm text-[var(--muted)]">or click to browse</p>
        <p className="text-xs text-[var(--muted)] mt-2">
          Accepts: JPG, PNG, WebP, PDF (max 10MB each)
        </p>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />
      
      {/* Upload Items */}
      {uploadItems.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Files to Upload</h2>
          
          {uploadItems.map((item, index) => (
            <Card 
              key={item.id}
              className={`${
                item.status === 'success' ? 'border-green-500/50 bg-green-500/5' :
                item.status === 'error' ? 'border-red-500/50 bg-red-500/5' :
                item.status === 'uploading' ? 'border-blue-500/50' : ''
              }`}
            >
              <CardContent className="pt-4">
                <div className="flex gap-4">
                  {/* Preview */}
                  <div className="w-24 h-24 flex-shrink-0 bg-[var(--muted)]/10 rounded-lg overflow-hidden flex items-center justify-center">
                    {item.preview ? (
                      <img 
                        src={item.preview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">
                        {item.file.type.includes('pdf') ? '📄' : '🖼️'}
                      </span>
                    )}
                  </div>
                  
                  {/* Form */}
                  <div className="flex-1 grid md:grid-cols-3 gap-3">
                    <div className="md:col-span-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium truncate flex-1">
                          {item.file.name}
                        </span>
                        {item.status === 'success' && (
                          <span className="text-green-500 text-sm">✓ Uploaded</span>
                        )}
                        {item.status === 'error' && (
                          <span className="text-red-500 text-sm">✗ {item.error}</span>
                        )}
                        {item.status === 'uploading' && (
                          <span className="text-blue-500 text-sm">⏳ {item.progress}%</span>
                        )}
                      </div>
                      {item.status === 'uploading' && (
                        <div className="h-1 bg-[var(--muted)]/20 rounded-full overflow-hidden mb-2">
                          <div 
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Equipment (Required) */}
                    <div>
                      <label className="text-xs text-[var(--muted)]">Equipment *</label>
                      <select
                        value={item.equipment_id}
                        onChange={(e) => updateItem(item.id, { equipment_id: e.target.value })}
                        disabled={item.status !== 'pending'}
                        className="w-full mt-1 px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded"
                      >
                        <option value="">Select equipment...</option>
                        {equipment.map(eq => (
                          <option key={eq.id} value={eq.id}>
                            {eq.equipment_code || eq.equipment_number} - {eq.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Date */}
                    <div>
                      <label className="text-xs text-[var(--muted)]">Date</label>
                      <Input
                        type="date"
                        value={item.receipt_date}
                        onChange={(e) => updateItem(item.id, { receipt_date: e.target.value })}
                        disabled={item.status !== 'pending'}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    
                    {/* Amount */}
                    <div>
                      <label className="text-xs text-[var(--muted)]">Amount ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => updateItem(item.id, { amount: e.target.value })}
                        disabled={item.status !== 'pending'}
                        placeholder="0.00"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    
                    {/* Vendor */}
                    <div>
                      <label className="text-xs text-[var(--muted)]">Vendor</label>
                      <Input
                        value={item.vendor_name}
                        onChange={(e) => updateItem(item.id, { vendor_name: e.target.value })}
                        disabled={item.status !== 'pending'}
                        placeholder="Vendor name"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    
                    {/* Type */}
                    <div>
                      <label className="text-xs text-[var(--muted)]">Type</label>
                      <select
                        value={item.attachment_type}
                        onChange={(e) => updateItem(item.id, { attachment_type: e.target.value })}
                        disabled={item.status !== 'pending'}
                        className="w-full mt-1 px-2 py-1.5 text-sm bg-[var(--background)] border border-[var(--border)] rounded"
                      >
                        <option value="receipt">Receipt</option>
                        <option value="invoice">Invoice</option>
                        <option value="service_report">Service Report</option>
                        <option value="certification">Certification</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-end">
                      {item.status === 'pending' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          Remove
                        </Button>
                      )}
                      {item.status === 'error' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateItem(item.id, { status: 'pending', error: undefined })}
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Empty State */}
      {uploadItems.length === 0 && (
        <div className="text-center py-12 text-[var(--muted)]">
          <div className="text-5xl mb-4">📤</div>
          <p>No files selected</p>
          <p className="text-sm">Drag and drop receipt images or PDFs to get started</p>
        </div>
      )}
    </div>
  );
}
