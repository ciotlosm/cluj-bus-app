// TripStore - Clean state management with raw API data
// No cross-store dependencies, simple loading and error states
// Includes performance optimizations for data sharing across components

import { create } from 'zustand';
import type { TranzyStopTimeResponse } from '../types/rawTranzyApi';
import { CACHE_DURATIONS } from '../utils/constants';

interface TripStore {
  // Raw API data - no transformations
  stopTimes: TranzyStopTimeResponse[];
  
  // Simple loading and error states
  loading: boolean;
  error: string | null;
  
  // Performance optimization: track last update time
  lastUpdated: number | null;
  
  // Actions
  loadStopTimes: (apiKey: string, agency_id: number) => Promise<void>;
  clearStopTimes: () => void;
  clearError: () => void;
  
  // Performance helper: check if data is fresh
  isDataFresh: (maxAgeMs?: number) => boolean;
}

export const useTripStore = create<TripStore>((set, get) => ({
  // Raw API data
  stopTimes: [],
  loading: false,
  error: null,
  lastUpdated: null,
  
  // Actions
  async loadStopTimes(apiKey: string, agency_id: number) {
    // Performance optimization: avoid duplicate requests if already loading
    const currentState = get();
    if (currentState.loading) {
      return;
    }
    
    set({ loading: true, error: null });
    
    try {
      // Import service dynamically to avoid circular dependencies
      const { tripService } = await import('../services/tripService');
      const stopTimes = await tripService.getStopTimes(apiKey, agency_id);
      
      set({ 
        stopTimes, 
        loading: false, 
        error: null, 
        lastUpdated: Date.now() 
      });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load stop times'
      });
    }
  },
  
  clearStopTimes() {
    set({ stopTimes: [], error: null, lastUpdated: null });
  },
  
  clearError() {
    set({ error: null });
  },
  
  // Performance helper: check if data is fresh (default from constants)
  isDataFresh: (maxAgeMs = CACHE_DURATIONS.STOP_TIMES) => {
    const { lastUpdated } = get();
    if (!lastUpdated) return false;
    return (Date.now() - lastUpdated) < maxAgeMs;
  },
}));