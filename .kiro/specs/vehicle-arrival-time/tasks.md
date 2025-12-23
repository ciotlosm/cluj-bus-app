# Implementation Plan: Vehicle Arrival Time

## Overview

This implementation plan breaks down the vehicle arrival time feature into discrete coding tasks. The approach prioritizes core distance and time calculation functionality first, followed by status message generation, and finally UI integration. Each task builds incrementally on previous work to ensure continuous validation.

## Tasks

- [x] 1. Set up core interfaces and configuration
  - Create TypeScript interfaces for ArrivalCalculator, DistanceCalculator, and configuration types
  - Implement configuration loading and validation for speed constants and thresholds
  - Set up basic project structure for arrival time calculations
  - _Requirements: 2.3, 2.5_

- [ ]* 1.1 Write property test for configuration validation
  - **Property 4: Configuration Validation**
  - **Validates: Requirements 2.5**

- [ ] 2. Implement distance calculation core functionality
  - Create DistanceCalculator class with GPS projection algorithms
  - Implement route shape parsing and segment distance calculations
  - Add fallback distance calculation using intermediate stops
  - _Requirements: 1.3, 1.4, 1.5, 5.1, 5.4_

- [ ]* 2.1 Write property test for GPS projection to route shape
  - **Property 5: GPS Projection to Route Shape**
  - **Validates: Requirements 5.2, 5.3, 5.6**

- [ ]* 2.2 Write property test for total distance calculation formula
  - **Property 6: Total Distance Calculation Formula**
  - **Validates: Requirements 5.4**

- [ ]* 2.3 Write property test for distance calculation method selection
  - **Property 2: Distance Calculation Method Selection**
  - **Validates: Requirements 1.3, 1.4, 1.5**

- [ ] 3. Implement time estimation and speed calculations
  - Create TimeEstimator class that converts distances to arrival times
  - Implement speed-based time calculations using configurable average speed
  - Add dwell time calculations for intermediate stops
  - _Requirements: 2.1, 2.2, 6.4, 6.5_

- [ ]* 3.1 Write property test for speed-based time calculation
  - **Property 3: Speed-Based Time Calculation**
  - **Validates: Requirements 2.1, 2.2**

- [ ]* 3.2 Write property test for dwell time calculation
  - **Property 9: Dwell Time Calculation**
  - **Validates: Requirements 6.4, 6.5**

- [ ] 4. Checkpoint - Ensure core calculation tests pass
  - Ensure all distance and time calculation tests pass, ask the user if questions arise.

- [ ] 5. Implement arrival status message generation
  - Create StatusGenerator class for human-friendly arrival messages
  - Implement time-based status messages (arriving soon, in X minutes)
  - Add proximity-based status messages (at stop, just left, departed)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 5.1 Write property test for status message generation
  - **Property 7: Status Message Generation**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [ ] 6. Implement main ArrivalCalculator orchestrator
  - Create ArrivalCalculator class that coordinates distance, time, and status calculations
  - Implement next stop identification logic for vehicle trips
  - Add vehicle filtering by target stop functionality
  - _Requirements: 1.1, 1.2, 6.1, 6.2, 6.3_

- [ ]* 6.1 Write property test for next stop identification
  - **Property 1: Next Stop Identification**
  - **Validates: Requirements 1.1**

- [ ]* 6.2 Write property test for vehicle filtering by stop
  - **Property 8: Vehicle Filtering by Stop**
  - **Validates: Requirements 6.1, 6.2, 6.3**

- [ ] 7. Implement vehicle sorting and multiple arrival calculations
  - Add sorting logic for vehicles by arrival time priority
  - Implement bulk arrival time calculations for multiple vehicles
  - Create stable sorting with vehicle ID tiebreaker
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 4.1, 4.2_

- [ ]* 7.1 Write property test for vehicle sorting by arrival
  - **Property 10: Vehicle Sorting by Arrival**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [ ] 8. Add error handling and validation
  - Implement input validation for GPS coordinates and trip data
  - Add graceful fallback handling for missing route shapes
  - Create comprehensive error reporting with calculation confidence levels
  - _Requirements: 4.3, 5.5_

- [ ]* 8.1 Write unit tests for error handling scenarios
  - Test invalid GPS coordinates, missing data, and malformed route shapes
  - _Requirements: 4.3, 5.5_

- [ ] 9. Checkpoint - Ensure all core functionality tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Integrate with existing vehicle and station services
  - Connect ArrivalCalculator to existing vehicleService and stationService
  - Add arrival time calculations to vehicle data transformation pipeline
  - Update vehicle and station stores to include arrival time data
  - _Requirements: 4.1, 4.2, 4.4_

- [ ]* 10.1 Write integration tests for service connections
  - Test integration with existing vehicle and station data flows
  - _Requirements: 4.1, 4.2_

- [ ] 11. Update UI components to display arrival times
  - Modify StationVehicleList component to show arrival time messages
  - Update VehicleList component with arrival time sorting
  - Add arrival time display to nearby stops view
  - _Requirements: 4.1, 4.2, 4.4_

- [ ]* 11.1 Write unit tests for UI component updates
  - Test arrival time display formatting and sorting in UI components
  - _Requirements: 4.1, 4.2_

- [ ] 12. Add configuration management UI
  - Create settings interface for adjusting average speed and dwell time constants
  - Add validation and persistence for arrival time configuration
  - Include configuration reset to defaults functionality
  - _Requirements: 2.3, 2.5_

- [ ]* 12.1 Write unit tests for configuration UI
  - Test configuration validation, persistence, and reset functionality
  - _Requirements: 2.3, 2.5_

- [ ] 13. Final checkpoint - Ensure all tests pass and integration works
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- Core calculation functionality is prioritized before UI integration