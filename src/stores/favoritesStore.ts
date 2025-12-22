// FavoritesStore - Clean state management for favorite routes
// Uses Set for O(1) lookups with localStorage persistence
// Graceful handling of localStorage failures with in-memory fallback

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesStore {
  // Core state - Set for O(1) lookups
  favoriteRouteIds: Set<string>;
  
  // Actions
  addFavorite: (routeId: string) => void;
  removeFavorite: (routeId: string) => void;
  toggleFavorite: (routeId: string) => void;
  isFavorite: (routeId: string) => boolean;
  clearFavorites: () => void;
  
  // Utilities
  getFavoriteCount: () => number;
  getFavoriteRouteIds: () => string[];
}

// Persistence state interface for JSON serialization
interface FavoritesPersistedState {
  favoriteRouteIds: string[];
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      // Core state
      favoriteRouteIds: new Set<string>(),
      
      // Actions
      addFavorite: (routeId: string) => {
        set((state) => {
          const newFavorites = new Set(state.favoriteRouteIds);
          newFavorites.add(routeId);
          return { favoriteRouteIds: newFavorites };
        });
      },
      
      removeFavorite: (routeId: string) => {
        set((state) => {
          const newFavorites = new Set(state.favoriteRouteIds);
          newFavorites.delete(routeId);
          return { favoriteRouteIds: newFavorites };
        });
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
        return favoriteRouteIds.has(routeId);
      },
      
      clearFavorites: () => {
        set({ favoriteRouteIds: new Set<string>() });
      },
      
      // Utilities
      getFavoriteCount: () => {
        const { favoriteRouteIds } = get();
        return favoriteRouteIds.size;
      },
      
      getFavoriteRouteIds: () => {
        const { favoriteRouteIds } = get();
        return Array.from(favoriteRouteIds);
      },
    }),
    {
      name: 'favorites-store',
      
      // Custom storage transformation: Set ↔ Array for JSON serialization
      storage: {
        getItem: (name: string) => {
          try {
            const item = localStorage.getItem(name);
            if (!item) return null;
            
            const parsed = JSON.parse(item);
            // Transform Array back to Set
            if (parsed.state?.favoriteRouteIds && Array.isArray(parsed.state.favoriteRouteIds)) {
              parsed.state.favoriteRouteIds = new Set(parsed.state.favoriteRouteIds);
            }
            return parsed;
          } catch (error) {
            // Graceful handling of localStorage failures
            console.warn('Failed to load favorites from localStorage:', error);
            return null;
          }
        },
        
        setItem: (name: string, value: any) => {
          try {
            // Transform Set to Array for JSON serialization
            const serializable = {
              ...value,
              state: {
                ...value.state,
                favoriteRouteIds: Array.from(value.state.favoriteRouteIds)
              }
            };
            localStorage.setItem(name, JSON.stringify(serializable));
          } catch (error) {
            // Graceful handling of localStorage failures - continue with in-memory state
            console.warn('Failed to save favorites to localStorage:', error);
          }
        },
        
        removeItem: (name: string) => {
          try {
            localStorage.removeItem(name);
          } catch (error) {
            // Graceful handling of localStorage failures
            console.warn('Failed to remove favorites from localStorage:', error);
          }
        },
      },
    }
  )
);