# Design Document

## Overview

The route bubble filtering feature adds interactive click functionality to existing route bubbles in station cards. When users click a route bubble, the vehicle list filters to show only vehicles from that route, bypassing the normal grouping logic. The feature maintains per-station filter state and provides clear visual feedback for selected routes.

## Architecture

The solution extends the existing station card architecture with minimal changes:

1. **State Management**: Add route filter state to the StationList component using React useState
2. **Event Handling**: Add click handlers to route bubble avatars in StationList
3. **Filter Logic**: Modify StationVehicleList to accept and apply route filtering
4. **Visual Styling**: Update route bubble styling based on selection state

## Components and Interfaces

### StationList Component Updates

**New State:**
```typescript
// Per-station route filter state
const [routeFilters, setRouteFilters] = useState<Map<number, number | null>>(new Map());
```

**New Handler:**
```typescript
const handleRouteFilter = useCallback((stationId: number, routeId: number) => {
  setRouteFilters(prev => {
    const newFilters = new Map(prev);
    const currentFilter = newFilters.get(stationId);
    
    // Toggle logic: if same route clicked, clear filter; otherwise set new filter
    if (currentFilter === routeId) {
      newFilters.set(stationId, null);
    } else {
      newFilters.set(stationId, routeId);
    }
    
    return newFilters;
  });
}, []);
```

**Route Bubble Updates:**
- Add onClick handler to Avatar components
- Apply conditional styling based on selection state
- Pass selected route ID to StationVehicleList

### StationVehicleList Component Updates

**New Props:**
```typescript
interface StationVehicleListProps {
  vehicles: StationVehicle[];
  expanded: boolean;
  station: any;
  stationRouteCount?: number;
  selectedRouteId?: number | null; // NEW: route filter
}
```

**Filter Logic:**
```typescript
// Apply route filtering before sorting and grouping
const filteredVehicles = selectedRouteId 
  ? vehicles.filter(({ route }) => route?.route_id === selectedRouteId)
  : vehicles;

// Skip grouping when route filter is active
const shouldApplyGrouping = !selectedRouteId && 
                           (stationRouteCount || 1) > 1 && 
                           sortedVehicles.length > VEHICLE_DISPLAY.VEHICLE_DISPLAY_THRESHOLD;
```

## Data Models

### Route Filter State
```typescript
// Map of station ID to selected route ID (null = no filter)
type RouteFilterState = Map<number, number | null>;
```

### Component Props Extensions
```typescript
// StationVehicleList receives additional prop
interface StationVehicleListProps {
  // ... existing props
  selectedRouteId?: number | null;
}
```

## Error Handling

### Invalid Route Selection
- **Scenario**: User clicks route bubble but no vehicles exist for that route
- **Handling**: Display empty state message: "No active vehicles for this route"
- **Recovery**: User can click route bubble again to return to default view

### State Synchronization
- **Scenario**: Route filter state becomes inconsistent with available routes
- **Handling**: Validate filter state against current route data
- **Recovery**: Clear invalid filters automatically

### Performance Considerations
- **Scenario**: Large number of stations with active filters
- **Handling**: Use Map for O(1) filter lookups, memoize filter handlers
- **Recovery**: Implement cleanup for unmounted stations

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Route filtering displays only selected route vehicles
*For any* station with multiple routes and vehicles, when a route bubble is clicked, the vehicle list should contain only vehicles from that specific route
**Validates: Requirements 1.1**

### Property 2: Route selection behavior is mutually exclusive
*For any* station with multiple route bubbles, selecting one route should deselect any previously selected route, and clicking the same route twice should toggle it off
**Validates: Requirements 1.4, 1.5**

### Property 3: Route bubble styling reflects selection state
*For any* station with route bubbles, the selected route bubble should have selected styling while all other bubbles have default styling
**Validates: Requirements 2.1, 2.2, 2.3**

### Property 4: Filter state is isolated per station
*For any* set of stations with route filters, applying or changing a filter on one station should not affect the filter state of any other station
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 5: Route filtering bypasses grouping logic
*For any* station with route filtering active, all vehicles for the selected route should be displayed without grouping limits or "Show more" controls
**Validates: Requirements 4.1, 4.4**

### Property 6: Filter state persists across UI interactions
*For any* station with an active route filter, the filter should remain active during normal UI interactions like expanding/collapsing or scrolling
**Validates: Requirements 5.4**

### Property 7: Filter state uses station ID as key
*For any* filter state map, each entry should be keyed by the station ID and contain the selected route ID or null
**Validates: Requirements 5.1**

## Error Handling

### Invalid Route Selection
- **Scenario**: User clicks route bubble but no vehicles exist for that route
- **Handling**: Display empty state message: "No active vehicles for this route"
- **Recovery**: User can click route bubble again to return to default view

### State Synchronization
- **Scenario**: Route filter state becomes inconsistent with available routes
- **Handling**: Validate filter state against current route data
- **Recovery**: Clear invalid filters automatically

### Performance Considerations
- **Scenario**: Large number of stations with active filters
- **Handling**: Use Map for O(1) filter lookups, memoize filter handlers
- **Recovery**: Implement cleanup for unmounted stations

## Testing Strategy

### Unit Tests
- Test empty state handling when no vehicles match filter (Requirements 4.3)
- Test edge cases like invalid route IDs or missing data
- Test component integration between StationList and StationVehicleList
- Test cleanup and memory management scenarios

### Property-Based Tests
- Minimum 100 iterations per property test
- Each property test references its design document property
- Tag format: **Feature: route-bubble-filtering, Property {number}: {property_text}**
- Use React Testing Library for DOM interactions and state verification
- Generate random station configurations with varying numbers of routes and vehicles