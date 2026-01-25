'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Legislation, LegislationSection } from './types';
import { useLegislationLibrary } from '../hooks/use-legislation-library';

function LegislationCard({ legislation, onViewDetails }: {
  legislation: Legislation;
  onViewDetails: (legislation: Legislation) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card className="hover:border-[var(--primary)]/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h4 className="font-semibold">{legislation.short_name}</h4>
            <p className="text-sm text-[var(--muted)]">{legislation.full_name}</p>
          </div>
          <Badge variant="outline">{legislation.jurisdiction}</Badge>
        </div>
        
        {legislation.description && (
          <p className="text-sm text-[var(--muted)] mb-3">
            {legislation.description}
          </p>
        )}
        
        <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)] mb-3">
          {legislation.effective_date && (
            <span>📅 Effective: {new Date(legislation.effective_date).toLocaleDateString()}</span>
          )}
          {legislation.last_amended && (
            <span>✏️ Last Amended: {new Date(legislation.last_amended).toLocaleDateString()}</span>
          )}
        </div>
        
        {/* Key Sections Preview */}
        {expanded && legislation.sections.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <h5 className="text-sm font-medium mb-2">Key Sections:</h5>
            <div className="space-y-2">
              {legislation.sections.slice(0, 5).map((section, i) => (
                <div key={i} className="p-2 bg-[var(--muted)]/10 rounded text-sm">
                  <span className="font-medium">{section.section_number}</span>
                  <span className="mx-2">-</span>
                  <span className="text-[var(--muted)]">{section.title}</span>
                </div>
              ))}
              {legislation.sections.length > 5 && (
                <p className="text-xs text-[var(--muted)]">
                  +{legislation.sections.length - 5} more sections...
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[var(--primary)] hover:underline"
          >
            {expanded ? 'Hide Sections' : 'Show Key Sections'}
          </button>
          <div className="flex gap-2">
            {legislation.url && (
              <Button variant="outline" size="sm" onClick={() => window.open(legislation.url!, '_blank')}>
                📄 Full Text
              </Button>
            )}
            <Button size="sm" onClick={() => onViewDetails(legislation)}>
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionCard({ section }: { section: LegislationSection }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card className="hover:border-[var(--primary)]/50 transition-colors">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium text-sm">{section.section_number}</span>
              {section.is_bookmarked && <span className="text-yellow-500">★</span>}
            </div>
            <p className="text-sm font-medium mt-0.5">{section.title}</p>
          </div>
        </div>
        
        {section.summary && (
          <p className="text-xs text-[var(--muted)] mt-2">
            {expanded ? section.summary : section.summary.slice(0, 150) + (section.summary.length > 150 ? '...' : '')}
          </p>
        )}
        
        {section.summary && section.summary.length > 150 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[var(--primary)] hover:underline mt-1"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function LegislationDetailModal({ legislation, isOpen, onClose }: {
  legislation: Legislation | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [searchSections, setSearchSections] = useState('');
  
  if (!legislation) return null;
  
  const filteredSections = legislation.sections.filter(s => {
    if (!searchSections) return true;
    const search = searchSections.toLowerCase();
    return s.section_number.toLowerCase().includes(search) ||
           s.title.toLowerCase().includes(search) ||
           s.summary?.toLowerCase().includes(search);
  });
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ⚖️ {legislation.short_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Header */}
          <div>
            <h2 className="text-xl font-bold">{legislation.full_name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge>{legislation.jurisdiction}</Badge>
              {legislation.last_amended && (
                <span className="text-sm text-[var(--muted)]">
                  Last amended: {new Date(legislation.last_amended).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          
          {legislation.description && (
            <p className="text-[var(--muted)]">{legislation.description}</p>
          )}
          
          {/* Search Sections */}
          <div>
            <Input
              type="search"
              placeholder="🔍 Search sections..."
              value={searchSections}
              onChange={(e) => setSearchSections(e.target.value)}
            />
          </div>
          
          {/* Sections */}
          <div className="space-y-2">
            <h4 className="font-semibold">
              Sections ({filteredSections.length})
            </h4>
            <div className="grid gap-2 max-h-[400px] overflow-y-auto">
              {filteredSections.map((section, i) => (
                <SectionCard key={i} section={section} />
              ))}
              
              {filteredSections.length === 0 && (
                <p className="text-center text-[var(--muted)] py-8">
                  No sections found matching your search
                </p>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
            {legislation.url && (
              <Button className="flex-1" onClick={() => window.open(legislation.url!, '_blank')}>
                📄 View Full Text (Ontario e-Laws)
              </Button>
            )}
            <Button variant="outline" className="flex-1">
              🖨️ Print Reference Card
            </Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LegislationLibraryTab() {
  const { legislation, quickReferences, isLoading, error, searchLegislation } = useLegislationLibrary();
  const [search, setSearch] = useState('');
  const [selectedLegislation, setSelectedLegislation] = useState<Legislation | null>(null);
  
  // Filter legislation
  const filteredLegislation = useMemo(() => {
    if (!search) return legislation;
    
    const searchLower = search.toLowerCase();
    return legislation.filter(l => 
      l.short_name.toLowerCase().includes(searchLower) ||
      l.full_name.toLowerCase().includes(searchLower) ||
      l.description?.toLowerCase().includes(searchLower) ||
      l.sections.some(s => 
        s.section_number.toLowerCase().includes(searchLower) ||
        s.title.toLowerCase().includes(searchLower)
      )
    );
  }, [legislation, search]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-[var(--muted)]">Loading legislation...</p>
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
            ⚖️ Ontario Occupational Health & Safety Legislation
          </h2>
          <p className="text-[var(--muted)] mt-1">
            OHSA, O. Reg. 213/91 Construction Projects, and related regulations
          </p>
        </div>
      </div>
      
      {/* Search */}
      <div className="p-4 bg-[var(--card)] rounded-lg border border-[var(--border)]">
        <Input
          type="search"
          placeholder="🔍 Search regulations, sections, or topics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>
      
      {/* Quick References */}
      {quickReferences.length > 0 && !search && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            ⚡ Quick References
          </h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {quickReferences.map((ref, i) => (
              <Card key={i} className="hover:border-[var(--primary)]/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <h4 className="font-medium">{ref.title}</h4>
                  <p className="text-sm text-[var(--muted)] mt-1">{ref.description}</p>
                  <div className="flex gap-2 mt-3">
                    <Badge variant="secondary">{ref.regulation}</Badge>
                    <Badge variant="outline">{ref.section}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Regulations List */}
      <div>
        <h3 className="font-semibold mb-3">
          📚 Regulations ({filteredLegislation.length})
        </h3>
        <div className="space-y-4">
          {filteredLegislation.map((leg, i) => (
            <LegislationCard
              key={i}
              legislation={leg}
              onViewDetails={setSelectedLegislation}
            />
          ))}
          
          {filteredLegislation.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-4xl mb-4">⚖️</div>
                <h3 className="font-semibold mb-2">No regulations found</h3>
                <p className="text-[var(--muted)]">
                  Try adjusting your search terms
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Important Notice */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <h4 className="font-semibold">Disclaimer</h4>
              <p className="text-sm text-[var(--muted)] mt-1">
                This is provided for reference purposes only. Always consult the official Ontario e-Laws 
                website for the most current version of legislation. Laws and regulations may change - 
                verify requirements before relying on this information.
              </p>
              <Button variant="link" className="p-0 h-auto mt-2" onClick={() => window.open('https://www.ontario.ca/laws', '_blank')}>
                Visit Ontario e-Laws →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Detail Modal */}
      <LegislationDetailModal
        legislation={selectedLegislation}
        isOpen={!!selectedLegislation}
        onClose={() => setSelectedLegislation(null)}
      />
    </div>
  );
}
