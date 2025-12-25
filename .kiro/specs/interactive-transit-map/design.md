# Design Document

## Overview

This design implements a focused subset of the interactive transit map functionality, specifically targeting the integration of a vehicle map dialog accessible from the station vehicle list. The implementation prioritizes simplicity and essential functionality over comprehensive map features.

## Architecture

### Component Structure

```
VehicleMapDialog (Full-screen dialog)
├── MapContainer (React-Leaflet base)
├── VehicleLayer (Single vehicle display)
├── RouteShapeLayer (Vehicle's route)
├── StationLayer (Route stations)
├── DebugLayer (Optional debugging)
└── MapControls (Layer toggles)
```

### Integration Point

The map functionality integrates with the existing `StationVehicleList` component through the map button (`<MapIcon />`) already present in each vehicle card. When clicked, it opens a full-screen dialog showing the selected vehicle's route and position.

## Components and Interfaces

### Core Components

**VehicleMapDialog**
- Full-screen dialog component
- Receives vehicle data and related transit information
- Manages map state and layer visibility
- Handles route shape loading and fallback logic

**Essential Map Layers**
- `VehicleLayer`: Displays the selected vehicle marker
- `RouteShapeLayer`: Shows the vehicle's route as a colored line
- `StationLayer`: Displays stations along the route
- `DebugLayer`: Optional debugging visualization
- `MapControls`: Toggle controls for layer visibility

### Key Interfaces

```typescript
interface VehicleMapDialogProps {
  open: boolean;
  onClose: () => void;
  vehicleId: number | null;
  targetStationId?: number | null;
  vehicles: TranzyVehicleResponse[];
  routes: TranzyRouteResponse[];
  stations: TranzyStopResponse[];
  trips: TranzyTripResponse[];
  stopTimes: TranzyStopTimeResponse[];
}

interface MapLayerProps {
  colorScheme: MapColorScheme;
  performanceConfig?: MapPerformanceConfig;
  loading?: boolean;
}
```

## Data Models

### Map State Management

The dialog manages its own state for:
- Route shapes (loaded from API or generated from stations)
- Layer visibility toggles
- Loading states
- Debug mode activation

### Data Flow

1. User clicks map button in vehicle card
2. Dialog opens with vehicle ID and station context
3. Route shapes are fetched for the vehicle's trip
4. Map centers on vehicle position
5. Layers render filtered data (single vehicle, its route, route stations)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property-Based Testing Overview

Property-based testing (PBT) validates software correctness by testing universal properties across many generated inputs. Each property is a formal specification that should hold for all valid inputs.

### Core Principles

1. **Universal Quantification**: Every property must contain an explicit "for all" statement
2. **Requirements Traceability**: Each property must reference the requirements it validates
3. **Executable Specifications**: Properties must be implementable as automated tests
4. **Comprehensive Coverage**: Properties should cover all testable acceptance criteria

### Acceptance Criteria Testing Prework

Let me analyze each acceptance criterion for testability:

1.1 WHEN a vehicle is selected for tracking, THE Interactive_Map SHALL display the vehicle's current position as a Vehicle_Marker
  Thoughts: This is testable - we can verify that when a vehicle ID is provided, the map renders a marker at the vehicle's coordinates
  Testable: yes - property

1.2 WHEN displaying a tracked vehicle, THE Interactive_Map SHALL render the complete Route_Shape as a colored line
  Thoughts: This is testable - we can verify that when a vehicle with a route is displayed, the route shape is rendered
  Testable: yes - property

1.3 WHEN showing a vehicle route, THE Interactive_Map SHALL display all stations along the route as Station_Symbol markers
  Thoughts: This is testable - we can verify that all stations associated with the vehicle's trip are displayed
  Testable: yes - property

1.4 WHEN the vehicle position updates, THE Interactive_Map SHALL update the Vehicle_Marker position in real-time
  Thoughts: This is about real-time updates which is difficult to test in isolation, but we can test that position changes result in marker updates
  Testable: yes - property

1.5 THE Interactive_Map SHALL center the view on the tracked vehicle and route for optimal visibility
  Thoughts: This is testable - we can verify that the map viewport centers on the vehicle position
  Testable: yes - property

6.1 THE Interactive_Map SHALL support pan and zoom gestures for navigation
  Thoughts: This is a UI interaction test that's difficult to test programmatically
  Testable: no

6.2 WHEN markers are clicked, THE Interactive_Map SHALL display relevant information in popups or tooltips
  Thoughts: This is testable - we can verify that clicking markers triggers popup display
  Testable: yes - property

6.3 THE Interactive_Map SHALL provide controls for toggling different display modes
  Thoughts: This is testable - we can verify that controls exist and function
  Testable: yes - property

6.4 WHEN debug mode is available, THE Interactive_Map SHALL provide toggle control for debugging features
  Thoughts: This is testable - we can verify that debug toggle exists and functions
  Testable: yes - property

