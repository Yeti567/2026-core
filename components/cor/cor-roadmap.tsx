'use client';

import { useState, useMemo } from 'react';
import { COR_ROADMAP_ELEMENTS, getRecommendedPath, getDependencyTree, calculateTotalTimeline } from '@/lib/audit/cor-roadmap';
import type { CORRoadmapElement } from '@/lib/audit/cor-roadmap';

export default function CORRoadmap() {
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'timeline'>('overview');

  const recommendedPath = useMemo(() => getRecommendedPath(), []);
  const timeline = useMemo(() => calculateTotalTimeline(), []);

  const element = selectedElement
    ? COR_ROADMAP_ELEMENTS.find(e => e.number === selectedElement)
    : null;

  const getStatusColor = (percentage: number) => {
    if (percentage === 0) return 'bg-slate-700/50 text-slate-400';
    if (percentage < 50) return 'bg-red-500/20 text-red-400';
    if (percentage < 80) return 'bg-amber-500/20 text-amber-400';
    return 'bg-emerald-500/20 text-emerald-400';
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'bg-emerald-500/20 text-emerald-400';
      case 'medium': return 'bg-amber-500/20 text-amber-400';
      case 'high': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-700/50 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">COR 2020 Certification Roadmap</h1>
            <p className="text-[var(--muted)]">
              Complete guide to achieving COR 2020 certification by October 2026
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-[var(--muted)]">Target Date</div>
            <div className="text-lg font-semibold">October 2026</div>
            <div className="text-sm text-[var(--muted)]">{timeline.months} months estimated</div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 border-b border-slate-700">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'detailed', label: 'Detailed View' },
            { id: 'timeline', label: 'Timeline' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as 'overview' | 'detailed' | 'timeline')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${viewMode === mode.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-[var(--muted)] hover:text-white'
                }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="card">
              <div className="text-sm text-[var(--muted)] mb-1">Total Elements</div>
              <div className="text-2xl font-bold">14</div>
            </div>
            <div className="card">
              <div className="text-sm text-[var(--muted)] mb-1">Completed</div>
              <div className="text-2xl font-bold text-emerald-400">0</div>
            </div>
            <div className="card">
              <div className="text-sm text-[var(--muted)] mb-1">In Progress</div>
              <div className="text-2xl font-bold text-amber-400">0</div>
            </div>
            <div className="card">
              <div className="text-sm text-[var(--muted)] mb-1">Not Started</div>
              <div className="text-2xl font-bold text-slate-400">14</div>
            </div>
          </div>

          {/* Recommended Path */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Recommended Implementation Order</h2>
            <div className="space-y-3">
              {recommendedPath.map((element, index) => (
                <div
                  key={element.number}
                  className="flex items-center gap-4 p-4 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedElement(element.number)}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">Element {element.number}: {element.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${getComplexityColor(element.estimatedTimeline.complexity)}`}>
                        {element.estimatedTimeline.complexity}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--muted)]">{element.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--muted)]">
                      <span>{element.estimatedTimeline.weeks} weeks</span>
                      <span>Weight: {element.weight}%</span>
                      {element.dependencies.length > 0 && (
                        <span>Depends on: {element.dependencies.map(d => `#${d}`).join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className={`w-24 h-2 rounded-full bg-slate-700 overflow-hidden`}>
                      <div
                        className={`h-full ${getStatusColor(element.completionPercentage)}`}
                        style={{ width: `${element.completionPercentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-1 text-center">
                      {element.completionPercentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detailed View Mode */}
      {viewMode === 'detailed' && (
        <div className="grid md:grid-cols-2 gap-4">
          {COR_ROADMAP_ELEMENTS.map((element) => (
            <div
              key={element.number}
              className={`card cursor-pointer transition-all ${selectedElement === element.number ? 'ring-2 ring-indigo-500' : ''
                }`}
              onClick={() => setSelectedElement(element.number)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold">Element {element.number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${getComplexityColor(element.estimatedTimeline.complexity)}`}>
                      {element.estimatedTimeline.complexity}
                    </span>
                  </div>
                  <h3 className="font-semibold text-indigo-400">{element.name}</h3>
                </div>
                <div className="text-right">
                  <div className="text-sm text-[var(--muted)]">Weight</div>
                  <div className="font-bold">{element.weight}%</div>
                </div>
              </div>

              <p className="text-sm text-[var(--muted)] mb-3">{element.description}</p>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Timeline:</span>
                  <span>{element.estimatedTimeline.weeks} weeks</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Completion:</span>
                  <span>{element.completionPercentage}%</span>
                </div>
                {element.dependencies.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--muted)]">Depends on:</span>
                    <span>{element.dependencies.map(d => `#${d}`).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Timeline View Mode */}
      {viewMode === 'timeline' && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">9-Month Implementation Timeline</h2>
          <div className="space-y-6">
            {recommendedPath.map((element, index) => {
              const startWeek = recommendedPath
                .slice(0, index)
                .reduce((sum, e) => sum + (e.dependencies.length > 0 ? Math.max(e.estimatedTimeline.weeks - 2, e.estimatedTimeline.weeks * 0.5) : e.estimatedTimeline.weeks), 0);
              const endWeek = startWeek + element.estimatedTimeline.weeks;
              const startMonth = Math.floor(startWeek / 4.33) + 1;
              const endMonth = Math.ceil(endWeek / 4.33);

              return (
                <div key={element.number} className="relative">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 text-right">
                      <div className="font-bold text-sm">#{element.number}</div>
                      <div className="text-xs text-[var(--muted)]">{element.estimatedTimeline.weeks}w</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{element.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${getComplexityColor(element.estimatedTimeline.complexity)}`}>
                          {element.estimatedTimeline.complexity}
                        </span>
                      </div>
                      <div className="relative h-8 bg-slate-800 rounded overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 ${getComplexityColor(element.estimatedTimeline.complexity)}`}
                          style={{
                            left: `${(startWeek / timeline.weeks) * 100}%`,
                            width: `${((endWeek - startWeek) / timeline.weeks) * 100}%`,
                          }}
                        />
                        <div className="absolute inset-y-0 left-0 right-0 flex items-center px-2 text-xs font-medium">
                          Month {startMonth}-{endMonth}
                        </div>
                      </div>
                      {element.dependencies.length > 0 && (
                        <div className="text-xs text-[var(--muted)] mt-1">
                          Requires: {element.dependencies.map(d => `Element ${d}`).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Month markers */}
          <div className="mt-6 pt-4 border-t border-slate-700">
            <div className="flex justify-between text-xs text-[var(--muted)]">
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="text-center">
                  <div>Month {i + 1}</div>
                  <div className="mt-1">
                    {i === 0 && 'Jan'}
                    {i === 1 && 'Feb'}
                    {i === 2 && 'Mar'}
                    {i === 3 && 'Apr'}
                    {i === 4 && 'May'}
                    {i === 5 && 'Jun'}
                    {i === 6 && 'Jul'}
                    {i === 7 && 'Aug'}
                    {i === 8 && 'Sep'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Element Detail Modal */}
      {element && selectedElement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedElement(null)}>
          <div className="bg-slate-900 rounded-lg border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-bold">Element {element.number}</span>
                    <span className={`text-xs px-2 py-1 rounded ${getComplexityColor(element.estimatedTimeline.complexity)}`}>
                      {element.estimatedTimeline.complexity} complexity
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-indigo-400">{element.name}</h2>
                  <p className="text-[var(--muted)] mt-1">{element.description}</p>
                </div>
                <button
                  onClick={() => setSelectedElement(null)}
                  className="text-[var(--muted)] hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Stats */}
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="card">
                  <div className="text-sm text-[var(--muted)] mb-1">Weight</div>
                  <div className="text-xl font-bold">{element.weight}%</div>
                </div>
                <div className="card">
                  <div className="text-sm text-[var(--muted)] mb-1">Timeline</div>
                  <div className="text-xl font-bold">{element.estimatedTimeline.weeks} weeks</div>
                </div>
                <div className="card">
                  <div className="text-sm text-[var(--muted)] mb-1">Completion</div>
                  <div className="text-xl font-bold">{element.completionPercentage}%</div>
                </div>
                <div className="card">
                  <div className="text-sm text-[var(--muted)] mb-1">Order</div>
                  <div className="text-xl font-bold">#{element.recommendedOrder}</div>
                </div>
              </div>

              {/* Dependencies */}
              {element.dependencies.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Dependencies</h3>
                  <div className="flex flex-wrap gap-2">
                    {element.dependencies.map((depNum) => {
                      const dep = COR_ROADMAP_ELEMENTS.find(e => e.number === depNum);
                      return (
                        <button
                          key={depNum}
                          onClick={() => setSelectedElement(depNum)}
                          className="px-3 py-1 rounded bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 text-sm"
                        >
                          Element {depNum}: {dep?.name}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-sm text-[var(--muted)] mt-2">
                    Complete these elements first before starting Element {element.number}
                  </p>
                </div>
              )}

              {/* Required Documentation */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Required Documentation</h3>
                <div className="space-y-3">
                  {element.requiredDocumentation.map((doc, index) => (
                    <div key={index} className="border border-slate-700 rounded-lg p-4">
                      <div className="font-medium mb-2">{doc.type}</div>
                      <p className="text-sm text-[var(--muted)] mb-2">{doc.description}</p>
                      <div className="text-xs text-[var(--muted)]">
                        <div className="font-medium mb-1">Examples:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {doc.examples.map((example, i) => (
                            <li key={i}>{example}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Activities */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Key Activities</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  {element.keyActivities.map((activity, index) => (
                    <li key={index} className="text-[var(--muted)]">{activity}</li>
                  ))}
                </ol>
              </div>

              {/* Success Criteria */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Success Criteria</h3>
                <ul className="space-y-2">
                  {element.successCriteria.map((criterion, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-[var(--muted)]">{criterion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Timeline Notes */}
              {element.estimatedTimeline.notes && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <div className="font-medium text-amber-400 mb-1">Timeline Notes</div>
                  <p className="text-sm text-[var(--muted)]">{element.estimatedTimeline.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
