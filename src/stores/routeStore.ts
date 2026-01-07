// RouteStore - Clean state management with raw API data
// No cross-store dependencies, simple loading and error states
// Includes performance optimizations for data sharing across components

import { create } from 'zustand';
import type { TranzyRouteResponse } from '../types/rawTranzyApi';
import { CACHE_DURATIONS } from '../utils/core/constants';
import { createStorageMethods, createRefreshMethod, createFreshnessChecker } from '../utils/core/storeUtils';

interface RouteStore {
  // Raw API data - no transformations
  routes: TranzyRouteResponse[];
  
  // Simple loading and error states
  loading: boolean;
  error: string | null;
  
  // Performance optimization: track last update time
  lastUpdated: number | null;
  
  // Actions
  loadRoutes: () => Promise<void>;
  refreshData: () => Promise<void>;
  clearRoutes: () => void;
  clearError: () => void;
  
  // Performance helper: check if data is fresh
  isDataFresh: (maxAgeMs?: number) => boolean;
  
  // Local storage integration
  persistToStorage: () => void;
  loadFromStorage: () => void;
}

// Create shared utilities for this store
const storageMethods = createStorageMethods('routes', 'routes');
const refreshMethod = createRefreshMethod(
  'route',
  'routes', 
  () => import('../services/routeService'),
  'getRoutes'
);
const freshnessChecker = createFreshnessChecker(CACHE_DURATIONS.ROUTES);

export const useRouteStore = create<RouteStore>((set, get) => ({
  // Raw API data
  routes: [],
  loading: false,
  error: null,
  lastUpdated: null,
  
  // Actions
  async loadRoutes() {
    // Performance optimization: avoid duplicate requests if already loading
    const currentState = get();
    if (currentState.loading) {
      return;
    }
    
    set({ loading: true, error: null });
    
    try {
      // Import service dynamically to avoid circular dependencies
      const { routeService } = await import('../services/routeService');
      const routes = await routeService.getRoutes();
      
      set({ 
        routes, 
        loading: false, 
        error: null, 
        lastUpdated: Date.now() 
      });
      
      // Persist to storage after successful load
      storageMethods.persistToStorage(get);
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load routes'
      });
    }
  },
  
  async refreshData() {
    await refreshMethod(get, set, () => storageMethods.persistToStorage(get));
  },
  
  clearRoutes() {
    set({ routes: [], error: null, lastUpdated: null });
  },
  
  clearError() {
    set({ error: null });
  },
  
  // Performance helper: check if data is fresh (default from constants)
  isDataFresh: (maxAgeMs = CACHE_DURATIONS.ROUTES) => {
    return freshnessChecker(get, maxAgeMs);
  },
  
  // Local storage integration methods
  persistToStorage: () => {
    storageMethods.persistToStorage(get);
  },
  
  loadFromStorage: () => {
    storageMethods.loadFromStorage(set);
  },
}));