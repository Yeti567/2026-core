'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COR_ELEMENTS, COR_PASSING_THRESHOLD, type ComplianceScore } from '@/lib/audit';

interface ComplianceData {
  overall: {
    score: number;
    maxScore: number;
    percentage: number;
    status: 'passing' | 'at-risk' | 'failing';
    passingThreshold: number;
  };
  elements: ComplianceScore[];
  lastUpdated: string;
}

export function ComplianceScorecard() {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedElements, setExpandedElements] = useState<number[]>([]);

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      const res = await fetch('/api/audit/compliance');
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleElement = (elementNumber: number) => {
    setExpandedElements(prev => 
      prev.includes(elementNumber) 
        ? prev.filter(n => n !== elementNumber)
        : [...prev, elementNumber]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passing':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'at-risk':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'failing':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case 'passing':
        return { bg: 'bg-emerald-500', track: 'bg-emerald-500/20', text: 'text-emerald-400' };
      case 'at-risk':
        return { bg: 'bg-amber-500', track: 'bg-amber-500/20', text: 'text-amber-400' };
      case 'failing':
        return { bg: 'bg-red-500', track: 'bg-red-500/20', text: 'text-red-400' };
      default:
        return { bg: 'bg-slate-500', track: 'bg-slate-500/20', text: 'text-slate-400' };
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700/50 rounded w-1/3" />
            <div className="h-32 bg-slate-700/50 rounded" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-700/50 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
        <CardContent className="p-6 text-center text-slate-400">
          Failed to load compliance data
        </CardContent>
      </Card>
    );
  }

  const { overall, elements } = data;
  const statusColors = getStatusColors(overall.status);
  const needsPoints = overall.passingThreshold - overall.percentage;

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur overflow-hidden">
      <CardHeader className="border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-transparent">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 rounded-lg bg-indigo-500/20">
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          Compliance Scorecard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Overall Score */}
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-lg font-medium text-slate-200">Overall Readiness</span>
              {getStatusIcon(overall.status)}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-4xl font-bold ${statusColors.text}`}>
                {overall.percentage}%
              </span>
              <span className="text-slate-500 text-sm">/ {overall.passingThreshold}%</span>
            </div>
          </div>
          
          {/* Main progress bar */}
          <div className="relative h-6 rounded-full overflow-hidden bg-slate-800">
            {/* Threshold marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
              style={{ left: `${overall.passingThreshold}%` }}
            />
            <div 
              className="absolute -top-1 text-[10px] text-slate-400 font-medium"
              style={{ left: `${overall.passingThreshold}%`, transform: 'translateX(-50%)' }}
            >
              Pass
            </div>
            
            {/* Progress fill */}
            <div 
              className={`h-full ${statusColors.bg} transition-all duration-1000 ease-out relative`}
              style={{ width: `${overall.percentage}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
            </div>
          </div>

          {/* Status message */}
          <div className="mt-3 flex items-center justify-between text-sm">
            {overall.status === 'passing' ? (
              <span className="text-emerald-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Ready to pass COR audit!
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Need {needsPoints}% more to pass
              </span>
            )}
            <span className="text-slate-500">
              {overall.score} / {overall.maxScore} points
            </span>
          </div>
        </div>

        {/* Element Progress */}
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            By Element
          </h3>
          
          <div className="space-y-2">
            {elements.map((element) => {
              const colors = getStatusColors(element.status);
              const isExpanded = expandedElements.includes(element.elementNumber);
              const elementInfo = COR_ELEMENTS.find(e => e.number === element.elementNumber);
              
              return (
                <div 
                  key={element.elementNumber}
                  className="bg-slate-800/50 rounded-lg overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleElement(element.elementNumber)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-slate-700/30 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg ${colors.bg}/20 flex items-center justify-center text-sm font-bold ${colors.text}`}>
                      {element.elementNumber}
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-200 truncate pr-2">
                          {element.elementName}
                        </span>
                        <span className={`text-sm font-semibold ${colors.text}`}>
                          {element.percentage}%
                        </span>
                      </div>
                      
                      <div className={`h-2 rounded-full ${colors.track}`}>
                        <div 
                          className={`h-full rounded-full ${colors.bg} transition-all duration-500`}
                          style={{ width: `${element.percentage}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getStatusIcon(element.status)}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>
                  
                  {isExpanded && elementInfo && (
                    <div className="px-3 pb-3 space-y-2 animate-in fade-in duration-200">
                      <p className="text-xs text-slate-400 pl-11">
                        {elementInfo.description}
                      </p>
                      <div className="pl-11 flex flex-wrap gap-1">
                        {elementInfo.requiredForms.map(form => (
                          <span 
                            key={form}
                            className="px-2 py-0.5 text-xs rounded-full bg-slate-700/50 text-slate-300"
                          >
                            {form.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                      {element.gaps.length > 0 && (
                        <div className="pl-11 text-xs text-amber-400">
                          {element.gaps.length} gap{element.gaps.length !== 1 ? 's' : ''} to address
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
