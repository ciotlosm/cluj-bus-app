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
  loadStops: (apiKey: string, agency_id: number) => Promise<void>;
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
  loadStops: async (apiKey: string, agency_id: number) => {
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