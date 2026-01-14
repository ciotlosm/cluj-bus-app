# Requirements Document

## Introduction

The Dynamic Speed Prediction feature enhances vehicle arrival time accuracy by using real-time speed data, traffic-aware calculations, and intelligent fallback mechanisms instead of static speed constants. This addresses the current issue where arrival estimates jump inconsistently (e.g., from 5 minutes to 3 minutes, then back to 4 minutes) when vehicle updates arrive, providing more stable and realistic predictions.

## Glossary

- **API_Speed**: The speed value received from the Tranzy API for a vehicle (may be null/undefined)
- **Predicted_Speed**: The calculated speed used for movement estimation based on various data sources
- **Speed_Predictor**: The system component responsible for determining the best speed estimate for calculations
- **Nearby_Vehicles**: Vehicles within a configurable distance radius that have valid speed data
- **Traffic_Context**: Environmental factors affecting vehicle speed (time of day, location density, nearby vehicle speeds)
- **Speed_Threshold**: The minimum speed value (default 5km/h) below which a vehicle is considered stationary
- **Station_Density_Center**: The geographic point with the highest concentration of transit stations for an agency
- **Movement_Estimator**: The enhanced system that uses predicted speeds for arrival time calculations
- **Speed_Display**: The UI component showing current/predicted vehicle speed to users

## Requirements

### Requirement 1: API Speed Integration and Validation

**User Story:** As a user, I want arrival predictions to use actual vehicle speeds when available, so that estimates reflect real-time traffic conditions.

#### Acceptance Criteria

1. WHEN a vehicle has API_Speed data available, THE Speed_Predictor SHALL validate the speed value is numeric and non-negative
2. WHEN API_Speed is greater than the configurable Speed_Threshold (default 5km/h), THE Speed_Predictor SHALL use API_Speed for movement calculations
3. WHEN API_Speed is less than or equal to Speed_Threshold, THE Speed_Predictor SHALL classify the vehicle as stationary for speed prediction purposes
4. WHEN API_Speed is null, undefined, or invalid, THE Speed_Predictor SHALL fall back to alternative speed estimation methods
5. THE Speed_Predictor SHALL convert API_Speed units to match internal calculation requirements (m/s for distance calculations)

### Requirement 2: Nearby Vehicle Speed Averaging

**User Story:** As a system, I want to use speeds of nearby moving vehicles to estimate traffic conditions, so that stationary or slow vehicles can have more accurate movement predictions.

#### Acceptance Criteria

1. WHEN a vehicle needs speed estimation, THE Speed_Predictor SHALL identify nearby vehicles within a configurable radius (default 1km)
2. WHEN collecting nearby vehicle speeds, THE Speed_Predictor SHALL only include vehicles with API_Speed greater than Speed_Threshold
3. WHEN multiple nearby vehicles have valid speeds, THE Speed_Predictor SHALL calculate the average speed of nearby moving vehicles
4. WHEN no nearby vehicles have valid speeds, THE Speed_Predictor SHALL fall back to location-based speed estimation
5. THE Speed_Predictor SHALL exclude the target vehicle itself from nearby vehicle calculations to avoid circular references

### Requirement 3: Location-Based Speed Estimation

**User Story:** As a system, I want to estimate speeds based on geographic location and station density, so that vehicles have realistic speed estimates even without nearby vehicle data.

#### Acceptance Criteria

1. THE Speed_Predictor SHALL calculate the Station_Density_Center as the geographic centroid of all agency stations
2. WHEN estimating location-based speed, THE Speed_Predictor SHALL calculate distance from vehicle position to Station_Density_Center
3. WHEN a vehicle is closer to Station_Density_Center, THE Speed_Predictor SHALL apply lower speed estimates to account for urban traffic density
4. WHEN a vehicle is farther from Station_Density_Center, THE Speed_Predictor SHALL apply higher speed estimates for suburban/highway conditions
5. THE Speed_Predictor SHALL use a configurable speed formula: base_speed * (1 - density_factor * max(0, (max_distance - distance_to_center) / max_distance))

