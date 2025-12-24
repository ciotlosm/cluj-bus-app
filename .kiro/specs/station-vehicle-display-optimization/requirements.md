# Requirements Document

## Introduction

This feature optimizes the display of vehicles in station lists to improve user experience when stations have many vehicles across multiple routes. The system will intelligently limit and group vehicle displays based on station complexity while maintaining access to all vehicle information.

## Glossary

- **Station**: A transit stop where vehicles pick up and drop off passengers
- **Vehicle**: A bus or transit vehicle with real-time location and status information
- **Route**: A defined transit line that vehicles follow
- **Vehicle_Display_System**: The component responsible for showing vehicle information in station lists
- **Off_Route_Vehicle**: A vehicle with status 'off_route' as defined in the existing ArrivalStatus enum
- **Vehicle_Status**: The arrival status categories: 'at_stop', 'arriving_soon', 'in_minutes', 'just_left', 'departed', 'off_route'
- **VEHICLE_DISPLAY_THRESHOLD**: A configurable constant defining the maximum number of vehicles to show before applying grouping logic

## Requirements

### Requirement 1: Basic Vehicle Display Logic

**User Story:** As a user, I want to see vehicle information clearly organized, so that I can quickly understand transit options at each station.

#### Acceptance Criteria

1. WHEN a station has only one route, THE Vehicle_Display_System SHALL display all vehicles using the current display logic
2. WHEN a station has multiple routes AND total vehicles is less than or equal to VEHICLE_DISPLAY_THRESHOLD, THE Vehicle_Display_System SHALL display all vehicles using the current display logic
3. WHEN a station has multiple routes AND total vehicles exceeds VEHICLE_DISPLAY_THRESHOLD, THE Vehicle_Display_System SHALL apply grouped display logic
4. THE Vehicle_Display_System SHALL define VEHICLE_DISPLAY_THRESHOLD as a configurable constant with initial value of 5

### Requirement 2: Grouped Vehicle Display

**User Story:** As a user, I want to see the most relevant vehicles from each route when there are many vehicles, so that I can make informed transit decisions without information overload.

#### Acceptance Criteria

1. WHEN applying grouped display logic, THE Vehicle_Display_System SHALL show maximum one vehicle per route with status 'at_stop'
2. WHEN applying grouped display logic, THE Vehicle_Display_System SHALL show maximum one vehicle per route with status 'arriving_soon'
3. WHEN applying grouped display logic, THE Vehicle_Display_System SHALL show maximum one vehicle per route with status 'in_minutes'
4. WHEN applying grouped display logic, THE Vehicle_Display_System SHALL show maximum one vehicle per route with status 'just_left'
5. WHEN applying grouped display logic, THE Vehicle_Display_System SHALL show maximum one vehicle per route with status 'departed'
6. WHEN selecting vehicles for grouped display, THE Vehicle_Display_System SHALL prioritize vehicles with the earliest arrival time within each status category

### Requirement 3: Off-Route Vehicle Management

**User Story:** As a user, I want to control whether I see off-route vehicles, so that I can focus on active service or troubleshoot service issues as needed.

#### Acceptance Criteria

1. THE Vehicle_Display_System SHALL hide all vehicles with status 'off_route' by default
2. THE Vehicle_Display_System SHALL provide a global toggle to show or hide off-route vehicles
3. WHEN the off-route toggle is enabled, THE Vehicle_Display_System SHALL display off-route vehicles following the same grouping rules as other vehicles
4. WHEN the off-route toggle state changes, THE Vehicle_Display_System SHALL apply the new setting to all station displays immediately

### Requirement 4: Expandable Vehicle List

**User Story:** As a user, I want to see additional vehicles when needed, so that I can access complete information while maintaining a clean initial view.

#### Acceptance Criteria

1. WHEN grouped display logic is applied, THE Vehicle_Display_System SHALL initially show up to VEHICLE_DISPLAY_THRESHOLD vehicles
2. WHEN there are more vehicles available than initially displayed, THE Vehicle_Display_System SHALL provide a "Show more" button or similar expansion control
3. WHEN the user activates the expansion control, THE Vehicle_Display_System SHALL reveal all remaining vehicles for that station
4. WHEN the expansion control is activated, THE Vehicle_Display_System SHALL change the control to allow collapsing back to the grouped view
5. THE Vehicle_Display_System SHALL maintain the expansion state per station during the user session

### Requirement 5: Configuration Management

**User Story:** As a developer, I want to easily adjust the vehicle display threshold, so that I can optimize the user experience based on usage patterns and feedback.

#### Acceptance Criteria

1. THE Vehicle_Display_System SHALL define VEHICLE_DISPLAY_THRESHOLD in a constants file or configuration module
2. WHEN VEHICLE_DISPLAY_THRESHOLD is modified, THE Vehicle_Display_System SHALL apply the new threshold to all station displays without requiring code changes in multiple locations
3. THE Vehicle_Display_System SHALL validate that VEHICLE_DISPLAY_THRESHOLD is a positive integer greater than zero