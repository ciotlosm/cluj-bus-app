/**
 * Hooks Index
 * 
 * Organized hook exports following the layered architecture:
 * - Data Layer: Raw data fetching and caching
 * - Processing Layer: Data transformation and business logic
 * - Shared Layer: Reusable utilities and system functions
 * - Controllers Layer: High-level orchestration and workflows
 */

// === DATA LAYER ===
// Data layer has been migrated to store-based architecture
// Use store subscription hooks from shared layer instead

// === PROCESSING LAYER ===
// Data transformation and analysis hooks
export * from './processing';

// === SHARED LAYER ===
// Reusable utility hooks
export * from './shared';

// === CONTROLLERS LAYER ===
// High-level business logic and orchestration hooks
export * from './controllers';

