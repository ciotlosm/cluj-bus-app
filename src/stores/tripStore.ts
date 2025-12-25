// TripStore - Clean state management with raw API data
// No cross-store dependencies, simple loading and error states
// Includes performance optimizations for data sharing across components
// Enhanced with localStorage persistence for faster startup

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TranzyStopTimeResponse, TranzyTripResponse } from '../types/rawTranzyApi';
import { CACHE_DURATIONS } from '../utils/core/constants';

interface TripStore {
  // Raw API data - no transformations
  stopTimes: TranzyStopTimeResponse[];
  trips: TranzyTripResponse[];
  
  // Simple loading and error states
  loading: boolean;
  error: string | null;
  
  // Performance optimization: track last update time
  lastUpdated: number | null;
  
  // Actions
  loadStopTimes: () => Promise<void>;
  loadTrips: () => Promise<void>;
  clearStopTimes: () => void;
  clearTrips: () => void;
  clearError: () => void;
  
  // Performance helper: check if data is fresh
  isDataFresh: (maxAgeMs?: number) => boolean;
  
  // Helper to get trip by trip_id
  getTripById: (tripId: string) => TranzyTripResponse | undefined;
}

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      // Raw API data
      stopTimes: [],
      trips: [],
      loading: false,
      error: null,
      lastUpdated: null,
      
      // Actions
      async loadStopTimes() {
        // Performance optimization: avoid duplicate requests if already loading
        const currentState = get();
        if (currentState.loading) {
          return;
        }
        
        // Check if cached data is fresh
        if (currentState.stopTimes.length > 0 && currentState.isDataFresh(CACHE_DURATIONS.STOP_TIMES)) {
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

      async loadTrips() {
        // Performance optimization: avoid duplicate requests if already loading
        const currentState = get();
        if (currentState.loading) {
          return;
        }
        
        // Check if cached data is fresh
        if (currentState.trips.length > 0 && currentState.isDataFresh(CACHE_DURATIONS.TRIPS)) {
          return; // Use cached data
        }
        
        set({ loading: true, error: null });
        
        try {
          // Import service dynamically to avoid circular dependencies
          const { tripService } = await import('../services/tripService');
          const trips = await tripService.getTrips();
          
          set({ 
            trips, 
            loading: false, 
            error: null, 
            lastUpdated: Date.now() 
          });
        } catch (error) {
          set({ 
            loading: false, 
            error: error instanceof Error ? error.message : 'Failed to load trips'
          });
        }
      },
      
      clearStopTimes() {
        set({ stopTimes: [], error: null, lastUpdated: null });
      },

      clearTrips() {
        set({ trips: [], error: null, lastUpdated: null });
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

      // Helper to get trip by trip_id
      getTripById: (tripId: string) => {
        const { trips } = get();
        return trips.find(trip => trip.trip_id === tripId);
      },
    }),
    {
      name: 'trip-store',
      // Simple storage without compression since trip data is smaller
      partialize: (state) => ({
        stopTimes: state.stopTimes,
        trips: state.trips,
        lastUpdated: state.lastUpdated,
        error: state.error
      }),
    }
  )
);