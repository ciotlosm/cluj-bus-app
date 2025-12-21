# Implementation Plan: Clean Architecture Rebuild

## Overview

Complete rebuild of the Bus Tracking App using clean architecture principles with raw API data flow, minimal components, and focused services. Implementation follows a backend-first approach, building up to the frontend incrementally.

## Tasks

- [x] 1. Create clean project structure and raw API types
  - Create new clean folder structure (services/, stores/, components/)
  - Define raw Tranzy API TypeScript interfaces (no field transformations)
  - Set up basic build configuration
  - _Requirements: 6.5, 8.1, 8.2_

- [x] 2. Implement domain-focused services
  - [x] 2.1 Create AgencyService for agency operations
    - Implement getAgencies() method
    - Keep service under 100 lines
    - Use raw API field names
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Create RouteService for route operations  
    - Implement getRoutes() method
    - Keep service under 100 lines
    - Use raw API field names
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 2.3 Create StationService for stop operations
    - Implement getStops() method
    - Keep service under 100 lines
    - Use raw API field names
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 2.4 Create VehicleService for vehicle tracking
    - Implement getVehicles() method
    - Keep service under 100 lines
    - Use raw API field names
    - _Requirements: 2.1, 2.2, 2.6_

  - [x] 2.5 Create TripService for trip operations
    - Implement getStopTimes() method
    - Keep service under 100 lines
    - Use raw API field names
    - _Requirements: 2.1, 2.2, 2.7_

- [ ]* 2.6 Write property tests for service constraints
  - **Property 4: Service File Size Constraint**
  - **Validates: Requirements 2.2**

- [x] 3. Implement clean state management
  - [x] 3.1 Create ConfigStore with raw configuration data
    - Implement apiKey, agency_id, home_location, work_location, theme fields using raw names
    - Add simple loading and error states
    - Use Zustand persist middleware for user preferences
    - No cross-store dependencies
    - _Requirements: 4.1, 4.4, 4.5, 4.6_

  - [x] 3.2 Create VehicleStore with raw API data
    - Store TranzyVehicleResponse[] directly without transformation
    - Add simple loading and error states
    - No cross-store dependencies
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

  - [x] 3.3 Create StationStore with raw API data
    - Store TranzyStopResponse[] directly without transformation
    - Add simple loading and error states
    - No cross-store dependencies
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

  - [x] 3.4 Create RouteStore with raw API data
    - Store TranzyRouteResponse[] directly without transformation
    - Add simple loading and error states
    - No cross-store dependencies
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

  - [x] 3.5 Create TripStore with raw API data
    - Store TranzyStopTimeResponse[] directly without transformation
    - Add simple loading and error states
    - No cross-store dependencies
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

- [ ]* 3.6 Write property tests for store architecture
  - **Property 8: Store Data Structure Matching**
  - **Property 9: Store Independence**
  - **Property 10: Required Store Properties**
  - **Property 15: Config Store Persistent Fields**
  - **Validates: Requirements 4.3, 4.4, 4.5, 4.6**

- [x] 4. Create minimal UI skeleton
  - [x] 4.1 Create basic layout components
    - Implement AppLayout, Header, Navigation (3 components max)
    - Add ThemeProvider component for Material-UI theme integration
    - Keep each component under 100 lines
    - Use Material-UI directly without wrappers
    - _Requirements: 3.1, 3.2, 5.1_

  - [x] 4.2 Create core view components
    - Implement StationView and SettingsView (2 components max)
    - Keep each component under 100 lines
    - Display raw API data directly
    - _Requirements: 3.1, 5.2, 6.2_

  - [x] 4.3 Create simple display components
    - Implement VehicleList, StopList, LocationPicker
    - Keep each component under 100 lines
    - Use raw API field names (route_short_name, stop_name, etc.)
    - _Requirements: 1.3, 3.1, 6.2_

- [ ]* 4.4 Write property tests for component architecture
  - **Property 5: Component File Size Constraint**
  - **Property 6: Direct MUI Usage**
  - **Property 7: Flat Component Structure**
  - **Validates: Requirements 3.1, 3.2, 3.5**

- [x] 5. Implement raw API data flow
  - [x] 5.1 Connect services to stores
    - Wire service calls to store actions
    - Preserve raw API field names throughout
    - No data transformation between layers
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 5.2 Connect stores to UI components
    - Display raw API data directly in components
    - Use route_short_name instead of routeName
    - No field transformation in UI layer
    - _Requirements: 1.3, 6.2_

- [ ]* 5.3 Write property tests for data flow
  - **Property 1: Raw API Field Preservation**
  - **Property 2: No Field Transformation Functions**
  - **Property 3: Direct API Field Usage in UI**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.5, 6.1, 6.2, 6.4**

- [x] 6. Implement error handling and loading states
  - Add simple error handling to all services
  - Implement loading states in all stores
  - Display error messages and loading indicators in UI
  - _Requirements: 4.4_

- [x] 7. Optimize build performance
  - [x] 7.1 Implement tree-shaking friendly imports
    - Use named imports throughout codebase
    - Eliminate default imports
    - _Requirements: 7.4_

  - [x] 7.2 Remove unused code and circular dependencies
    - Clean up unused imports
    - Eliminate circular dependency chains
    - _Requirements: 7.2, 7.5_

- [ ]* 7.3 Write property tests for build optimization
  - **Property 11: Named Import Usage**
  - **Property 12: No Circular Dependencies**
  - **Validates: Requirements 7.4, 7.5**

- [ ] 8. Final validation and testing
  - [ ] 8.1 Verify architectural constraints
    - Confirm layer separation (UI → State → Service → API)
    - Verify TypeScript interfaces match API responses
    - Check file size constraints
    - _Requirements: 8.1, 8.4_

  - [x] 8.2 Performance testing
    - Measure TypeScript compilation time (< 10 seconds)
    - Measure production bundle size (< 2MB)
    - _Requirements: 7.1, 7.3_

- [ ]* 8.3 Write property tests for architecture validation
  - **Property 13: Layer Separation**
  - **Property 14: TypeScript Interface Completeness**
  - **Validates: Requirements 8.1, 8.4**

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Focus on raw API data flow - no transformations between layers
- Keep all files small and focused (services 50-100 lines, components < 100 lines)
- Use Material-UI directly without custom wrappers
- Maintain flat folder structure and clear layer separation
- Complete store architecture: ConfigStore (persistent), VehicleStore (live), StationStore (cached), RouteStore (cached), TripStore (cached)
- Logic coordination handled in custom hooks to keep stores simple