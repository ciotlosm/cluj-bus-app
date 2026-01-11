# Requirements Document

## Introduction

The Vehicle Position Prediction feature enhances the accuracy of real-time vehicle tracking by calculating predicted vehicle positions based on timestamp age, route shapes, and movement patterns. This addresses the inherent delay between GPS updates from vehicles and ensures users see the most accurate current position rather than stale historical data.

## Glossary

- **API_Position**: The raw latitude/longitude coordinates received from the Tranzy API
- **Predicted_Position**: The calculated current position based on timestamp age and movement simulation
- **Timestamp_Age**: The time difference between the vehicle's reported timestamp and the current time
- **Route_Projection**: The process of mapping a position onto the route shape geometry
- **Movement_Simulation**: The calculation of vehicle advancement along the route based on time elapsed
- **Position_Predictor**: The system component responsible for generating predicted coordinates
- **Debug_Visualization**: The map layer showing both API and predicted positions for troubleshooting

## Requirements

### Requirement 1: Timestamp-Based Position Prediction

**User Story:** As a user, I want to see where vehicles actually are now, so that arrival times and map positions reflect current reality rather than outdated GPS data.

#### Acceptance Criteria

1. WHEN a vehicle's timestamp is older than the current time, THE Position_Predictor SHALL calculate where the vehicle should be now based on elapsed time
2. WHEN calculating predicted position, THE Position_Predictor SHALL use the vehicle's timestamp field to determine time elapsed since last GPS update
3. WHEN the timestamp age is zero or negative, THE Position_Predictor SHALL return the original API coordinates unchanged
4. THE Position_Predictor SHALL handle timestamp parsing from ISO string format to calculate accurate time differences
5. WHEN timestamp parsing fails, THE Position_Predictor SHALL fall back to using API coordinates without prediction

### Requirement 2: Route Shape-Based Movement Simulation

**User Story:** As a system architect, I want vehicle predictions to follow actual route geometry, so that predicted positions are realistic and follow road networks.

#### Acceptance Criteria

1. WHEN a route shape is available, THE Position_Predictor SHALL project the vehicle onto the route shape using existing projection utilities
2. WHEN simulating movement, THE Position_Predictor SHALL advance the vehicle along the route shape segments based on elapsed time, average speed, and stations encountered for dwell time calculation
3. WHEN a vehicle is off-route, THE Position_Predictor SHALL not attempt prediction and return original coordinates
4. THE Position_Predictor SHALL reuse existing route projection logic from arrival calculations
5. WHEN no route shape is available, THE Position_Predictor SHALL fall back to API coordinates without prediction

### Requirement 3: Speed and Dwell Time Integration

**User Story:** As a system designer, I want predictions to account for realistic vehicle behavior, so that stationary vehicles at stops and moving vehicles are handled appropriately.

#### Acceptance Criteria

1. THE Position_Predictor SHALL use ARRIVAL_CONFIG.AVERAGE_SPEED for movement calculations
2. WHEN a vehicle is determined to be at a station during the elapsed time, THE Position_Predictor SHALL apply ARRIVAL_CONFIG.DWELL_TIME delays
3. WHEN simulating movement through multiple stations, THE Position_Predictor SHALL account for dwell time at each intermediate station
4. THE Position_Predictor SHALL determine station proximity using existing vehicle progress estimation logic
5. WHEN a vehicle was reported at a station but elapsed time suggests it has departed, THE Position_Predictor SHALL calculate the new position along the route

### Requirement 4: Universal Application to Calculations

**User Story:** As a user, I want all arrival times and map displays to use the most accurate position data, so that the entire application reflects current vehicle locations.

#### Acceptance Criteria

1. WHEN calculating arrival times, THE System SHALL use predicted coordinates instead of API coordinates for all distance calculations
2. WHEN displaying vehicles on the map, THE System SHALL render vehicles at predicted positions for normal user view
3. WHEN performing route shape projections, THE System SHALL use predicted coordinates as input
4. THE System SHALL apply position prediction to all vehicle-related calculations including proximity detection and progress estimation
5. WHEN determining vehicle status (at stop, in transit, etc.), THE System SHALL base decisions on predicted positions

### Requirement 5: Debug Visualization Support

**User Story:** As a developer, I want to see both API and predicted positions on the debug map, so that I can verify prediction accuracy and troubleshoot issues.

#### Acceptance Criteria

1. WHEN debug mode is enabled, THE Debug_Visualization SHALL display both API position and predicted position for each vehicle
2. WHEN rendering debug markers, THE Debug_Visualization SHALL show API position with washed/grey styling to indicate it's historical data
3. WHEN rendering debug markers, THE Debug_Visualization SHALL show predicted position with normal vehicle styling
4. THE Debug_Visualization SHALL include timestamp age and prediction details in vehicle popups
5. WHEN prediction fails or is not applied, THE Debug_Visualization SHALL clearly indicate why prediction was skipped

### Requirement 6: Seamless Integration with Existing Systems

**User Story:** As a system maintainer, I want position prediction to integrate cleanly with existing code, so that implementation requires minimal changes to current functionality.

#### Acceptance Criteria

1. THE Position_Predictor SHALL extend existing vehicle data structures without breaking current interfaces
2. WHEN integrating with arrival calculations, THE Position_Predictor SHALL reuse existing utilities for route projection and distance calculation
3. THE Position_Predictor SHALL maintain compatibility with existing vehicle filtering and display logic
4. WHEN prediction fails, THE System SHALL gracefully fall back to existing behavior using API coordinates
5. THE Position_Predictor SHALL not require changes to the Tranzy API interface or data fetching logic

### Requirement 7: Basic Reliability

**User Story:** As a user, I want position prediction to work reliably, so that it doesn't cause errors or break existing functionality.

#### Acceptance Criteria

1. WHEN prediction calculations fail, THE Position_Predictor SHALL log the error and return API coordinates
2. THE Position_Predictor SHALL handle edge cases like negative timestamps, invalid coordinates, and missing route data gracefully
3. THE Position_Predictor SHALL not cache predictions since they are time-dependent and must be recalculated on each use