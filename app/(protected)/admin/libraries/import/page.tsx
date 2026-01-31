'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import {
  downloadHazardCSVTemplate,
  downloadTaskCSVTemplate,
  downloadSDSCSVTemplate,
  downloadLegislationCSVTemplate,
  validateCSVHeaders,
  parseArrayField,
  HAZARD_REQUIRED_HEADERS,
  TASK_REQUIRED_HEADERS,
  SDS_REQUIRED_HEADERS,
  LEGISLATION_REQUIRED_HEADERS,
  VALID_HAZARD_CATEGORIES,
} from '@/lib/validation/csv-libraries';

type LibraryType = 'hazards' | 'tasks' | 'sds' | 'legislation';

const LIBRARY_CONFIG: Record<LibraryType, {
  name: string;
  icon: string;
  description: string;
  downloadTemplate: () => void;
  requiredHeaders: readonly string[];
  tableName: string;
}> = {
  hazards: {
    name: 'Hazard Library',
    icon: '🚨',
    description: 'Hazards with controls, PPE, and risk levels',
    downloadTemplate: downloadHazardCSVTemplate,
    requiredHeaders: HAZARD_REQUIRED_HEADERS,
    tableName: 'hazard_library',
  },
  tasks: {
    name: 'Task Library',
    icon: '📋',
    description: 'Work tasks with procedures and hazard mappings',
    downloadTemplate: downloadTaskCSVTemplate,
    requiredHeaders: TASK_REQUIRED_HEADERS,
    tableName: 'task_library',
  },
  sds: {
    name: 'SDS Library',
    icon: '🧪',
    description: 'Safety Data Sheets for chemicals and materials',
    downloadTemplate: downloadSDSCSVTemplate,
    requiredHeaders: SDS_REQUIRED_HEADERS,
    tableName: 'sds_library',
  },
  legislation: {
    name: 'Legislation Library',
    icon: '⚖️',
    description: 'OH&S regulations and compliance requirements',
    downloadTemplate: downloadLegislationCSVTemplate,
    requiredHeaders: LEGISLATION_REQUIRED_HEADERS,
    tableName: 'legislation_library',
  },
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  isValid: boolean;
  errors: string[];
}

interface ImportResult {
  total: number;
  valid: number;
  invalid: number;
  rows: ParsedRow[];
}

