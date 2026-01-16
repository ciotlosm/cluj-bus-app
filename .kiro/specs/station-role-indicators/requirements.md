# Requirements Document: Station Role Indicators

## Introduction

This feature enhances the user experience by clearly distinguishing between different station roles (Start, End, Turnaround) for each route, reducing user anxiety about "phantom buses" and preventing users from waiting at drop-off-only locations. The system will provide visual indicators on route badges and vehicle arrival chips to communicate boarding availability.

## Glossary

- **Station**: A physical location where transit vehicles stop (from Tranzy API `stops` endpoint)
- **Route**: A transit line identified by a route number (e.g., "35", "1A")
- **Trip**: A scheduled journey along a route with a specific direction and destination
- **Start_Station**: The first stop in a trip's sequence where new trips originate
- **End_Station**: The final stop in a trip's sequence where trips terminate
- **Turnaround_Station**: A station that serves as both Start and End for different trips on the same route
- **Stop_Sequence**: The ordered list of stations for a trip (from `stop_times` API data)
- **Route_Badge**: The circular UI element displaying the route number
- **Station_Role**: The classification of a station's function for a specific route (Start, End, Turnaround, or Standard)
- **Drop_Off_Only**: A state indicating passengers cannot board at this location

## Requirements

### Requirement 1: Station Role Calculation

**User Story:** As a system, I want to determine each station's role for every route, so that I can display appropriate visual indicators to users.

#### Acceptance Criteria

1. WHEN processing trip data, THE System SHALL identify the first stop (stop_sequence = 0) as the Start_Station for that trip
2. WHEN processing trip data, THE System SHALL identify the last stop (highest stop_sequence) as the End_Station for that trip
3. WHEN aggregating trip data for a route, THE System SHALL classify a station as a Turnaround_Station IF it appears as Start_Station in some trips AND End_Station in other trips for the same route
4. WHEN aggregating trip data for a route, THE System SHALL classify a station as Standard IF it is neither Start_Station nor End_Station for any trip on that route
5. WHEN calculating station roles, THE System SHALL use the `stop_times` API data to determine stop sequences for each trip
6. WHEN calculating station roles, THE System SHALL group trips by route_id to aggregate station roles per route
7. WHEN a station serves multiple routes, THE System SHALL maintain separate role classifications for each route

### Requirement 2: Route Badge Visual Indicators

**User Story:** As a user viewing route badges, I want to see visual indicators showing station roles, so that I understand whether I can board at this location.

#### Acceptance Criteria

1. WHEN displaying a route badge for a Standard station, THE System SHALL render a clean circular badge with no additional symbols
2. WHEN displaying a route badge for a Start_Station, THE System SHALL render a small Play icon (▶) at the 1:00 clock position on the badge border
3. WHEN displaying a route badge for an End_Station, THE System SHALL render a small Square icon (■) at the 7:00 clock position on the badge border
4. WHEN displaying a route badge for a Turnaround_Station, THE System SHALL render BOTH the Play icon (1:00 position) AND Square icon (7:00 position)
5. WHEN rendering station role icons, THE System SHALL ensure icons are visible but do not obscure the route number
6. WHEN rendering station role icons, THE System SHALL use consistent sizing and positioning across all route badges

### Requirement 3: Vehicle Arrival "Drop Off Only" Indicator

**User Story:** As a user viewing vehicle arrivals, I want to see clear warnings when vehicles are drop-off only, so that I don't wait for buses I cannot board.

#### Acceptance Criteria

1. WHEN displaying a vehicle arrival chip, THE System SHALL determine if the current station is the End_Station for that vehicle's trip
2. WHEN the current station is the End_Station for a vehicle's trip, THE System SHALL display a "Drop off only" badge next to the arrival time
3. WHEN displaying the "Drop off only" badge, THE System SHALL use a distinct visual style (grey background or outlined red) to draw attention
4. WHEN a user taps the "Drop off only" badge, THE System SHALL display a toast message: "This vehicle terminates here. Do not board."
5. WHEN the current station is NOT the End_Station for a vehicle's trip, THE System SHALL display standard arrival information without the "Drop off only" badge
6. WHEN displaying arrival times, THE System SHALL maintain the existing arrival time format and add the badge as a secondary element

