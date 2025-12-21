// VehicleStore - Clean state management with raw API data
// No cross-store dependencies, simple loading and error states
// Includes performance optimizations for data sharing across components

import { create } from 'zustand';
import type { TranzyVehicleResponse } from '../types/rawTranzyApi';

interface VehicleStore {
  // Raw API data - no transformations
  vehicles: TranzyVehicleResponse[];
  
  // Simple loading and error states
  loading: boolean;
  error: string | null;
  
  // Performance optimization: track last update time
  lastUpdated: number | null;
  
  // Actions
  loadVehicles: (apiKey: string, agency_id: number) => Promise<void>;
  clearVehicles: () => void;
  clearError: () => void;
  
  // Performance helper: check if data is fresh
  isDataFresh: (maxAgeMs?: number) => boolean;
}

export const useVehicleStore = create<VehicleStore>((set, get) => ({
  // Raw API data
  vehicles: [],
  
  // Simple states
  loading: false,
  error: null,
  lastUpdated: null,
  
  // Actions
  loadVehicles: async (apiKey: string, agency_id: number) => {
    // Performance optimization: avoid duplicate requests if already loading
    const currentState = get();
    if (currentState.loading) {
      return;
    }
    
    set({ loading: true, error: null });
    
    try {
      // Import service dynamically to avoid circular dependencies
      const { vehicleService } = await import('../services/vehicleService');
      const vehicles = await vehicleService.getVehicles(apiKey, agency_id);
      
      set({ 
        vehicles, 
        loading: false, 
        error: null, 
        lastUpdated: Date.now() 
      });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load vehicles'
      });
    }
  },
  
  clearVehicles: () => set({ vehicles: [], error: null, lastUpdated: null }),
  clearError: () => set({ error: null }),
  
  // Performance helper: check if data is fresh (default 30 seconds)
  isDataFresh: (maxAgeMs = 30000) => {
    const { lastUpdated } = get();
    if (!lastUpdated) return false;
    return (Date.now() - lastUpdated) < maxAgeMs;
  },
}));