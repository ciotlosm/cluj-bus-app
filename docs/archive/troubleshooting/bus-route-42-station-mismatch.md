# Bus Route 42 Station Mismatch Issue

**Date**: December 13, 2025  
**Issue**: Route 42 showing incorrect station names and route information

## Problem Description

**Expected Behavior**:
- Bus route 42 should display route: "P-ta M. Viteazul - Str. Campului"
- User is closest to "Biserica Campului" station
- Should show relevant departure information for this station

**Actual Behavior**:
- App shows "Biserica Borhanci Est" instead
- Route information doesn't match expected schedule

## Investigation Areas

### 1. Station Name Normalization
The `normalizeStationName()` function in `favoriteBusService.ts` might be over-normalizing:

```typescript
private normalizeStationName(name: string): string {
  return name.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\b(str|strada|piata|pta|bd|bdul|calea|cal)\b/g, '') // Remove common street prefixes
    .replace(/\b(sosire|plecare|arrival|departure)\b/g, '') // Remove direction indicators
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}
```

**Potential Issue**: This might be causing "Biserica Campului" and "Biserica Borhanci Est" to be confused.

### 2. Direction Detection Logic
The direction detection uses keyword matching:

```typescript
const workKeywords = ['centru', 'center', 'piata', 'unirii', 'gara', 'universitate'];
const homeKeywords = ['disp', 'dispensar', 'cartier', 'manastur', 'gheorgheni', 'zorilor'];
```

**Potential Issue**: "P-ta M. Viteazul" contains "piata" which might trigger work direction incorrectly.

### 3. Station Proximity Calculation
The `findNearestStationOnRoute()` method calculates distances but might be selecting wrong stations.

### 4. Trip Headsign Matching
The `isStationNameMatch()` method might be incorrectly matching station names with trip headsigns.

## Data to Collect

1. **Live API Data**: Check Tranzy API responses for route 42
2. **Station Coordinates**: Verify coordinates for both "Biserica Campului" and "Biserica Borhanci Est"
3. **Trip Headsigns**: Check what headsigns are returned for route 42 trips
4. **Route Shape Data**: Verify the actual route path and station sequence

## Next Steps

1. Use Chrome DevTools to inspect live API calls
2. Check console logs for station matching decisions
3. Verify GPS coordinates and distance calculations
4. Compare expected vs actual station data from Tranzy API

## Debugging Commands

```javascript
// In browser console - check current location vs stations
console.log('Current location:', currentLocation);
console.log('Biserica Campului coords:', /* need to find */);
console.log('Biserica Borhanci Est coords:', /* need to find */);

// Check distance calculations
const distance1 = calculateDistance(currentLocation, bisericaCampuluiCoords);
const distance2 = calculateDistance(currentLocation, bisericaBorhanciCoords);
console.log('Distance to Biserica Campului:', distance1);
console.log('Distance to Biserica Borhanci Est:', distance2);
```

## Status
- [ ] Chrome DevTools inspection
- [ ] API data verification
- [ ] Station coordinate verification
- [ ] Fix implementation
- [ ] Test verification