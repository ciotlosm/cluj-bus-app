# Design Document: Station Role Indicators

## Overview

This feature implements visual indicators to distinguish between Start, End, Turnaround, and Standard stations for each route, helping users understand boarding availability and reducing confusion about "phantom buses" and drop-off-only locations.

The system calculates station roles per trip, aggregates them to route level for display, and caches results in local storage with 24-hour freshness. Visual indicators appear on route filter bubbles in station views, with additional "Drop off only" badges on vehicle arrival chips and station headers when applicable.

## Architecture

### High-Level Flow

```
API Data (trips, stop_times) 
  ↓
Station Role Calculator
  ↓
Cache Layer (Local Storage)
  ↓
UI Components (Route Badges, Chips)
```

### Component Hierarchy

```
StationRoleStore (Zustand + Persist)
  ├── calculateStationRoles() - Core calculation logic
  ├── getStationRole() - Lookup cached role
  └── invalidateCache() - Force recalculation

StationRoleUtils
  ├── calculateRolesForTrip() - Per-trip calculation
  ├── aggregateRolesToRoute() - Aggregate to route level
  └── isStationEndForTrip() - Check if station is trip terminus

RouteBadge Component (Enhanced)
  ├── Props: isStart, isEnd
  └── Renders: Play icon (▶), Square icon (■), or both

VehicleArrivalChip Component (New)
  ├── Props: isDropOffOnly
  └── Renders: "Drop off only" badge

StationHeader Component (Enhanced)
  ├── Checks: All vehicles drop-off only
  └── Renders: Station-level indicator
```

## Components and Interfaces

### 1. Station Role Store

**Purpose:** Centralized state management for station role calculations with caching.

**Interface:**
```typescript
interface StationRoleStore {
  // Cached data: Map<routeId, Map<stationId, StationRole>>
  stationRoles: Map<number, Map<number, StationRole>>;
  
  // Metadata
  lastCalculated: number | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  calculateStationRoles: () => Promise<void>;
  getStationRole: (routeId: number, stationId: number) => StationRole;
  invalidateCache: () => void;
  isDataFresh: (maxAgeMs?: number) => boolean;
}

type StationRole = 'start' | 'end' | 'turnaround' | 'standard';
```

**Storage Strategy:**
- Uses Zustand persist middleware
- Stores in localStorage with key `station-role-store`
- 24-hour TTL (same as STATIC_DATA constant)
- Invalidates when trips or stop_times are refreshed

### 2. Station Role Calculation Utility

**Purpose:** Pure functions for calculating station roles from trip data.

**Interface:**
```typescript
interface TripStationRoles {
  tripId: string;
  routeId: number;
  startStation: number;  // stop_id with stop_sequence = 0
  endStation: number;    // stop_id with highest stop_sequence
}

interface RouteStationRoles {
  routeId: number;
  stations: Map<number, StationRole>;
}

// Calculate roles for a single trip
function calculateRolesForTrip(
  trip: TranzyTripResponse,
  stopTimes: TranzyStopTimeResponse[]
): TripStationRoles;

// Aggregate trip roles to route level
function aggregateRolesToRoute(
  tripRoles: TripStationRoles[]
): RouteStationRoles;

// Check if station is end for specific trip
function isStationEndForTrip(
  stationId: number,
  tripId: string,
  stopTimes: TranzyStopTimeResponse[]
): boolean;
```

**Algorithm:**

1. **Per-Trip Calculation:**
   ```
   For each trip:
     - Find stop_times for trip_id
     - Sort by stop_sequence
     - First stop (sequence = 0) → Start
     - Last stop (highest sequence) → End
   ```

2. **Route-Level Aggregation:**
   ```
   For each route:
     - Collect all trip roles for route_id
     - For each station:
       - If appears as Start in any trip → mark as Start
       - If appears as End in any trip → mark as End
       - If appears as both Start AND End → mark as Turnaround
       - Otherwise → mark as Standard
   ```

