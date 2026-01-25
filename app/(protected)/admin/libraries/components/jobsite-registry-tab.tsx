'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Jobsite } from './types';
import { useJobsiteRegistry } from '../hooks/use-jobsite-registry';

const STATUS_CONFIG = {
  planning: { label: 'Planning', color: 'bg-blue-500', icon: '📝' },
  active: { label: 'Active', color: 'bg-green-500', icon: '🏗️' },
  on_hold: { label: 'On Hold', color: 'bg-yellow-500', icon: '⏸️' },
  completed: { label: 'Completed', color: 'bg-gray-500', icon: '✅' },
  closed: { label: 'Closed', color: 'bg-gray-700', icon: '🔒' },
};

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  // Safe: status is typed as keyof STATUS_CONFIG, not arbitrary user input
  // eslint-disable-next-line security/detect-object-injection
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
}

function JobsiteCard({ jobsite, onViewDetails }: {
  jobsite: Jobsite;
  onViewDetails: (jobsite: Jobsite) => void;
}) {
  const daysRemaining = jobsite.expected_end_date 
    ? Math.ceil((new Date(jobsite.expected_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  
  return (
    <Card className="hover:border-[var(--primary)]/50 transition-colors cursor-pointer" onClick={() => onViewDetails(jobsite)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <span className="font-mono text-xs text-[var(--muted)]">{jobsite.jobsite_code}</span>
            <h4 className="font-semibold mt-0.5">{jobsite.name}</h4>
          </div>
          <StatusBadge status={jobsite.status} />
        </div>
        
        <div className="flex items-center gap-2 text-sm text-[var(--muted)] mb-3">
          <span>📍</span>
          <span>{jobsite.address}, {jobsite.city}</span>
        </div>
        
        {jobsite.supervisor_name && (
          <div className="flex items-center gap-2 text-sm text-[var(--muted)] mb-3">
            <span>👷</span>
            <span>Supervisor: {jobsite.supervisor_name}</span>
          </div>
        )}
        
        <div className="flex flex-wrap gap-3 text-sm">
          {jobsite.start_date && (
            <span className="flex items-center gap-1 text-[var(--muted)]">
              📅 Started: {new Date(jobsite.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {daysRemaining !== null && jobsite.status === 'active' && (
            <span className={`flex items-center gap-1 ${daysRemaining < 0 ? 'text-red-500' : daysRemaining < 14 ? 'text-yellow-500' : 'text-[var(--muted)]'}`}>
              ⏰ {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days remaining`}
            </span>
          )}
        </div>
        
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[var(--border)]">
          <span className="flex items-center gap-1 text-sm">
            <span className="text-lg">👥</span>
            <span>{jobsite.worker_count} workers</span>
          </span>
          <span className="flex items-center gap-1 text-sm">
            <span className="text-lg">🔧</span>
            <span>{jobsite.equipment_count} equipment</span>
          </span>
        </div>
        
        {jobsite.site_specific_hazards.length > 0 && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-1">
              {jobsite.site_specific_hazards.slice(0, 3).map((hazard, i) => (
                <Badge key={i} variant="outline" className="text-xs border-orange-500/50 text-orange-500">
                  ⚠️ {hazard}
                </Badge>
              ))}
              {jobsite.site_specific_hazards.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{jobsite.site_specific_hazards.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JobsiteDetailModal({ jobsite, isOpen, onClose }: {
  jobsite: Jobsite | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!jobsite) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🏗️ Jobsite Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-sm text-[var(--muted)]">{jobsite.jobsite_code}</span>
              <h2 className="text-xl font-bold mt-1">{jobsite.name}</h2>
              <p className="text-[var(--muted)] mt-1">📍 {jobsite.address}, {jobsite.city}, {jobsite.province}</p>
            </div>
            <StatusBadge status={jobsite.status} />
          </div>
          
          {/* Project Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--muted)]/10 rounded-lg">
            {jobsite.client_name && (
              <div>
                <label className="text-xs text-[var(--muted)]">Client</label>
                <p className="font-medium">{jobsite.client_name}</p>
              </div>
            )}
            {jobsite.project_value && (
              <div>
                <label className="text-xs text-[var(--muted)]">Project Value</label>
                <p className="font-medium">${jobsite.project_value.toLocaleString()}</p>
              </div>
            )}
            {jobsite.start_date && (
              <div>
                <label className="text-xs text-[var(--muted)]">Start Date</label>
                <p className="font-medium">{new Date(jobsite.start_date).toLocaleDateString()}</p>
              </div>
            )}
            {jobsite.expected_end_date && (
              <div>
                <label className="text-xs text-[var(--muted)]">Expected Completion</label>
                <p className="font-medium">{new Date(jobsite.expected_end_date).toLocaleDateString()}</p>
              </div>
            )}
            {jobsite.supervisor_name && (
              <div>
                <label className="text-xs text-[var(--muted)]">Site Supervisor</label>
                <p className="font-medium">{jobsite.supervisor_name}</p>
              </div>
            )}
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-1">👥</div>
                <div className="text-xl font-bold">{jobsite.worker_count}</div>
                <div className="text-xs text-[var(--muted)]">Workers Assigned</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-1">🔧</div>
                <div className="text-xl font-bold">{jobsite.equipment_count}</div>
                <div className="text-xs text-[var(--muted)]">Equipment Items</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-1">⚠️</div>
                <div className="text-xl font-bold">{jobsite.site_specific_hazards.length}</div>
                <div className="text-xs text-[var(--muted)]">Site Hazards</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Emergency Info */}
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                🚨 Emergency Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {jobsite.emergency_assembly_point && (
                  <div>
                    <label className="text-xs text-[var(--muted)]">Assembly Point</label>
                    <p className="font-medium">{jobsite.emergency_assembly_point}</p>
                  </div>
                )}
                {jobsite.nearest_hospital && (
                  <div>
                    <label className="text-xs text-[var(--muted)]">Nearest Hospital</label>
                    <p className="font-medium">{jobsite.nearest_hospital}</p>
                  </div>
                )}
              </div>
              
              {jobsite.emergency_contacts.length > 0 && (
                <div className="mt-3">
                  <label className="text-xs text-[var(--muted)]">Emergency Contacts</label>
                  <div className="mt-1 space-y-1">
                    {jobsite.emergency_contacts.map((contact, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-white/50 dark:bg-black/20 rounded">
                        <span className="font-medium">{contact.name} ({contact.role})</span>
                        <span className="font-mono text-sm">{contact.phone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Site-Specific Hazards */}
          {jobsite.site_specific_hazards.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Site-Specific Hazards</h4>
              <div className="flex flex-wrap gap-2">
                {jobsite.site_specific_hazards.map((hazard, i) => (
                  <Badge key={i} variant="outline" className="border-orange-500/50 text-orange-500">
                    ⚠️ {hazard}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Access Instructions */}
          {jobsite.access_instructions && (
            <div>
              <h4 className="font-semibold mb-2">Access Instructions</h4>
              <p className="text-sm text-[var(--muted)] p-3 bg-[var(--muted)]/10 rounded">
                {jobsite.access_instructions}
              </p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
            <Button variant="outline" className="flex-1">👥 Worker Roster</Button>
            <Button variant="outline" className="flex-1">🔧 Equipment List</Button>
            <Button variant="outline" className="flex-1">📋 Site Forms</Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function JobsiteRegistryTab() {
  const { jobsites, isLoading, error } = useJobsiteRegistry();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedJobsite, setSelectedJobsite] = useState<Jobsite | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  
  // Filter jobsites
  const filteredJobsites = useMemo(() => {
    return jobsites.filter(js => {
      if (search) {
        const searchLower = search.toLowerCase();
        const matches = 
          js.name.toLowerCase().includes(searchLower) ||
          js.jobsite_code.toLowerCase().includes(searchLower) ||
          js.address.toLowerCase().includes(searchLower) ||
          js.city.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }
      
      if (statusFilter && js.status !== statusFilter) return false;
      
      if (!showCompleted && (js.status === 'completed' || js.status === 'closed')) return false;
      
      return true;
    });
  }, [jobsites, search, statusFilter, showCompleted]);
  
  // Group by status
  const activeJobsites = filteredJobsites.filter(js => js.status === 'active' || js.status === 'planning' || js.status === 'on_hold');
  const completedJobsites = filteredJobsites.filter(js => js.status === 'completed' || js.status === 'closed');
  
  // Stats
  const stats = useMemo(() => ({
    total: jobsites.length,
    active: jobsites.filter(js => js.status === 'active').length,
    planning: jobsites.filter(js => js.status === 'planning').length,
    completed: jobsites.filter(js => js.status === 'completed' || js.status === 'closed').length,
    totalWorkers: jobsites.reduce((sum, js) => sum + js.worker_count, 0),
  }), [jobsites]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-[var(--muted)]">Loading jobsites...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            🏗️ Jobsite Registry
          </h2>
          <p className="text-[var(--muted)] mt-1">
            {stats.active} active projects • {stats.totalWorkers} total workers assigned
          </p>
        </div>
        
        <Button>
          + New Jobsite
        </Button>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:border-[var(--primary)]/50" onClick={() => setStatusFilter('')}>
          <CardContent className="p-3 text-center">
            <div className="text-2xl">📊</div>
            <div className="text-xl font-bold">{stats.total}</div>
            <div className="text-xs text-[var(--muted)]">Total Jobsites</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-[var(--primary)]/50" onClick={() => setStatusFilter('active')}>
          <CardContent className="p-3 text-center">
            <div className="text-2xl">🏗️</div>
            <div className="text-xl font-bold text-green-500">{stats.active}</div>
            <div className="text-xs text-[var(--muted)]">Active</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-[var(--primary)]/50" onClick={() => setStatusFilter('planning')}>
          <CardContent className="p-3 text-center">
            <div className="text-2xl">📝</div>
            <div className="text-xl font-bold text-blue-500">{stats.planning}</div>
            <div className="text-xs text-[var(--muted)]">Planning</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-[var(--primary)]/50" onClick={() => { setShowCompleted(true); setStatusFilter(''); }}>
          <CardContent className="p-3 text-center">
            <div className="text-2xl">✅</div>
            <div className="text-xl font-bold">{stats.completed}</div>
            <div className="text-xs text-[var(--muted)]">Completed</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center p-4 bg-[var(--card)] rounded-lg border border-[var(--border)]">
        <div className="flex-1 min-w-[200px]">
          <Input
            type="search"
            placeholder="🔍 Search jobsites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
        >
          <option value="">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.icon} {config.label}</option>
          ))}
        </select>
        
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="rounded"
          />
          Show Completed
        </label>
        
        {(search || statusFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('');
            }}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Clear filters ✕
          </button>
        )}
      </div>
      
      {/* Active Jobsites */}
      {activeJobsites.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            🏗️ Active & Upcoming ({activeJobsites.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeJobsites.map(jobsite => (
              <JobsiteCard
                key={jobsite.id}
                jobsite={jobsite}
                onViewDetails={setSelectedJobsite}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Completed Jobsites */}
      {showCompleted && completedJobsites.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-[var(--muted)]">
            ✅ Completed ({completedJobsites.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedJobsites.map(jobsite => (
              <JobsiteCard
                key={jobsite.id}
                jobsite={jobsite}
                onViewDetails={setSelectedJobsite}
              />
            ))}
          </div>
        </div>
      )}
      
      {filteredJobsites.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-4xl mb-4">🏗️</div>
            <h3 className="font-semibold mb-2">No jobsites found</h3>
            <p className="text-[var(--muted)]">
              Try adjusting your filters or create a new jobsite
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Detail Modal */}
      <JobsiteDetailModal
        jobsite={selectedJobsite}
        isOpen={!!selectedJobsite}
        onClose={() => setSelectedJobsite(null)}
      />
    </div>
  );
}
