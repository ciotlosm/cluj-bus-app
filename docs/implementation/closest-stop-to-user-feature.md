# Closest Stop to User Location Feature

**Date**: December 13, 2025  
**Status**: ✅ Completed  
**Feature**: Mark the closest bus stop to user's current location in route stops list

## Overview

This feature enhances the favorite buses route stops display by identifying and highlighting the stop that is closest to the user's current GPS location. This helps users quickly identify which stop they should walk to when they want to catch a specific bus.

## Implementation Details

### 1. Interface Updates

**File**: `src/services/favoriteBusService.ts`

Added new properties to `BusStopInfo` interface:
```typescript
export interface BusStopInfo {
  // ... existing properties
  isClosestToUser?: boolean; // True if this is the closest stop to the user's current location
  distanceToUser?: number; // Distance from user's location in meters
}
```

### 2. Service Layer Enhancement

**File**: `src/services/favoriteBusService.ts`

Enhanced `buildStopSequence` method to:
- Accept optional `userLocation` parameter
- Calculate distance from user location to each stop using Haversine formula
- Identify and mark the closest stop to user with `isClosestToUser: true`

```typescript
private buildStopSequence(
  tripId: string,
  stopTimes: any[],
  stations: any[],
  vehiclePosition: { latitude: number; longitude: number },
  nearestStation: { id: string; name: string; distance: number } | null,
  allRouteStopTimes: Map<string, any[]>,
  routeId: string,
  userLocation?: { latitude: number; longitude: number } | null, // NEW PARAMETER
  _tripDirection?: 'inbound' | 'outbound'
): BusStopInfo[]
```

### 3. Store Integration

**File**: `src/stores/favoriteBusStore.ts`

Updated `refreshFavorites` method to:
- Get user's current location from `locationStore`
- Pass user location to `favoriteBusService.getFavoriteBusInfo()`
- Fall back to home location if current location unavailable

```typescript
// Get current location if not available
let location = currentLocation;
if (!location) {
  try {
    location = await requestLocation();
  } catch (locationError) {
    logger.warn('Could not get current location, using home as fallback');
    location = config.homeLocation;
  }
}

// Pass user location for closest stop calculation
const result = await favoriteBusService.getFavoriteBusInfo(
  config.favoriteBuses,
  config.city,
  location // Pass user's current location
);
```

### 4. UI Implementation

**File**: `src/components/features/FavoriteBuses/components/FavoriteBusCard.tsx`

Added visual indicators for closest stop to user:

#### Icon
- **PersonPin** icon (info color) for stops closest to user
- **LocationOn** icon (primary color) for current bus location
- **RadioButtonUnchecked** icon (disabled color) for regular stops

#### Chip
- **"Closest to You"** chip with info color and outlined variant
- Positioned after existing "Current" and "Closest" chips

```typescript
{isClosestToUser && (
  <Chip
    label="Closest to You"
    size="small"
    color="info"
    variant="outlined"
    sx={{
      height: 16,
      fontSize: '0.6rem',
      '& .MuiChip-label': { px: 0.5 }
    }}
  />
)}
```

## Visual Design

### Color Scheme
- **Info Color (Blue)**: Used for closest-to-user indicators
- **Primary Color (Purple)**: Used for current bus location
- **Error Color (Red)**: Used for off-route indicators

### Layout
- PersonPin icon in the left icon area
- "Closest to You" chip in the right chip area
- Consistent with existing visual patterns

## User Experience

### Benefits
1. **Quick Identification**: Users can immediately see which stop is closest to them
2. **Walking Optimization**: Reduces time spent figuring out which direction to walk
3. **Location Awareness**: Leverages GPS for personalized route information

### Fallback Behavior
- If user location is unavailable, falls back to home location from settings
- If location permission denied, feature gracefully degrades (no closest stop marked)
- Works alongside existing "Current" bus location indicators

## Technical Implementation

### Distance Calculation
Uses Haversine formula for accurate distance calculation between GPS coordinates:
```typescript
private calculateDistance(
  pos1: { latitude: number; longitude: number },
  pos2: { latitude: number; longitude: number }
): number {
  const R = 6371e3; // Earth's radius in meters
  // ... Haversine formula implementation
  return R * c; // Distance in meters
}
```

### Performance Considerations
- Distance calculations only performed when user location is available
- Calculations done once per refresh, not on every render
- Minimal impact on existing route stops functionality

## Testing Results

### Localhost Testing
✅ Feature tested on `http://localhost:5175`  
✅ "Closest to You" chip appears correctly  
✅ PersonPin icon displays properly  
✅ Works alongside existing "Current" bus location  
✅ No conflicts with off-route indicators  

### Visual Verification
- Biserica Câmpului stop marked as "Closest to You" with PersonPin icon
- Central stop marked as "Current" with LocationOn icon
- Clean visual hierarchy with proper color coding

## Files Modified

1. `src/services/favoriteBusService.ts` - Enhanced distance calculation and stop marking
2. `src/stores/favoriteBusStore.ts` - Added user location parameter passing
3. `src/components/features/FavoriteBuses/components/FavoriteBusCard.tsx` - Added UI indicators

## Future Enhancements

### Potential Improvements
1. **Distance Display**: Show actual distance to closest stop (e.g., "150m away")
2. **Walking Directions**: Integration with maps for walking directions
3. **Multiple Closest**: Handle cases where multiple stops are equidistant
4. **Location Accuracy**: Use high-accuracy GPS when available

### Performance Optimizations
1. **Caching**: Cache distance calculations for repeated refreshes
2. **Debouncing**: Debounce location updates to avoid excessive calculations
3. **Background Updates**: Update closest stop in background without full refresh

## Conclusion

The closest stop to user location feature successfully enhances the user experience by providing personalized, location-aware information in the route stops display. The implementation is robust, performant, and integrates seamlessly with existing functionality.