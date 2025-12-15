# Favorite Bus Filtering Issue Investigation

**Date**: December 13, 2025  
**Status**: Investigating  
**Type**: Bug Investigation

## Problem

The favorite bus list is showing all vehicles instead of filtering to only show vehicles for the user's favorite routes. This suggests that the route filtering is not working properly.

## Investigation Steps

### 1. Check Favorite Routes Storage

The app uses `config.favoriteBuses` which should contain `FavoriteRoute` objects with:
```typescript
interface FavoriteRoute {
  id: string;        // API route ID for queries
  shortName: string; // Display name for users ("42", "43B")
  longName: string;  // Full route name
  type: 'bus' | 'trolleybus' | 'tram' | 'metro' | 'rail' | 'ferry' | 'other';
}
```

### 2. Check API Calls

The service should make calls like:
- `GET /api/tranzy/v1/opendata/vehicles?route_id=40` (for specific route)
- NOT `GET /api/tranzy/v1/opendata/vehicles` (for all vehicles)

### 3. Potential Issues

1. **Route ID Mismatch**: Stored route IDs don't match actual API route IDs
2. **Route Mapping Failure**: Route mapping service fails to get correct IDs
3. **Service Logic Error**: Service is making calls for all vehicles instead of specific routes
4. **Empty Favorites**: No favorite routes are actually stored in config

## Debugging Added

### Service Level Debugging
```typescript
// Added to favoriteBusService.ts
console.log('🔍 DEBUG: Favorite routes received:', favoriteRoutes);
favoriteRoutes.forEach((route, index) => {
  console.log(`🔍 Route ${index}:`, {
    id: route.id,
    shortName: route.shortName,
    idType: typeof route.id,
    parsedId: parseInt(route.id),
    isValidNumber: !isNaN(parseInt(route.id))
  });
});
```

### Browser Console Scripts
Created debug scripts to check:
- `src/debug-routes.js` - Check available routes and localStorage config
- `src/debug-vehicle-data.js` - Check raw API responses

## Expected vs Actual Behavior

### Expected
- User has Route 42 as favorite
- Service calls `GET /api/tranzy/v1/opendata/vehicles?route_id=40`
- Only vehicles for Route 42 are shown

### Actual (Suspected)
- Service calls `GET /api/tranzy/v1/opendata/vehicles` (all vehicles)
- All vehicles are shown regardless of favorites

## Next Steps

1. **Check Browser Console**: Look for debug output showing favorite routes structure
2. **Check Network Tab**: Verify API calls are using correct route_id parameters
3. **Check localStorage**: Verify favorite routes are properly stored
4. **Test Route Mapping**: Verify route mapping service returns correct IDs

## Root Cause Identified

The issue was **multiple API calls from different services**:

1. **✅ Correct**: `favoriteBusService` calls `/api/tranzy/v1/opendata/vehicles?route_id=40`
2. **❌ Interfering**: Other services call `/api/tranzy/v1/opendata/vehicles` (all vehicles)

Services making unfiltered calls:
- `routePlanningService.ts`: `enhancedTranzyApi.getVehicles(agencyId)` 
- `enhancedBusStore.ts`: `enhancedTranzyApi.getVehicles(parseInt(agency.id))`

## Solution Implemented

### 1. Enhanced Route ID Validation
```typescript
// Validate route ID before making API call
const parsedRouteId = parseInt(routeId);
if (isNaN(parsedRouteId)) {
  logger.error('Invalid route ID - cannot parse as integer');
  continue; // Skip this route instead of making API call without route_id
}
```

### 2. Double Filtering of Vehicle Data
```typescript
// Double-check: Filter vehicles to ensure they match the requested route
const filteredVehicles = liveVehicles.filter(vehicle => {
  const vehicleRouteId = vehicle.routeId;
  const matches = vehicleRouteId === routeId || vehicleRouteId === parsedRouteId.toString();
  return matches;
});
```

### 3. Comprehensive Debugging
Added detailed console logging to track:
- Which routes are being processed
- Route ID validation results
- Vehicle filtering results
- Final vehicle counts per route

### 4. Re-enabled Nearest Station Feature
```typescript
// Get stations for finding nearest stations to vehicles
stations = await enhancedTranzyApi.getStops(agencyId);

// Find nearest station for each vehicle
const nearestStation = this.findNearestStation(
  { latitude: vehicle.position.latitude, longitude: vehicle.position.longitude },
  stations
);
```

## Resolution Status

**FIXED**: The favorite bus service now:
- ✅ Validates route IDs before API calls
- ✅ Filters vehicles to match only favorite routes
- ✅ Provides detailed debugging output
- ✅ Prevents display of vehicles from non-favorite routes
- ✅ Shows nearest station names instead of raw coordinates
- ✅ Calculates distances to nearest stations within 2km

## Files Involved

- `src/services/favoriteBusService.ts` - Main service logic
- `src/services/routeMappingService.ts` - Route ID mapping
- `src/hooks/useFavoriteBusManager.ts` - Favorite route management
- `src/stores/configStore.ts` - Configuration storage
- `src/stores/favoriteBusStore.ts` - Favorite bus data management