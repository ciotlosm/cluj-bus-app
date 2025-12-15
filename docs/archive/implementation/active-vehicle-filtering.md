# Active Vehicle Filtering Implementation

## Overview
Updated the favorite buses feature to only show vehicles that are actively traveling by filtering based on `trip_id` field.

## Changes Made

### 1. Enhanced Vehicle Filtering
**File**: `src/services/favoriteBusService.ts`

- Added filter to only show vehicles with non-null `trip_id`
- Vehicles with `trip_id: null` are now excluded (these are typically parked or out of service)
- Added detailed logging for filtered vehicles

### 2. Updated FavoriteBusInfo Interface
**File**: `src/services/favoriteBusService.ts`

```typescript
export interface FavoriteBusInfo {
  // ... existing fields
  tripId: string; // Active trip ID (indicates direction: "40_0", "40_1", etc.)
  // ... other fields
}
```

### 3. Enhanced UI Display
**File**: `src/components/features/FavoriteBuses/components/FavoriteBusCard.tsx`

- Added direction indicator based on `trip_id`
- Format: "Dir 0" or "Dir 1" (extracted from trip_id like "40_1")

## Trip ID Format
- Format: `{route_id}_{direction}`
- Example: `"40_1"` means route 40, direction 1
- Direction 0/1 typically represents different directions of travel (e.g., inbound/outbound)

## Benefits
1. **Cleaner UI**: Only shows buses that are actually moving/active
2. **Better User Experience**: Users see only relevant, live vehicle information
3. **Direction Awareness**: Users can see which direction the bus is traveling
4. **Reduced Clutter**: Eliminates parked or inactive vehicles from the display

## API Data Example
```json
{
  "id": 451,
  "label": "962",
  "route_id": 40,
  "trip_id": "40_1",  // Active trip - will be shown
  "latitude": 46.7572766,
  "longitude": 23.56332,
  "speed": 48
}
```

vs.

```json
{
  "id": 450,
  "label": "965", 
  "route_id": 40,
  "trip_id": null,    // Inactive - will be filtered out
  "latitude": 46.7865583,
  "longitude": 23.6275916,
  "speed": 0
}
```

## Testing
- Test with route 42 which has both active (`trip_id: "40_1"`) and inactive (`trip_id: null`) vehicles
- Verify only active vehicles appear in favorites
- Check direction indicator displays correctly

---
*Updated: December 13, 2025*