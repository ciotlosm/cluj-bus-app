# Implementation Plan: Smart Station Filtering

## Overview

This implementation plan creates a location-aware station filtering system that finds the closest station with active trips, then optionally includes a nearby secondary station. The system also integrates with the favorites feature to allow filtering stations based on user's preferred routes. The approach leverages existing services and stores (location, station, trip, favorites) while adding a custom hook for filtering logic and enhancing the StationView component.

## Tasks

- [x] 1. Create core filtering interfaces and types
  - Define `SmartStationFilterResult` and `FilteredStation` interfaces
  - Add filtering constants (100m threshold for secondary stations)
  - Create TypeScript types for filtering options
  - _Requirements: 4.2, 3.1_

- [x] 2. Implement trip validation utility functions
  - Create function to check if station has active trips using stop times data
  - Add function to count trips for a given station
  - Implement validation logic that works with existing trip store data
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 2.1 Write property test for trip validation
  - **Property 3: Trip validation for all stations**
  - **Validates: Requirements 2.1**

- [x] 3. Create smart station filtering hook
  - Implement `useSmartStationFilter` hook with core filtering algorithm
  - Add location-based sorting using existing distance utilities
  - Integrate with location, station, and trip stores
  - Handle loading and error states
  - _Requirements: 1.1, 1.5, 4.2, 4.3_

- [ ]* 3.1 Write property test for distance-based sorting
  - **Property 1: Distance-based station sorting**
  - **Validates: Requirements 1.1**

- [ ]* 3.2 Write property test for location change reactivity
  - **Property 2: Location change triggers re-sorting**
  - **Validates: Requirements 1.5**

- [x] 4. Implement primary station selection logic
  - Add logic to find first station with valid trips
  - Implement station skipping for stations without trips
  - Ensure primary station designation works correctly
  - _Requirements: 2.4, 2.2_

- [ ]* 4.1 Write property test for primary station selection
  - **Property 6: Primary station selection**
  - **Validates: Requirements 2.4**

- [ ]* 4.2 Write property test for station exclusion
  - **Property 4: Stations without trips are excluded**
  - **Validates: Requirements 2.2**

- [x] 5. Implement secondary station discovery
  - Add logic to search within 100m radius of primary station
  - Implement validation for secondary station trips
  - Add selection of closest secondary station when multiple exist
  - Handle case when no valid secondary stations are found
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 5.1 Write property test for secondary station search
  - **Property 7: Secondary station search radius**
  - **Validates: Requirements 3.1**

- [ ]* 5.2 Write property test for secondary station validation
  - **Property 8: Secondary station trip validation**
  - **Validates: Requirements 3.2**

- [ ]* 5.3 Write property test for closest secondary selection
  - **Property 10: Closest secondary station selection**
  - **Validates: Requirements 3.4**

- [ ] 6. Add caching and performance optimizations
  - Implement distance calculation caching within hook
  - Add minimal location change detection to avoid unnecessary recalculation
  - Ensure cache invalidation when station data updates
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 6.1 Write property test for distance caching
  - **Property 16: Distance calculation caching**
  - **Validates: Requirements 6.1**

- [ ]* 6.2 Write property test for cache invalidation
  - **Property 19: Cache invalidation on data updates**
  - **Validates: Requirements 6.4**

- [x] 7. Enhance StationView component with filtering
  - Update StationView to use the new filtering hook
  - Add distance display for each filtered station
  - Implement primary/secondary station indicators
  - Add filtering toggle and status indicators
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 7.1 Write property test for distance information display
  - **Property 13: Distance information display**
  - **Validates: Requirements 5.2**

- [ ]* 7.2 Write property test for station count accuracy
  - **Property 20: Station count accuracy**
  - **Validates: Requirements 8.2**

- [ ] 8. Implement error handling and fallbacks
  - Add graceful fallback when GPS is unavailable
  - Handle trip validation failures for all stations
  - Implement error recovery with cached results
  - Add clear error messages and recovery options
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [ ]* 8.1 Write unit test for GPS unavailable fallback
  - Test that system shows all stations when location is unavailable
  - _Requirements: 7.1_

- [ ]* 8.2 Write unit test for all trip validation failures
  - Test warning display when no stations have verified service
  - _Requirements: 7.2_

- [ ] 9. Add user control and transparency features
  - Implement filtering status indicators in UI
  - Add station count display (filtered vs total)
  - Create toggle to disable filtering
  - Add trip validation status indicators
  - _Requirements: 8.1, 8.2, 8.4, 8.5_

- [ ]* 9.1 Write unit test for filtering toggle functionality
  - Test that toggle switches between filtered and unfiltered views
  - _Requirements: 8.4_

- [x] 10. Implement favorites integration in filtering hook
  - Update `useStationFilter` hook to integrate with favorites store
  - Add favorites filter state and toggle functionality
  - Implement route matching logic for station trip validation
  - Add `matchesFavorites` and `favoriteRouteCount` to FilteredStation interface
  - Handle case when no favorite routes are configured
  - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [ ]* 10.1 Write property test for favorites filter control visibility
  - **Property 23: Favorites filter control visibility with favorites**
  - **Property 27: Favorites filter control visibility without favorites**
  - **Validates: Requirements 9.1, 9.5**

- [ ]* 10.2 Write property test for favorites station filtering
  - **Property 24: Favorites filter station inclusion**
  - **Validates: Requirements 9.2**

- [ ]* 10.3 Write property test for complete trip evaluation
  - **Property 25: Complete trip evaluation for favorites**
  - **Validates: Requirements 9.3**

- [x] 11. Implement favorites filter logic
  - Add logic to exclude stations that don't match favorite routes
  - Implement combined filter logic (location + trips + favorites) using AND operation
  - Handle favorites filter disabled state (apply only location and trip filters)
  - Add error handling for favorites store unavailability
  - _Requirements: 9.4, 9.6, 9.7_

- [ ]* 11.1 Write property test for non-matching station exclusion
  - **Property 26: Non-matching station exclusion**
  - **Validates: Requirements 9.4**

- [ ]* 11.2 Write property test for favorites filter disabled behavior
  - **Property 28: Favorites filter disabled behavior**
  - **Validates: Requirements 9.6**

- [ ]* 11.3 Write property test for combined filter logic
  - **Property 29: Combined filter logic with favorites**
  - **Validates: Requirements 9.7**

- [x] 12. Enhance StationView with favorites filtering UI
  - Add favorites filter toggle control to StationView
  - Display favorites filter status in filtering indicators
  - Show favorite route indicators on stations that match favorites
  - Update station count display to reflect favorites filtering
  - Handle favorites filter control visibility based on user's favorite routes
  - _Requirements: 9.1, 9.5_

- [ ]* 12.1 Write unit test for favorites filter UI integration
  - Test favorites toggle appears when user has favorites
  - Test favorites toggle hidden when user has no favorites
  - _Requirements: 9.1, 9.5_

- [ ] 13. Integration testing and final validation
  - Test complete integration with existing stores including favorites store
  - Verify hook works correctly with StationView and favorites functionality
  - Ensure no breaking changes to existing functionality
  - Test performance with realistic station datasets and favorite route configurations
  - _Requirements: 4.5_

- [ ]* 13.1 Write integration test for favorites store integration
  - Test hook integration with location, station, trip, and favorites stores
  - _Requirements: 4.5_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests ensure components work together correctly