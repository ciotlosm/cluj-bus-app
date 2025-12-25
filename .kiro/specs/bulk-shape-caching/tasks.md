# Implementation Plan: Bulk Shape Caching

## Overview

This implementation transforms the current individual shape fetching system into an efficient bulk caching architecture. The approach follows a "cache-first, refresh-behind" strategy where the app loads instantly with cached data while transparently updating in the background when changes are detected.

## Tasks

- [x] 1. Create shape processing utilities
  - Create `src/utils/shapes/shapeProcessingUtils.ts` with bulk processing functions
  - Implement `processAllShapes()` to convert raw API responses to RouteShape format
  - Implement `generateShapeHash()` using FNV-1a algorithm (content-only, no timestamps)
  - Implement `validateShapeData()` for basic JSON structure validation
  - _Requirements: 2.3, 7.1, 8.5_

- [ ]* 1.1 Write property test for shape processing
  - **Property 4: RouteShape format consistency**
  - **Validates: Requirements 2.3, 5.3**

- [ ]* 1.2 Write property test for hash generation
  - **Property 12: Hash-based change detection**
  - **Validates: Requirements 7.1, 7.2**

- [x] 2. Create centralized shape store
  - Create `src/stores/shapeStore.ts` with Zustand and persist middleware
  - Implement Map-based storage with localStorage persistence (Map ↔ Array transformation)
  - Add actions: `initializeShapes`, `getShape`, `refreshShapes`, `clearShapes`
  - Add utilities: `isDataFresh`, `hasShape`
  - Handle localStorage failures gracefully (fallback to in-memory state)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 3.4, 8.2_

- [ ]* 2.1 Write property test for cache initialization
  - **Property 1: Cache-first initialization**
  - **Validates: Requirements 1.1, 3.2, 4.3**

- [ ]* 2.2 Write property test for localStorage persistence
  - **Property 5: localStorage persistence round-trip**
  - **Validates: Requirements 3.1, 3.5**

- [ ]* 2.3 Write property test for localStorage failure resilience
  - **Property 7: localStorage failure resilience**
  - **Validates: Requirements 3.4, 8.2**

- [x] 3. Enhance shapes service for bulk fetching
  - Modify `src/services/shapesService.ts` to add `getAllShapes()` method
  - Implement bulk API call without shape_id parameter
  - Maintain existing error handling patterns
  - Keep existing `getShapePoints()` method for backward compatibility during transition
  - _Requirements: 2.1, 2.2, 5.4_

- [ ]* 3.1 Write property test for bulk API integration
  - **Property 3: Bulk API integration**
  - **Validates: Requirements 1.3, 2.1, 2.2**

- [x] 4. Implement smart loading strategy
  - Integrate shape store initialization with app startup
  - Implement cache-first loading with immediate availability
  - Implement background refresh with hash-based change detection
  - Only update cache and notify components when data hash differs
  - Always update timestamp after background refresh (even if data unchanged)
  - _Requirements: 1.1, 1.2, 1.4, 7.3, 7.4_

- [ ]* 4.1 Write property test for background refresh
  - **Property 2: Background refresh with change detection**
  - **Validates: Requirements 1.2, 1.4, 7.3, 7.4**

- [ ]* 4.2 Write property test for API call optimization
  - **Property 8: API call optimization**
  - **Validates: Requirements 4.2, 4.4, 6.4**

- [ ] 5. Checkpoint - Ensure core functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement error handling and resilience
  - Add exponential backoff retry logic for network errors (100ms, 200ms, 400ms)
  - Implement graceful fallback to individual shape fetching when bulk fetch fails
  - Add cache expiration handling with fresh fetch triggers
  - Implement offline functionality using cached data
  - _Requirements: 8.1, 8.3, 3.3, 6.5_

- [ ]* 6.1 Write property test for graceful fallback
  - **Property 10: Graceful fallback behavior**
  - **Validates: Requirements 5.4, 8.1**

- [ ]* 6.2 Write property test for network error resilience
  - **Property 13: Network error resilience**
  - **Validates: Requirements 8.3**

- [ ]* 6.3 Write property test for cache expiration
  - **Property 6: Cache expiration handling**
  - **Validates: Requirements 3.3**

- [ ]* 6.4 Write property test for offline functionality
  - **Property 11: Offline functionality**
  - **Validates: Requirements 6.5**

- [x] 7. Ensure backward compatibility
  - Verify existing code can request shapes by shape_id from bulk collection
  - Ensure RouteShape objects maintain expected format for arrival calculations
  - Test integration with existing route shape utilities
  - _Requirements: 5.1, 5.3_

- [ ]* 7.1 Write property test for backward compatibility
  - **Property 9: Backward compatibility**
  - **Validates: Requirements 5.1**

- [ ]* 7.2 Write property test for response validation
  - **Property 14: Response validation**
  - **Validates: Requirements 8.5**

- [x] 8. Update existing code to use shape store
  - Modify `src/utils/station/stationFilterStrategies.ts` to use shape store instead of routeShapeService
  - Update any other components currently using individual shape fetching
  - Remove rate limiting logic (no longer needed with bulk fetching)
  - _Requirements: 4.2, 5.1_

- [x] 9. Consolidate shape utilities into utils/shapes/
  - Move `convertToRouteShape`, `getCachedRouteShape`, and `clearShapeCache` from `src/utils/arrival/shapeUtils.ts` to `src/utils/shapes/shapeUtils.ts`
  - Move relevant functions from `src/services/routeShapeService.ts` to `src/utils/shapes/routeShapeUtils.ts`
  - Update all import statements across the codebase to use the new consolidated locations
  - Remove the old `src/utils/arrival/shapeUtils.ts` file after migration
  - Ensure all existing functionality is preserved with the same interfaces
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 10. Final cleanup and optimization
  - Remove deprecated `getShapePoints()` method from shapesService
  - Remove old routeShapeService file and related individual fetching logic
  - Clean up any unused imports and dependencies
  - _Requirements: 2.4_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The system maintains backward compatibility during transition
- Background refresh strategy ensures instant loading with fresh data