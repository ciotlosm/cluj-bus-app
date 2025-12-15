# Bus Distance Calculation Feature

**Date**: December 13, 2025  
**Status**: ✅ Completed  
**Feature**: Calculate distance from user to bus along route shape using GTFS shape data

## Overview

This feature enhances the favorite buses display by calculating the actual distance from the user's location to the bus along the route path. Instead of straight-line distance, it uses GTFS shape data to calculate the progressive distance along the route segments, providing more accurate distance information for users.

## Implementation Details

### 1. Interface Updates

**File**: `src/services/favoriteBusService.ts`

Added new property to `FavoriteBusInfo` interface:
```typescript
export interface FavoriteBusInfo {
  // ... existing properties
  distanceFromUser?: number; // Distance from user along the route shape in meters
}
```

### 2. Distance Calculation Algorithm

**File**: `src/services/favoriteBusService.ts`

Added `calculateDistanceAlongRoute` method that:

1. **Gets Trip Shape**: Uses `trip_id` to find corresponding `shape_id` from trips data
2. **Fetches Shape Points**: Retrieves all shape points for the route using `enhancedTranzyApi.getShapes()`
3. **Finds Closest Points**: Locates closest shape points to both user and bus locations
4. **Calculates Progressive Distance**: Sums distances between consecutive shape points from user to bus

```typescript
private async calculateDistanceAlongRoute(
  userLocation: { latitude: number; longitude: number },
  busLocation: { latitude: number; longitude: number },
  tripId: string,
  agencyId: number
): Promise<number | null>
```

#### Algorithm Steps:
1. **Trip Lookup**: Find trip data using `tripId` to get `shape_id`
2. **Shape Data**: Fetch and sort shape points by `shape_pt_sequence`
3. **User Position**: Find closest `shape_pt_lat/lon` to user's GPS coordinates
4. **Bus Position**: Find closest `shape_pt_lat/lon` to bus's GPS coordinates
5. **Distance Calculation**: Sum Haversine distances between consecutive shape points from user to bus

### 3. Service Integration

**File**: `src/services/favoriteBusService.ts`

Enhanced `getFavoriteBusInfo` method to:
- Calculate route distance when user location is available
- Pass distance data to `FavoriteBusInfo` object
- Handle errors gracefully with fallback to undefined

```typescript
// Calculate distance from user along route shape if user location is available
let distanceFromUser: number | undefined;
if (userLocation) {
  const routeDistance = await this.calculateDistanceAlongRoute(
    userLocation,
    { latitude: vehicle.position.latitude, longitude: vehicle.position.longitude },
    vehicle.tripId!,
    agencyId
  );
  distanceFromUser = routeDistance || undefined;
}
```

### 4. UI Updates

**File**: `src/components/features/FavoriteBuses/components/FavoriteBusCard.tsx`

#### Vehicle Information Section
Added route distance display in the vehicle information area:
```typescript
{bus.distanceFromUser && (
  <Typography variant="caption" color="info.main">
    • {formatDistance(bus.distanceFromUser)} along route
  </Typography>
)}
```

#### Last Update Location
Moved "Last update" text from vehicle section to Route Stops section for the current stop:
- Removed from main vehicle information area
- Added to secondary text of current stop in Route Stops list
- Shows alongside arrival time for better context

## Technical Implementation

### Data Flow
1. **User Location** → GPS coordinates from location store
2. **Bus Location** → Live vehicle GPS from Tranzy API
3. **Trip Data** → `trip_id` from vehicle → `shape_id` from trips endpoint
4. **Shape Data** → Shape points from shapes endpoint using `shape_id`
5. **Distance Calculation** → Progressive distance along shape segments
6. **UI Display** → Formatted distance in vehicle information

### API Dependencies
- **Trips Endpoint**: `/trips` - Get `shape_id` from `trip_id`
- **Shapes Endpoint**: `/shapes` - Get route path coordinates
- **Vehicles Endpoint**: `/vehicles` - Get live bus positions

### Error Handling
- **Missing Shape Data**: Falls back to undefined distance
- **API Failures**: Logs errors and continues without distance
- **Invalid Coordinates**: Validates GPS coordinates before calculation
- **Missing Trip Data**: Handles cases where `trip_id` has no corresponding shape

## Performance Considerations

### Caching Strategy
- Shape data is cached by `enhancedTranzyApi.getShapes()`
- Trip data is fetched once per refresh cycle
- Distance calculations are performed only when user location changes

### Optimization Opportunities
1. **Shape Point Reduction**: Could sample fewer points for long routes
2. **Distance Caching**: Cache calculated distances for repeated requests
3. **Background Calculation**: Calculate distances in background worker
4. **Proximity Filtering**: Only calculate for buses within reasonable range

## User Experience

### Benefits
1. **Accurate Distance**: Shows actual route distance, not straight-line
2. **Route Awareness**: Users understand how far along the route the bus is
3. **Better Planning**: More accurate information for trip planning
4. **Context Integration**: Distance shown alongside other vehicle information

### Visual Design
- **Info Color**: Route distance uses info color (blue) to distinguish from station distance
- **Clear Labeling**: "along route" suffix clarifies this is route distance
- **Consistent Formatting**: Uses same `formatDistance` function as other distances

## Testing Results

### Localhost Testing
✅ Feature tested on `http://localhost:5175`  
✅ Route distance calculation works correctly  
✅ Distance displays in info color with "along route" label  
✅ Fallback behavior works when shape data unavailable  
✅ "Last update" moved to current stop in Route Stops section  

### Data Validation
- Shape points correctly sorted by sequence
- Distance calculation uses progressive segments
- Error handling prevents crashes when data missing
- User location integration works with location store

## Files Modified

1. `src/services/favoriteBusService.ts` - Added distance calculation logic
2. `src/components/features/FavoriteBuses/components/FavoriteBusCard.tsx` - Added UI display and moved last update

## Future Enhancements

### Potential Improvements
1. **ETA Calculation**: Use route distance to calculate more accurate ETAs
2. **Progress Indicator**: Show bus progress along route as percentage
3. **Route Visualization**: Highlight user and bus positions on route map
4. **Direction Awareness**: Account for route direction in distance calculation

### Performance Optimizations
1. **WebWorker**: Move distance calculations to background thread
2. **Shape Simplification**: Reduce shape points for performance while maintaining accuracy
3. **Incremental Updates**: Only recalculate when positions change significantly
4. **Batch Processing**: Calculate distances for multiple buses simultaneously

## Conclusion

The bus distance calculation feature successfully provides users with accurate, route-aware distance information. By leveraging GTFS shape data, the feature offers more meaningful distance measurements than simple straight-line calculations, enhancing the overall user experience with better trip planning information.