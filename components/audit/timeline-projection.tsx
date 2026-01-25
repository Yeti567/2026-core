'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Target, 
  CheckCircle2, 
  Clock,
  ArrowRight,
  Flag,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type TimelineProjection, type CriticalPathItem, type Milestone } from '@/lib/audit';

interface TimelineData {
  timeline: TimelineProjection;
  elementProgress: { element: number; percentage: number; weight: number }[];
}

const statusConfig = {
  completed: { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  in_progress: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/40' },
  pending: { bg: 'bg-slate-600', text: 'text-slate-400', border: 'border-slate-600/40' },
  blocked: { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/40' },
  upcoming: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/40' },
  at_risk: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/40' },
  overdue: { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/40' },
};

export function TimelineProjection() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimelineData();
  }, []);

  const fetchTimelineData = async () => {
    try {
      const res = await fetch('/api/audit/timeline');
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysUntil = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateString);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700/50 rounded w-1/3" />
            <div className="h-32 bg-slate-700/50 rounded" />
            <div className="h-64 bg-slate-700/50 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur">
        <CardContent className="p-6 text-center text-slate-400">
          Failed to load timeline data
        </CardContent>
      </Card>
    );
  }

  const { timeline } = data;
  const daysUntilReady = calculateDaysUntil(timeline.projectedReadyDate);

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur overflow-hidden">
      <CardHeader className="border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-transparent">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Calendar className="w-6 h-6 text-purple-400" />
          </div>
          Timeline Projection
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Projected Ready Date */}
        <div className="relative p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-500/30 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
          
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-400 font-medium uppercase tracking-wider">
                Projected Audit Ready Date
              </p>
              <p className="text-4xl font-bold text-white mt-2">
                {formatDate(timeline.projectedReadyDate)}
              </p>
              <p className="text-slate-400 mt-1">
                {daysUntilReady > 0 
                  ? `${daysUntilReady} days from now`
                  : daysUntilReady === 0 
                  ? 'Today!'
                  : 'Projected date has passed'}
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-slate-400 mb-1">Current Readiness</div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      timeline.currentReadiness >= 80 
                        ? 'bg-emerald-500'
                        : timeline.currentReadiness >= 60
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${timeline.currentReadiness}%` }}
                  />
                </div>
                <span className={`text-2xl font-bold ${
                  timeline.currentReadiness >= 80 
                    ? 'text-emerald-400'
                    : timeline.currentReadiness >= 60
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}>
                  {timeline.currentReadiness}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
            Key Milestones
          </h3>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-700" />
            
            <div className="space-y-4">
              {timeline.milestones.map((milestone, index) => {
                const config = statusConfig[milestone.status];
                const days = calculateDaysUntil(milestone.date);
                
                return (
                  <div key={milestone.id} className="relative pl-12">
                    {/* Timeline dot */}
                    <div className={`absolute left-3 w-5 h-5 rounded-full border-2 ${config.border} ${
                      milestone.status === 'completed' ? config.bg : 'bg-slate-900'
                    } flex items-center justify-center`}>
                      {milestone.status === 'completed' && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </div>
                    
                    <div className={`p-4 rounded-xl border transition-all ${
                      milestone.status === 'completed' 
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : milestone.status === 'at_risk' || milestone.status === 'overdue'
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-slate-800/50 border-slate-700/50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Flag className={`w-4 h-4 ${config.text}`} />
                            <h4 className="font-semibold text-slate-200">
                              {milestone.name}
                            </h4>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            {formatDate(milestone.date)}
                            {days !== 0 && (
                              <span className={`ml-2 ${
                                days < 0 ? 'text-red-400' : days <= 7 ? 'text-amber-400' : ''
                              }`}>
                                ({days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`})
                              </span>
                            )}
                          </p>
                        </div>
                        
                        <span className={`px-2 py-1 rounded-full text-xs ${config.bg}/20 ${config.text}`}>
                          {milestone.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="mt-3 flex flex-wrap gap-2">
                        {milestone.tasks.map((task, i) => (
                          <span 
                            key={i}
                            className={`px-2 py-1 rounded text-xs ${
                              milestone.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-slate-700/50 text-slate-400'
                            }`}
                          >
                            {task}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Critical Path */}
        <div>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Critical Path
          </h3>
          
          <div className="space-y-2">
            {timeline.criticalPath.map((item, index) => {
              const config = statusConfig[item.status];
              const isLast = index === timeline.criticalPath.length - 1;
              
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <div className={`flex-1 p-3 rounded-lg border ${config.border} bg-slate-800/30`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${config.bg}`} />
                        <span className="text-sm text-slate-200">{item.task}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{item.duration} days</span>
                        <span>{formatDate(item.startDate)} - {formatDate(item.endDate)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {!isLast && (
                    <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
          
          {timeline.criticalPath.length === 0 && (
            <div className="text-center py-8">
              <TrendingUp className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">
                All critical tasks completed! You're on track.
              </p>
            </div>
          )}
        </div>

        {/* Confidence indicator */}
        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {timeline.currentReadiness >= 70 ? (
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400" />
              )}
              <span className="text-sm font-medium text-slate-200">
                Projection Confidence
              </span>
            </div>
            <span className={`text-sm font-semibold ${
              timeline.currentReadiness >= 70 
                ? 'text-emerald-400' 
                : timeline.currentReadiness >= 50
                ? 'text-amber-400'
                : 'text-red-400'
            }`}>
              {timeline.currentReadiness >= 70 ? 'High' : timeline.currentReadiness >= 50 ? 'Medium' : 'Low'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Based on current completion rate and identified gaps. Regularly updating documentation will improve accuracy.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
