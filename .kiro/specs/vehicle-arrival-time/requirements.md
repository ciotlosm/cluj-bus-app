# Requirements Document

## Introduction

This feature calculates real-time arrival times for vehicles approaching their next stops. It provides users with accurate, human-friendly time estimates by considering vehicle position, speed, route geometry, and station locations. The calculations account for route shapes (curves and corners) rather than straight-line distances, and use configurable average speeds for more realistic estimates.

## Glossary

- **Vehicle**: A bus or transit vehicle tracked in real-time via the Tranzy API
- **Stop**: A physical station or stop location where vehicles pick up passengers
- **Trip**: A scheduled journey a vehicle makes along a specific route
- **Route_Shape**: The geographic path (polyline) that defines the actual road path a vehicle follows
- **Arrival_Calculator**: The system component that computes arrival time estimates
- **Distance_Along_Shape**: The distance measured by following the route geometry, not straight-line distance
- **Arrival_Status**: A human-readable message describing vehicle proximity (e.g., "arriving soon", "at station")

## Requirements

### Requirement 1: Calculate Next Stop Arrival Time

**User Story:** As a user, I want to see when the next bus will arrive at its next stop, so that I can plan my journey effectively.

#### Acceptance Criteria

1. WHEN a vehicle has an active trip with upcoming stops, THE Arrival_Calculator SHALL identify the next stop using segment containment logic
2. WHEN determining next stop, THE System SHALL find the closest stop to vehicle GPS position in the trip sequence
3. WHEN determining next stop, THE System SHALL find the next stop in sequence after the closest stop
4. WHEN the vehicle GPS position is within the segment between closest stop and next stop in sequence, THE System SHALL set next stop as the next stop in sequence
5. WHEN the vehicle GPS position is outside the segment between closest stop and next stop in sequence, THE System SHALL set next stop as the closest stop
6. WHEN calculating arrival time, THE Arrival_Calculator SHALL use the vehicle's current GPS position and the determined next stop's GPS position
7. WHEN calculating arrival time, THE Arrival_Calculator SHALL measure distance along the Route_Shape rather than straight-line distance
8. WHEN a Route_Shape is available, THE Arrival_Calculator SHALL follow the shape geometry to calculate Distance_Along_Shape
9. IF a Route_Shape is not available, THEN THE Arrival_Calculator SHALL use intermediate stop GPS coordinates to calculate distance by summing straight-line segments between consecutive stops from vehicle to target stop

### Requirement 2: Use Configurable Speed for Time Estimation

**User Story:** As a user, I want arrival times based on consistent speed calculations, so that estimates are reliable and predictable.

#### Acceptance Criteria

1. THE Arrival_Calculator SHALL use a configurable average speed constant for all time calculations
2. WHEN calculating estimated arrival time, THE Arrival_Calculator SHALL divide Distance_Along_Shape by the configured average speed
3. THE System SHALL store the average speed constant in a configuration file for easy adjustment
4. WHERE vehicle speed from API is available, THE System MAY use it to determine if the vehicle is stopped (speed = 0) for status messages
5. THE System SHALL validate that configured speed values are positive and within reasonable bounds (5-100 km/h)

### Requirement 3: Generate Human-Friendly Arrival Messages

**User Story:** As a user, I want to see clear arrival status messages, so that I can quickly understand when the bus will arrive.

#### Acceptance Criteria

1. WHEN the vehicle is within 50 meters of the stop AND vehicle speed is 0, THE System SHALL display "At stop"
2. WHEN the vehicle is within 50 meters of the stop AND vehicle speed > 0 AND the target stop is the vehicle's next stop, THE System SHALL display "Arriving soon"
3. WHEN the vehicle is within 50 meters of the stop AND vehicle speed > 0 AND the target stop is NOT the vehicle's next stop, THE System SHALL display "Just left"
4. WHEN the vehicle is outside 50 meters AND estimated arrival time is 1-30 minutes, THE System SHALL display "In X minutes"
5. WHEN the vehicle has passed the stop and is far away, THE System SHALL display "Departed"
6. WHEN vehicle speed data is not available from API AND vehicle is within proximity threshold, THE System SHALL default speed to 0

### Requirement 4: Support Nearby View Display

**User Story:** As a user viewing nearby stops, I want to see arrival times for all approaching vehicles, so that I can choose the best option.

#### Acceptance Criteria

1. WHEN displaying a nearby view, THE System SHALL calculate arrival times for all vehicles approaching visible stops
2. WHEN multiple vehicles serve the same stop, THE System SHALL display arrival times for each vehicle
3. WHEN a vehicle has no valid arrival calculation, THE System SHALL omit the arrival time display for that vehicle
4. THE System SHALL update arrival time calculations automatically as vehicle positions change

### Requirement 5: Handle Route Shape Geometry

**User Story:** As a system, I want to use accurate route shapes for distance calculations, so that arrival times account for curves and corners.

#### Acceptance Criteria

1. WHEN a Route_Shape is available from the API, THE Arrival_Calculator SHALL parse the shape into a sequence of GPS coordinates
2. WHEN the vehicle GPS position is not exactly on the Route_Shape, THE Arrival_Calculator SHALL find the closest point on the shape and add straight-line distance from GPS to shape
3. WHEN the stop GPS position is not exactly on the Route_Shape, THE Arrival_Calculator SHALL find the closest point on the shape and add straight-line distance from GPS to shape
4. WHEN calculating total Distance_Along_Shape, THE Arrival_Calculator SHALL sum: straight-line distance from vehicle to shape + distance along shape segments + straight-line distance from shape to stop
5. THE Arrival_Calculator SHALL handle route shapes with multiple segments and complex geometries
6. WHEN projecting GPS positions to Route_Shape, THE Arrival_Calculator SHALL use the closest point on any shape segment

### Requirement 6: Calculate Time to Specific Stops

**User Story:** As a user, I want to see arrival times for specific stops I care about, so that I know when to leave for the bus.

#### Acceptance Criteria

1. WHEN a user selects a specific stop, THE System SHALL calculate arrival times for all vehicles approaching that stop
2. WHEN calculating time to a specific stop, THE Arrival_Calculator SHALL find the stop in each vehicle's trip sequence
3. IF a stop is not in a vehicle's trip sequence, THEN THE System SHALL exclude that vehicle from the calculation
4. WHEN a vehicle will reach the stop after multiple intermediate stops, THE Arrival_Calculator SHALL account for dwell time at intermediate stops
5. THE System SHALL use a configurable dwell time constant for intermediate stop delays

### Requirement 7: Sort Vehicles by Arrival Priority

**User Story:** As a user, I want to see vehicles sorted by their arrival status, so that the most relevant buses appear first.

#### Acceptance Criteria

1. WHEN displaying vehicles for a stop, THE System SHALL sort vehicles by calculated arrival time value
2. THE System SHALL assign numerical values: 0 for vehicles at stop, positive values for vehicles approaching (time in minutes), negative values for vehicles that have passed (time since departure in minutes)
3. THE System SHALL sort vehicles in ascending order: 0 first, then positive values (1, 2, 3...), then negative values (-1, -2, -3...)
4. WHEN multiple vehicles have the same arrival time value, THE System SHALL maintain stable sort order based on vehicle ID
5. THE System SHALL apply this sorting to all vehicle lists that display arrival information
