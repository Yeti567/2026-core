'use client';

import { useState, useEffect, useCallback } from 'react';
import { Hazard, HazardControl, RegulatoryReference } from '../components/types';

export function useHazardLibrary() {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHazards = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/hazards');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load hazards');
      }

      // Transform the data to ensure proper typing
      const transformedHazards: Hazard[] = (data.hazards || []).map((h: any) => ({
        id: h.id,
        hazard_code: h.hazard_code,
        name: h.name,
        description: h.description,
        category: h.category,
        subcategory: h.subcategory,
        applicable_trades: h.applicable_trades || [],
        applicable_activities: h.applicable_activities || [],
        default_severity: h.default_severity || 3,
        default_likelihood: h.default_likelihood || 3,
        default_risk_score: h.default_risk_score || 9,
        default_risk_level: h.default_risk_level || 'medium',
        recommended_controls: (h.recommended_controls || []) as HazardControl[],
        required_ppe: h.required_ppe || [],
        regulatory_references: (h.regulatory_references || []) as RegulatoryReference[],
        is_active: h.is_active,
        is_global: h.is_global,
        company_id: h.company_id,
        created_at: h.created_at,
        updated_at: h.updated_at,
      }));

      setHazards(transformedHazards);
    } catch (err) {
      console.error('Error fetching hazards:', err);
      setError(err instanceof Error ? err.message : 'Failed to load hazards');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createHazard = useCallback(async (hazardData: Partial<Hazard>) => {
    try {
      const response = await fetch('/api/admin/hazards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hazardData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create hazard');
      }

      // Refresh the list
      await fetchHazards();

      return data.hazard;
    } catch (err) {
      console.error('Error creating hazard:', err);
      throw err;
    }
  }, [fetchHazards]);

  const updateHazard = useCallback(async (id: string, updates: Partial<Hazard>) => {
    try {
      const response = await fetch(`/api/admin/hazards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update hazard');
      }

      // Refresh the list
      await fetchHazards();

      return data.hazard;
    } catch (err) {
      console.error('Error updating hazard:', err);
      throw err;
    }
  }, [fetchHazards]);

  const deleteHazard = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/admin/hazards/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete hazard');
      }

      // Refresh the list
      await fetchHazards();
    } catch (err) {
      console.error('Error deleting hazard:', err);
      throw err;
    }
  }, [fetchHazards]);

  const searchHazards = useCallback(async (searchTerm: string) => {
    // Search is now handled client-side via filtering
    return hazards.filter(h => 
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [hazards]);

  const getHazardsByTrade = useCallback(async (tradeName: string) => {
    // Filter hazards by trade client-side
    return hazards.filter(h => 
      h.applicable_trades.some(t => t.toLowerCase().includes(tradeName.toLowerCase()))
    );
  }, [hazards]);

  const getHazardStats = useCallback(async () => {
    // Calculate stats client-side
    return {
      total: hazards.length,
      by_category: hazards.reduce((acc, h) => {
        acc[h.category] = (acc[h.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      by_risk_level: hazards.reduce((acc, h) => {
        acc[h.default_risk_level] = (acc[h.default_risk_level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [hazards]);

  useEffect(() => {
    fetchHazards();
  }, [fetchHazards]);

  return {
    hazards,
    isLoading,
    error,
    fetchHazards,
    createHazard,
    updateHazard,
    deleteHazard,
    searchHazards,
    getHazardsByTrade,
    getHazardStats,
  };
}
