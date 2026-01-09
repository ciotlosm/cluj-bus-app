// VehicleStore - Clean state management with raw API data
// Standardized with Zustand persist middleware for consistency

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TranzyVehicleResponse } from '../types/rawTranzyApi';
import { IN_MEMORY_CACHE_DURATIONS } from '../utils/core/constants';
import { createRefreshMethod, createFreshnessChecker } from '../utils/core/storeUtils';

interface VehicleStore {
  // Raw API data - no transformations
  vehicles: TranzyVehicleResponse[];
  
  // Simple loading and error states
  loading: boolean;
  error: string | null;
  
  // Performance optimization: track last update time
  lastUpdated: number | null;
  
  // Actions
  loadVehicles: () => Promise<void>;
  refreshData: () => Promise<void>;
  clearVehicles: () => void;
  clearError: () => void;
  
  // Performance helper: check if data is fresh
  isDataFresh: (maxAgeMs?: number) => boolean;
}

// Create shared utilities for this store
const refreshMethod = createRefreshMethod(
  'vehicle',
  'vehicles', 
  () => import('../services/vehicleService'),
  'getVehicles'
);
const freshnessChecker = createFreshnessChecker(IN_MEMORY_CACHE_DURATIONS.VEHICLES);

export const useVehicleStore = create<VehicleStore>()(
  persist(
    (set, get) => ({
      // Raw API data
      vehicles: [],
      
      // Simple states
      loading: false,
      error: null,
      lastUpdated: null,
      
      // Actions
      loadVehicles: async () => {
        // Performance optimization: avoid duplicate requests if already loading
        const currentState = get();
        if (currentState.loading) {
          return;
        }
        
        // Check if cached data is fresh
        if (currentState.vehicles.length > 0 && currentState.isDataFresh()) {
          return; // Use cached data
        }
        
        set({ loading: true, error: null });
        
        try {
          // Import service dynamically to avoid circular dependencies
          const { vehicleService } = await import('../services/vehicleService');
          const vehicles = await vehicleService.getVehicles();
          
          set({ 
            vehicles, 
            loading: false, 
            error: null, 
            lastUpdated: Date.now() 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load vehicles';
          set({ loading: false, error: errorMessage });
          console.error('Error loading vehicles:', error);
        }
      },
      
      refreshData: async () => {
        await refreshMethod(get, set);
      },
      
      clearVehicles: () => set({ vehicles: [], error: null, lastUpdated: null }),
      clearError: () => set({ error: null }),
      
      // Performance helper: check if data is fresh
      isDataFresh: (maxAgeMs = IN_MEMORY_CACHE_DURATIONS.VEHICLES) => {
        return freshnessChecker(get, maxAgeMs);
      },
    }),
    {
      name: 'vehicle-store',
      partialize: (state) => ({
        vehicles: state.vehicles,
        lastUpdated: state.lastUpdated,
        error: state.error
      }),
    }
  )
);