export default function LibraryImportPage() {
  const [selectedLibrary, setSelectedLibrary] = useState<LibraryType | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importComplete, setImportComplete] = useState(false);
  const [documentControlNote, setDocumentControlNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback((file: File, libraryType: LibraryType) => {
    setParseError(null);
    setImportResult(null);
    setImportComplete(false);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please upload a CSV file');
      return;
    }

    const config = LIBRARY_CONFIG[libraryType];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim(),
      complete: (results) => {
        const headerErrors = validateCSVHeaders(
          results.meta.fields || [],
          config.requiredHeaders
        );
        
        if (headerErrors.length > 0) {
          setParseError(headerErrors.join('. '));
          return;
        }

        const rows = results.data as Record<string, string>[];
        const parsedRows: ParsedRow[] = [];
        let validCount = 0;
        let invalidCount = 0;

        rows.forEach((row, index) => {
          const rowNumber = index + 2;
          const errors: string[] = [];

          // Validate required fields
          config.requiredHeaders.forEach(header => {
            if (!row[header] || row[header].trim() === '') {
              errors.push(`Missing ${header}`);
            }
          });

          // Library-specific validation
          if (libraryType === 'hazards' && row.category) {
            if (!VALID_HAZARD_CATEGORIES.includes(row.category.toLowerCase() as any)) {
              errors.push(`Invalid category: ${row.category}`);
            }
          }

          const isValid = errors.length === 0;
          if (isValid) validCount++;
          else invalidCount++;

          parsedRows.push({
            rowNumber,
            data: row,
            isValid,
            errors,
          });
        });

        setImportResult({
          total: parsedRows.length,
          valid: validCount,
          invalid: invalidCount,
          rows: parsedRows,
        });
      },
      error: (error) => {
        setParseError(`Failed to parse CSV: ${error.message}`);
      },
    });
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (selectedLibrary && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0], selectedLibrary);
    }
  }, [selectedLibrary, parseFile]);

  const handleImport = async () => {
    if (!importResult || !selectedLibrary) return;

    setImporting(true);
    setImportProgress(0);

    const supabase = getSupabase();
    const config = LIBRARY_CONFIG[selectedLibrary];
    const validRows = importResult.rows.filter(r => r.isValid);

    try {
      // Get company ID
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .single();

      if (!profile?.company_id) {
        throw new Error('Unable to get company ID');
      }

      // Create document control entry for audit trail
      const { data: docEntry, error: docError } = await supabase
        .from('documents')
        .insert({
          company_id: profile.company_id,
          title: `${config.name} Import - ${new Date().toLocaleDateString()}`,
          document_type: 'library_import',
          folder: 'Library Updates',
          description: documentControlNote || `Bulk import of ${validRows.length} items to ${config.name}`,
          status: 'approved',
          version: 1,
        })
        .select()
        .single();

      if (docError) {
        console.warn('Document control entry not created:', docError.message);
      }

      // Import rows based on library type
      let successCount = 0;
      
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        let insertData: Record<string, any> = {};

        if (selectedLibrary === 'hazards') {
          const severity = parseInt(row.data.severity) || 3;
          const likelihood = parseInt(row.data.likelihood) || 3;
          const riskScore = severity * likelihood;
          const riskLevel = riskScore >= 20 ? 'critical' : riskScore >= 15 ? 'high' : riskScore >= 10 ? 'medium' : riskScore >= 5 ? 'low' : 'negligible';

          insertData = {
            company_id: profile.company_id,
            name: row.data.name,
            category: row.data.category?.toLowerCase() || 'other',
            subcategory: row.data.subcategory || null,
            description: row.data.description || null,
            applicable_trades: parseArrayField(row.data.applicable_trades),
            default_severity: severity,
            default_likelihood: likelihood,
            default_risk_score: riskScore,
            default_risk_level: riskLevel,
            recommended_controls: [
              ...parseArrayField(row.data.engineering_controls).map(c => ({ type: 'engineering', control: c, required: true })),
              ...parseArrayField(row.data.administrative_controls).map(c => ({ type: 'administrative', control: c, required: true })),
            ],
            required_ppe: parseArrayField(row.data.required_ppe),
            regulatory_references: parseArrayField(row.data.regulatory_references).map(r => ({ regulation: r, section: '', title: '' })),
            is_active: true,
            is_global: false,
            import_document_id: docEntry?.id || null,
          };

          await supabase.from('hazard_library').insert(insertData);
        } else if (selectedLibrary === 'tasks') {
          insertData = {
            company_id: profile.company_id,
            task_code: row.data.task_code || `TASK-${Date.now()}-${i}`,
            name: row.data.name,
            category: row.data.category,
            trade: row.data.trade,
            description: row.data.description || null,
            procedure_steps: parseArrayField(row.data.procedure_steps),
            required_equipment: parseArrayField(row.data.required_equipment),
            required_certifications: parseArrayField(row.data.required_certifications),
            ppe_required: parseArrayField(row.data.ppe_required),
            typical_duration_hours: parseFloat(row.data.duration_hours) || null,
            crew_size_min: parseInt(row.data.crew_size_min) || null,
            crew_size_max: parseInt(row.data.crew_size_max) || null,
            is_active: true,
            is_global: false,
            import_document_id: docEntry?.id || null,
          };

          await supabase.from('task_library').insert(insertData);
        } else if (selectedLibrary === 'sds') {
          insertData = {
            company_id: profile.company_id,
            product_name: row.data.product_name,
            manufacturer: row.data.manufacturer,
            product_identifier: row.data.product_identifier || null,
            sds_revision_date: row.data.sds_revision_date || null,
            whmis_hazard_classes: parseArrayField(row.data.whmis_hazard_classes),
            hazard_statements: parseArrayField(row.data.hazard_statements),
            precautionary_statements: parseArrayField(row.data.precautionary_statements),
            ppe_required: parseArrayField(row.data.ppe_required),
            storage_requirements: row.data.storage_requirements || null,
            disposal_requirements: row.data.disposal_requirements || null,
            emergency_phone: row.data.emergency_phone || null,
            locations: parseArrayField(row.data.locations),
            is_current: true,
            import_document_id: docEntry?.id || null,
          };

          await supabase.from('sds_library').insert(insertData);
        } else if (selectedLibrary === 'legislation') {
          // Check if legislation already exists
          const { data: existing } = await supabase
            .from('legislation_library')
            .select('id')
            .eq('short_name', row.data.short_name)
            .eq('jurisdiction', row.data.jurisdiction)
            .single();

          if (!existing) {
            insertData = {
              short_name: row.data.short_name,
              full_name: row.data.full_name,
              jurisdiction: row.data.jurisdiction,
              effective_date: row.data.effective_date || null,
              last_amended: row.data.last_amended || null,
              description: row.data.description || null,
              url: row.data.url || null,
              import_document_id: docEntry?.id || null,
            };

            const { data: legis } = await supabase.from('legislation_library').insert(insertData).select().single();

            // Add section if provided
            if (legis && row.data.section_number) {
              await supabase.from('legislation_sections').insert({
                legislation_id: legis.id,
                section_number: row.data.section_number,
                title: row.data.section_title || '',
                summary: row.data.section_summary || null,
              });
            }
          }
        }

        successCount++;
        setImportProgress(Math.round((successCount / validRows.length) * 100));
      }

      setImportComplete(true);
    } catch (error) {
      console.error('Import error:', error);
      setParseError(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setSelectedLibrary(null);
    setImportResult(null);
    setParseError(null);
    setImportComplete(false);
    setDocumentControlNote('');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/libraries" className="text-slate-400 hover:text-white">
              ← Back to Libraries
            </Link>
            <div className="h-6 w-px bg-slate-700" />
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                📥 Import Library Data
              </h1>
              <p className="text-sm text-slate-400">
                Bulk upload to hazards, tasks, SDS, or legislation libraries
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Success State */}
        {importComplete && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Import Complete!</h2>
            <p className="text-slate-400 mb-6">
              {importResult?.valid} items imported to {LIBRARY_CONFIG[selectedLibrary!]?.name}
            </p>
            <div className="flex gap-4 justify-center">
              <button onClick={resetImport} className="btn btn-primary">
                Import More Data
              </button>
              <Link href="/admin/libraries" className="btn border border-slate-600">
                View Libraries
              </Link>
            </div>
          </div>
        )}

        {/* Library Selection */}
        {!importComplete && !selectedLibrary && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Select Library to Update</h2>
            <div className="grid grid-cols-2 gap-4">
              {(Object.entries(LIBRARY_CONFIG) as [LibraryType, typeof LIBRARY_CONFIG[LibraryType]][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedLibrary(key)}
                  className="p-6 rounded-xl border border-slate-700 bg-slate-800/50 hover:border-indigo-500 hover:bg-slate-800 transition-all text-left"
                >
                  <span className="text-3xl mb-3 block">{config.icon}</span>
                  <h3 className="font-semibold text-lg">{config.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{config.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upload Interface */}
        {!importComplete && selectedLibrary && (
          <div className="space-y-6">
            {/* Selected Library Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{LIBRARY_CONFIG[selectedLibrary].icon}</span>
                <div>
                  <h2 className="text-lg font-semibold">{LIBRARY_CONFIG[selectedLibrary].name}</h2>
                  <p className="text-sm text-slate-400">{LIBRARY_CONFIG[selectedLibrary].description}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => LIBRARY_CONFIG[selectedLibrary].downloadTemplate()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Template
                </button>
                <button onClick={() => setSelectedLibrary(null)} className="text-slate-400 hover:text-white">
                  Change
                </button>
              </div>
            </div>

            {/* Drop Zone */}
            {!importResult && (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0], selectedLibrary)}
                />
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-lg font-medium mb-1">Drop your CSV file here</p>
                <p className="text-slate-400 text-sm">or click to browse</p>
              </div>
            )}

            {parseError && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                {parseError}
              </div>
            )}

            {/* Preview */}
            {importResult && !importing && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                  <div>
                    <span className="text-white font-medium">Preview</span>
                    <span className="text-slate-400 ml-2">
                      {importResult.valid} valid, {importResult.invalid} errors
                    </span>
                  </div>
                  <button onClick={() => setImportResult(null)} className="text-sm text-slate-400 hover:text-white">
                    Upload Different File
                  </button>
                </div>

                <div className="max-h-64 overflow-auto rounded-lg border border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/50 sticky top-0">
                      <tr>
                        <th className="py-2 px-3 text-left text-slate-400">#</th>
                        <th className="py-2 px-3 text-left text-slate-400">Name/Title</th>
                        <th className="py-2 px-3 text-left text-slate-400">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.rows.slice(0, 20).map((row) => (
                        <tr key={row.rowNumber} className={row.isValid ? '' : 'bg-red-500/5'}>
                          <td className="py-2 px-3 text-slate-500">{row.rowNumber}</td>
                          <td className="py-2 px-3 text-white">
                            {row.data.name || row.data.product_name || row.data.short_name || 'Unnamed'}
                          </td>
                          <td className="py-2 px-3">
                            {row.isValid ? (
                              <span className="text-emerald-400 text-xs">✓ Valid</span>
                            ) : (
                              <span className="text-red-400 text-xs">{row.errors.join(', ')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importResult.rows.length > 20 && (
                    <div className="p-3 text-center text-slate-500 text-sm">
                      ...and {importResult.rows.length - 20} more rows
                    </div>
                  )}
                </div>

                {/* Document Control Note */}
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    📋 Document Control
                  </h3>
                  <p className="text-sm text-slate-400 mb-3">
                    This import will be logged in the document registry for audit purposes.
                  </p>
                  <textarea
                    value={documentControlNote}
                    onChange={(e) => setDocumentControlNote(e.target.value)}
                    placeholder="Add notes about this import (optional)..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm"
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setImportResult(null)} className="flex-1 btn border border-slate-600">
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importResult.valid === 0}
                    className="flex-1 btn btn-primary disabled:opacity-50"
                  >
                    Import {importResult.valid} Items
                  </button>
                </div>
              </div>
            )}

            {/* Importing Progress */}
            {importing && (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-lg font-semibold">Importing...</p>
                <p className="text-slate-400 text-sm mt-1">{importProgress}%</p>
                <div className="w-full max-w-xs mx-auto bg-slate-700 rounded-full h-2 mt-4">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
