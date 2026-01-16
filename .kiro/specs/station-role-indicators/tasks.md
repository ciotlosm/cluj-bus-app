# Implementation Plan: Station Role Indicators

## Overview

This implementation plan breaks down the station role indicators feature into discrete, incremental tasks. Each task builds on previous work, with testing integrated throughout to catch errors early.

## Tasks

- [x] 1. Create station role calculation utilities
  - Implement core calculation functions for determining station roles from trip data
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7_

- [x] 1.1 Create `stationRoleUtils.ts` with type definitions
  - Define `StationRole` type: `'start' | 'end' | 'turnaround' | 'standard'`
  - Define `TripStationRoles` interface
  - Define `RouteStationRoles` interface
  - _Requirements: 1.1, 1.2_

- [x] 1.2 Implement `calculateRolesForTrip()` function
  - Accept trip and stopTimes as parameters
  - Filter stopTimes by trip_id
  - Sort by stop_sequence
  - Identify first stop (sequence = 0) as start
  - Identify last stop (highest sequence) as end
  - Return TripStationRoles object
  - _Requirements: 1.1, 1.2_

- [ ]* 1.3 Write property test for first stop identification
  - **Property 1: First Stop Identification**
  - **Validates: Requirements 1.1**

- [ ]* 1.4 Write property test for last stop identification
  - **Property 2: Last Stop Identification**
  - **Validates: Requirements 1.2**

- [x] 1.5 Implement `aggregateRolesToRoute()` function
  - Accept array of TripStationRoles
  - Group by routeId
  - For each station, determine if it appears as start, end, both, or neither
  - Mark as turnaround if appears as both start and end
  - Mark as standard if appears as neither
  - Return RouteStationRoles object
  - _Requirements: 1.3, 1.4_

- [ ]* 1.6 Write property test for turnaround detection
  - **Property 3: Turnaround Station Detection**
  - **Validates: Requirements 1.3**

- [ ]* 1.7 Write property test for standard classification
  - **Property 4: Standard Station Classification**
  - **Validates: Requirements 1.4**

- [ ]* 1.8 Write property test for route isolation
  - **Property 5: Route Isolation**
  - **Validates: Requirements 1.7**

- [x] 1.9 Implement `isStationEndForTrip()` helper function
  - Accept stationId, tripId, and stopTimes
  - Find stop_times for the trip
  - Determine if station has highest stop_sequence
  - Return boolean
  - _Requirements: 3.1_

- [ ]* 1.10 Write property test for trip end station determination
  - **Property 6: Trip End Station Determination**
  - **Validates: Requirements 3.1**

- [x] 2. Create station role store with caching
  - Implement Zustand store with persist middleware for caching station roles
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7_

- [x] 2.1 Create `stationRoleStore.ts` with Zustand store
  - Define StationRoleStore interface
  - Use nested Map structure: `Map<routeId, Map<stationId, StationRole>>`
  - Add loading, error, lastCalculated state
  - Set up Zustand persist middleware with localStorage
  - _Requirements: 5.1, 5.2, 5.6_

- [x] 2.2 Implement `calculateStationRoles()` action
  - Load trips and stopTimes from respective stores
  - Call calculateRolesForTrip() for each trip
  - Call aggregateRolesToRoute() to get route-level roles
  - Store results in nested Map
  - Set lastCalculated timestamp
  - Handle errors gracefully (log and continue)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1, 8.2, 8.3_

- [x] 2.3 Implement `getStationRole()` lookup function
  - Accept routeId and stationId
  - Return role from nested Map (O(1) lookup)
  - Default to 'standard' if not found
  - _Requirements: 1.4, 8.1_

- [x] 2.4 Implement `isDataFresh()` freshness checker
  - Use 24-hour TTL from IN_MEMORY_CACHE_DURATIONS.STATIC_DATA
  - Check lastCalculated timestamp
  - Return boolean
  - _Requirements: 5.3, 5.4_

- [x] 2.5 Implement `invalidateCache()` action
  - Clear stationRoles Map
  - Reset lastCalculated to null
  - Trigger recalculation
  - _Requirements: 5.5_

- [x] 2.6 Implement cache size limiting logic
  - Track access times for routes
  - When cache exceeds 100 routes, remove least recently used
  - _Requirements: 5.7_

- [ ]* 2.7 Write property test for cache size limit
  - **Property 8: Cache Size Limit**
  - **Validates: Requirements 5.7**

- [ ]* 2.8 Write unit tests for cache operations
  - Test cache write/read
  - Test 24-hour expiration
  - Test invalidation on API refresh
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 2.9 Write unit tests for error handling
  - Test missing trip data fallback
  - Test incomplete stopTimes handling
  - Test cache corruption recovery
  - _Requirements: 8.1, 8.2, 8.4_

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create enhanced RouteBadge component
  - Build reusable route badge component with station role indicators
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3, 6.4_

- [x] 4.1 Create `RouteBadge.tsx` component
  - Accept props: routeNumber, routeColor, isStart, isEnd, size, onClick, selected, isFavorite
  - Render Avatar with route number
  - Use existing styling patterns from StationList route bubbles
  - _Requirements: 6.1_

- [x] 4.2 Add Start icon (Play) at 1:00 position
  - Import PlayArrowIcon from Material-UI
  - Position absolutely at top-right (10% from top, 10% from right)
  - Transform to center on border
  - Render conditionally when isStart is true
  - _Requirements: 2.2, 6.2_

