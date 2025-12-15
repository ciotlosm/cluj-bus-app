# Favorite Bus ID Mapping Fix

**Date**: December 13, 2025  
**Issue**: Route 42 not saving properly, null values in favorites, API calls failing  
**Status**: ✅ RESOLVED

## Root Cause Analysis

### Primary Issues Identified

1. **Incorrect ID Usage**: Components were using `route.id` (undefined) instead of `route.shortName`
2. **Missing Route Mapping**: System wasn't properly mapping shortName to API route ID
3. **Data Structure Mismatch**: Store expected `string[]` but components provided objects
4. **Fallback to shortName as ID**: Critical error - never use shortName as route ID for API calls

## Technical Details

### Before Fix
```typescript
// ❌ WRONG: Using undefined route.id
onChange={() => onToggle(route.id)}

// ❌ WRONG: Fallback to shortName as ID
const favoriteRoute: FavoriteRoute = {
  id: routeMapping?.routeId || routeShortName, // BAD FALLBACK
  shortName: routeShortName,
  longName: routeToAdd.longName,
  type: routeToAdd.type
};
```

### After Fix
```typescript
// ✅ CORRECT: Using proper shortName
onChange={() => onToggle(route.shortName)}

// ✅ CORRECT: Strict ID validation
if (!routeMapping?.routeId) {
  console.error('❌ Cannot add route - no valid route ID found for:', routeShortName);
  return; // Don't add routes without proper IDs
}

const favoriteRoute: FavoriteRoute = {
  id: routeMapping.routeId, // Always use proper route ID
  shortName: routeShortName,
  longName: routeToAdd.longName,
  type: routeToAdd.type
};
```

## Architecture Changes

### 1. Updated Type Definitions
```typescript
export interface FavoriteRoute {
  id: string; // API route ID for queries
  shortName: string; // Display name for users ("42", "43B")
  longName: string; // Full route name
  type: 'bus' | 'trolleybus' | 'tram' | 'metro' | 'rail' | 'ferry' | 'other';
}

export interface UserConfig {
  // ... other fields
  favoriteBuses?: FavoriteRoute[]; // Array of complete route objects
}
```

### 2. Updated Hook Logic
- Made `handleToggleRoute` async to properly fetch route mappings
- Added strict validation to prevent saving routes without proper IDs
- Integrated route mapping service for ID resolution

### 3. Component Interface Updates
- Updated `RouteListItem` and `RoutesList` to handle async toggle
- Fixed prop types to use `shortName` consistently
- Added error handling for failed route mapping

## Key Principles Established

### ✅ DO
- Always use proper API route IDs for data storage
- Use shortName only for user display
- Validate route mappings before saving
- Clear cache when changing data structures

### ❌ DON'T
- Never use shortName as route ID for API calls
- Don't save routes without proper ID mapping
- Don't mix display names with API identifiers
- Don't ignore route mapping service failures

## Testing Requirements

### Before Testing
1. **Clear Cache**: Always clear localStorage when data structures change
2. **Fresh Start**: Reload page after cache clear
3. **Validate Mapping**: Ensure route mapping service is working

### Test Scenarios
1. Add Route 42 - should get proper route ID from mapping service
2. Save favorites - should store complete FavoriteRoute objects
3. Display favorites - should show shortName to users
4. API calls - should use route ID for all API requests

## Files Modified

- `src/types/index.ts` - Added FavoriteRoute interface
- `src/hooks/useFavoriteBusManager.ts` - Fixed toggle logic and ID mapping
- `src/components/features/FavoriteBuses/components/RouteListItem.tsx` - Fixed prop usage
- `src/components/features/FavoriteBuses/components/RoutesList.tsx` - Updated interfaces
- `src/services/favoriteBusService.ts` - Updated to handle FavoriteRoute objects
- `src/stores/favoriteBusStore.ts` - Updated for new data structure

## Prevention Measures

1. **Type Safety**: Use TypeScript interfaces to prevent ID/shortName confusion
2. **Validation**: Always validate route mappings before saving
3. **Documentation**: Clear separation between display names and API identifiers
4. **Testing**: Include cache clearing in test procedures for data structure changes

## Related Issues

- Route mapping service integration
- localStorage data structure migrations
- Component prop type consistency
- API call parameter validation

## Additional Fix: Error Logging Issue

### Problem
When saving the first favorite route, an error was thrown in the route planning service with unhelpful logging:
```
❌ Error: Error: [object Object]
```

### Root Cause
The error logging in `routePlanningService.ts` was trying to log an Error object directly, which gets serialized as `[object Object]`.

### Solution
Updated error logging to properly serialize error information:

```typescript
// ❌ Before: Unhelpful error logging
} catch (error) {
  logger.error('Failed to get buses for stations', { city: cityName, agencyId, error });

// ✅ After: Proper error serialization
} catch (error) {
  logger.error('Failed to get buses for stations', { 
    city: cityName, 
    agencyId, 
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
```

### Files Modified
- `src/services/routePlanningService.ts` - Fixed error logging in `getBusesAtStations` method

This fix ensures that when errors occur during route planning (which may be triggered after saving favorites), the actual error message and stack trace are visible for debugging.

## Additional Fix: Improved Logging for Route Debugging

### Problem
Log messages only showed internal route IDs (e.g., "40") without the user-friendly route short names (e.g., "42"), making debugging difficult.

**Before:**
```
[WARN] No schedule data available for route 40 at station P-ța M. Viteazul Sud
```

**After:**
```
[WARN] No schedule data available for route 42 (ID: 40) at station P-ța M. Viteazul Sud
```

### Solution
Updated logging throughout the favorite bus service to include both route short name and ID:

```typescript
// Updated function signature
private async getNextDepartureTime(
  routeId: string,
  fromStation: Station,
  cityName: string,
  direction: 'towards_home' | 'towards_work',
  routeShortName?: string // Added for better logging
): Promise<...>

// Improved logging format
const routeDisplayName = routeShortName ? `${routeShortName} (ID: ${routeId})` : routeId;
logger.warn(`No schedule data available for route ${routeDisplayName} at station ${fromStation.name}`);
```

### Benefits
- **Better Debugging**: Immediately see both user-facing route name and internal ID
- **Clearer Context**: Understand which route users are trying to track
- **Easier Troubleshooting**: No need to manually map between short names and IDs

### Files Modified
- `src/services/favoriteBusService.ts` - Updated logging in multiple functions