### 3. Enhanced Route Badge Component

**Purpose:** Reusable circular badge with station role indicators.

**Props:**
```typescript
interface RouteBadgeProps {
  routeNumber: string;
  routeColor?: string;
  isStart?: boolean;
  isEnd?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  selected?: boolean;
  isFavorite?: boolean;
}
```

**Visual Layout:**
```
     ▶ (1:00 position)
    ┌───┐
    │ 35│  ← Route number
    └───┘
■ (7:00 position)
```

**CSS Implementation:**
```typescript
// Container with relative positioning
<Avatar sx={{ position: 'relative', ... }}>
  {routeNumber}
  
  {/* Start indicator */}
  {isStart && (
    <Box sx={{
      position: 'absolute',
      top: '10%',
      right: '10%',
      transform: 'translate(50%, -50%)'
    }}>
      <PlayArrowIcon fontSize="small" />
    </Box>
  )}
  
  {/* End indicator */}
  {isEnd && (
    <Box sx={{
      position: 'absolute',
      bottom: '10%',
      left: '10%',
      transform: 'translate(-50%, 50%)'
    }}>
      <StopIcon fontSize="small" />
    </Box>
  )}
</Avatar>
```

### 4. Vehicle Arrival "Drop Off Only" Chip

**Purpose:** Warning badge for vehicles terminating at current station.

**Props:**
```typescript
interface VehicleArrivalChipProps {
  arrivalTime: ArrivalTimeResult;
  isDropOffOnly: boolean;
  onInfoClick?: () => void;
}
```

**Visual Design:**
```
┌─────────────────────────────────┐
│ 🕐 Arriving in 5m  [Drop off only] │
└─────────────────────────────────┘
   ↑ Green chip      ↑ Grey/Red badge
```

**Implementation:**
```typescript
<Stack direction="row" spacing={1} alignItems="center">
  <Chip
    icon={<AccessTimeIcon />}
    label={formatArrivalTime(arrivalTime)}
    color="success"
    size="small"
  />
  
  {isDropOffOnly && (
    <Chip
      label="Drop off only"
      size="small"
      variant="outlined"
      color="default"
      onClick={onInfoClick}
      sx={{
        borderColor: 'error.main',
        color: 'text.secondary',
        bgcolor: 'grey.100'
      }}
    />
  )}
</Stack>
```

### 5. Station Header Enhancement

**Purpose:** Station-level indicator when all vehicles are drop-off only.

**Logic:**
```typescript
function shouldShowStationDropOffIndicator(
  vehicles: StationVehicle[],
  stationId: number,
  stationRoleStore: StationRoleStore,
  stopTimes: TranzyStopTimeResponse[]
): boolean {
  if (vehicles.length === 0) return false;
  
  return vehicles.every(({ vehicle, route }) => {
    if (!vehicle.trip_id || !route) return false;
    
    return isStationEndForTrip(
      stationId,
      vehicle.trip_id,
      stopTimes
    );
  });
}
```

**Visual Placement:**
```
┌────────────────────────────────────┐
│ Station Name                        │
│ 📍 500m away  [Drop off only]      │
│                ↑ New indicator      │
└────────────────────────────────────┘
```

## Data Models

### Station Role Cache Structure

```typescript
// Stored in localStorage via Zustand persist
interface StationRoleCacheData {
  // Nested map structure for O(1) lookups
  stationRoles: {
    [routeId: number]: {
      [stationId: number]: StationRole
    }
  };
  
  // Metadata
  lastCalculated: number;  // timestamp
  version: string;         // cache version for migrations
}
```

### Trip Station Role Data

