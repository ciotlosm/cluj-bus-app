# Data Hooks to Store Migration - Requirements Document

## Introduction

This specification addresses the critical architectural inconsistency in the Cluj Bus App where data fetching logic is duplicated between data hooks and Zustand stores. Currently, we have data hooks (useVehicleData, useStationData, useRouteData, useStopTimesData) performing API calls, caching, and retry logic, while the vehicle store also implements similar functionality. This creates duplication, inconsistency, and maintenance overhead. This migration will eliminate data hooks entirely and consolidate all data management into the store-based architecture.

## Glossary

- **Data Hook**: A React hook responsible for fetching and managing API data with caching and error handling (TO BE REMOVED)
- **Store-Based Architecture**: Centralized state management using Zustand stores for all data operations
- **Controller Hook**: A React hook that coordinates store operations and provides component-level logic
- **Vehicle Store**: The unified Zustand store managing all vehicle, station, and route data
- **Config Store**: The Zustand store managing configuration, theme, and favorites
- **Location Store**: The Zustand store managing GPS and location services
- **Store Migration**: The process of moving data fetching logic from hooks to stores
- **Architectural Duplication**: The current problem where both hooks and stores handle the same data operations

## Requirements

### Requirement 1

**User Story:** As a developer, I want to eliminate data hooks entirely, so that all data management is centralized in stores without duplication.

#### Acceptance Criteria

1. WHEN data hooks are removed THEN the system SHALL handle all data operations through Zustand stores exclusively
2. WHEN controller hooks are updated THEN the system SHALL use store methods instead of data hook calls
3. WHEN the migration is complete THEN the system SHALL eliminate all duplicate API calling logic between hooks and stores
4. WHEN stores handle all data operations THEN the system SHALL maintain consistent caching, retry logic, and error handling
5. WHEN data hooks are removed THEN the system SHALL reduce the codebase by removing 1,500+ lines of duplicate data fetching logic

### Requirement 2

**User Story:** As a developer, I want to standardize on store-based data access, so that all components use a consistent architecture.

#### Acceptance Criteria

1. WHEN components need data THEN the system SHALL access data through store subscriptions and methods exclusively
2. WHEN controller hooks need data operations THEN the system SHALL call store methods (refreshVehicles, refreshStations, etc.) directly
3. WHEN processing data THEN the system SHALL use existing processing hooks (useVehicleFiltering, useVehicleGrouping) with store data as input
4. WHEN handling complex orchestration needs THEN the system SHALL use store-based controller patterns like useNearbyViewController
5. WHEN new features are added THEN the system SHALL follow store-first architecture without creating new data hooks

### Requirement 3

**User Story:** As a developer, I want to enhance store capabilities to handle all data scenarios, so that stores can completely replace data hooks.

#### Acceptance Criteria

1. WHEN stores need to handle specific data scenarios THEN the system SHALL add methods to support all use cases currently handled by data hooks
2. WHEN API services are needed THEN the system SHALL use singleton service instances from stores exclusively
3. WHEN caching is required THEN the system SHALL use unified caching strategies managed entirely by stores
4. WHEN auto-refresh is enabled THEN the system SHALL coordinate all refresh operations through store-managed systems
5. WHEN errors occur THEN the system SHALL handle all error scenarios through store error handling mechanisms

### Requirement 4

**User Story:** As a developer, I want to preserve all existing functionality during refactoring, so that users experience no disruption or regression.

#### Acceptance Criteria

1. WHEN refactoring components THEN the system SHALL preserve all existing functionality and user-facing behavior
2. WHEN replacing orchestration logic THEN the system SHALL maintain identical loading states, error handling, and data transformation
3. WHEN updating hook usage THEN the system SHALL preserve all existing configuration options and their behaviors
4. WHEN refactoring is complete THEN the system SHALL pass all existing tests with minimal modifications
5. WHEN new patterns are implemented THEN the system SHALL maintain performance characteristics equal to or better than current implementation

