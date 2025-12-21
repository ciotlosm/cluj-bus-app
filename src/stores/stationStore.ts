// StationStore - Clean state management with raw API data
// No cross-store dependencies, simple loading and error states

import { create } from 'zustand';
import type { TranzyStopResponse } from '../types/rawTranzyApi';

interface StationStore {
  // Raw API data - no transformations
  stops: TranzyStopResponse[];
  
  // Simple loading and error states
  loading: boolean;
  error: string | null;
  
  // Actions
  loadStops: () => Promise<void>;
  clearStops: () => void;
  clearError: () => void;
}

export const useStationStore = create<StationStore>((set, get) => ({
  // Raw API data
  stops: [],
  
  // Simple states
  loading: false,
  error: null,
  
  // Actions
  loadStops: async () => {
    // Access config directly from configStore
    const { useConfigStore } = await import('./configStore');
    const { apiKey, agency_id } = useConfigStore.getState();
    
    if (!apiKey || !agency_id) {
      set({ error: 'API key and agency must be configured' });
      return;
    }
    
    set({ loading: true, error: null });
    
    try {
      // Import service dynamically to avoid circular dependencies
      const { stationService } = await import('../services/stationService');
      const stops = await stationService.getStops(apiKey, agency_id);
      
      set({ stops, loading: false, error: null });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load stops'
      });
    }
  },
  
  clearStops: () => set({ stops: [], error: null }),
  clearError: () => set({ error: null }),
}));