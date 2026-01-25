'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Package, 
  CheckCircle,
  Loader2,
  FolderOpen,
  FileCheck,
  Clock,
  AlertCircle,
  Settings,
  ChevronDown,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COR_ELEMENTS, type ComplianceScore } from '@/lib/audit';
import {
  generateAuditPackage,
  type CompanyInfo,
  type ElementScore,
  type PackageOptions
} from '@/lib/audit/package-generator';

interface PackageSection {
  elementNumber: number;
  elementName: string;
  status: 'complete' | 'partial' | 'missing';
  percentage: number;
  documentCount: number;
  pageEstimate: number;
  lastUpdated: string | null;
  evidence: Array<{
    id: string;
    type: string;
    reference: string;
    title: string;
    description: string;
    date: string;
  }>;
  gaps: Array<{
    description: string;
    severity: string;
  }>;
}

interface GenerationProgress {
  stage: string;
  progress: number;
  currentElement?: number;
}

type ExportFormat = 'full' | 'executive' | 'element' | 'custom';

export function AuditPackageGenerator() {
  const [sections, setSections] = useState<PackageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [companyName, setCompanyName] = useState('Your Company');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  
  // Export options
  const [exportFormat, setExportFormat] = useState<ExportFormat>('full');
  const [selectedElements, setSelectedElements] = useState<number[]>([]);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    fetchPackageData();
  }, []);

  const fetchPackageData = async () => {
    try {
      const res = await fetch('/api/audit/compliance');
      if (res.ok) {
        const data = await res.json();
        
        // Transform compliance data to package sections
        const packageSections: PackageSection[] = data.elements.map((element: ComplianceScore) => {
          const corElement = COR_ELEMENTS.find(e => e.number === element.elementNumber);
          return {
            elementNumber: element.elementNumber,
            elementName: element.elementName,
            status: element.percentage >= 80 ? 'complete' : element.percentage >= 50 ? 'partial' : 'missing',
            percentage: element.percentage,
            documentCount: Math.ceil(element.percentage / 20),
            pageEstimate: Math.max(5, Math.ceil(element.percentage / 5)),
            lastUpdated: element.percentage > 0 ? new Date().toISOString() : null,
            evidence: [],
            gaps: element.gaps?.map((g: { title: string; severity: string }) => ({
              description: g.title,
              severity: g.severity || 'minor'
            })) || []
          };
        });
        
        setSections(packageSections);
        setSelectedElements(packageSections.map(s => s.elementNumber));
        
        // Set company name from data if available
        if (data.companyName) {
          setCompanyName(data.companyName);
        }
      }
    } catch (error) {
      console.error('Failed to fetch package data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePackageHandler = async () => {
    setGenerating(true);
    setProgress({ stage: 'Initializing...', progress: 0 });

    try {
      // Prepare company info
      const company: CompanyInfo = companyInfo || {
        id: 'company-1',
        name: companyName,
        wsib_number: '',
        address: '',
        safety_manager_name: 'Safety Manager',
        industry: 'Construction'
      };

      // Transform sections to ElementScore format
      const elementScores: ElementScore[] = sections.map(s => ({
        element_number: s.elementNumber,
        element_name: s.elementName,
        percentage: s.percentage,
        status: s.percentage >= 80 ? 'good' : s.percentage >= 60 ? 'needs_improvement' : 'critical',
        found_evidence: s.evidence.map(e => ({
          ...e,
          type: e.type as 'form' | 'training' | 'inspection' | 'drill' | 'meeting' | 'certificate' | 'policy'
        })),
        gaps: s.gaps
      }));

      // Prepare options based on export format
      const options: PackageOptions = {
        includeElements: exportFormat === 'custom' ? selectedElements : 
                        exportFormat === 'element' ? selectedElements.slice(0, 1) : [],
        includeAppendices: exportFormat !== 'executive',
        includeExecutiveSummary: true,
        maxFormsPerElement: exportFormat === 'executive' ? 2 : 5,
        includePhotos
      };

      // Generate PDF
      const pdfBytes = await generateAuditPackage(
        company,
        elementScores,
        options,
        (prog, status) => {
          setProgress({ stage: status, progress: prog });
        }
      );

      // Download the PDF
      const bytes = Uint8Array.from(pdfBytes as any);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const dateStr = new Date().toISOString().split('T')[0];
      const formatSuffix = exportFormat === 'executive' ? '_Executive' : 
                          exportFormat === 'element' ? `_Element${selectedElements[0]}` : '';
      link.download = `COR_Audit_Package_${companyName.replace(/\s+/g, '_')}${formatSuffix}_${dateStr}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress({ stage: 'Complete!', progress: 100 });
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to generate package:', error);
      alert('Failed to generate audit package. Please try again.');
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  };

  const toggleElementSelection = (elementNum: number) => {
    setSelectedElements(prev => 
      prev.includes(elementNum)
        ? prev.filter(n => n !== elementNum)
        : [...prev, elementNum]
    );
  };

  const totalPages = sections.reduce((sum, s) => sum + s.pageEstimate, 0);
  const totalDocuments = sections.reduce((sum, s) => sum + s.documentCount, 0);
  const completeSections = sections.filter(s => s.status === 'complete').length;
  
  const estimatedPages = exportFormat === 'executive' ? Math.ceil(totalPages * 0.15) :
                        exportFormat === 'element' ? sections.find(s => s.elementNumber === selectedElements[0])?.pageEstimate || 20 :
                        exportFormat === 'custom' ? sections.filter(s => selectedElements.includes(s.elementNumber)).reduce((sum, s) => sum + s.pageEstimate, 0) :
                        totalPages;

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700/50 rounded w-1/3" />
            <div className="h-32 bg-slate-700/50 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur overflow-hidden">
      <CardHeader className="border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-transparent">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 rounded-lg bg-orange-500/20">
            <Package className="w-6 h-6 text-orange-400" />
          </div>
          Audit Package Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <FileText className="w-4 h-4" />
              Total Documents
            </div>
            <div className="text-2xl font-bold text-slate-200">{totalDocuments}</div>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <FolderOpen className="w-4 h-4" />
              Est. Pages
            </div>
            <div className="text-2xl font-bold text-slate-200">~{estimatedPages}</div>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <FileCheck className="w-4 h-4" />
              Complete
            </div>
            <div className="text-2xl font-bold text-slate-200">{completeSections}/14</div>
          </div>
        </div>

        {/* Company name input */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Company Name for Package</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            placeholder="Enter company name"
          />
        </div>

        {/* Export Format Selection */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Export Format</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { value: 'full', label: 'Full Package', desc: `~${totalPages} pages` },
              { value: 'executive', label: 'Executive Summary', desc: '~20 pages' },
              { value: 'element', label: 'Single Element', desc: 'Choose one' },
              { value: 'custom', label: 'Custom Selection', desc: 'Pick elements' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setExportFormat(option.value as ExportFormat)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  exportFormat === option.value
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <div className="text-sm font-medium text-slate-200">{option.label}</div>
                <div className="text-xs text-slate-500">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Element Selection for Single Element or Custom */}
        {(exportFormat === 'element' || exportFormat === 'custom') && (
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              {exportFormat === 'element' ? 'Select Element' : 'Select Elements to Include'}
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto scrollbar-thin p-1">
              {sections.map((section) => (
                <button
                  key={section.elementNumber}
                  onClick={() => {
                    if (exportFormat === 'element') {
                      setSelectedElements([section.elementNumber]);
                    } else {
                      toggleElementSelection(section.elementNumber);
                    }
                  }}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    selectedElements.includes(section.elementNumber)
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${
                      selectedElements.includes(section.elementNumber)
                        ? 'bg-orange-500'
                        : 'border border-slate-600'
                    }`}>
                      {selectedElements.includes(section.elementNumber) && (
                        <CheckCircle className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm text-slate-200 truncate">
                      {section.elementNumber}. {section.elementName}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Options Toggle */}
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Advanced Options
          <ChevronDown className={`w-4 h-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
        </button>

        {showOptions && (
          <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includePhotos}
                onChange={(e) => setIncludePhotos(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm text-slate-300">Include photo attachments</span>
            </label>
          </div>
        )}

        {/* Section checklist */}
        <div>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            Package Contents Preview
          </h3>
          
          <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto scrollbar-thin">
            {sections.map((section) => {
              const isIncluded = exportFormat === 'full' || 
                                exportFormat === 'executive' ||
                                selectedElements.includes(section.elementNumber);
              
              return (
                <div 
                  key={section.elementNumber}
                  className={`p-3 rounded-lg border transition-all ${
                    !isIncluded
                      ? 'opacity-40 bg-slate-800/20 border-slate-700/30'
                      : section.status === 'complete' 
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : section.status === 'partial'
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : 'bg-red-500/5 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {section.status === 'complete' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : section.status === 'partial' ? (
                      <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-200 truncate">
                        {section.elementNumber}. {section.elementName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {section.percentage}% • ~{section.pageEstimate} pages
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Generate progress */}
        {generating && progress && (
          <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
              <span className="text-sm text-orange-400">{progress.stage}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            <div className="text-right mt-1">
              <span className="text-xs text-slate-400">{progress.progress}%</span>
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={generatePackageHandler}
          disabled={generating || completeSections === 0 || (exportFormat !== 'full' && exportFormat !== 'executive' && selectedElements.length === 0)}
          className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-3 transition-all"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Generate {estimatedPages}-Page PDF Package
            </>
          )}
        </button>

        <p className="text-xs text-slate-500 text-center">
          PDF will be generated and downloaded automatically. Large packages may take 1-2 minutes.
        </p>
      </CardContent>
    </Card>
  );
}
