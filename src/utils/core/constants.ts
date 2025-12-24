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

/**
 * Arrival time calculation constants
 * Configurable values for arrival time estimation (Requirements 2.3, 2.5)
 */
export const ARRIVAL_CONFIG = {
  // Average bus speed for time calculations (km/h)
  AVERAGE_SPEED: 25,
  
  // Dwell time per intermediate stop (seconds)
  DWELL_TIME: 30,
  
  // Proximity threshold for "at stop" status (meters)
  PROXIMITY_THRESHOLD: 50,
  
  // Recent departure window for "just left" status (minutes)
  RECENT_DEPARTURE_WINDOW: 2
} as const;

/**
 * Vehicle display optimization constants
 * Configuration for intelligent vehicle grouping and display limits (Requirements 1.4, 5.1)
 */
export const VEHICLE_DISPLAY = {
  // Maximum vehicles before applying grouping logic
  VEHICLE_DISPLAY_THRESHOLD: 5,
  
  // Maximum vehicles per route per status in grouped mode
  MAX_VEHICLES_PER_ROUTE_STATUS: 1,
} as const;