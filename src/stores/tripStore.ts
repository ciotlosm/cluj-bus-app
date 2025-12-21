// TripStore - Clean state management with raw API data
// No cross-store dependencies, simple loading and error states

import { create } from 'zustand';
import type { TranzyStopTimeResponse } from '../types/rawTranzyApi';

interface TripStore {
  // Raw API data - no transformations
  stopTimes: TranzyStopTimeResponse[];
  
  // Simple loading and error states
  loading: boolean;
  error: string | null;
  
  // Actions
  loadStopTimes: (apiKey: string, agency_id: number) => Promise<void>;
  clearStopTimes: () => void;
  clearError: () => void;
}

export const useTripStore = create<TripStore>((set, get) => ({
  // Raw API data
  stopTimes: [],
  loading: false,
  error: null,
  
  // Actions
  async loadStopTimes(apiKey: string, agency_id: number) {
    set({ loading: true, error: null });
    
    try {
      // Import service dynamically to avoid circular dependencies
      const { tripService } = await import('../services/tripService');
      const stopTimes = await tripService.getStopTimes(apiKey, agency_id);
      
      set({ stopTimes, loading: false, error: null });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load stop times'
      });
    }
  },
  
  clearStopTimes() {
    set({ stopTimes: [], error: null });
  },
  
  clearError() {
    set({ error: null });
  }
}));