'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Loader2,
  FileText,
  FileCheck,
  BarChart3
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface ElementEvidenceSummary {
  element_number: number;
  element_name: string;
  total_forms: number;
  converted_forms: number;
  manual_forms: number;
  total_submissions_90_days: number;
  evidence_status: 'sufficient' | 'partial' | 'insufficient';
}

// =============================================================================
// STATUS CONFIG
// =============================================================================

const EVIDENCE_STATUS_CONFIG = {
  sufficient: {
    label: 'Sufficient',
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    icon: CheckCircle2,
  },
  partial: {
    label: 'Partial',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    icon: AlertTriangle,
  },
  insufficient: {
    label: 'Insufficient',
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    icon: XCircle,
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function AuditEvidenceWidget() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<ElementEvidenceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSummaries() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/audit/evidence-summary');
        if (!response.ok) throw new Error('Failed to load');
        const data = await response.json();
        setSummaries(data.summaries || []);
      } catch (err) {
        console.error('Failed to load evidence summaries:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSummaries();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate overview stats
  const sufficientCount = summaries.filter(s => s.evidence_status === 'sufficient').length;
  const partialCount = summaries.filter(s => s.evidence_status === 'partial').length;
  const insufficientCount = summaries.filter(s => s.evidence_status === 'insufficient').length;
  const totalForms = summaries.reduce((sum, s) => sum + s.total_forms, 0);
  const convertedForms = summaries.reduce((sum, s) => sum + s.converted_forms, 0);

  // Sort by status (insufficient first)
  const sortedSummaries = [...summaries].sort((a, b) => {
    const order = { insufficient: 0, partial: 1, sufficient: 2 };
    return order[a.evidence_status] - order[b.evidence_status];
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-blue-600" />
            COR Audit Evidence
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/audit')}
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Full Report
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
            <p className="text-2xl font-bold text-green-700">{sufficientCount}</p>
            <p className="text-xs text-green-600">Sufficient</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-2xl font-bold text-amber-700">{partialCount}</p>
            <p className="text-xs text-amber-600">Partial</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-2xl font-bold text-red-700">{insufficientCount}</p>
            <p className="text-xs text-red-600">Needs Work</p>
          </div>
        </div>

        {/* Form Sources */}
        <div className="flex items-center justify-center gap-6 py-3 bg-gray-50 rounded-lg mb-4">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">{totalForms - convertedForms} manual</span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-2 text-sm">
            <FileCheck className="w-4 h-4 text-purple-500" />
            <span className="text-gray-600">{convertedForms} converted</span>
          </div>
        </div>

        {/* Elements with issues */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Elements Status</h4>
          
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {sortedSummaries.slice(0, 8).map((summary) => {
              const statusConfig = EVIDENCE_STATUS_CONFIG[summary.evidence_status];
              const StatusIcon = statusConfig.icon;
              
              return (
                <button
                  key={summary.element_number}
                  onClick={() => router.push(`/audit?element=${summary.element_number}`)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                    statusConfig.bgColor,
                    'hover:opacity-90'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    summary.evidence_status === 'sufficient' ? 'bg-green-200 text-green-800' :
                    summary.evidence_status === 'partial' ? 'bg-amber-200 text-amber-800' :
                    'bg-red-200 text-red-800'
                  )}>
                    {summary.element_number}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {summary.element_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {summary.total_forms} form{summary.total_forms !== 1 ? 's' : ''} • 
                      {' '}{summary.total_submissions_90_days} submissions (90d)
                    </p>
                  </div>

                  <StatusIcon className={cn('w-5 h-5 flex-shrink-0', statusConfig.color)} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-4 pt-3 border-t">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push('/audit')}
          >
            View Full Audit Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default AuditEvidenceWidget;
