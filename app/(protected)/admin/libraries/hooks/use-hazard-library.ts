'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Hazard, HazardControl, RegulatoryReference } from '../components/types';

export function useHazardLibrary() {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchHazards = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('hazard_library')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name');

      if (fetchError) {
        throw fetchError;
      }

      // Transform the data to ensure proper typing
      const transformedHazards: Hazard[] = (data || []).map(h => ({
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
  }, [supabase]);

  const createHazard = useCallback(async (hazardData: Partial<Hazard>) => {
    try {
      // Generate a hazard code
      const codePrefix = hazardData.category?.toUpperCase().slice(0, 4) || 'CUST';
      const timestamp = Date.now().toString(36).toUpperCase();
      const hazard_code = `${codePrefix}-${timestamp}`;

      const { data, error: createError } = await supabase
        .from('hazard_library')
        .insert({
          ...hazardData,
          hazard_code,
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Refresh the list
      await fetchHazards();

      return data;
    } catch (err) {
      console.error('Error creating hazard:', err);
      throw err;
    }
  }, [supabase, fetchHazards]);

  const updateHazard = useCallback(async (id: string, updates: Partial<Hazard>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('hazard_library')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Refresh the list
      await fetchHazards();

      return data;
    } catch (err) {
      console.error('Error updating hazard:', err);
      throw err;
    }
  }, [supabase, fetchHazards]);

  const deleteHazard = useCallback(async (id: string) => {
    try {
      // Soft delete by setting is_active to false
      const { error: deleteError } = await supabase
        .from('hazard_library')
        .update({ is_active: false })
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      // Refresh the list
      await fetchHazards();
    } catch (err) {
      console.error('Error deleting hazard:', err);
      throw err;
    }
  }, [supabase, fetchHazards]);

  const searchHazards = useCallback(async (searchTerm: string) => {
    try {
      const { data, error: searchError } = await supabase
        .rpc('search_hazards', { search_term: searchTerm });

      if (searchError) {
        throw searchError;
      }

      return data;
    } catch (err) {
      console.error('Error searching hazards:', err);
      throw err;
    }
  }, [supabase]);

  const getHazardsByTrade = useCallback(async (tradeName: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_hazards_by_trade', { trade_name: tradeName });

      if (fetchError) {
        throw fetchError;
      }

      return data;
    } catch (err) {
      console.error('Error fetching hazards by trade:', err);
      throw err;
    }
  }, [supabase]);

  const getHazardStats = useCallback(async () => {
    try {
      const { data, error: statsError } = await supabase
        .rpc('get_hazard_summary_stats');

      if (statsError) {
        throw statsError;
      }

      return data?.[0] || null;
    } catch (err) {
      console.error('Error fetching hazard stats:', err);
      return null;
    }
  }, [supabase]);

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