```typescript
interface TripStationRoles {
  tripId: string;
  routeId: number;
  startStation: number;
  endStation: number;
  allStops: number[];  // All stop_ids in sequence
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: First Stop Identification

*For any* trip with stop_times data, the stop with stop_sequence = 0 should be identified as the Start_Station for that trip.

**Validates: Requirements 1.1**

### Property 2: Last Stop Identification

*For any* trip with stop_times data, the stop with the highest stop_sequence value should be identified as the End_Station for that trip.

**Validates: Requirements 1.2**

### Property 3: Turnaround Station Detection

*For any* route with multiple trips, if a station appears as Start_Station in at least one trip AND as End_Station in at least one other trip for the same route, then that station should be classified as a Turnaround_Station at the route level.

**Validates: Requirements 1.3**

### Property 4: Standard Station Classification

*For any* station in a route's stop sequence, if that station is neither a Start_Station nor an End_Station for any trip on that route, then it should be classified as a Standard station.

**Validates: Requirements 1.4**

### Property 5: Route Isolation

*For any* station that serves multiple routes, the station role classification for one route should be independent of its classification for other routes (e.g., a station can be Start for Route A and End for Route B).

**Validates: Requirements 1.7**

### Property 6: Trip End Station Determination

*For any* vehicle with a trip_id and any station, the system should correctly determine whether that station is the End_Station for that specific trip by checking if it has the highest stop_sequence in that trip's stop_times.

**Validates: Requirements 3.1**

### Property 7: All Vehicles Drop-Off Check

*For any* station with a non-empty list of vehicles, if every vehicle's trip has that station as its End_Station, then the station-level drop-off indicator should be shown; otherwise it should not be shown.

**Validates: Requirements 4.1**

### Property 8: Cache Size Limit

*For any* cache state with more than 100 routes, the system should retain only the 100 most recently accessed routes and discard older entries.

**Validates: Requirements 5.7**

## Error Handling

### Missing or Incomplete Data

**Strategy:** Graceful degradation with sensible defaults

1. **Missing Trip Data:**
   - Default to Standard classification for all stations
   - Log warning: "No trip data available for route {routeId}"
   - Continue with other routes

2. **Incomplete Stop Times:**
   - Skip trips with missing stop_sequence data
   - Log warning: "Incomplete stop_times for trip {tripId}"
   - Process remaining valid trips

3. **Missing Station Data:**
   - Treat as Standard station
   - Use stop_id as fallback identifier
   - Log warning: "Station {stopId} not found in stops data"

### Cache Corruption

**Strategy:** Clear and rebuild

```typescript
try {
  const cached = JSON.parse(localStorage.getItem('station-role-store'));
  validateCacheStructure(cached);
} catch (error) {
  console.error('Cache corrupted, clearing and recalculating');
  localStorage.removeItem('station-role-store');
  await calculateStationRoles();
}
```

### API Unavailability

**Strategy:** Use stale data with warning

```typescript
if (apiError && hasCachedData) {
  console.warn('API unavailable, using stale cache');
  showWarningToast('Using cached data - may be outdated');
  return cachedData;
}
```

### Calculation Errors

**Strategy:** Fail gracefully, don't crash

```typescript
try {
  const roles = calculateStationRoles();
  return roles;
} catch (error) {
  console.error('Station role calculation failed:', error);
  // Return empty map, UI will show no indicators
  return new Map();
}
```

## Testing Strategy

### Unit Tests

Unit tests verify specific examples, edge cases, and error conditions:

1. **Calculation Logic:**
   - Test first/last stop identification with known trip data
   - Test turnaround detection with specific trip combinations
   - Test standard station classification
   - Test route isolation with multi-route stations

2. **Component Rendering:**
   - Test RouteBadge renders correctly with isStart/isEnd props
   - Test "Drop off only" chip appears/disappears correctly
   - Test station-level indicator logic

3. **Cache Operations:**
   - Test cache write/read operations
   - Test cache expiration (24-hour TTL)
   - Test cache invalidation on API refresh
   - Test cache size limiting (100 routes)

4. **Error Handling:**
   - Test missing trip data fallback
   - Test incomplete stop_times handling
   - Test cache corruption recovery
   - Test API unavailability graceful degradation

5. **Integration:**
   - Test StationList route bubble integration
   - Test station header indicator
   - Test map marker integration
   - Test existing functionality not broken (filtering, favorites)

### Property-Based Tests

Property-based tests verify universal properties across all inputs using **fast-check** library (minimum 100 iterations per test):

1. **Property 1: First Stop Identification**
   - Generate random trips with stop_times
   - Verify stop with sequence=0 is always identified as Start
   - **Feature: station-role-indicators, Property 1: First Stop Identification**

2. **Property 2: Last Stop Identification**
   - Generate random trips with stop_times
   - Verify stop with highest sequence is always identified as End
   - **Feature: station-role-indicators, Property 2: Last Stop Identification**

3. **Property 3: Turnaround Station Detection**
   - Generate random sets of trips for a route
   - Verify stations appearing as both Start and End are marked Turnaround
   - **Feature: station-role-indicators, Property 3: Turnaround Station Detection**

4. **Property 4: Standard Station Classification**
   - Generate random trips with intermediate stops
   - Verify intermediate stops are always classified as Standard
   - **Feature: station-role-indicators, Property 4: Standard Station Classification**

5. **Property 5: Route Isolation**
   - Generate random multi-route station scenarios
   - Verify role for route A doesn't affect role for route B
   - **Feature: station-role-indicators, Property 5: Route Isolation**

6. **Property 6: Trip End Station Determination**
   - Generate random vehicle/station pairs
   - Verify end station detection is always correct
   - **Feature: station-role-indicators, Property 6: Trip End Station Determination**

7. **Property 7: All Vehicles Drop-Off Check**
   - Generate random vehicle lists for stations
   - Verify indicator logic: show only when ALL are drop-off
   - **Feature: station-role-indicators, Property 7: All Vehicles Drop-Off Check**

8. **Property 8: Cache Size Limit**
   - Generate cache with >100 routes
   - Verify only 100 most recent are retained
   - **Feature: station-role-indicators, Property 8: Cache Size Limit**

### Testing Configuration

- **Library:** fast-check (TypeScript property-based testing)
- **Iterations:** Minimum 100 per property test
- **Timeout:** 60 seconds per test suite
- **Coverage Target:** 80% for calculation utilities, 70% for UI components

## Implementation Notes

### Performance Considerations

1. **Calculation Timing:**
   - Initial calculation: ~200-300ms for 50 routes
   - Cached lookup: <5ms (O(1) Map access)
   - Recalculation triggered only on API data refresh

2. **Memory Usage:**
   - Cache size: ~50KB for 100 routes with 20 stations each
   - In-memory Map: ~100KB during calculation
   - Acceptable for modern browsers

3. **Rendering Impact:**
   - Icon rendering: <1ms per badge (CSS positioning)
   - No impact on existing route bubble performance
   - Memoization prevents unnecessary recalculations

### Migration Strategy

1. **Phase 1:** Add store and calculation utilities (no UI changes)
2. **Phase 2:** Enhance RouteBadge component with indicators
3. **Phase 3:** Add vehicle-level "Drop off only" chips
4. **Phase 4:** Add station-level indicator
5. **Phase 5:** Integrate with map markers

### Backward Compatibility

- New props on RouteBadge are optional (default: false)
- Existing route bubbles work without changes
- Cache is versioned for future migrations
- Graceful degradation if calculation fails

## Dependencies

### Existing Code

- `useTripStore` - Access to trip data
- `useStopTimeStore` - Access to stop_times data
- `useStationStore` - Access to station data
- `IN_MEMORY_CACHE_DURATIONS.STATIC_DATA` - 24-hour TTL constant
- `createRefreshMethod` - Store refresh utility
- `createFreshnessChecker` - Cache freshness utility

### New Dependencies

- None (uses existing Material-UI icons and Zustand)

### Material-UI Icons

- `PlayArrowIcon` - Start station indicator (▶)
- `StopIcon` - End station indicator (■)
- Already available in existing imports