### Requirement 4: Station-Level "Drop Off Only" Indicator

**User Story:** As a user viewing a station, I want to see a station-level indicator when all vehicles are drop-off only, so that I immediately know boarding is not possible.

#### Acceptance Criteria

1. WHEN displaying a station's vehicle list, THE System SHALL check if ALL vehicles serving that station have the "Drop off only" status
2. WHEN ALL vehicles are drop-off only, THE System SHALL display a station-level "Drop off only" indicator next to the distance chip
3. WHEN at least one vehicle allows boarding, THE System SHALL NOT display the station-level indicator
4. WHEN the station-level indicator is displayed, THE System SHALL use consistent styling with the vehicle-level badges
5. WHEN no vehicles are currently serving the station, THE System SHALL NOT display the station-level indicator

### Requirement 5: Data Caching and Storage

**User Story:** As a system, I want to cache station role calculations, so that I can provide fast responses without recalculating on every render.

#### Acceptance Criteria

1. WHEN station roles are calculated, THE System SHALL cache the results in local storage
2. WHEN storing cached data, THE System SHALL include route_id, station_id, role classification, and calculation timestamp
3. WHEN cached data exists, THE System SHALL use it if the data age is less than 24 hours
4. WHEN cached data is older than 24 hours, THE System SHALL recalculate station roles from fresh API data
5. WHEN API data (trips or stop_times) is refreshed, THE System SHALL invalidate and recalculate station role cache
6. WHEN storing cache data, THE System SHALL use the same storage mechanism as other static data (Zustand persist middleware)
7. WHEN the cache grows large, THE System SHALL limit storage to the most recently used 100 routes

### Requirement 6: Route Badge Component Enhancement

**User Story:** As a developer, I want a reusable route badge component with station role props, so that I can consistently display indicators across the application.

#### Acceptance Criteria

1. WHEN rendering a route badge, THE Component SHALL accept `isStart` and `isEnd` boolean props
2. WHEN `isStart` is true, THE Component SHALL render the Start icon at the 1:00 position
3. WHEN `isEnd` is true, THE Component SHALL render the End icon at the 7:00 position
4. WHEN both `isStart` and `isEnd` are true, THE Component SHALL render both icons (Turnaround)
5. WHEN rendering icons, THE Component SHALL use CSS positioning to place icons on the badge border
6. WHEN the component is used in different contexts (map, station list, vehicle list), THE Component SHALL maintain consistent visual appearance

### Requirement 7: Integration with Existing Components

**User Story:** As a developer, I want station role indicators integrated into existing UI components, so that users see consistent information throughout the app.

#### Acceptance Criteria

1. WHEN displaying route filter bubbles in StationList (the Avatar chips that filter by route), THE System SHALL include station role indicators for the current station context
2. WHEN displaying a station header, THE System SHALL show a station-level "Drop off only" chip next to the distance indicator IF all routes serving that station are drop-off only
3. WHEN displaying station markers on the map for a vehicle's current trip, THE System SHALL include station role indicators for that specific trip's route
4. WHEN integrating indicators, THE System SHALL NOT break existing functionality (filtering, favorites, route selection, etc.)
5. WHEN integrating indicators, THE System SHALL maintain existing performance characteristics
6. WHEN integrating indicators, THE System SHALL reuse existing utility functions where possible
7. WHEN a user interacts with route filter bubbles, THE System SHALL maintain the existing toggle behavior (select/deselect route filter)

### Requirement 8: Error Handling and Fallbacks

**User Story:** As a system, I want graceful error handling for station role calculations, so that missing or incomplete data doesn't break the UI.

#### Acceptance Criteria

1. WHEN trip data is missing for a route, THE System SHALL default to Standard station classification
2. WHEN stop_times data is incomplete, THE System SHALL log a warning and skip that trip in calculations
3. WHEN a station has no stop_sequence data, THE System SHALL treat it as a Standard station
4. WHEN cache data is corrupted, THE System SHALL clear the cache and recalculate from API data
5. WHEN API data is unavailable, THE System SHALL use stale cache data if available and display a warning
6. WHEN calculation errors occur, THE System SHALL NOT crash the application and SHALL log errors for debugging