6.5 THE Interactive_Map SHALL maintain responsive behavior across different screen sizes
  Thoughts: This is about responsive design which is difficult to test programmatically
  Testable: no

8.1 THE Interactive_Map SHALL render efficiently with multiple vehicles and route shapes
  Thoughts: This is a performance requirement that's difficult to test as a property
  Testable: no

8.2 WHEN large datasets are provided, THE Interactive_Map SHALL implement appropriate performance optimizations
  Thoughts: This is about performance optimization which is difficult to test as a property
  Testable: no

8.3 THE Interactive_Map SHALL handle real-time updates without causing visual flickering
  Thoughts: This is about visual behavior which is difficult to test programmatically
  Testable: no

8.4 WHEN map data changes, THE Interactive_Map SHALL update only affected elements
  Thoughts: This is about implementation efficiency which is difficult to test as a property
  Testable: no

8.5 THE Interactive_Map SHALL provide loading states during data fetching operations
  Thoughts: This is testable - we can verify that loading states are displayed during async operations
  Testable: yes - property

### Property Reflection

After reviewing the testable properties, I can identify some potential redundancy:
- Properties 1.1 and 1.5 both relate to vehicle display and positioning
- Properties 6.3 and 6.4 both relate to control functionality

However, each property validates distinct aspects:
- 1.1 focuses on marker presence, 1.5 focuses on viewport centering
- 6.3 focuses on general controls, 6.4 focuses specifically on debug controls

All identified properties provide unique validation value and should be retained.

### Correctness Properties

**Property 1: Vehicle marker display**
*For any* valid vehicle with coordinates, when the vehicle is selected for tracking, the map should display a vehicle marker at the vehicle's latitude and longitude coordinates
**Validates: Requirements 1.1**

**Property 2: Route shape rendering**
*For any* vehicle with an associated trip and route shape, when the vehicle is displayed, the map should render the complete route shape as a colored line
**Validates: Requirements 1.2**

**Property 3: Station marker display**
*For any* vehicle with an associated trip, when the vehicle route is shown, the map should display all stations along the route as station symbol markers
**Validates: Requirements 1.3**

**Property 4: Vehicle position updates**
*For any* vehicle marker on the map, when the vehicle's position coordinates change, the marker position should update to reflect the new coordinates
**Validates: Requirements 1.4**

**Property 5: Map viewport centering**
*For any* tracked vehicle, the map viewport should be centered on the vehicle's position with appropriate zoom level for optimal visibility
**Validates: Requirements 1.5**

**Property 6: Marker click interactions**
*For any* clickable marker on the map, when the marker is clicked, relevant information should be displayed in a popup or tooltip
**Validates: Requirements 6.2**

**Property 7: Layer toggle controls**
*For any* map display mode, the map should provide functional controls for toggling different layer visibility (vehicles, routes, stations)
**Validates: Requirements 6.3**

**Property 8: Debug mode toggle**
*For any* map instance where debug mode is available, the map should provide a functional toggle control for enabling/disabling debugging features
**Validates: Requirements 6.4**

**Property 9: Loading state display**
*For any* data fetching operation, the map should display appropriate loading states while the operation is in progress
**Validates: Requirements 8.5**

## Error Handling

### Route Shape Loading
- Primary: Fetch route shapes from API using trip's shape_id
- Fallback: Generate route from ordered station coordinates
- Error: Display map without route shape, show loading error

### Data Validation
- Validate vehicle coordinates before rendering markers
- Handle missing or invalid route/trip data gracefully
- Provide meaningful error messages for data issues

### Performance Safeguards
- Limit number of rendered elements
- Implement loading timeouts
- Handle large dataset scenarios

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests as complementary approaches:

**Unit Tests**:
- Specific examples demonstrating correct behavior
- Edge cases and error conditions
- Integration points between components
- Component rendering with known data sets

**Property-Based Tests**:
- Universal properties across all valid inputs
- Comprehensive input coverage through randomization
- Minimum 100 iterations per property test
- Each test tagged with feature and property reference

### Property-Based Testing Configuration

Using **fast-check** library for TypeScript property-based testing:
- Minimum 100 iterations per property test
- Custom generators for transit data (vehicles, routes, stations)
- Each property test references its design document property
- Tag format: **Feature: interactive-transit-map, Property {number}: {property_text}**

### Testing Focus Areas

**Unit Testing**:
- Component mounting and unmounting
- Props validation and default values
- Event handler functionality
- Error boundary behavior

**Property Testing**:
- Map rendering with various data combinations
- Layer visibility toggle functionality
- Coordinate validation and marker positioning
- Data loading and error states

Both testing approaches are essential for comprehensive coverage - unit tests catch concrete implementation bugs while property tests verify general correctness across all possible inputs.