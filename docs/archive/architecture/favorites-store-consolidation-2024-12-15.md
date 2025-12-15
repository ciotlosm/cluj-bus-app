# Favorites Store Consolidation

**Date**: December 15, 2024  
**Type**: Breaking Change - Store Architecture Refactoring

## Problem

The Cluj Bus App had two separate favorites stores that created confusion:

- **`favorites-store`** (legacy) - Used localStorage key `"favorites-store"`, contained direction intelligence and manual overrides
- **`favorites`** (modern) - Used localStorage key `"bus-tracker-favorites"`, contained current favorite bus functionality

This duplication caused:
- Confusing cache entries in Settings > Cache section
- Unclear data ownership and responsibility
- Potential data inconsistency
- Maintenance overhead

## Solution

Consolidated the two stores into a single, unified favorites store:

### Changes Made

1. **Removed Legacy Store**
   - Deleted `src/stores/favoritesStore.ts`
   - Removed complex direction intelligence features (manual overrides, station metadata)

2. **Enhanced Modern Store**
   - Updated `src/stores/favoriteBusStore.ts` to include simple favorites functionality
   - Added backward-compatible methods: `addFavoriteBus`, `removeFavoriteBus`, `addFavoriteStation`, `removeFavoriteStation`
   - Changed localStorage key from `"favorites"` to `"bus-tracker-favorites"`

3. **Updated Exports**
   - Modified `src/stores/index.ts` to export `useFavoriteBusStore` as the primary store
   - Added `useFavoritesStore` as an alias for backward compatibility

4. **Fixed Tests**
   - Updated test imports to use the consolidated store
   - Fixed localStorage key expectations in integration tests

### Final Store Structure

```typescript
interface FavoriteBusStore {
  // Modern favorite bus functionality
  favoriteBusResult: FavoriteBusResult | null;
  availableRoutes: RouteInfo[];
  
  // Simple favorites (backward compatibility)
  favorites: {
    buses: string[];
    stations: string[];
  };
  
  // Auto-refresh system
  isAutoRefreshEnabled: boolean;
  
  // Actions for both modern and legacy functionality
  refreshFavorites(): Promise<void>;
  addFavoriteBus(routeShortName: string): void;
  removeFavoriteBus(routeShortName: string): void;
  // ... other methods
}
```

### localStorage Keys After Consolidation

- **`bus-tracker-favorites`** - Single favorites store containing all favorite bus data
- **`config`** - User configuration (unchanged)
- **`bus-tracker-agencies`** - Agency data (unchanged)

## Impact

### ✅ Benefits
- **Simplified Architecture**: Single source of truth for favorites
- **Cleaner Cache UI**: Only one favorites entry in Settings > Cache
- **Reduced Complexity**: Eliminated duplicate functionality
- **Better Maintainability**: Single store to maintain and debug

### ⚠️ Breaking Changes
- **Data Loss**: Users will lose direction intelligence overrides and station metadata
- **localStorage Migration**: Old `favorites-store` data will not be automatically migrated
- **API Changes**: Some advanced direction features are no longer available

### 🔧 Migration Required
Users will need to:
1. Clear their browser cache/localStorage manually
2. Reconfigure their favorite buses
3. Re-setup any custom preferences

## Testing

All tests updated and passing:
- ✅ `src/stores/favoritesStore.test.ts` - Property-based tests
- ✅ `src/integration.test.ts` - Store integration tests  
- ✅ `src/integration-complete.test.tsx` - Complete user flow tests
- ✅ Build and TypeScript compilation successful

## Files Modified

- `src/stores/favoriteBusStore.ts` - Enhanced with legacy functionality
- `src/stores/index.ts` - Updated exports
- `src/stores/favoritesStore.test.ts` - Updated imports
- `src/integration.test.ts` - Fixed localStorage key expectations
- `src/integration-complete.test.tsx` - Fixed localStorage key expectations
- `src/stores/favoritesStore.ts` - **DELETED**

## Conclusion

The favorites store consolidation successfully eliminates confusion while maintaining backward compatibility for essential functionality. The breaking change is acceptable as it significantly improves the architecture and user experience in the cache management interface.