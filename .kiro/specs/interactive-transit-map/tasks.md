# Implementation Plan: Interactive Transit Map

## Overview

This implementation focuses on creating a vehicle map dialog that integrates with the existing StationVehicleList component. The approach prioritizes essential functionality with a full-screen dialog showing a single vehicle, its route, and stations.

## Tasks

- [x] 1. Copy essential map components from feature branch
  - Copy VehicleMapDialog, VehicleLayer, RouteShapeLayer, StationLayer, DebugLayer, MapControls from `feature/station-display-optimization` branch
  - Copy essential types and utilities (interactiveMap types, icon utils, performance utils)
  - Create maps directory structure under `src/components/features/maps/`
  - _Requirements: 1.1, 1.2, 1.3, 6.3, 6.4_

- [ ]* 1.1 Write property test for component copying
  - **Property 1: Essential components exist**
  - **Validates: Requirements 1.1**

- [x] 2. Set up map dependencies and configuration
  - Install react-leaflet and leaflet dependencies if not present
  - Configure Leaflet CSS imports
  - Set up map type definitions and constants
  - _Requirements: 6.1, 8.1_

- [ ]* 2.1 Write unit tests for map configuration
  - Test dependency imports and CSS loading
  - Test type definitions and constants
  - _Requirements: 6.1, 8.1_

- [x] 3. Implement VehicleMapDialog integration
  - Create state management for dialog open/close in VehicleCard component
  - Wire map button click handler to open dialog
  - Pass vehicle data and station context to dialog
  - _Requirements: 1.1, 1.5_

- [ ]* 3.1 Write property test for dialog integration
  - **Property 2: Dialog opens with vehicle data**
  - **Validates: Requirements 1.1**

- [ ] 4. Implement vehicle marker display
  - Configure VehicleLayer to show single selected vehicle
  - Ensure vehicle marker displays at correct coordinates
  - Implement vehicle marker styling and icons
  - _Requirements: 1.1, 1.4_

- [ ]* 4.1 Write property test for vehicle marker
  - **Property 1: Vehicle marker display**
  - **Validates: Requirements 1.1**

- [ ]* 4.2 Write property test for vehicle position updates
  - **Property 4: Vehicle position updates**
  - **Validates: Requirements 1.4**

- [ ] 5. Implement route shape visualization
  - Configure RouteShapeLayer to display vehicle's route
  - Implement route shape loading from API with fallback
  - Style route shapes with appropriate colors
  - _Requirements: 1.2_

- [ ]* 5.1 Write property test for route shape rendering
  - **Property 2: Route shape rendering**
  - **Validates: Requirements 1.2**

- [ ] 6. Implement station markers for route
  - Configure StationLayer to show stations along vehicle's route
  - Filter stations to only show those on the vehicle's trip
  - Implement station marker styling and popups
  - _Requirements: 1.3_

- [ ]* 6.1 Write property test for station markers
  - **Property 3: Station marker display**
  - **Validates: Requirements 1.3**

- [ ] 7. Implement map viewport centering
  - Center map on vehicle position when dialog opens
  - Set appropriate zoom level for optimal visibility
  - Handle viewport updates when vehicle position changes
  - _Requirements: 1.5_

- [ ]* 7.1 Write property test for viewport centering
  - **Property 5: Map viewport centering**
  - **Validates: Requirements 1.5**

- [ ] 8. Implement map controls and layer toggles
  - Add MapControls component with layer visibility toggles
  - Implement toggle functionality for vehicles, routes, stations
  - Add debug mode toggle for development
  - _Requirements: 6.3, 6.4_

- [ ]* 8.1 Write property test for layer toggles
  - **Property 7: Layer toggle controls**
  - **Validates: Requirements 6.3**

- [ ]* 8.2 Write property test for debug toggle
  - **Property 8: Debug mode toggle**
  - **Validates: Requirements 6.4**

- [ ] 9. Implement marker click interactions
  - Add click handlers for vehicle and station markers
  - Display relevant information in popups or tooltips
  - Ensure popup content is informative and well-formatted
  - _Requirements: 6.2_

- [ ]* 9.1 Write property test for marker interactions
  - **Property 6: Marker click interactions**
  - **Validates: Requirements 6.2**

- [ ] 10. Implement loading states and error handling
  - Add loading indicators during route shape fetching
  - Handle API errors gracefully with fallback routes
  - Display appropriate error messages to users
  - _Requirements: 8.5_

- [ ]* 10.1 Write property test for loading states
  - **Property 9: Loading state display**
  - **Validates: Requirements 8.5**

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Integration testing and final wiring
  - Test complete flow from vehicle card to map dialog
  - Verify data flow between components
  - Test dialog close functionality and cleanup
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [ ]* 12.1 Write integration tests
  - Test complete user flow from button click to map display
  - Test data cleanup when dialog closes
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Focus on essential functionality: single vehicle, its route, and route stations
- Full-screen dialog approach for optimal mobile experience