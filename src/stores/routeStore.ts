// RouteStore - Clean state management with raw API data
// No cross-store dependencies, simple loading and error states

import { create } from 'zustand';
import type { TranzyRouteResponse } from '../types/rawTranzyApi';

interface RouteStore {
  // Raw API data - no transformations
  routes: TranzyRouteResponse[];
  
  // Simple loading and error states
  loading: boolean;
  error: string | null;
  
  // Actions
  loadRoutes: (apiKey: string, agency_id: number) => Promise<void>;
  clearRoutes: () => void;
  clearError: () => void;
}

export const useRouteStore = create<RouteStore>((set, get) => ({
  // Raw API data
  routes: [],
  loading: false,
  error: null,
  
  // Actions
  async loadRoutes(apiKey: string, agency_id: number) {
    set({ loading: true, error: null });
    
    try {
      // Import service dynamically to avoid circular dependencies
      const { routeService } = await import('../services/routeService');
      const routes = await routeService.getRoutes(apiKey, agency_id);
      
      set({ routes, loading: false, error: null });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load routes'
      });
    }
  },
  
  clearRoutes() {
    set({ routes: [], error: null });
  },
  
  clearError() {
    set({ error: null });
  }
}));