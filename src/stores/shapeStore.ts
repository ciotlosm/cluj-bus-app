/**
 * Shape Store - Centralized state management for route shape data
 * Uses shared utilities for consistency while maintaining compression for 5MB+ data
 * Simplified initialization with standardized retry logic
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RouteShape } from '../types/arrivalTime.ts';
import { IN_MEMORY_CACHE_DURATIONS, CALCULATION_TOLERANCES } from '../utils/core/constants.ts';
import { compressData, decompressData, getCompressionRatio, formatSize } from '../utils/core/compressionUtils.ts';
import { 
  createRefreshMethod, 
  createFreshnessChecker 
} from '../utils/core/storeUtils.ts';

interface ShapeStore {
  // Core state - Map for O(1) shape lookups by shape_id
  shapes: Map<string, RouteShape>;
  
  // Simple loading and error states
  loading: boolean;
  error: string | null;
  
  // Performance optimization: track last update time
  lastUpdated: number | null;
  
  // Separate API fetch timestamp for freshness checks
  lastApiFetch: number | null;
  
  // Actions
  loadShapes: () => Promise<void>;
  getShape: (shapeId: string) => RouteShape | undefined;
  refreshData: () => Promise<void>;
  clearShapes: () => void;
  
  // Utilities
  isDataFresh: (maxAgeMs?: number) => boolean;
  hasShape: (shapeId: string) => boolean;
  isDataExpired: () => boolean;
  
  // Local storage integration
  persistToStorage: () => void;
  loadFromStorage: () => void;
}

// Create shared utilities for this store
// Note: Storage methods need custom compression handling for 5MB+ data
const refreshMethod = createRefreshMethod(
  'shapes',
  'shapes',
  () => import('../services/shapesService.ts'),
  'getAllShapes',
  {
    // Only specify non-default options
    processData: async (rawShapes: any) => {
      try {
        // Import processing utilities dynamically
        const { processAllShapes, validateShapeData } = await import('../utils/shapes/shapeProcessingUtils.ts');
        
        // Validate and process shapes
        const validatedShapes = validateShapeData(rawShapes);
        const processedShapes = processAllShapes(validatedShapes);
        
        console.log(`✅ Shapes processing completed: ${processedShapes.size} shapes processed`);
        return processedShapes;
      } catch (error) {
        console.error('❌ Error processing shapes:', error);
        throw error; // Re-throw to let the refresh method handle it
      }
    }
  }
);

const freshnessChecker = createFreshnessChecker(IN_MEMORY_CACHE_DURATIONS.STATIC_DATA);

export const useShapeStore = create<ShapeStore>()(
  persist(
    (set, get) => ({
  // Core state
  shapes: new Map<string, RouteShape>(),
  loading: false,
  error: null,
  lastUpdated: null,
  lastApiFetch: null,
  
  // Actions
  loadShapes: async () => {
    const currentState = get();
    
    // Performance optimization: avoid duplicate requests if already loading
    if (currentState.loading) {
      return;
    }
    
    // Check if cached data is fresh
    if (currentState.shapes.size > 0 && currentState.isDataFresh()) {
      return; // Use cached data
    }
    
    // Need to fetch fresh data
    await get().refreshData();
  },
  
  getShape: (shapeId: string) => {
    const { shapes } = get();
    return shapes.get(shapeId);
  },
  
  refreshData: async () => {
    // Use standardized refresh method (retry and cached data handling enabled by default)
    await refreshMethod(get, set);
  },
  
  clearShapes: () => {
    set({
      shapes: new Map<string, RouteShape>(),
      error: null,
      lastUpdated: null,
      lastApiFetch: null
    });
  },
  
  // Utilities
  isDataFresh: (maxAgeMs = IN_MEMORY_CACHE_DURATIONS.STATIC_DATA) => {
    return freshnessChecker(get, maxAgeMs);
  },
  
  hasShape: (shapeId: string) => {
    const { shapes } = get();
    return shapes.has(shapeId);
  },
  
  isDataExpired: () => {
    const { lastUpdated } = get();
    if (!lastUpdated) return true;
    return (Date.now() - lastUpdated) >= IN_MEMORY_CACHE_DURATIONS.STATIC_DATA;
  },
  
  // Local storage integration methods (handled by persist middleware)
  persistToStorage: () => {
    // Persistence with compression is handled automatically by zustand persist middleware
  },
  
  loadFromStorage: () => {
    // Loading with decompression is handled automatically by zustand persist middleware
  },
}),
{
  name: 'shape-store',
  
  // Custom storage with compression for 5MB+ shape data
  storage: {
    getItem: (name: string) => {
      try {
        const item = localStorage.getItem(name);
        if (!item) return null;
        
        // Check if data is compressed
        if (item.startsWith('gzip:')) {
          // Return placeholder for async decompression during hydration
          return { 
            state: { 
              shapes: new Map(),
              loading: false,
              error: null,
              lastUpdated: null,
              _compressed: item // Store for async decompression
            }
          };
        } else {
          // Uncompressed data (legacy or fallback)
          const parsed = JSON.parse(item);
          
          // Transform Array back to Map
          if (parsed.state?.shapes && Array.isArray(parsed.state.shapes)) {
            parsed.state.shapes = new Map(parsed.state.shapes);
          }
          
          return parsed;
        }
      } catch (error) {
        console.warn('Failed to load shapes from localStorage:', error);
        return null;
      }
    },
    
    setItem: (name: string, value: any) => {
      try {
        // Transform Map to Array for JSON serialization
        const serializable = {
          ...value,
          state: {
            ...value.state,
            shapes: Array.from(value.state.shapes)
          }
        };
        
        const jsonString = JSON.stringify(serializable);
        const originalSize = new TextEncoder().encode(jsonString).length;
        
        // Compress asynchronously for 5MB+ data
        compressData(jsonString).then(compressed => {
          try {
            const compressedSize = new TextEncoder().encode(compressed).length;
            
            // Log compression stats in development
            if (process.env.NODE_ENV === 'development') {
              const ratio = getCompressionRatio(jsonString, compressed);
              const isCompressed = compressed.startsWith('gzip:');
              
              if (isCompressed && ratio > CALCULATION_TOLERANCES.COMPRESSION_RATIO_THRESHOLD) {
                console.log(`📦 Shape data compressed: ${formatSize(originalSize)} → ${formatSize(compressedSize)} (${ratio.toFixed(1)}x reduction)`);
              }
            }
            
            localStorage.setItem(name, compressed);
          } catch (storageError) {
            console.warn('Failed to store compressed shapes:', storageError);
            // Fallback: try storing uncompressed
            try {
              localStorage.setItem(name, jsonString);
            } catch (fallbackError) {
              console.warn('Failed to store shapes even uncompressed:', fallbackError);
            }
          }
        }).catch(compressionError => {
          console.warn('Compression failed, storing uncompressed:', compressionError);
          try {
            localStorage.setItem(name, jsonString);
          } catch (storageError) {
            console.warn('Failed to store shapes:', storageError);
          }
        });
        
      } catch (error) {
        console.warn('Failed to prepare shapes for storage:', error);
      }
    },
    
    removeItem: (name: string) => {
      try {
        localStorage.removeItem(name);
      } catch (error) {
        console.warn('Failed to remove shapes from localStorage:', error);
      }
    },
  },
  
  // Handle async decompression during hydration
  onRehydrateStorage: () => (state) => {
    if (state && (state as any)._compressed) {
      // Decompress data asynchronously
      decompressData((state as any)._compressed).then(decompressed => {
        try {
          const parsed = JSON.parse(decompressed);
          if (parsed.state?.shapes && Array.isArray(parsed.state.shapes)) {
            const shapesMap = new Map(parsed.state.shapes);
            
            // Update store with decompressed data
            useShapeStore.setState({
              shapes: shapesMap,
              lastUpdated: parsed.state.lastUpdated || null,
              error: parsed.state.error || null,
              _compressed: undefined
            } as any);
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ Decompressed ${shapesMap.size} shapes from cache`);
            }
          }
        } catch (error) {
          console.warn('Failed to decompress cached shapes:', error);
        }
      }).catch(error => {
        console.warn('Decompression failed:', error);
      });
    }
  }
}
));