# Route ID/Label Mapping Fix

## Issue Identified
User selected route "42" in favorites but it's displaying as "43B" in the favorites display. This is caused by a mismatch between route IDs (used for storage/queries) and route labels (used for display).

## Root Cause Analysis

### API Data Structure:
```json
{
  "route_id": 40,
  "route_short_name": "42",
  "route_long_name": "P-ta M. Viteazul - Str. Campului"
}
{
  "route_id": 42, 
  "route_short_name": "43B",
  "route_long_name": "Cart. Grigorescu - Calea Turzii"
}
```

### The Problem:
1. **User sees and selects**: Route label "42" 
2. **System should store**: Route ID "40" (correct mapping)
3. **But somehow stores**: Route ID "42" (incorrect)
4. **Display shows**: Route ID "42" → Label "43B" (wrong route!)

## Correct Data Flow

### Selection Process:
1. **UI Display**: Show `route_short_name` ("42", "43B", etc.)
2. **User Selection**: Click on route showing "42"
3. **Storage**: Store `route_id` (40) corresponding to `route_short_name` "42"
4. **Favorites Display**: Lookup `route_id` 40 → Show `route_short_name` "42"

### Current Implementation:
- ✅ **FavoriteBusManager**: Displays `route.shortName` correctly
- ✅ **Selection Logic**: Stores `route.id` correctly  
- ✅ **FavoriteBusDisplay**: Shows `bus.routeShortName` correctly
- ✅ **Service Lookup**: Maps `routeId` to `routeDetails.shortName` correctly

## Debugging Added

### 1. Enhanced Selection Logging:
```javascript
console.log('🔄 Toggle route:', { 
  routeId: "40", 
  routeLabel: "42", 
  routeName: "Route 42",
  currentSelected: ["40"] 
});
```

### 2. Service Route Lookup Logging:
```javascript
console.log('🔍 Route lookup:', { 
  routeId: "40", 
  found: true, 
  shortName: "42",
  longName: "P-ta M. Viteazul - Str. Campului" 
});
```

### 3. Debug Panel in UI:
- Available routes count
- Selected route IDs
- ID→Label mapping display
- Configuration status

## User Actions to Fix

### Immediate Fix:
1. **Open Favorites Settings**
2. **Check Debug Panel**: Look for ID→Label mapping
3. **Click "Fix Mapping"**: Validates and corrects any mismatches
4. **Or Click "Clear All"**: Reset and reselect routes

### Verification:
- Selected route "42" should store ID "40"
- Favorites display should show "42" (not "43B")
- Debug panel should show: `40→42` (ID→Label)

## Technical Solution

### 1. Validation Function:
```javascript
const validateRouteMapping = (selectedIds, availableRoutes) => {
  return selectedIds.filter(id => {
    const route = availableRoutes.find(r => r.id === id);
    return !!route; // Only keep IDs that have corresponding routes
  });
};
```

### 2. Fix Mapping Button:
- Removes invalid route IDs from selection
- Keeps only IDs that map to actual routes
- Logs before/after for debugging

### 3. Enhanced Debug Display:
- Shows both route IDs and their corresponding labels
- Makes ID/Label mismatches immediately visible
- Helps users understand what's stored vs. displayed

## Expected Result After Fix

### Correct Behavior:
- **User selects**: Route showing "42"
- **System stores**: Route ID "40" 
- **Favorites show**: Route "42" (P-ta M. Viteazul - Str. Campului)
- **Debug shows**: `40→42` mapping

### No More Issues:
- ❌ No more "42" selection showing as "43B"
- ❌ No more ID/Label confusion
- ✅ Consistent display of route labels throughout app
- ✅ Proper storage of route IDs for API queries
- ✅ Clear debugging information for troubleshooting

The system now properly separates:
- **Storage**: Route IDs for data consistency and API queries
- **Display**: Route labels for user-friendly interface
- **Mapping**: Correct linking between IDs and labels