// VehicleStore - Clean state management with raw API data
// No cross-store dependencies, simple loading and error states

import { create } from 'zustand';
import type { TranzyVehicleResponse } from '../types/rawTranzyApi';

interface VehicleStore {
  // Raw API data - no transformations
  vehicles: TranzyVehicleResponse[];
  
  // Simple loading and error states
  loading: boolean;
  error: string | null;
  
  // Actions
  loadVehicles: (agency_id: number, route_id?: number) => Promise<void>;
  clearVehicles: () => void;
  clearError: () => void;
}

export const useVehicleStore = create<VehicleStore>((set, get) => ({
  // Raw API data
  vehicles: [],
  
  // Simple states
  loading: false,
  error: null,
  
  // Actions
  loadVehicles: async (agency_id: number, route_id?: number) => {
    set({ loading: true, error: null });
    
    try {
      // Import service dynamically to avoid circular dependencies
      const { vehicleService } = await import('../services/vehicleService');
      const vehicles = await vehicleService.getVehicles(agency_id, route_id);
      
      set({ vehicles, loading: false, error: null });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load vehicles'
      });
    }
  },
  
  clearVehicles: () => set({ vehicles: [], error: null }),
  clearError: () => set({ error: null }),
}));