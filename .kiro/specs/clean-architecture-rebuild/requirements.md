# Requirements Document

## Introduction

A complete architectural rebuild of the Bus Tracking App to eliminate complexity, reduce file sizes, and create a maintainable foundation. The current codebase suffers from over-engineered UI components, complex transformations, and large files that are difficult to maintain and debug.

## Glossary

- **Raw_API_Fields**: Field names exactly as returned by the Tranzy API (e.g., route_short_name, agency_id)
- **Clean_Service**: A focused service handling one domain with minimal transformations
- **Minimal_Component**: A React component under 100 lines with single responsibility
- **Skeleton_App**: A working application with core functionality using minimal code

## Requirements

### Requirement 1: Raw API Field Usage

**User Story:** As a developer, I want to use raw API field names throughout the application, so that I can easily trace data from API documentation to UI display without confusion.

#### Acceptance Criteria

1. THE System SHALL use raw Tranzy API field names (route_short_name, route_long_name, agency_id) directly in all code
2. THE System SHALL NOT transform field names between API responses and UI components
3. WHEN displaying route information, THE System SHALL use route_short_name directly instead of routeName
4. WHEN storing API responses, THE System SHALL preserve original field names without mapping
5. THE System SHALL eliminate all field transformation layers between API and UI

### Requirement 2: Domain-Focused Services

**User Story:** As a developer, I want focused services by domain, so that I can easily understand and maintain API interactions for specific functionality.

#### Acceptance Criteria

1. THE System SHALL implement separate services for each domain (agencies, routes, stations, vehicles, schedules)
2. WHEN creating services, THE System SHALL limit each service to 50-100 lines maximum
3. THE System SHALL implement agencyService for agency lookup and configuration
4. THE System SHALL implement routeService for routes and trip planning
5. THE System SHALL implement stationService for stop/station data
6. THE System SHALL implement vehicleService for live vehicle tracking
7. THE System SHALL implement scheduleService for stop times and schedules

### Requirement 3: Minimal Component Architecture

**User Story:** As a developer, I want small, focused React components, so that I can easily understand, test, and maintain each piece of functionality.

#### Acceptance Criteria

1. THE System SHALL limit all React components to 100 lines maximum
2. THE System SHALL use Material-UI components directly without custom wrappers
3. WHEN creating UI components, THE System SHALL implement single responsibility per component
4. THE System SHALL eliminate complex component hierarchies and deep nesting
5. THE System SHALL use flat folder structure for components

### Requirement 4: Clean State Management

**User Story:** As a developer, I want simple state management, so that I can easily track data flow and debug application state.

#### Acceptance Criteria

1. THE System SHALL implement one Zustand store per domain (vehicles, config, stations, routes, trips)
2. THE System SHALL eliminate complex state transformations and computed values
3. WHEN storing API data, THE System SHALL store raw API responses without transformation
4. THE System SHALL implement simple loading and error states per store
5. THE System SHALL eliminate cross-store dependencies and complex state synchronization
6. WHEN storing user preferences, THE System SHALL store persistent configuration (API key, agency, locations, theme) in ConfigStore
7. WHEN handling ephemeral data, THE System SHALL NOT store runtime state (current location, temporary UI state) in persistent stores

### Requirement 5: Skeleton Application Structure

**User Story:** As a developer, I want a working skeleton application, so that I can build features incrementally on a solid foundation.

#### Acceptance Criteria

1. THE System SHALL implement basic layout with Header, Content, and Navigation (3 components maximum)
2. THE System SHALL implement core views for Station and Settings (2 components maximum)
3. WHEN displaying vehicle data, THE System SHALL show simple list without complex cards
4. THE System SHALL implement basic location picker without fancy UI
5. THE System SHALL implement simple settings form without complex panels
6. THE System SHALL achieve working core functionality with maximum 10 small files

### Requirement 6: No Complex Transformations

**User Story:** As a developer, I want to eliminate data transformations, so that I can easily debug data flow and reduce complexity.

#### Acceptance Criteria

1. THE System SHALL NOT implement VehicleTransformationService or similar transformation layers
2. THE System SHALL display raw API data directly in UI components
3. WHEN processing API responses, THE System SHALL perform minimal formatting only (dates, numbers)
4. THE System SHALL eliminate business logic layers that transform data structure
5. THE System SHALL use TypeScript interfaces that match API response structure exactly

### Requirement 7: Build Performance

**User Story:** As a developer, I want fast build times and minimal bundle size, so that I can develop efficiently.

#### Acceptance Criteria

1. THE System SHALL achieve TypeScript compilation under 10 seconds
2. THE System SHALL eliminate unused imports and dead code
3. WHEN building for production, THE System SHALL generate bundle under 2MB
4. THE System SHALL use tree-shaking friendly imports (named imports only)
5. THE System SHALL eliminate circular dependencies

### Requirement 8: Maintainable Architecture

**User Story:** As a developer, I want clear architectural boundaries, so that I can easily add features without breaking existing functionality.

#### Acceptance Criteria

1. THE System SHALL implement clear separation between API, state, and UI layers
2. THE System SHALL use consistent file naming and folder structure
3. WHEN adding new features, THE System SHALL follow established patterns
4. THE System SHALL implement proper TypeScript types for all API interfaces
5. THE System SHALL eliminate complex abstractions and over-engineering