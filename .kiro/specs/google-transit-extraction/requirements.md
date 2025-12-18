# Google Transit Service Extraction - Requirements Document

## Introduction

This feature involves extracting all Google Transit service and Google Maps API key related functionality from the Cluj Bus App. The Google Transit service is currently implemented but not actively used in the application. This extraction will clean up the codebase by removing unused Google-specific code while preserving the core transit functionality that relies on the Tranzy API.

## Glossary

- **Google_Transit_Service**: The service class that handles Google Maps Distance Matrix API calls for transit time calculations
- **Google_Maps_API_Key**: The authentication key required to access Google Maps services
- **Transit_Estimate**: A calculated estimate of travel time between two points with confidence indicators
- **Fallback_Estimation**: Distance-based travel time calculation used when Google API is not available
- **Configuration_UI**: User interface components for managing Google Maps API key settings
- **Bus_Tracker_System**: The main Cluj Bus tracking application

## Requirements

### Requirement 1

**User Story:** As a system maintainer, I want to remove unused Google Transit service code, so that the codebase is cleaner and focuses only on actively used functionality.

#### Acceptance Criteria

1. WHEN removing the Google Transit service, THE Bus_Tracker_System SHALL maintain all existing transit functionality using Tranzy API
2. WHEN Google service files are removed, THE Bus_Tracker_System SHALL continue to operate without errors or broken imports
3. WHEN Google configuration UI is removed, THE Bus_Tracker_System SHALL maintain a clean settings interface
4. WHEN Google API key references are removed, THE Bus_Tracker_System SHALL not attempt to access Google services
5. WHEN extraction is complete, THE Bus_Tracker_System SHALL have no remaining Google Maps API dependencies

### Requirement 2

**User Story:** As a developer, I want all Google-related code properly identified and documented, so that the extraction process is systematic and complete.

#### Acceptance Criteria

1. WHEN analyzing the codebase, THE extraction process SHALL identify all Google Transit service files
2. WHEN analyzing configuration components, THE extraction process SHALL identify all Google API key UI components
3. WHEN analyzing type definitions, THE extraction process SHALL identify all Google-related interfaces and types
4. WHEN analyzing environment variables, THE extraction process SHALL identify all Google API key references
5. WHEN analysis is complete, THE extraction process SHALL provide a comprehensive list of files to modify or remove

### Requirement 3

**User Story:** As a developer, I want to safely remove the Google Transit service file, so that no unused service code remains in the application.

#### Acceptance Criteria

1. WHEN removing googleTransitService.ts, THE Bus_Tracker_System SHALL not break any existing functionality
2. WHEN removing the service file, THE extraction process SHALL verify no active imports exist
3. WHEN removing the service class, THE extraction process SHALL remove the exported singleton instance
4. WHEN service removal is complete, THE Bus_Tracker_System SHALL have no references to GoogleTransitService
5. WHEN file is removed, THE extraction process SHALL update any documentation references

### Requirement 4

**User Story:** As a user, I want Google Maps API key configuration options removed from settings, so that the interface only shows relevant configuration options.

#### Acceptance Criteria

1. WHEN removing GoogleMapsApiKeySection component, THE settings interface SHALL remain functional
2. WHEN removing Google API key fields, THE configuration form SHALL not have broken form handling
3. WHEN removing Google-related UI elements, THE settings page SHALL maintain proper layout and styling
4. WHEN Google configuration is removed, THE Bus_Tracker_System SHALL not display Google-related status messages
5. WHEN UI cleanup is complete, THE settings interface SHALL only show Tranzy API configuration options

### Requirement 5

**User Story:** As a developer, I want all Google-related type definitions removed, so that the type system reflects only actively used interfaces.

#### Acceptance Criteria

1. WHEN removing googleMapsApiKey from UserConfig, THE configuration types SHALL remain valid
2. WHEN removing TransitEstimate and TransitRequest interfaces, THE type system SHALL not have unused exports
3. WHEN removing Google-related types, THE Bus_Tracker_System SHALL compile without type errors
4. WHEN type cleanup is complete, THE codebase SHALL have no references to removed Google types
5. WHEN types are removed, THE extraction process SHALL update any dependent interfaces

### Requirement 6

**User Story:** As a system administrator, I want environment variable references to Google API keys removed, so that the application has no Google service dependencies.

#### Acceptance Criteria

1. WHEN removing VITE_GOOGLE_MAPS_API_KEY references, THE Bus_Tracker_System SHALL not attempt to read Google environment variables
2. WHEN removing environment variable usage, THE application build process SHALL not reference Google API keys
3. WHEN Google environment variables are removed, THE Bus_Tracker_System SHALL not log Google-related configuration messages
4. WHEN environment cleanup is complete, THE application SHALL have no Google service initialization attempts
5. WHEN variables are removed, THE extraction process SHALL update any configuration documentation

### Requirement 7

**User Story:** As a user, I want Google-related UI indicators and messages removed, so that the interface only shows information relevant to the current functionality.

#### Acceptance Criteria

1. WHEN removing Google API key status messages, THE Bus_Tracker_System SHALL not display Google-related alerts
2. WHEN removing offline estimation tooltips, THE UI SHALL not reference Google Maps API configuration
3. WHEN removing Google-related help text, THE interface SHALL provide accurate information about available features
4. WHEN UI message cleanup is complete, THE Bus_Tracker_System SHALL only show Tranzy API related status information
5. WHEN messages are updated, THE user interface SHALL maintain clear and helpful guidance

### Requirement 8

**User Story:** As a developer, I want future Google Maps directions requirements removed from specifications, so that the project scope reflects current functionality.

#### Acceptance Criteria

1. WHEN removing Google Maps directions requirements, THE specification documents SHALL reflect actual implemented features
2. WHEN cleaning up spec files, THE requirements SHALL not reference unimplemented Google functionality
3. WHEN updating specifications, THE project scope SHALL focus on Tranzy API based features
4. WHEN spec cleanup is complete, THE requirements SHALL not contain Google Maps integration plans
5. WHEN specifications are updated, THE project documentation SHALL accurately reflect the current architecture