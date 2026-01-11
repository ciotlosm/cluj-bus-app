# Design Document

## Overview

The Vehicle Position Prediction system calculates realistic current vehicle positions by simulating movement along route shapes based on timestamp age. This addresses the inherent delay in GPS updates from vehicles, ensuring users see accurate current positions rather than stale historical data.

The system integrates seamlessly with existing arrival time calculations by extending vehicle data with predicted coordinates while maintaining full backward compatibility. All existing distance calculations, route projections, and vehicle positioning logic will automatically use predicted positions when available.

## Architecture

### Core Components

1. **Position Predictor** (`src/utils/vehicle/positionPredictionUtils.ts`)
   - Main prediction engine that calculates current vehicle positions
   - Integrates with existing route projection and movement simulation logic
   - Handles timestamp parsing, movement calculation, and station dwell time

2. **Vehicle Data Enhancement** (`src/utils/vehicle/vehicleEnhancementUtils.ts`)
   - Extends TranzyVehicleResponse with predicted coordinates
   - Provides seamless integration point for all vehicle-consuming code
   - Maintains original API data for debug visualization

3. **Debug Visualization Extensions** (`src/components/features/maps/DebugLayer.tsx`)
   - Renders both API and predicted positions in debug mode
   - Shows prediction metadata and calculation details
   - Provides visual verification of prediction accuracy

### Integration Points

The system integrates at the vehicle data level, ensuring all downstream calculations automatically benefit from improved positioning:

- **Arrival Time Calculations**: All distance calculations use predicted positions
- **Map Visualization**: Vehicle markers render at predicted locations
- **Route Projections**: Vehicle progress estimation uses predicted coordinates
- **Station Proximity**: "At stop" detection uses predicted positions

## Components and Interfaces

### Enhanced Vehicle Data Structure

```typescript
interface EnhancedVehicleData extends TranzyVehicleResponse {
  // Original API coordinates (always preserved)
  apiLatitude: number;
  apiLongitude: number;
  
  // Predicted coordinates (replaces latitude/longitude for calculations)
  latitude: number;
  longitude: number;
  
  // Prediction metadata
  predictionMetadata?: {
    predictedDistance: number; // meters moved
    stationsEncountered: number;
    totalDwellTime: number; // milliseconds
    predictionMethod: 'route_shape' | 'fallback';
    predictionApplied: boolean;
  };
}
```

### Position Prediction Engine

```typescript
interface PositionPredictionResult {
  predictedPosition: Coordinates;
  metadata: {
    predictedDistance: number;
    stationsEncountered: number;
    totalDwellTime: number;
    method: 'route_shape' | 'fallback';
    success: boolean;
  };
}

interface MovementSimulation {
  startPosition: Coordinates;
  endPosition: Coordinates;
  distanceTraveled: number;
  stationsEncountered: TranzyStopTimeResponse[];
  totalDwellTime: number;
}
```

## Data Models

### Movement Calculation Data

```typescript
interface RouteMovementData {
  routeShape: RouteShape;
  tripStopTimes: TranzyStopTimeResponse[];
  stops: TranzyStopResponse[];
  vehicleProjection: ProjectionResult;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Now I'll analyze the acceptance criteria to determine which ones can be tested as properties:

### Property Reflection

After reviewing all testable properties from the prework analysis, I identified several areas where properties can be consolidated:

**Redundancy Analysis:**
- Properties 1.1, 1.2, and 1.3 all relate to timestamp handling and can be combined into a comprehensive timestamp processing property
- Properties 2.1, 2.3, and 2.5 all relate to route shape availability and can be combined into route shape handling
- Properties 3.1, 3.2, and 3.3 all relate to movement simulation and can be combined into movement calculation consistency
- Properties 4.1, 4.2, 4.3, 4.4, and 4.5 all relate to system integration and can be combined into integration consistency
- Properties 6.4, 7.1, and 7.2 all relate to error handling and can be combined into error handling consistency

**Final Consolidated Properties:**

Property 1: Timestamp Processing Consistency
*For any* vehicle with a timestamp, the Position_Predictor should handle timestamp parsing and age calculation consistently, returning original coordinates for zero/negative ages and attempting prediction for positive ages
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

Property 2: Route Shape Handling
*For any* vehicle and route shape combination, the Position_Predictor should consistently use route projection when shapes are available and fall back to API coordinates when shapes are missing or vehicle is off-route
**Validates: Requirements 2.1, 2.3, 2.5**

Property 3: Movement Simulation Consistency
*For any* valid movement simulation, the calculation should consistently use ARRIVAL_CONFIG values for speed and dwell time, accounting for all stations encountered during the elapsed time period
**Validates: Requirements 2.2, 3.1, 3.2, 3.3, 3.5**

Property 4: System Integration Consistency
*For any* vehicle with predicted coordinates, all system calculations (arrival times, map display, projections, status determination) should consistently use predicted positions instead of API coordinates
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

Property 5: Debug Visualization Completeness
*For any* vehicle in debug mode, the visualization should display both API and predicted positions with appropriate styling and include prediction metadata in popups
**Validates: Requirements 5.1, 5.4, 5.5**

Property 6: Error Handling Consistency
*For any* prediction failure or edge case (invalid data, missing routes, calculation errors), the system should gracefully fall back to API coordinates, log appropriate errors, and maintain system stability
**Validates: Requirements 6.4, 7.1, 7.2**

Property 7: Prediction Recalculation
*For any* prediction request, the calculation should be performed fresh without caching, ensuring time-dependent results are always current
**Validates: Requirements 7.3**

## Error Handling

### Graceful Degradation Strategy

The system follows a "fail-safe" approach where any prediction failure results in using original API coordinates:

1. **Timestamp Parsing Failures**: Invalid ISO strings fall back to API coordinates
2. **Route Shape Unavailable**: Missing or invalid route data falls back to API coordinates  
3. **Off-Route Vehicles**: Vehicles exceeding distance thresholds skip prediction
4. **Calculation Errors**: Any mathematical errors during simulation fall back to API coordinates
5. **Missing Trip Data**: Vehicles without trip_id or stop sequence data skip prediction

### Error Logging

All prediction failures are logged with appropriate context:
- Vehicle ID and timestamp for debugging
- Specific failure reason (parsing, projection, calculation)
- Fallback action taken (using API coordinates)

### Performance Considerations

The system prioritizes reliability over optimization:
- No caching of predictions (time-dependent calculations)
- Simple error handling without complex retry logic
- Reuse of existing utilities to minimize new code paths
- Graceful degradation ensures system stability

## Testing Strategy

### Dual Testing Approach

The system requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests:**
- Specific examples of timestamp parsing edge cases
- Known vehicle positions with calculated expected predictions
- Integration points with existing arrival calculation system
- Debug visualization rendering with mock data

**Property-Based Tests:**
- Universal timestamp handling across all valid/invalid formats
- Movement simulation consistency across random vehicle/route combinations
- System integration behavior across various vehicle states
- Error handling robustness across edge cases and failure modes

**Property Test Configuration:**
- Minimum 100 iterations per property test
- Each test references its corresponding design property
- Tag format: **Feature: vehicle-position-prediction, Property {number}: {property_text}**

### Testing Framework Integration

The system will use the existing Vitest testing framework with property-based testing library integration. Each correctness property will be implemented as a separate property-based test that validates the universal behavior across generated test cases.