### Requirement 5

**User Story:** As a developer, I want clear refactoring guidance and documentation, so that the new architecture is well-understood and consistently applied.

#### Acceptance Criteria

1. WHEN implementing new patterns THEN the system SHALL provide clear documentation with practical examples
2. WHEN refactoring components THEN the system SHALL follow consistent architectural principles across all implementations
3. WHEN creating new hooks THEN the system SHALL maintain clear separation of concerns between data, processing, and orchestration layers
4. WHEN documenting changes THEN the system SHALL provide comprehensive before/after examples showing the improvements
5. WHEN refactoring is complete THEN the system SHALL update all documentation to reflect the new architecture

### Requirement 6

**User Story:** As a developer, I want improved performance and maintainability, so that the application is faster and easier to work with.

#### Acceptance Criteria

1. WHEN using new composition patterns THEN the system SHALL eliminate duplicate API calls and data processing operations
2. WHEN hooks are simplified THEN the system SHALL reduce memory usage and improve rendering performance
3. WHEN testing new patterns THEN the system SHALL be easier to unit test with clear separation of concerns
4. WHEN debugging issues THEN the system SHALL provide clearer error messages and simpler call stacks
5. WHEN extending functionality THEN the system SHALL support easier addition of new features through composable patterns

### Requirement 7

**User Story:** As a developer, I want standardized store-based controller patterns, so that all controllers follow consistent architectural principles.

#### Acceptance Criteria

1. WHEN complex orchestration is needed THEN the system SHALL use store-based controller patterns like useNearbyViewController
2. WHEN creating new controller hooks THEN the system SHALL access data through store subscriptions and methods only
3. WHEN integrating with stores THEN the system SHALL maintain clean separation between data management (stores) and orchestration logic (controllers)
4. WHEN handling errors in controllers THEN the system SHALL use store error states and error handling patterns
5. WHEN configuring controller behavior THEN the system SHALL use store configuration and state management



### Requirement 8

**User Story:** As a developer, I want comprehensive testing coverage, so that the refactored architecture is reliable and regression-free.

#### Acceptance Criteria

1. WHEN implementing new composition patterns THEN the system SHALL maintain or improve test coverage for all functionality
2. WHEN refactoring components THEN the system SHALL ensure all existing integration tests continue to pass with minimal modifications
3. WHEN creating new hooks THEN the system SHALL include comprehensive unit tests for each hook's functionality
4. WHEN testing error scenarios THEN the system SHALL verify proper error handling and fallback behaviors
5. WHEN performance testing THEN the system SHALL demonstrate improved or equivalent performance metrics

### Requirement 9

**User Story:** As a developer, I want validation of the store migration success, so that I can confirm the architectural improvements have been achieved.

#### Acceptance Criteria

1. WHEN migration is complete THEN the system SHALL demonstrate removal of all data hooks (1,500+ lines of duplicate code)
2. WHEN measuring performance THEN the system SHALL show improved performance through elimination of duplicate API calls
3. WHEN evaluating maintainability THEN the system SHALL demonstrate single source of truth for all data operations
4. WHEN assessing consistency THEN the system SHALL show unified store-based patterns across all data handling
5. WHEN validating functionality THEN the system SHALL pass all tests and maintain identical user-facing behavior

### Requirement 10

**User Story:** As a developer, I want complete removal of data hooks, so that there is no architectural confusion or maintenance overhead.

#### Acceptance Criteria

1. WHEN data hooks are removed THEN the system SHALL have zero remaining files in src/hooks/data/ directory
2. WHEN controller hooks are updated THEN the system SHALL have zero imports of useVehicleData, useStationData, useRouteData, or useStopTimesData
3. WHEN stores handle all data THEN the system SHALL have single API calling logic per data type in stores only
4. WHEN caching is needed THEN the system SHALL use store-managed cache systems exclusively
5. WHEN testing data operations THEN the system SHALL mock stores instead of data hooks