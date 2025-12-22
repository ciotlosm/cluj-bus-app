// RouteStore - Clean state management with raw API data
// No cross-store dependencies, simple loading and error states
// Includes performance optimizations for data sharing across components

import { create } from 'zustand';
import type { TranzyRouteResponse } from '../types/rawTranzyApi';
import { CACHE_DURATIONS } from '../utils/core/constants';

interface RouteStore {
  // Raw API data - no transformations
  routes: TranzyRouteResponse[];
  
  // Simple loading and error states
  loading: boolean;
  error: string | null;
  
  // Performance optimization: track last update time
  lastUpdated: number | null;
  
  // Actions
  loadRoutes: (apiKey: string, agency_id: number) => Promise<void>;
  clearRoutes: () => void;
  clearError: () => void;
  
  // Performance helper: check if data is fresh
  isDataFresh: (maxAgeMs?: number) => boolean;
}

export const useRouteStore = create<RouteStore>((set, get) => ({
  // Raw API data
  routes: [],
  loading: false,
  error: null,
  lastUpdated: null,
  
  // Actions
  async loadRoutes(apiKey: string, agency_id: number) {
    // Performance optimization: avoid duplicate requests if already loading
    const currentState = get();
    if (currentState.loading) {
      return;
    }
    
    set({ loading: true, error: null });
    
    try {
      // Import service dynamically to avoid circular dependencies
      const { routeService } = await import('../services/routeService');
      const routes = await routeService.getRoutes(apiKey, agency_id);
      
      set({ 
        routes, 
        loading: false, 
        error: null, 
        lastUpdated: Date.now() 
      });
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load routes'
      });
    }
  },
  
  clearRoutes() {
    set({ routes: [], error: null, lastUpdated: null });
  },
  
  clearError() {
    set({ error: null });
  },
  
  // Performance helper: check if data is fresh (default from constants)
  isDataFresh: (maxAgeMs = CACHE_DURATIONS.ROUTES) => {
    const { lastUpdated } = get();
    if (!lastUpdated) return false;
    return (Date.now() - lastUpdated) < maxAgeMs;
  },
}));