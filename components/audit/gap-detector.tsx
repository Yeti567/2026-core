'use client';

import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  FileX, 
  GraduationCap,
  Flame,
  ClipboardX,
  ArrowRight,
  Filter,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type GapItem } from '@/lib/audit';

interface GapData {
  gaps: GapItem[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    byType: Record<string, number>;
  };
}

const gapTypeIcons: Record<GapItem['type'], React.ElementType> = {
  missing_form: FileX,
  overdue_inspection: Clock,
  expired_training: GraduationCap,
  missing_drill: Flame,
  incomplete_documentation: ClipboardX,
};

const severityConfig = {
  critical: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400', dot: 'bg-red-500', label: 'Critical' },
  high: { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-400', dot: 'bg-orange-500', label: 'High' },
  medium: { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-400', dot: 'bg-amber-500', label: 'Medium' },
  low: { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-400', dot: 'bg-blue-500', label: 'Low' },
};

export function GapDetector() {
  const [data, setData] = useState<GapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchGapData();
  }, []);

  const fetchGapData = async () => {
    try {
      const res = await fetch('/api/audit/gaps');
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch gap data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGaps = data?.gaps.filter(gap => {
    if (filterSeverity && gap.severity !== filterSeverity) return false;
    if (filterType && gap.type !== filterType) return false;
    return true;
  }) || [];

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700/50 rounded w-1/3" />
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-700/50 rounded" />
              ))}
            </div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-700/50 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur overflow-hidden">
      <CardHeader className="border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            Gap Detector
          </CardTitle>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showFilters || filterSeverity || filterType
                ? 'bg-indigo-500/20 text-indigo-400'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(filterSeverity || filterType) && (
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Summary Stats */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['critical', 'high', 'medium', 'low'] as const).map((severity) => {
              // Safe: severity is constrained to specific string literals from const array
              // eslint-disable-next-line security/detect-object-injection
              const config = severityConfig[severity];
              // eslint-disable-next-line security/detect-object-injection
              const count = data.summary[severity];
              
              return (
                <button
                  key={severity}
                  onClick={() => setFilterSeverity(filterSeverity === severity ? null : severity)}
                  className={`p-4 rounded-xl border transition-all ${
                    filterSeverity === severity 
                      ? `${config.bg} ${config.border} ring-2 ring-offset-2 ring-offset-slate-900 ring-current ${config.text}`
                      : `${config.bg} ${config.border} hover:scale-105`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-2xl font-bold ${config.text}`}>{count}</span>
                    <div className={`w-3 h-3 rounded-full ${config.dot}`} />
                  </div>
                  <span className="text-sm text-slate-400 capitalize">{severity}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Filters panel */}
        {showFilters && (
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 animate-in fade-in duration-200">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-slate-400 mr-2">Type:</span>
              {Object.keys(gapTypeIcons).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(filterType === type ? null : type)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    filterType === type
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {type.replace(/_/g, ' ')}
                </button>
              ))}
              {(filterSeverity || filterType) && (
                <button
                  onClick={() => { setFilterSeverity(null); setFilterType(null); }}
                  className="px-3 py-1 rounded-full text-xs bg-slate-600 text-slate-200 hover:bg-slate-500"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {/* Gap List */}
        <div className="space-y-3">
          {filteredGaps.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-lg font-medium text-slate-200">
                {data?.gaps.length === 0 ? 'No gaps detected!' : 'No gaps match filters'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {data?.gaps.length === 0 
                  ? 'Your compliance documentation is looking great.'
                  : 'Try adjusting your filters to see more items.'}
              </p>
            </div>
          ) : (
            filteredGaps.map((gap) => {
              const config = severityConfig[gap.severity];
              const Icon = gapTypeIcons[gap.type];
              
              return (
                <div 
                  key={gap.id}
                  className={`p-4 rounded-xl border transition-all hover:scale-[1.01] ${config.bg} ${config.border}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${config.bg} ${config.border}`}>
                      <Icon className={`w-5 h-5 ${config.text}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-200">
                              {gap.title}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.text} ${config.border} border`}>
                              {config.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 mt-1">
                            {gap.description}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          Element {gap.elementNumber}
                        </span>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {gap.estimatedTime}
                          </span>
                          {gap.dueDate && (
                            <span className={`flex items-center gap-1 ${
                              new Date(gap.dueDate) < new Date() ? 'text-red-400' : ''
                            }`}>
                              Due: {new Date(gap.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-indigo-400">
                          <span>{gap.actionItem}</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Auto-generated action items summary */}
        {filteredGaps.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/30">
            <h4 className="font-semibold text-indigo-400 mb-2">Auto-Generated Action Plan</h4>
            <ul className="space-y-1.5 text-sm text-slate-300">
              {filteredGaps.slice(0, 5).map((gap, index) => (
                <li key={gap.id} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  {gap.actionItem}
                </li>
              ))}
              {filteredGaps.length > 5 && (
                <li className="text-slate-400 text-xs pl-7">
                  +{filteredGaps.length - 5} more action items
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
