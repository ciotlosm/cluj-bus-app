# Implementation Plan: Route Bubble Filtering

## Overview

This implementation adds interactive route filtering to station cards by making route bubbles clickable. The solution extends existing components with minimal changes, adding state management for per-station route filters and updating the vehicle display logic accordingly.

## Tasks

- [x] 1. Add route filter state management to StationList component
  - Add useState for route filter state using Map<number, number | null>
  - Create memoized handler for route bubble clicks with toggle logic
  - Implement per-station filter state tracking
  - _Requirements: 1.1, 1.4, 1.5, 3.1, 5.1_

- [ ]* 1.1 Write property test for route filter state management
  - **Property 7: Filter state uses station ID as key**
  - **Validates: Requirements 5.1**

- [ ]* 1.2 Write property test for filter state isolation
  - **Property 4: Filter state is isolated per station**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 2. Update route bubble click handlers and styling
  - Add onClick handlers to route bubble Avatar components
  - Implement conditional styling for selected vs unselected states
  - Apply standard selected color styling for active route bubbles
  - _Requirements: 1.2, 2.1, 2.2, 2.3_

- [ ]* 2.1 Write property test for route bubble styling
  - **Property 3: Route bubble styling reflects selection state**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ]* 2.2 Write property test for route selection behavior
  - **Property 2: Route selection behavior is mutually exclusive**
  - **Validates: Requirements 1.4, 1.5**

- [x] 3. Extend StationVehicleList with route filtering capability
  - Add selectedRouteId prop to StationVehicleList interface
  - Implement vehicle filtering logic before sorting and grouping
  - Update grouping logic to bypass when route filter is active
  - _Requirements: 1.1, 4.1, 4.4_

- [ ]* 3.1 Write property test for route filtering logic
  - **Property 1: Route filtering displays only selected route vehicles**
  - **Validates: Requirements 1.1**

- [ ]* 3.2 Write property test for grouping bypass
  - **Property 5: Route filtering bypasses grouping logic**
  - **Validates: Requirements 4.1, 4.4**

- [ ] 4. Handle empty state and edge cases
  - Add empty state message for routes with no vehicles
  - Implement validation for filter state consistency
  - Add cleanup logic for invalid route filters
  - _Requirements: 4.3_

- [ ]* 4.1 Write unit tests for empty state handling
  - Test display of empty state message when no vehicles match filter
  - Test edge cases with invalid route IDs
  - _Requirements: 4.3_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Wire components together and test integration
  - Pass selectedRouteId from StationList to StationVehicleList
  - Verify filter state persistence across UI interactions
  - Test complete user flow from route bubble click to filtered display
  - _Requirements: 3.2, 3.3, 5.4_

- [ ]* 6.1 Write property test for state persistence
  - **Property 6: Filter state persists across UI interactions**
  - **Validates: Requirements 5.4**

- [ ]* 6.2 Write integration tests for component interaction
  - Test complete flow from StationList to StationVehicleList
  - Test filter state updates and prop passing
  - _Requirements: 1.1, 3.1, 4.1_

- [ ] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Implementation uses TypeScript with React hooks and Material-UI components