'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  FileText,
  CheckCircle2,
  FileEdit,
  Plus,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock,
  TrendingUp
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface ConversionStats {
  total_conversions: number;
  published_count: number;
  draft_count: number;
  total_fields_converted: number;
  average_fields_per_form: number;
  cor_related_count: number;
  non_cor_count: number;
  recent_conversions: RecentConversion[];
}

interface RecentConversion {
  id: string;
  form_name: string;
  original_pdf_name: string;
  status: 'draft' | 'mapping_fields' | 'ready_to_publish' | 'published' | 'archived';
  fields_count: number;
  created_at: string;
  published_at: string | null;
  template_id: string | null;
}

// =============================================================================
// STATUS CONFIG
// =============================================================================

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-700',
    icon: FileEdit,
  },
  mapping_fields: {
    label: 'Mapping',
    color: 'bg-amber-100 text-amber-700',
    icon: FileEdit,
  },
  ready_to_publish: {
    label: 'Ready',
    color: 'bg-blue-100 text-blue-700',
    icon: CheckCircle2,
  },
  published: {
    label: 'Published',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
  },
  archived: {
    label: 'Archived',
    color: 'bg-gray-100 text-gray-500',
    icon: FileText,
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ConvertedFormsWidget() {
  const router = useRouter();
  const [stats, setStats] = useState<ConversionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/forms/conversions/stats');
        if (!response.ok) throw new Error('Failed to load stats');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
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

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Unable to load conversion stats</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-purple-600" />
            Converted Forms
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/forms/import')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Convert PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.total_conversions}</p>
            <p className="text-xs text-gray-500">Total Converted</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-700">{stats.published_count}</p>
            <p className="text-xs text-green-600">Published</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <p className="text-2xl font-bold text-amber-700">{stats.draft_count}</p>
            <p className="text-xs text-amber-600">In Progress</p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4 px-1">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            {stats.total_fields_converted} fields converted
          </span>
          <span>
            Avg: {stats.average_fields_per_form} fields/form
          </span>
        </div>

        {/* Recent Conversions */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Conversions</h4>
          
          {stats.recent_conversions.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">No conversions yet</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => router.push('/admin/forms/import')}
                className="mt-2"
              >
                Convert your first PDF
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recent_conversions.slice(0, 5).map((conversion) => {
                const statusConfig = STATUS_CONFIG[conversion.status];
                const StatusIcon = statusConfig.icon;
                
                return (
                  <button
                    key={conversion.id}
                    onClick={() => {
                      if (conversion.status === 'published' && conversion.template_id) {
                        router.push(`/admin/forms/${conversion.template_id}`);
                      } else {
                        router.push(`/admin/forms/convert/${conversion.id}`);
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                  >
                    <StatusIcon className={cn(
                      'w-4 h-4 flex-shrink-0',
                      conversion.status === 'published' ? 'text-green-600' : 'text-gray-400'
                    )} />
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conversion.form_name}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {formatDate(conversion.published_at || conversion.created_at)}
                        <span>•</span>
                        {conversion.fields_count} fields
                      </p>
                    </div>

                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium flex-shrink-0',
                      statusConfig.color
                    )}>
                      {statusConfig.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* View All Link */}
        {stats.total_conversions > 5 && (
          <div className="mt-4 pt-3 border-t">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/admin/forms?filter=converted')}
            >
              View All Conversions
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default ConvertedFormsWidget;
