// VehicleStore - Clean state management with raw API data
// No cross-store dependencies, simple loading and error states
// Includes performance optimizations for data sharing across components

import { create } from 'zustand';
import type { TranzyVehicleResponse } from '../types/rawTranzyApi';
import { CACHE_DURATIONS } from '../utils/core/constants';
import { createStorageMethods, createRefreshMethod, createInitialLoadMethod, createFreshnessChecker } from '../utils/core/storeUtils';

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
  
  // Local storage integration
  persistToStorage: () => void;
  loadFromStorage: () => void;
}

// Create shared utilities for this store
const storageMethods = createStorageMethods('vehicles', 'vehicles');
const refreshMethod = createRefreshMethod(
  'vehicle',
  'vehicles', 
  () => import('../services/vehicleService'),
  'getVehicles'
);
const initialLoadMethod = createInitialLoadMethod(
  'vehicle',
  'vehicles', 
  () => import('../services/vehicleService'),
  'getVehicles'
);
const freshnessChecker = createFreshnessChecker(CACHE_DURATIONS.VEHICLES);

export const useVehicleStore = create<VehicleStore>((set, get) => ({
  // Raw API data
  vehicles: [],
  
  // Simple states
  loading: false,
  error: null,
  lastUpdated: null,
  
  // Actions
  loadVehicles: async () => {
    await initialLoadMethod(get, set, () => storageMethods.persistToStorage(get));
  },
  
  refreshData: async () => {
    await refreshMethod(get, set, () => storageMethods.persistToStorage(get));
  },
  
  clearVehicles: () => set({ vehicles: [], error: null, lastUpdated: null }),
  clearError: () => set({ error: null }),
  
  // Performance helper: check if data is fresh (default from constants)
  isDataFresh: (maxAgeMs = CACHE_DURATIONS.VEHICLES) => {
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