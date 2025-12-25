/**
 * Shape Store - Centralized state management for route shape data
 * Implements bulk fetching with localStorage persistence and intelligent caching
 * Uses "cache-first, refresh-behind" strategy for instant loading with fresh data
 * Enhanced with error handling, exponential backoff, and graceful fallback
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RouteShape } from '../types/arrivalTime.ts';
import { CACHE_DURATIONS } from '../utils/core/constants.ts';
import { compressData, decompressData, getCompressionRatio, formatSize } from '../utils/core/compressionUtils.ts';

interface ShapeStore {
  // Core state - Map for O(1) shape lookups by shape_id
  shapes: Map<string, RouteShape>;
  
  // Simple loading and error states
  loading: boolean;
  error: string | null;
  
  // Performance optimization: track last update time and data hash
  lastUpdated: number | null;
  dataHash: string | null;
  
  // Error handling state
  retryCount: number;
  
  // Internal: compressed cache data (temporary during initialization)
  _compressed?: string;
  
  // Actions
  initializeShapes: () => Promise<void>;
  getShape: (shapeId: string) => RouteShape | undefined;
  refreshShapes: () => Promise<void>;
  clearShapes: () => void;
  
  // Utilities
  isDataFresh: (maxAgeMs?: number) => boolean;
  hasShape: (shapeId: string) => boolean;
  isDataExpired: () => boolean;
}

// Retry configuration for network errors (100ms, 200ms, 400ms)
const RETRY_CONFIG = {
  maxAttempts: 3,
  delays: [100, 200, 400] // milliseconds
} as const;

// Helper function for exponential backoff retry
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't wait after the last attempt
      if (attempt === RETRY_CONFIG.maxAttempts - 1) {
        break;
      }
      
      const delay = RETRY_CONFIG.delays[attempt];
      console.log(`${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Helper function to check if error is network-related
function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('network') || 
           message.includes('connection') || 
           message.includes('timeout') ||
           message.includes('fetch');
  }
  return false;
}

export const useShapeStore = create<ShapeStore>()(
  persist(
    (set, get) => ({
      // Core state
      shapes: new Map<string, RouteShape>(),
      loading: false,
      error: null,
      lastUpdated: null,
      dataHash: null,
      
      // Error handling state
      retryCount: 0,
      
      // Actions
      initializeShapes: async () => {
        const currentState = get();
        
        // If already loading, avoid duplicate requests
        if (currentState.loading) {
          return;
        }
        
        // Check if we have compressed data that needs decompression
        if ((currentState as any)._compressed) {
          console.log('Decompressing cached shape data...');
          try {
            const decompressed = await decompressData((currentState as any)._compressed);
            const parsed = JSON.parse(decompressed);
            
            // Transform Array back to Map
            if (parsed.state?.shapes && Array.isArray(parsed.state.shapes)) {
              const shapesMap = new Map(parsed.state.shapes);
              
              set({
                shapes: shapesMap,
                lastUpdated: parsed.state.lastUpdated || null,
                dataHash: parsed.state.dataHash || null,
                error: parsed.state.error || null,
                retryCount: parsed.state.retryCount || 0,
                _compressed: undefined // Clear compressed data
              });
              
              console.log(`✅ Decompressed ${shapesMap.size} shapes from cache`);
              
              // Check if data is expired and trigger background refresh if needed
              if (get().isDataExpired()) {
                console.log('Cached shapes expired, triggering background refresh');
                setTimeout(() => {
                  get().refreshShapes();
                }, 0);
              }
              return;
            }
          } catch (error) {
            console.warn('Failed to decompress cached shapes, fetching fresh data:', error);
            // Fall through to fresh fetch
          }
        }
        
        // Check if cached data is expired and trigger fresh fetch
        if (currentState.shapes.size > 0 && currentState.isDataExpired()) {
          console.log('Cached shapes expired, triggering fresh fetch');
          await get().refreshShapes();
          return;
        }
        
        // If we have fresh cached data, load it immediately and trigger background refresh
        if (currentState.shapes.size > 0 && currentState.isDataFresh()) {
          // Data is already loaded and fresh, trigger background refresh
          setTimeout(() => {
            get().refreshShapes();
          }, 0);
          return;
        }
        
        // No cached data or data is stale, fetch immediately
        await get().refreshShapes();
      },
      
      getShape: (shapeId: string) => {
        const { shapes } = get();
        return shapes.get(shapeId);
      },
      
      refreshShapes: async () => {
        const currentState = get();
        
        // Avoid duplicate refresh requests
        if (currentState.loading) {
          return;
        }
        
        set({ loading: true, error: null, retryCount: 0 });
        
        try {
          // Try bulk fetch with retry logic
          await retryWithBackoff(async () => {
            // Import services dynamically to avoid circular dependencies
            const { shapesService } = await import('../services/shapesService.ts');
            const { processAllShapes, generateShapeHash, validateShapeData } = await import('../utils/shapes/shapeProcessingUtils.ts');
            
            // Fetch all shapes in bulk
            const rawShapes = await shapesService.getAllShapes();
            
            // Validate shape data structure
            const validatedShapes = validateShapeData(rawShapes);
            
            // Process shapes into RouteShape format
            const processedShapes = processAllShapes(validatedShapes);
            
            // Generate hash for change detection
            const newHash = generateShapeHash(processedShapes);
            
            // Only update cache and notify components if data actually changed
            const currentHash = currentState.dataHash;
            const dataChanged = newHash !== currentHash;
            
            if (dataChanged) {
              set({
                shapes: processedShapes,
                dataHash: newHash,
                lastUpdated: Date.now(),
                loading: false,
                error: null,
                retryCount: 0
              });
            } else {
              // Data unchanged, just update timestamp
              set({
                lastUpdated: Date.now(),
                loading: false,
                error: null,
                retryCount: 0
              });
            }
          }, 'bulk shape fetch');
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load shapes';
          
          // Check if this is a network error
          if (isNetworkError(error)) {
            // If we have cached data, continue using it
            if (currentState.shapes.size > 0) {
              set({
                loading: false,
                error: `Network error during refresh: ${errorMessage}. Using cached data.`,
                retryCount: currentState.retryCount + 1
              });
            } else {
              // No cached data and network error
              set({
                loading: false,
                error: `Network error: ${errorMessage}. Please check your connection.`,
                retryCount: currentState.retryCount + 1
              });
            }
          } else {
            // Non-network error - handle gracefully
            if (currentState.shapes.size > 0) {
              set({
                loading: false,
                error: `Background refresh failed: ${errorMessage}. Using cached data.`,
                retryCount: currentState.retryCount + 1
              });
            } else {
              // No cached data available, this is a critical error
              set({
                loading: false,
                error: errorMessage,
                retryCount: currentState.retryCount + 1
              });
            }
          }
        }
      },
      
      clearShapes: () => {
        set({
          shapes: new Map<string, RouteShape>(),
          error: null,
          lastUpdated: null,
          dataHash: null,
          retryCount: 0
        });
      },
      
      // Utilities
      isDataFresh: (maxAgeMs = CACHE_DURATIONS.SHAPES) => {
        const { lastUpdated } = get();
        if (!lastUpdated) return false;
        return (Date.now() - lastUpdated) < maxAgeMs;
      },
      
      hasShape: (shapeId: string) => {
        const { shapes } = get();
        return shapes.has(shapeId);
      },
      
      isDataExpired: () => {
        const { lastUpdated } = get();
        if (!lastUpdated) return true;
        return (Date.now() - lastUpdated) >= CACHE_DURATIONS.SHAPES;
      },
    }),
    {
      name: 'shape-store',
      
      // Custom storage transformation with compression: Map ↔ Array + gzip compression
      storage: {
        getItem: (name: string) => {
          try {
            const item = localStorage.getItem(name);
            if (!item) return null;
            
            // Check if data is compressed
            if (item.startsWith('gzip:')) {
              // For compressed data, we need to handle it synchronously during initial load
              // This is a blocking operation but necessary to avoid race conditions
              try {
                // Use a synchronous approach for initial cache load
                // The decompression will be handled by the store initialization
                return { 
                  state: { 
                    shapes: new Map(), // Empty initially, will be populated by initializeShapes
                    loading: false,
                    error: null,
                    lastUpdated: null,
                    dataHash: null,
                    retryCount: 0,
                    _compressed: item // Store compressed data for later decompression
                  }
                };
              } catch (error) {
                console.warn('Failed to prepare compressed shapes data:', error);
                return null;
              }
            } else {
              // Uncompressed data (legacy or fallback)
              const parsed = JSON.parse(item);
              
              // Transform Array back to Map
              if (parsed.state?.shapes && Array.isArray(parsed.state.shapes)) {
                parsed.state.shapes = new Map(parsed.state.shapes);
              }
              
              // Handle missing fields for backward compatibility
              if (parsed.state) {
                parsed.state.retryCount = parsed.state.retryCount || 0;
              }
              
              return parsed;
            }
          } catch (error) {
            // Graceful handling of localStorage failures
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
            
            // Compress the data asynchronously
            compressData(jsonString).then(compressed => {
              try {
                const compressedSize = new TextEncoder().encode(compressed).length;
                
                // Log compression stats in development
                if (process.env.NODE_ENV === 'development') {
                  const ratio = getCompressionRatio(jsonString, compressed);
                  const isCompressed = compressed.startsWith('gzip:');
                  if (isCompressed) {
                    console.log(`📦 Shape data compressed: ${formatSize(originalSize)} → ${formatSize(compressedSize)} (${ratio.toFixed(1)}x reduction)`);
                  } else {
                    console.log(`📦 Shape data stored uncompressed: ${formatSize(originalSize)} (compression not beneficial)`);
                  }
                }
                
                localStorage.setItem(name, compressed);
              } catch (storageError) {
                console.warn('Failed to store compressed shapes:', storageError);
                
                // Fallback: try storing uncompressed
                try {
                  localStorage.setItem(name, jsonString);
                  console.log('Stored shapes uncompressed as fallback');
                } catch (fallbackError) {
                  console.warn('Failed to store shapes even uncompressed:', fallbackError);
                }
              }
            }).catch(compressionError => {
              console.warn('Compression failed, storing uncompressed:', compressionError);
              
              // Fallback: store uncompressed
              try {
                localStorage.setItem(name, jsonString);
              } catch (storageError) {
                console.warn('Failed to store shapes:', storageError);
                
                // Check if it's a quota exceeded error and attempt cleanup
                if (storageError instanceof Error && storageError.name === 'QuotaExceededError') {
                  try {
                    localStorage.removeItem(name);
                    console.log('Cleared old shape cache due to storage quota exceeded');
                  } catch (cleanupError) {
                    console.warn('Failed to cleanup localStorage:', cleanupError);
                  }
                }
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
            // Graceful handling of localStorage failures
            console.warn('Failed to remove shapes from localStorage:', error);
          }
        },
      },
    }
  )
);