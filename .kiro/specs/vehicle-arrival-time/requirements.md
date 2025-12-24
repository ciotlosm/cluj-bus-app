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
- **Arrival_Status**: A human-readable message describing vehicle proximity (e.g., "at stop", "in X minutes")

## Requirements

### Requirement 1: Calculate Target Stop Arrival Time

**User Story:** As a user, I want to see when the next vehicles will arrive at the target stop (the nearby stop for me based on filtering), so that I can plan my journey effectively.

#### Acceptance Criteria

1. WHEN a vehicle has an active trip, THE Arrival_Calculator SHALL determine if the target stop is in the vehicle's upcoming stops by checking the trip's stop sequence
2. WHEN the target stop is found in the trip sequence, THE Arrival_Calculator SHALL identify if it is an upcoming stop (higher sequence number than vehicle's current position) or a passed stop (lower sequence number)
3. WHEN the target stop is an upcoming stop, THE Arrival_Calculator SHALL calculate arrival time from vehicle's current position to the target stop
4. WHEN the target stop is a passed stop, THE Arrival_Calculator SHALL determine the vehicle has already departed from that stop
5. WHEN the target stop is not in the vehicle's trip sequence, THE Arrival_Calculator SHALL exclude that vehicle from calculations for that stop
6. WHEN calculating arrival time to target stop, THE Arrival_Calculator SHALL measure distance along the Route_Shape rather than straight-line distance
7. WHEN a Route_Shape is available, THE Arrival_Calculator SHALL follow the shape geometry to calculate Distance_Along_Shape from vehicle position to target stop
8. WHEN the vehicle GPS position is not on the Route_Shape, THE Arrival_Calculator SHALL project the vehicle position to the closest point on the route shape and add the straight-line distance from vehicle to shape
9. WHEN the target stop GPS position is not on the Route_Shape, THE Arrival_Calculator SHALL project the stop position to the closest point on the route shape and add the straight-line distance from shape to stop
8. IF a Route_Shape is not available, THEN THE Arrival_Calculator SHALL use intermediate stop GPS coordinates to calculate distance by summing straight-line segments between consecutive stops from vehicle to target stop
9. WHEN calculating distance via intermediate stops, THE Arrival_Calculator SHALL only include stops between the vehicle's current position and the target stop in the trip sequence
10. WHEN a vehicle will reach the target stop after multiple intermediate stops, THE Arrival_Calculator SHALL account for dwell time at intermediate stops
11. THE System SHALL use a configurable dwell time constant for intermediate stop delays

### Requirement 2: Use Configurable Speed for Time Estimation

**User Story:** As a user, I want arrival times based on consistent speed calculations, so that estimates are reliable and predictable.

#### Acceptance Criteria

1. THE Arrival_Calculator SHALL use a configurable average speed constant for all time calculations
2. WHEN calculating estimated arrival time, THE Arrival_Calculator SHALL divide Distance_Along_Shape by the configured average speed
3. THE System SHALL store the average speed constant in a constants file for easy developer adjustment
4. WHERE vehicle speed from API is available, THE System MAY use it to determine if the vehicle is stopped (speed = 0) for status messages

### Requirement 3: Generate Human-Friendly Arrival Messages

**User Story:** As a user, I want to see clear arrival status messages, so that I can quickly understand when the bus will arrive.

#### Acceptance Criteria

1. WHEN the vehicle is within 50 meters of the target stop AND vehicle speed is 0, THE System SHALL display "At stop"
2. WHEN the target stop is upcoming AND estimated arrival time is 1-30 minutes, THE System SHALL display "In X minutes"
3. WHEN the target stop is already passed in the vehicle's trip sequence, THE System SHALL display "Departed"
4. WHEN a vehicle has no route_id OR projected distance from route shape exceeds the large threshold, THE System SHALL display "Off route"
5. WHEN vehicle speed data is not available from API AND vehicle is within proximity threshold, THE System SHALL default speed to 0

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

### Requirement 6: Sort Vehicles by Arrival Priority

**User Story:** As a user, I want to see vehicles sorted by their arrival status, so that the most relevant buses appear first.

#### Acceptance Criteria

1. WHEN displaying vehicles for a stop, THE System SHALL sort vehicles by arrival status in the following priority order: "At stop" first, "In X minutes" second (sorted ascending by minutes), "Departed" third, "Off route" last
2. WHEN a vehicle has no route_id (null or undefined), THE System SHALL classify it as "Off route"
3. WHEN a vehicle's projected distance from the route shape exceeds a configurable large threshold, THE System SHALL classify it as "Off route"
4. WHEN multiple vehicles have the same status and time, THE System SHALL maintain stable sort order based on vehicle ID
5. THE System SHALL apply this sorting to all vehicle lists that display arrival information
