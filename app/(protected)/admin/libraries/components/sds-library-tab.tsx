'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SDSEntry, WHMISHazardClass, WHMIS_PICTOGRAMS } from './types';
import { useSDSLibrary } from '../hooks/use-sds-library';

function WHMISBadge({ hazardClass }: { hazardClass: WHMISHazardClass }) {
  // Safe: hazardClass is typed as WHMISHazardClass enum, not arbitrary user input
  // eslint-disable-next-line security/detect-object-injection
  const config = WHMIS_PICTOGRAMS[hazardClass];
  if (!config) return null;
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 text-red-500 text-xs font-medium border border-red-500/30">
      {config.icon} {config.label}
    </span>
  );
}

function SDSCard({ sds, onViewDetails }: {
  sds: SDSEntry;
  onViewDetails: (sds: SDSEntry) => void;
}) {
  const daysSinceRevision = sds.sds_revision_date
    ? Math.floor((Date.now() - new Date(sds.sds_revision_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  
  const isStale = daysSinceRevision !== null && daysSinceRevision > 365 * 3; // 3 years old
  const needsReview = sds.review_date && new Date(sds.review_date) <= new Date();
  
  return (
    <Card className="hover:border-[var(--primary)]/50 transition-colors cursor-pointer" onClick={() => onViewDetails(sds)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold">{sds.product_name}</h4>
            <p className="text-sm text-[var(--muted)]">{sds.manufacturer}</p>
          </div>
          {isStale && (
            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">
              ⚠️ Review Needed
            </Badge>
          )}
          {!isStale && sds.is_current && (
            <Badge variant="outline" className="text-xs border-green-500 text-green-500">
              ✅ Current
            </Badge>
          )}
        </div>
        
        {/* WHMIS Classes */}
        {sds.whmis_hazard_classes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {sds.whmis_hazard_classes.slice(0, 4).map((hc, i) => (
              <WHMISBadge key={i} hazardClass={hc} />
            ))}
            {sds.whmis_hazard_classes.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{sds.whmis_hazard_classes.length - 4} more
              </Badge>
            )}
          </div>
        )}
        
        {/* Locations */}
        {sds.locations.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-[var(--muted)] mb-2">
            <span>📍</span>
            <span>{sds.locations.join(', ')}</span>
          </div>
        )}
        
        {/* SDS Info */}
        <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
          {sds.sds_revision_date && (
            <span>📄 SDS: {new Date(sds.sds_revision_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          )}
          {daysSinceRevision !== null && (
            <span className={isStale ? 'text-yellow-500' : ''}>
              {isStale ? '⚠️ ' : ''}
              {Math.floor(daysSinceRevision / 365)} years old
            </span>
          )}
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
          <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); window.open(sds.sds_file_url || '#', '_blank'); }}>
            📄 View SDS
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); }}>
            ⬇️ Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SDSDetailModal({ sds, isOpen, onClose }: {
  sds: SDSEntry | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!sds) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🧪 Safety Data Sheet
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Header */}
          <div>
            <h2 className="text-xl font-bold">{sds.product_name}</h2>
            <p className="text-[var(--muted)]">{sds.manufacturer}</p>
            {sds.product_identifier && (
              <p className="text-sm font-mono text-[var(--muted)] mt-1">Product ID: {sds.product_identifier}</p>
            )}
          </div>
          
          {/* WHMIS Hazards */}
          {sds.whmis_hazard_classes.length > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">⚠️ WHMIS 2015 Hazard Classification</h4>
                <div className="flex flex-wrap gap-2">
                  {sds.whmis_hazard_classes.map((hc, i) => (
                    <WHMISBadge key={i} hazardClass={hc} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Hazard Statements */}
          {sds.hazard_statements.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Hazard Statements</h4>
              <ul className="text-sm space-y-1">
                {sds.hazard_statements.map((stmt, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-red-500">•</span>
                    <span>{stmt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* PPE Required */}
          {sds.ppe_required.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">🦺 Required PPE</h4>
              <div className="flex flex-wrap gap-2">
                {sds.ppe_required.map((ppe, i) => (
                  <Badge key={i} variant="outline">{ppe}</Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* First Aid */}
          {Object.keys(sds.first_aid_measures).length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">🏥 First Aid Measures</h4>
              <div className="space-y-2 text-sm">
                {Object.entries(sds.first_aid_measures).map(([route, treatment]) => (
                  <div key={route} className="p-2 bg-[var(--muted)]/10 rounded">
                    <span className="font-medium capitalize">{route}: </span>
                    <span className="text-[var(--muted)]">{treatment}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Storage & Disposal */}
          <div className="grid grid-cols-2 gap-4">
            {sds.storage_requirements && (
              <div>
                <h4 className="font-semibold mb-2">📦 Storage</h4>
                <p className="text-sm text-[var(--muted)]">{sds.storage_requirements}</p>
              </div>
            )}
            {sds.disposal_requirements && (
              <div>
                <h4 className="font-semibold mb-2">🗑️ Disposal</h4>
                <p className="text-sm text-[var(--muted)]">{sds.disposal_requirements}</p>
              </div>
            )}
          </div>
          
          {/* Locations */}
          {sds.locations.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">📍 On-Site Locations</h4>
              <div className="flex flex-wrap gap-2">
                {sds.locations.map((loc, i) => (
                  <Badge key={i} variant="secondary">{loc}</Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Emergency Contact */}
          {sds.emergency_phone && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <h4 className="font-semibold text-red-500 mb-1">🚨 Emergency Contact</h4>
              <p className="font-mono text-lg">{sds.emergency_phone}</p>
            </div>
          )}
          
          {/* SDS Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--muted)]/10 rounded-lg text-sm">
            <div>
              <label className="text-xs text-[var(--muted)]">SDS Revision Date</label>
              <p className="font-medium">{sds.sds_revision_date ? new Date(sds.sds_revision_date).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Next Review</label>
              <p className="font-medium">{sds.review_date ? new Date(sds.review_date).toLocaleDateString() : '-'}</p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
            <Button className="flex-1" onClick={() => window.open(sds.sds_file_url || '#', '_blank')}>
              📄 View Full SDS (PDF)
            </Button>
            <Button variant="outline" className="flex-1">Edit</Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SDSLibraryTab() {
  const { sdsEntries, isLoading, error } = useSDSLibrary();
  const [search, setSearch] = useState('');
  const [hazardFilter, setHazardFilter] = useState('');
  const [selectedSDS, setSelectedSDS] = useState<SDSEntry | null>(null);
  const [showStaleOnly, setShowStaleOnly] = useState(false);
  
  // Get unique hazard classes
  const hazardClasses = useMemo(() => {
    const classes = new Set<WHMISHazardClass>();
    sdsEntries.forEach(sds => sds.whmis_hazard_classes.forEach(c => classes.add(c)));
    return Array.from(classes).sort();
  }, [sdsEntries]);
  
  // Filter SDS entries
  const filteredEntries = useMemo(() => {
    return sdsEntries.filter(sds => {
      if (search) {
        const searchLower = search.toLowerCase();
        const matches = 
          sds.product_name.toLowerCase().includes(searchLower) ||
          sds.manufacturer.toLowerCase().includes(searchLower) ||
          sds.product_identifier?.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }
      
      if (hazardFilter && !sds.whmis_hazard_classes.includes(hazardFilter as WHMISHazardClass)) {
        return false;
      }
      
      if (showStaleOnly) {
        const daysSince = sds.sds_revision_date
          ? Math.floor((Date.now() - new Date(sds.sds_revision_date).getTime()) / (1000 * 60 * 60 * 24))
          : 9999;
        if (daysSince < 365 * 3) return false;
      }
      
      return true;
    });
  }, [sdsEntries, search, hazardFilter, showStaleOnly]);
  
  // Stats
  const stats = useMemo(() => {
    const staleCount = sdsEntries.filter(sds => {
      const daysSince = sds.sds_revision_date
        ? Math.floor((Date.now() - new Date(sds.sds_revision_date).getTime()) / (1000 * 60 * 60 * 24))
        : 9999;
      return daysSince > 365 * 3;
    }).length;
    
    return {
      total: sdsEntries.length,
      current: sdsEntries.length - staleCount,
      stale: staleCount,
    };
  }, [sdsEntries]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-[var(--muted)]">Loading SDS library...</p>
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
            🧪 Safety Data Sheets (SDS)
          </h2>
          <p className="text-[var(--muted)] mt-1">
            {stats.total} products • {stats.stale > 0 && <span className="text-yellow-500">{stats.stale} need review</span>}
          </p>
        </div>
        
        <Button>
          + Upload SDS
        </Button>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="cursor-pointer hover:border-[var(--primary)]/50" onClick={() => setShowStaleOnly(false)}>
          <CardContent className="p-3 text-center">
            <div className="text-2xl">📚</div>
            <div className="text-xl font-bold">{stats.total}</div>
            <div className="text-xs text-[var(--muted)]">Total Products</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-[var(--primary)]/50" onClick={() => setShowStaleOnly(false)}>
          <CardContent className="p-3 text-center">
            <div className="text-2xl">✅</div>
            <div className="text-xl font-bold text-green-500">{stats.current}</div>
            <div className="text-xs text-[var(--muted)]">Current</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:border-[var(--primary)]/50 ${stats.stale > 0 ? 'border-yellow-500/50' : ''}`} onClick={() => setShowStaleOnly(true)}>
          <CardContent className="p-3 text-center">
            <div className="text-2xl">⚠️</div>
            <div className={`text-xl font-bold ${stats.stale > 0 ? 'text-yellow-500' : ''}`}>{stats.stale}</div>
            <div className="text-xs text-[var(--muted)]">Need Review</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center p-4 bg-[var(--card)] rounded-lg border border-[var(--border)]">
        <div className="flex-1 min-w-[200px]">
          <Input
            type="search"
            placeholder="🔍 Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select
          value={hazardFilter}
          onChange={(e) => setHazardFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
        >
          <option value="">All WHMIS Classes</option>
          {hazardClasses.map(hc => (
            <option key={hc} value={hc}>
              {/* Safe: hc is from typed WHMISHazardClass array iteration */}
              {/* eslint-disable-next-line security/detect-object-injection */}
              {WHMIS_PICTOGRAMS[hc]?.icon} {WHMIS_PICTOGRAMS[hc]?.label}
            </option>
          ))}
        </select>
        
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showStaleOnly}
            onChange={(e) => setShowStaleOnly(e.target.checked)}
            className="rounded"
          />
          Show only stale (&gt;3 years)
        </label>
        
        {(search || hazardFilter || showStaleOnly) && (
          <button
            onClick={() => {
              setSearch('');
              setHazardFilter('');
              setShowStaleOnly(false);
            }}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Clear filters ✕
          </button>
        )}
      </div>
      
      {/* SDS Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEntries.map(sds => (
          <SDSCard
            key={sds.id}
            sds={sds}
            onViewDetails={setSelectedSDS}
          />
        ))}
      </div>
      
      {filteredEntries.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-4xl mb-4">🧪</div>
            <h3 className="font-semibold mb-2">No SDS found</h3>
            <p className="text-[var(--muted)]">
              Try adjusting your filters or upload a new SDS
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Detail Modal */}
      <SDSDetailModal
        sds={selectedSDS}
        isOpen={!!selectedSDS}
        onClose={() => setSelectedSDS(null)}
      />
    </div>
  );
}
