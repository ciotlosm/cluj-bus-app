// StopTimeStore - Clean state management with raw API data
// No cross-store dependencies, simple loading and error states
// Enhanced with refresh functionality and local storage persistence

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TranzyStopTimeResponse } from '../types/rawTranzyApi';
import { CACHE_DURATIONS } from '../utils/core/constants';
import { createRefreshMethod, createFreshnessChecker } from '../utils/core/storeUtils';

interface StopTimeStore {
  // Raw API data - no transformations
  stopTimes: TranzyStopTimeResponse[];
  
  // Simple loading and error states
  loading: boolean;
  error: string | null;
  
  // Performance optimization: track last update time
  lastUpdated: number | null;
  
  // Actions
  loadStopTimes: () => Promise<void>;
  refreshData: () => Promise<void>;
  clearStopTimes: () => void;
  clearError: () => void;
  
  // Performance helper: check if data is fresh
  isDataFresh: (maxAgeMs?: number) => boolean;
  
  // Local storage integration
  persistToStorage: () => void;
  loadFromStorage: () => void;
}

// Create shared utilities for this store
const refreshMethod = createRefreshMethod(
  'trip',
  'stopTimes', 
  () => import('../services/tripService'),
  'getStopTimes'
);
const freshnessChecker = createFreshnessChecker(CACHE_DURATIONS.STOP_TIMES);

export const useStopTimeStore = create<StopTimeStore>()(
  persist(
    (set, get) => ({
      // Raw API data
      stopTimes: [],
      loading: false,
      error: null,
      lastUpdated: null,
      
      // Actions
      loadStopTimes: async () => {
        // Performance optimization: avoid duplicate requests if already loading
        const currentState = get();
        if (currentState.loading) {
          return;
        }
        
        // Check if cached data is fresh
        if (currentState.stopTimes.length > 0 && currentState.isDataFresh()) {
          return; // Use cached data
        }
        
        set({ loading: true, error: null });
        
        try {
          // Import service dynamically to avoid circular dependencies
          const { tripService } = await import('../services/tripService');
          const stopTimes = await tripService.getStopTimes();
          
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
      
      refreshData: async () => {
        await refreshMethod(get, set, () => get().persistToStorage());
      },
      
      clearStopTimes: () => set({ stopTimes: [], error: null, lastUpdated: null }),
      clearError: () => set({ error: null }),
      
      // Performance helper: check if data is fresh (default 24 hours for general data)
      isDataFresh: (maxAgeMs = CACHE_DURATIONS.STOP_TIMES) => {
        return freshnessChecker(get, maxAgeMs);
      },
      
      // Local storage integration methods
      persistToStorage: () => {
        // Persistence is handled automatically by zustand persist middleware
        // This method exists for API consistency but doesn't need implementation
      },
      
      loadFromStorage: () => {
        // Loading from storage is handled automatically by zustand persist middleware
        // This method exists for API consistency but doesn't need implementation
      },
    }),
    {
      name: 'stop-time-store',
      // Simple storage for stop time data
      partialize: (state) => ({
        stopTimes: state.stopTimes,
        lastUpdated: state.lastUpdated,
        error: state.error
      }),
    }
  )
);