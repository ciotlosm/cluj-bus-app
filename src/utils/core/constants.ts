// Application Constants
// Centralized configuration for cache durations and other app-wide settings

/**
 * Cache duration constants (in milliseconds)
 * These control how long data stays fresh before requiring a refresh
 */
export const CACHE_DURATIONS = {
  // Vehicle data refreshes frequently (30 seconds) for real-time tracking
  VEHICLES: 30 * 1000,
  
  // Route data is more stable (5 minutes)
  ROUTES: 5 * 60 * 1000,
  
  // Stop times data is fairly stable (10 minutes)
  STOP_TIMES: 10 * 60 * 1000,
  
  // Route-to-station mapping cache (5 minutes)
  ROUTE_MAPPING: 5 * 60 * 1000,
} as const;

/**
 * Performance optimization constants
 */
export const PERFORMANCE = {
  // Minimum time between refresh calls to avoid spam
  MIN_REFRESH_INTERVAL: 1000,
  
  // Maximum number of concurrent API requests
  MAX_CONCURRENT_REQUESTS: 3,
} as const;