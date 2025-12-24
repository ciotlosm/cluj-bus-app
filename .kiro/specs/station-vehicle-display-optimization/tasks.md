# Implementation Plan: Station Vehicle Display Optimization

## Overview

This implementation plan converts the vehicle display optimization design into discrete coding tasks. Each task builds incrementally on previous work, focusing on core functionality first with optional testing tasks for comprehensive validation.

## Tasks

- [ ] 1. Add vehicle display constants and configuration
  - Add VEHICLE_DISPLAY constants to `src/utils/core/constants.ts`
  - Define VEHICLE_DISPLAY_THRESHOLD with initial value of 5
  - Define MAX_VEHICLES_PER_ROUTE_STATUS with value of 1
  - _Requirements: 1.4, 5.1_

- [ ]* 1.1 Write unit test for constants validation
  - Test that VEHICLE_DISPLAY_THRESHOLD exists and has correct initial value
  - Test that constants are positive integers
  - _Requirements: 1.4, 5.3_

- [ ] 2. Create vehicle grouping utilities
  - [ ] 2.1 Create `src/utils/station/vehicleGroupingUtils.ts`
    - Implement GroupedVehicles and VehicleGroupingOptions interfaces
    - Implement `groupVehiclesForDisplay` function with core grouping logic
    - Implement `selectBestVehiclePerStatus` function for priority selection
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.2 Write property test for status-based grouping
    - **Property 3: Status-Based Vehicle Grouping**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

  - [ ]* 2.3 Write property test for vehicle selection priority
    - **Property 4: Earliest Vehicle Selection Priority**
    - **Validates: Requirements 2.6**

  - [ ]* 2.4 Write unit tests for grouping edge cases
    - Test empty vehicle lists
    - Test single vehicle scenarios
    - Test vehicles without arrival times
    - _Requirements: 2.1-2.6_

- [ ] 3. Enhance StationVehicleList component
  - [ ] 3.1 Add local state management for display optimization
    - Add VehicleDisplayState interface to component
    - Implement useState hooks for grouping state and off-route toggle
    - Add expansion state management for "Show more" functionality
    - _Requirements: 3.1, 4.1, 4.5_

  - [ ] 3.2 Implement vehicle display logic
    - Add logic to determine when to apply grouping based on route count and vehicle count
    - Integrate groupVehiclesForDisplay utility into component
    - Implement off-route vehicle filtering with local toggle
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.3_

  - [ ]* 3.3 Write property test for single route display logic
    - **Property 1: Single Route Display Logic**
    - **Validates: Requirements 1.1**

  - [ ]* 3.4 Write property test for multi-route threshold logic
    - **Property 2: Multi-Route Threshold Logic**
    - **Validates: Requirements 1.2, 1.3**

- [ ] 4. Add expansion controls and UI enhancements
  - [ ] 4.1 Implement "Show more" / "Show less" button functionality
    - Add conditional rendering of expansion button based on hidden vehicle count
    - Implement click handlers for expanding and collapsing vehicle list
    - Add appropriate button text and icons
    - _Requirements: 4.2, 4.3, 4.4_

  - [ ] 4.2 Add off-route vehicle toggle UI
    - Add toggle button or switch for showing/hiding off-route vehicles
    - Implement toggle state management and click handlers
    - Add appropriate labeling and visual indicators
    - _Requirements: 3.2, 3.4_

  - [ ]* 4.3 Write property test for off-route vehicle hiding
    - **Property 5: Off-Route Vehicle Default Hiding**
    - **Validates: Requirements 3.1**

  - [ ]* 4.4 Write property test for off-route grouping consistency
    - **Property 6: Off-Route Vehicle Grouping Consistency**
    - **Validates: Requirements 3.3**

- [ ] 5. Update parent components for route count information
  - [ ] 5.1 Enhance StationList component
    - Pass route count information to StationVehicleList component
    - Calculate route count from vehicle data or station metadata
    - Update component props and prop passing
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 5.2 Write property test for initial display count limit
    - **Property 7: Initial Display Count Limit**
    - **Validates: Requirements 4.1**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Integration and performance optimization
  - [ ] 7.1 Optimize component re-rendering
    - Add React.memo to prevent unnecessary re-renders
    - Optimize callback functions with useCallback
    - Ensure efficient state updates
    - _Requirements: All requirements for performance_

  - [ ]* 7.2 Write integration tests for component interactions
    - Test expansion/collapse functionality
    - Test off-route toggle interactions
    - Test vehicle click handling with grouped display
    - _Requirements: 4.2, 4.3, 4.4, 3.4_

- [ ]* 8. Write property test for threshold validation
  - **Property 8: Threshold Validation**
  - **Validates: Requirements 5.3**

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- The implementation maintains backward compatibility with existing vehicle display logic