### Requirement 4: Intelligent Speed Selection Algorithm

**User Story:** As a system, I want to automatically select the best available speed estimation method, so that predictions are as accurate as possible with available data.

#### Acceptance Criteria

1. THE Speed_Predictor SHALL prioritize speed sources in the following order: valid API_Speed > nearby vehicle average > location-based estimation > static fallback
2. WHEN API_Speed is available and above threshold, THE Speed_Predictor SHALL use API_Speed directly
3. WHEN API_Speed is unavailable or below threshold, THE Speed_Predictor SHALL attempt nearby vehicle averaging
4. WHEN nearby vehicle averaging yields insufficient data (fewer than MIN_NEARBY_VEHICLES, configurable default 2), THE Speed_Predictor SHALL use location-based estimation
5. WHEN all dynamic methods fail, THE Speed_Predictor SHALL fall back to the existing static AVERAGE_SPEED constant

### Requirement 5: Enhanced Movement Estimation

**User Story:** As a user, I want arrival time predictions to account for realistic vehicle behavior including stops and traffic, so that estimates remain stable and accurate.

#### Acceptance Criteria

1. WHEN calculating vehicle movement, THE Movement_Estimator SHALL use Predicted_Speed from the Speed_Predictor instead of static speed constants
2. WHEN a vehicle is predicted to be stationary (speed ≤ threshold) AND is located near a station, THE Movement_Estimator SHALL apply station dwell time
3. WHEN a vehicle is predicted to be moving, THE Movement_Estimator SHALL use the predicted speed for distance-over-time calculations
4. WHEN estimating arrival times, THE Movement_Estimator SHALL recalculate predicted speed after each intermediate station based on current traffic conditions
5. THE Movement_Estimator SHALL update predictions more frequently (every 15 seconds) to provide smoother estimate transitions

### Requirement 6: Speed Display Enhancement

**User Story:** As a user, I want to see current vehicle speeds and status on the interface, so that I can understand vehicle behavior and prediction accuracy.

#### Acceptance Criteria

1. WHEN displaying vehicle information, THE Speed_Display SHALL show the Predicted_Speed value instead of raw API_Speed
2. WHEN a vehicle is predicted to be stationary AND is within PROXIMITY_THRESHOLD of a station, THE Speed_Display SHALL show "At Stop" status instead of speed
3. WHEN a vehicle is predicted to be moving, THE Speed_Display SHALL show speed in km/h with one decimal place precision
4. WHEN speed prediction confidence is low, THE Speed_Display SHALL indicate uncertainty with visual styling or text
5. THE Speed_Display SHALL update in real-time as speed predictions change

### Requirement 7: Configurable Parameters

**User Story:** As a developer, I want speed prediction parameters to be easily configurable, so that the system can be tuned for different transit agencies and conditions.

#### Acceptance Criteria

1. THE System SHALL define configurable constants for: Speed_Threshold, nearby vehicle radius, location-based speed formula parameters, and update frequencies
2. WHEN updating speed prediction parameters, THE System SHALL apply changes without requiring code modifications
3. THE System SHALL provide reasonable default values based on urban transit conditions
4. THE System SHALL validate configuration parameters to ensure they are within acceptable ranges
5. THE System SHALL log configuration values at startup for debugging and verification

### Requirement 8: Performance and Reliability

**User Story:** As a user, I want speed predictions to be fast and reliable, so that the interface remains responsive and predictions are consistently available.

#### Acceptance Criteria

1. THE Speed_Predictor SHALL complete speed calculations within 50ms for typical vehicle datasets
2. WHEN processing large numbers of vehicles, THE Speed_Predictor SHALL use efficient algorithms to avoid UI blocking
3. THE Speed_Predictor SHALL handle edge cases gracefully (invalid coordinates, missing data, network issues)
4. WHEN speed prediction encounters errors, THE System SHALL log the error and continue with fallback methods
5. THE Speed_Predictor SHALL cache intermediate calculations (like Station_Density_Center) to avoid repeated computation

