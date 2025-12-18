// Data layer hooks for the Cluj Bus App
// These hooks provide focused data fetching with caching, error handling, and retry logic
// NOTE: These hooks are being migrated to store-based architecture

// Re-export shared types from centralized location
export type { UseStationDataOptions, DataHookResult, DataHookError, DataHookErrorType } from '../../types/dataHooks';

export { useRouteData } from './useRouteData';
export type { UseRouteDataOptions } from './useRouteData';

export { useStopTimesData } from './useStopTimesData';
export type { UseStopTimesDataOptions } from './useStopTimesData';