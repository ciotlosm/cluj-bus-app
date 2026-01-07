// FavoritesStore - Clean state management for favorite routes
// Simple array-based storage with shared utilities for consistency
// Graceful handling of localStorage failures with in-memory fallback

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createFreshnessChecker } from '../utils/core/storeUtils';

interface FavoritesStore {
  // Core state - Simple array for easy serialization
  favoriteRouteIds: string[];
  
  // Performance optimization: track last update time
  lastUpdated: number | null;
  
  // Actions
  addFavorite: (routeId: string) => void;
  removeFavorite: (routeId: string) => void;
  toggleFavorite: (routeId: string) => void;
  isFavorite: (routeId: string) => boolean;
  clearFavorites: () => void;
  refreshData: () => Promise<void>;
  
  // Utilities
  getFavoriteCount: () => number;
  getFavoriteRouteIds: () => string[];
  
  // Performance helper: check if data is fresh
  isDataFresh: (maxAgeMs?: number) => boolean;
  
  // Local storage integration
  persistToStorage: () => void;
  loadFromStorage: () => void;
}

// Create shared utilities for this store
const freshnessChecker = createFreshnessChecker(24 * 60 * 60 * 1000); // 24 hours - favorites don't expire often

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      // Core state
      favoriteRouteIds: [],
      lastUpdated: Date.now(), // Initialize with current time
      
      // Actions
      addFavorite: (routeId: string) => {
        set((state) => {
          // Avoid duplicates
          if (state.favoriteRouteIds.includes(routeId)) {
            return state;
          }
          return { 
            favoriteRouteIds: [...state.favoriteRouteIds, routeId],
            lastUpdated: Date.now()
          };
        });
      },
      
      removeFavorite: (routeId: string) => {
        set((state) => ({
          favoriteRouteIds: state.favoriteRouteIds.filter(id => id !== routeId),
          lastUpdated: Date.now()
        }));
      },
      
      toggleFavorite: (routeId: string) => {
        const { isFavorite, addFavorite, removeFavorite } = get();
        if (isFavorite(routeId)) {
          removeFavorite(routeId);
        } else {
          addFavorite(routeId);
        }
      },
      
      isFavorite: (routeId: string) => {
        const { favoriteRouteIds } = get();
        return favoriteRouteIds.includes(routeId);
      },
      
      clearFavorites: () => {
        set({ 
          favoriteRouteIds: [],
          lastUpdated: Date.now()
        });
      },
      
      refreshData: async () => {
        // Favorites don't need external refresh - they're user-managed
        // This method exists for API consistency but is a no-op
        set({ lastUpdated: Date.now() });
      },
      
      // Utilities
      getFavoriteCount: () => {
        const { favoriteRouteIds } = get();
        return favoriteRouteIds.length;
      },
      
      getFavoriteRouteIds: () => {
        const { favoriteRouteIds } = get();
        return [...favoriteRouteIds]; // Return copy to prevent mutations
      },
      
      // Performance helper: check if data is fresh
      isDataFresh: (maxAgeMs = 24 * 60 * 60 * 1000) => {
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
      name: 'favorites-store',
      // Simple storage - no custom serialization needed
      partialize: (state) => ({
        favoriteRouteIds: state.favoriteRouteIds,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);