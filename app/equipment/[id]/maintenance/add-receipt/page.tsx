'use client';

import { useState, useRef, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

// ============================================================================
// TYPES
// ============================================================================

interface Equipment {
  id: string;
  equipment_number: string;
  name: string;
  equipment_type: string;
  current_hours?: number;
}

interface ExtractedData {
  vendor_name: string | null;
  date: string | null;
  amount: number | null;
  invoice_number: string | null;
  confidence: number;
}

type AttachmentType = 'receipt' | 'invoice' | 'service_report' | 'certification' | 'other';
type MaintenanceType = 'preventive' | 'corrective' | 'inspection' | 'certification' | 'repair';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AddReceiptPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id: equipmentId } = use(params);
  const router = useRouter();
  
  // State
  const [step, setStep] = useState<'capture' | 'review' | 'maintenance'>('capture');
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Capture state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] = useState<AttachmentType>('receipt');
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Review state
  const [extractedData, setExtractedData] = useState<ExtractedData>({
    vendor_name: null,
    date: null,
    amount: null,
    invoice_number: null,
    confidence: 0
  });
  const [vendorName, setVendorName] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [createMaintenanceRecord, setCreateMaintenanceRecord] = useState(false);
  const [selectedMaintenanceRecordId, setSelectedMaintenanceRecordId] = useState('');
  
  // Maintenance record state
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('corrective');
  const [performedBy, setPerformedBy] = useState<'internal' | 'external'>('external');
  const [technicianName, setTechnicianName] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [equipmentHours, setEquipmentHours] = useState('');
  const [conditionAfter, setConditionAfter] = useState('good');
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [notes, setNotes] = useState('');
  
  // Fetch equipment (supports both UUID and equipment number like EQP-003)
  useEffect(() => {
    async function fetchEquipment() {
      try {
        // Try to determine if this is a UUID or equipment number
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(equipmentId);
        
        const res = await fetch(`/api/admin/equipment`);
        if (res.ok) {
          const data = await res.json();
          // Find by ID or equipment_number/equipment_code
          const eq = data.equipment?.find((e: Equipment & { equipment_code?: string }) => 
            e.id === equipmentId || 
            e.equipment_number === equipmentId ||
            e.equipment_code === equipmentId ||
            e.equipment_number?.toUpperCase() === equipmentId.toUpperCase() ||
            e.equipment_code?.toUpperCase() === equipmentId.toUpperCase()
          );
          if (eq) {
            setEquipment(eq);
            // Update URL to use actual ID if we found by equipment number
            if (!isUUID && eq.id !== equipmentId) {
              // Store actual equipment ID for API calls
              setEquipment({ ...eq, id: eq.id });
            }
            if (eq.current_hours) {
              setEquipmentHours(eq.current_hours.toString());
            }
          } else {
            setError(`Equipment "${equipmentId}" not found`);
          }
        }
      } catch (err) {
        console.error('Error fetching equipment:', err);
        setError('Failed to load equipment');
      } finally {
        setIsLoading(false);
      }
    }
    fetchEquipment();
  }, [equipmentId]);
  
  // Camera handling
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please use file upload instead.');
    }
  };
  
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };
  
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `receipt_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setCapturedFile(file);
          setCapturedImage(canvas.toDataURL('image/jpeg'));
          stopCamera();
          setStep('review');
        }
      }, 'image/jpeg', 0.9);
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setCapturedFile(file);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setCapturedImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // PDF - show placeholder
        setCapturedImage(null);
      }
      
      setStep('review');
    }
  };
  
  const retakePhoto = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    setStep('capture');
  };
  
  const addTag = () => {
    if (newTag && !tags.includes(newTag.toLowerCase())) {
      setTags([...tags, newTag.toLowerCase()]);
      setNewTag('');
    }
  };
  
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  // Submit receipt
  const handleSubmit = async () => {
    if (!capturedFile) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', capturedFile);
      formData.append('equipment_id', equipmentId);
      formData.append('attachment_type', attachmentType);
      formData.append('vendor_name', vendorName);
      formData.append('amount', amount);
      formData.append('attachment_date', receiptDate);
      formData.append('description', description);
      formData.append('tags', JSON.stringify(tags));
      formData.append('uploaded_via', 'mobile');
      
      if (selectedMaintenanceRecordId) {
        formData.append('maintenance_record_id', selectedMaintenanceRecordId);
      }
      
      if (createMaintenanceRecord) {
        formData.append('create_maintenance_record', 'true');
        formData.append('maintenance_data', JSON.stringify({
          maintenance_type: maintenanceType,
          actual_date: receiptDate,
          work_description: workDescription || description,
          vendor_name: performedBy === 'external' ? vendorName : null,
          technician_name: technicianName,
          cost_labour: parseFloat(laborCost) || 0,
          cost_parts: parseFloat(partsCost) || 0,
          odometer_hours: parseFloat(equipmentHours) || null,
          condition_after_service: conditionAfter,
          next_service_date: nextServiceDate || null,
          notes: notes
        }));
      }
      
      const res = await fetch('/api/maintenance/upload-receipt', {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      
      // Success - go back
      router.push(`/admin/maintenance/equipment/${equipmentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload receipt');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-[var(--muted)]">Loading...</p>
        </div>
      </div>
    );
  }
  
  // ============================================================================
  // STEP 1: CAPTURE
  // ============================================================================
  if (step === 'capture') {
    return (
      <div className="min-h-screen bg-[var(--background)] p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            📸 Capture Receipt
          </h1>
          <button 
            onClick={() => router.back()}
            className="p-2 text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ✕
          </button>
        </div>
        
        {/* Equipment Selector */}
        <div className="mb-4 p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]">
          <div className="text-sm text-[var(--muted)]">Equipment:</div>
          <div className="font-medium">
            {equipment?.equipment_number} - {equipment?.name}
          </div>
        </div>
        
        {/* Camera/Preview Area */}
        <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden mb-4">
          {cameraActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Overlay guide */}
              <div className="absolute inset-4 border-2 border-white/30 border-dashed rounded-lg pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-white/60 text-sm text-center px-4">
                    Position receipt in frame<br/>
                    Ensure all text is readable
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/60">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-center px-4">
                Tap below to capture or upload a receipt
              </p>
            </div>
          )}
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Receipt Type */}
        <div className="mb-4">
          <div className="text-sm font-medium mb-2">Receipt Type:</div>
          <div className="space-y-2">
            {[
              { value: 'receipt', label: 'Service/Repair Receipt', icon: '🧾' },
              { value: 'invoice', label: 'Parts Purchase', icon: '🔩' },
              { value: 'certification', label: 'Inspection/Certification', icon: '📜' },
              { value: 'other', label: 'Other', icon: '📄' }
            ].map(opt => (
              <label 
                key={opt.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  attachmentType === opt.value 
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10' 
                    : 'border-[var(--border)] bg-[var(--card)]'
                }`}
              >
                <input
                  type="radio"
                  name="attachmentType"
                  value={opt.value}
                  checked={attachmentType === opt.value}
                  onChange={(e) => setAttachmentType(e.target.value as AttachmentType)}
                  className="sr-only"
                />
                <span className="text-xl">{opt.icon}</span>
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Capture Buttons */}
        <div className="space-y-3">
          {cameraActive ? (
            <>
              <Button 
                onClick={capturePhoto}
                className="w-full py-6 text-lg"
              >
                📸 Capture Photo
              </Button>
              <Button 
                variant="outline"
                onClick={stopCamera}
                className="w-full"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={startCamera}
                className="w-full py-6 text-lg"
              >
                📸 Open Camera
              </Button>
              <Button 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                📁 Upload Existing File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </>
          )}
        </div>
        
        {/* Tips */}
        <div className="mt-6 p-4 bg-[var(--muted)]/10 rounded-lg">
          <div className="text-sm font-medium mb-2">💡 Tips:</div>
          <ul className="text-sm text-[var(--muted)] space-y-1">
            <li>• Use good lighting</li>
            <li>• Lay receipt flat</li>
            <li>• Capture all 4 corners</li>
            <li>• Avoid shadows/glare</li>
          </ul>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }
  
  // ============================================================================
  // STEP 2: REVIEW
  // ============================================================================
  if (step === 'review') {
    return (
      <div className="min-h-screen bg-[var(--background)] p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Review Receipt</h1>
          <button 
            onClick={() => router.back()}
            className="p-2 text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ✕
          </button>
        </div>
        
        {/* Image Preview */}
        <div className="relative aspect-[4/3] bg-[var(--muted)]/10 rounded-xl overflow-hidden mb-4">
          {capturedImage ? (
            <img 
              src={capturedImage} 
              alt="Receipt preview" 
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="text-6xl mb-2">📄</div>
              <p className="text-[var(--muted)]">{capturedFile?.name}</p>
            </div>
          )}
        </div>
        
        {/* Image Actions */}
        <div className="flex gap-2 mb-6">
          <Button variant="outline" size="sm" className="flex-1">
            ↻ Rotate
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            ✂ Crop
          </Button>
          <Button variant="outline" size="sm" onClick={retakePhoto}>
            🗑 Retake
          </Button>
        </div>
        
        {/* Extracted Data */}
        <div className="space-y-4">
          <div className="p-3 bg-blue-500/10 rounded-lg">
            <div className="text-sm font-medium text-blue-500 mb-1">
              Auto-Detected Info (verify accuracy):
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Vendor</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Vendor name"
              />
              {extractedData.vendor_name && (
                <span className="text-green-500 text-xs self-center">✓</span>
              )}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Date</label>
            <div className="flex gap-2 mt-1">
              <Input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
              />
              {extractedData.date && (
                <span className="text-green-500 text-xs self-center">✓</span>
              )}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Amount ($)</label>
            <div className="flex gap-2 mt-1">
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              {extractedData.amount && (
                <span className="text-green-500 text-xs self-center">✓</span>
              )}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Receipt Type</label>
            <select
              value={attachmentType}
              onChange={(e) => setAttachmentType(e.target.value as AttachmentType)}
              className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
            >
              <option value="receipt">Service/Repair Receipt</option>
              <option value="invoice">Invoice</option>
              <option value="service_report">Service Report</option>
              <option value="certification">Certification</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Link to Maintenance Record (optional)</label>
            <select
              value={selectedMaintenanceRecordId}
              onChange={(e) => setSelectedMaintenanceRecordId(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
            >
              <option value="">Select existing record...</option>
              {/* Would be populated with actual records */}
            </select>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-[var(--muted)]/10 rounded-lg">
            <input
              type="checkbox"
              id="createMaintenance"
              checked={createMaintenanceRecord}
              onChange={(e) => setCreateMaintenanceRecord(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="createMaintenance" className="text-sm font-medium">
              Create new maintenance record
            </label>
          </div>
          
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this receipt for?"
              className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg min-h-[80px]"
            />
          </div>
          
          {/* Tags */}
          <div>
            <label className="text-sm font-medium">Tags</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {tags.map(tag => (
                <span 
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-sm"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-red-500">
                    ✕
                  </button>
                </span>
              ))}
              <div className="flex gap-1">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className="w-28 h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button size="sm" variant="outline" onClick={addTag}>+</Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => setStep('capture')} className="flex-1">
            ← Back
          </Button>
          {createMaintenanceRecord ? (
            <Button onClick={() => setStep('maintenance')} className="flex-1">
              Continue →
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={isUploading}
              className="flex-1"
            >
              {isUploading ? '⏳ Uploading...' : 'Save Receipt'}
            </Button>
          )}
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }
  
  // ============================================================================
  // STEP 3: CREATE MAINTENANCE RECORD
  // ============================================================================
  return (
    <div className="min-h-screen bg-[var(--background)] p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Create Maintenance Record</h1>
        <button 
          onClick={() => router.back()}
          className="p-2 text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ✕
        </button>
      </div>
      
      {/* Equipment Info */}
      <div className="mb-4 p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]">
        <div className="text-sm text-[var(--muted)]">Equipment:</div>
        <div className="font-medium">
          {equipment?.equipment_number} - {equipment?.name}
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Maintenance Type */}
        <div>
          <label className="text-sm font-medium">Maintenance Type</label>
          <select
            value={maintenanceType}
            onChange={(e) => setMaintenanceType(e.target.value as MaintenanceType)}
            className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
          >
            <option value="corrective">Corrective (Repair)</option>
            <option value="preventive">Preventive Maintenance</option>
            <option value="inspection">Inspection</option>
            <option value="certification">Certification</option>
            <option value="repair">General Repair</option>
          </select>
        </div>
        
        {/* Date */}
        <div>
          <label className="text-sm font-medium">Date Performed</label>
          <Input
            type="date"
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
            className="mt-1"
          />
        </div>
        
        {/* Work Description */}
        <div>
          <label className="text-sm font-medium">Work Description</label>
          <textarea
            value={workDescription}
            onChange={(e) => setWorkDescription(e.target.value)}
            placeholder="What work was performed?"
            className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg min-h-[100px]"
          />
        </div>
        
        {/* Performed By */}
        <div>
          <label className="text-sm font-medium">Performed By</label>
          <div className="flex gap-2 mt-1">
            <label className={`flex-1 p-3 rounded-lg border cursor-pointer text-center ${
              performedBy === 'internal' 
                ? 'border-[var(--primary)] bg-[var(--primary)]/10' 
                : 'border-[var(--border)]'
            }`}>
              <input
                type="radio"
                name="performedBy"
                value="internal"
                checked={performedBy === 'internal'}
                onChange={() => setPerformedBy('internal')}
                className="sr-only"
              />
              <div className="text-sm">👤 Internal</div>
            </label>
            <label className={`flex-1 p-3 rounded-lg border cursor-pointer text-center ${
              performedBy === 'external' 
                ? 'border-[var(--primary)] bg-[var(--primary)]/10' 
                : 'border-[var(--border)]'
            }`}>
              <input
                type="radio"
                name="performedBy"
                value="external"
                checked={performedBy === 'external'}
                onChange={() => setPerformedBy('external')}
                className="sr-only"
              />
              <div className="text-sm">🏢 External Vendor</div>
            </label>
          </div>
        </div>
        
        {performedBy === 'external' && (
          <div>
            <label className="text-sm font-medium">Vendor Name</label>
            <Input
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Vendor name"
              className="mt-1"
            />
          </div>
        )}
        
        <div>
          <label className="text-sm font-medium">Technician Name</label>
          <Input
            value={technicianName}
            onChange={(e) => setTechnicianName(e.target.value)}
            placeholder="Who performed the work?"
            className="mt-1"
          />
        </div>
        
        {/* Costs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Labour Cost ($)</label>
            <Input
              type="number"
              step="0.01"
              value={laborCost}
              onChange={(e) => setLaborCost(e.target.value)}
              placeholder="0.00"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Parts Cost ($)</label>
            <Input
              type="number"
              step="0.01"
              value={partsCost}
              onChange={(e) => setPartsCost(e.target.value)}
              placeholder="0.00"
              className="mt-1"
            />
          </div>
        </div>
        
        <div className="p-3 bg-green-500/10 rounded-lg">
          <div className="text-sm text-[var(--muted)]">Total (from receipt)</div>
          <div className="text-lg font-bold text-green-500">
            ${amount || ((parseFloat(laborCost) || 0) + (parseFloat(partsCost) || 0)).toFixed(2)}
          </div>
        </div>
        
        {/* Equipment Hours */}
        <div>
          <label className="text-sm font-medium">Equipment Hours (current reading)</label>
          <Input
            type="number"
            step="0.1"
            value={equipmentHours}
            onChange={(e) => setEquipmentHours(e.target.value)}
            placeholder="Hour meter reading"
            className="mt-1"
          />
        </div>
        
        {/* Condition After Service */}
        <div>
          <label className="text-sm font-medium">Condition After Service</label>
          <select
            value={conditionAfter}
            onChange={(e) => setConditionAfter(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
          >
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
            <option value="out_of_service">Out of Service</option>
          </select>
        </div>
        
        {/* Next Service Due */}
        <div>
          <label className="text-sm font-medium">Next Service Due (optional)</label>
          <Input
            type="date"
            value={nextServiceDate}
            onChange={(e) => setNextServiceDate(e.target.value)}
            className="mt-1"
          />
        </div>
        
        {/* Notes */}
        <div>
          <label className="text-sm font-medium">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
            className="w-full mt-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg min-h-[80px]"
          />
        </div>
        
        {/* Attached Receipt */}
        <div className="p-3 bg-[var(--muted)]/10 rounded-lg">
          <div className="text-sm font-medium mb-2">Attachments:</div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <span className="text-sm">{capturedFile?.name || 'Receipt image'}</span>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--background)] border-t border-[var(--border)]">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button variant="outline" onClick={() => setStep('review')} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isUploading}
            className="flex-1"
          >
            {isUploading ? '⏳ Saving...' : 'Save Maintenance Record'}
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
