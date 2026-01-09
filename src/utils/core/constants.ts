// Application Constants
// Centralized configuration for cache durations and other app-wide settings

/**
 * API Configuration
 * Centralized API endpoints and configuration
 */
export const API_CONFIG = {
  // Base URL for all Tranzy API endpoints
  BASE_URL: '/api/tranzy/v1/opendata',
} as const;

/**
 * Refresh and cache configuration constants (in milliseconds)
 * Single-tier caching: In-memory cache checks only
 */

// Auto-refresh cycle configuration
export const AUTO_REFRESH_CYCLE = 60 * 1000; // 1 minute (configurable for future 2min)

// In-memory cache durations (when to fetch new data)
export const IN_MEMORY_CACHE_DURATIONS = {
  // Vehicle data - matches auto-refresh cycle
  VEHICLES: AUTO_REFRESH_CYCLE, // 1 minute
  
  // Static data - 24 hours (routes, stations, shapes, trips, stop times)
  STATIC_DATA: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// UI staleness thresholds (for display purposes only)
export const STALENESS_THRESHOLDS = {
  // Vehicle data shows as stale after 5 minutes
  VEHICLES: 5 * 60 * 1000, // 5 minutes
  
  // Static data shows as stale after 24 hours
  STATIC_DATA: 24 * 60 * 60 * 1000, // 24 hours
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

/**
 * Arrival time calculation constants
 * Configurable values for arrival time estimation (Requirements 2.3, 2.5)
 */
export const ARRIVAL_CONFIG = {
  // Average bus speed for time calculations (km/h)
  // Reduced from 25 to 18 for more realistic urban conditions
  AVERAGE_SPEED: 25,
  
  // Dwell time per intermediate stop (seconds)
  // Increased from 30 to 60 for more realistic stop times
  DWELL_TIME: 30,
  
  // Proximity threshold for "at stop" status (meters)
  PROXIMITY_THRESHOLD: 50,
  
  // Recent departure window for "just left" status (minutes)
  RECENT_DEPARTURE_WINDOW: 2,
  
  // Off-route threshold for distance from route shape (meters)
  OFF_ROUTE_THRESHOLD: 200
} as const;

/**
 * Vehicle display optimization constants
 * Configuration for station vehicle list display logic (Requirements 1.4, 4.1)
 */
export const VEHICLE_DISPLAY = {
  // Maximum vehicles to show before applying grouping logic
  VEHICLE_DISPLAY_THRESHOLD: 5,
  
  // Maximum vehicles per trip status in grouped mode
  MAX_VEHICLES_PER_TRIP_STATUS: 1,
} as const;