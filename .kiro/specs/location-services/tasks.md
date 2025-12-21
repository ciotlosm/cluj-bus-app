# Implementation Plan: Location Services

## Overview

Implementation of GPS location services following the established patterns: raw data stores, domain-focused services, simple loading/error states, and minimal cross-dependencies. The implementation focuses on core functionality with clean separation between location detection, distance calculations, and state management.

## Tasks

- [x] 1. Create core location utilities and types
  - Create `src/utils/distanceUtils.ts` with distance calculation functions
  - Create TypeScript interfaces for location data types
  - Implement Haversine formula for accurate distance calculations
  - _Requirements: 3.1, 3.3_

- [ ]* 2. Write property tests for distance calculations
  - **Property 8: Distance calculation accuracy**
  - **Validates: Requirements 3.1, 3.3**

- [ ]* 3. Write property tests for distance edge cases
  - **Property 9: Distance calculation edge cases**
  - **Validates: Requirements 3.4**

- [x] 4. Implement locationService
  - Create `src/services/locationService.ts` following stationService pattern
  - Implement GPS position retrieval with browser Geolocation API
  - Add permission checking and management methods
  - Handle location availability detection
  - _Requirements: 1.1, 1.2, 2.1, 2.4_

- [ ]* 5. Write property tests for location service
  - **Property 1: Location retrieval on permission grant**
  - **Property 4: Permission state checking before prompting**
  - **Validates: Requirements 1.2, 1.3, 2.1**

- [ ]* 6. Write property tests for error handling
  - **Property 2: Error message specificity**
  - **Property 3: Graceful degradation on permission denial**
  - **Validates: Requirements 1.4, 1.5**

- [x] 7. Create LocationStore with Zustand
  - Create `src/stores/locationStore.ts` following existing store patterns
  - Implement raw GPS data storage with loading/error states
  - Add location preferences and caching configuration
  - Include previous location tracking for comparison
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 8. Write property tests for store state management
  - **Property 14: Previous location maintenance**
  - **Property 15: Location preferences persistence**
  - **Property 16: Clear disabled state management**
  - **Validates: Requirements 5.2, 5.3, 5.4**

- [x] 9. Checkpoint - Core functionality complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Create location filtering utilities
  - Implement proximity filtering functions using distanceUtils
  - Create helper functions for location-based sorting
  - Add utility functions for distance threshold checking
  - _Requirements: 4.2, 4.4_

- [ ]* 11. Write property tests for filtering and sorting
  - **Property 10: Proximity filtering with configurable thresholds**
  - **Property 12: Distance-based sorting**
  - **Validates: Requirements 4.2, 4.4**

- [x] 12. Implement error handling and fallbacks
  - Add specific error types and messages to errorHandler
  - Implement graceful degradation when GPS unavailable
  - Add retry logic with exponential backoff for timeouts
  - _Requirements: 6.1, 6.2, 6.4_

- [ ]* 13. Write property tests for error scenarios
  - **Property 17: Manual location fallback**
  - **Property 18: Exponential backoff retry behavior**
  - **Property 20: Complete failure graceful degradation**
  - **Validates: Requirements 6.1, 6.2, 6.4**

- [ ] 14. Add performance optimizations
  - Implement location coordinate caching with configurable timeout
  - Add rate limiting to prevent excessive GPS requests
  - Optimize for battery usage with balanced accuracy settings
  - _Requirements: 7.2, 7.5_

- [ ]* 15. Write property tests for performance features
  - **Property 22: Location coordinate caching**
  - **Property 23: Rate limiting implementation**
  - **Validates: Requirements 7.2, 7.5**

- [ ] 16. Create location preferences configuration
  - Add location accuracy settings interface (high/balanced/low)
  - Include distance threshold configuration for filtering
  - Add configuration for cache timeout and rate limiting
  - _Requirements: 6.1, 7.3_

- [ ]* 17. Write integration tests for component interactions
  - Test LocationStore integration with components
  - Test error handling across service-store boundaries
  - Test location change triggers and re-filtering behavior
  - _Requirements: 4.3, 5.1_

- [ ] 18. Final checkpoint - Complete system integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Implementation follows existing patterns from configStore and stationService