- [x] 4.3 Add End icon (Stop) at 7:00 position
  - Import StopIcon from Material-UI
  - Position absolutely at bottom-left (10% from bottom, 10% from left)
  - Transform to center on border
  - Render conditionally when isEnd is true
  - _Requirements: 2.3, 6.3_

- [x] 4.4 Handle Turnaround case (both icons)
  - Render both Play and Stop icons when both props are true
  - Ensure icons don't overlap or obscure route number
  - _Requirements: 2.4, 6.4_

- [ ]* 4.5 Write unit tests for RouteBadge component
  - Test rendering with no icons (standard)
  - Test rendering with Start icon only
  - Test rendering with End icon only
  - Test rendering with both icons (turnaround)
  - Test props are accepted without errors
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3, 6.4_

- [x] 5. Integrate RouteBadge with StationList route filter bubbles
  - Replace existing Avatar components with enhanced RouteBadge
  - _Requirements: 7.1, 7.4, 7.7_

- [x] 5.1 Update StationList to use RouteBadge component
  - Import RouteBadge and stationRoleStore
  - For each route bubble, lookup station role using getStationRole()
  - Pass isStart and isEnd props based on role
  - Maintain existing onClick, selected, and isFavorite behavior
  - _Requirements: 7.1_

- [ ]* 5.2 Write integration tests for StationList
  - Test route bubbles render with station role indicators
  - Test existing filter toggle behavior still works
  - Test favorite routes still work
  - _Requirements: 7.1, 7.4, 7.7_

- [x] 6. Create vehicle "Drop off only" chip component
  - Add warning badge for vehicles terminating at current station
  - _Requirements: 3.2, 3.4, 3.5, 3.6_

- [x] 6.1 Create `VehicleDropOffChip.tsx` component
  - Accept props: isDropOffOnly, onInfoClick
  - Render Chip with "Drop off only" label
  - Use grey background with red outline
  - Make clickable to show toast
  - _Requirements: 3.2_

- [x] 6.2 Implement toast message on click
  - Use Material-UI Snackbar or existing toast system
  - Display message: "This vehicle terminates here. Do not board."
  - _Requirements: 3.4_

- [ ]* 6.3 Write unit tests for VehicleDropOffChip
  - Test chip renders when isDropOffOnly is true
  - Test chip does not render when isDropOffOnly is false
  - Test click triggers toast with correct message
  - _Requirements: 3.2, 3.4, 3.5_

- [x] 7. Integrate "Drop off only" chip with StationVehicleList
  - Add drop-off indicator to vehicle arrival chips
  - _Requirements: 3.1, 3.2, 3.5, 3.6, 4.1_

- [x] 7.1 Update VehicleCard in StationVehicleList
  - Import VehicleDropOffChip and isStationEndForTrip utility
  - For each vehicle, check if current station is end station for its trip
  - Render VehicleDropOffChip next to arrival time chip when true
  - Maintain existing arrival time format
  - _Requirements: 3.1, 3.2, 3.6_

- [ ]* 7.2 Write property test for all vehicles drop-off check
  - **Property 7: All Vehicles Drop-Off Check**
  - **Validates: Requirements 4.1**

- [ ]* 7.3 Write integration tests for vehicle drop-off chips
  - Test chip appears when station is trip end
  - Test chip does not appear when station is not trip end
  - Test existing arrival time display is unchanged
  - _Requirements: 3.2, 3.5, 3.6_

- [x] 8. Add station-level "Drop off only" indicator
  - Show station-wide indicator when all vehicles are drop-off only
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 8.1 Create `shouldShowStationDropOffIndicator()` utility function
  - Accept vehicles array, stationId, and stopTimes
  - Return true if all vehicles have station as end station
  - Return false if vehicles array is empty
  - Return false if any vehicle allows boarding
  - _Requirements: 4.1, 4.5_

- [x] 8.2 Update StationList header to show station-level indicator
  - Call shouldShowStationDropOffIndicator() for each station
  - Render "Drop off only" chip next to distance indicator when true
  - Use consistent styling with vehicle-level chips
  - _Requirements: 4.2, 4.4, 7.2_

- [ ]* 8.3 Write unit tests for station-level indicator
  - Test indicator shows when all vehicles are drop-off only
  - Test indicator does not show when at least one vehicle allows boarding
  - Test indicator does not show when no vehicles present
  - _Requirements: 4.2, 4.3, 4.5_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Integrate with map station markers (optional)
  - Add station role indicators to map markers for vehicle's current trip
  - _Requirements: 7.3_

- [ ] 10.1 Update StationLayer or relevant map component
  - For vehicle's current trip, lookup station roles
  - Pass isStart and isEnd to marker rendering
  - Ensure performance is not impacted
  - _Requirements: 7.3, 7.5_

- [ ]* 10.2 Write integration tests for map markers
  - Test markers show indicators for vehicle's trip route
  - Test existing map functionality still works
  - _Requirements: 7.3, 7.4_

- [ ] 11. Final integration and polish
  - Ensure all components work together seamlessly
  - _Requirements: 7.4, 7.5, 8.5, 8.6_

- [ ] 11.1 Test end-to-end user flows
  - Test viewing station with multiple routes
  - Test filtering by route with station role indicators
  - Test vehicle arrivals with drop-off chips
  - Test station-level drop-off indicator
  - _Requirements: 7.4_

- [ ]* 11.2 Write error handling tests
  - Test API unavailability graceful degradation
  - Test calculation errors don't crash app
  - _Requirements: 8.5, 8.6_

- [ ] 11.3 Verify performance characteristics
  - Test calculation time for 50 routes
  - Test cached lookup performance
  - Test rendering performance with indicators
  - _Requirements: 7.5_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests ensure components work together
