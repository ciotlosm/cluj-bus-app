# API Service Consolidation - December 15, 2024

## Problem Statement

The codebase currently has two Tranzy API services:
- `tranzyApiService.ts` - Legacy basic API wrapper
- `enhancedTranzyApi.ts` - Advanced service with caching and enhanced features

This duplication creates maintenance overhead, inconsistent behavior, and architectural confusion.

## Analysis

### Current Usage
- **tranzyApiService**: Used by `agencyStore`, `configurationManager`, `busStore`
- **enhancedTranzyApi**: Used by most newer services and stores

### Feature Comparison
| Feature | tranzyApiService | enhancedTranzyApi |
|---------|------------------|-------------------|
| Basic API calls | ✅ | ✅ |
| Caching integration | ❌ | ✅ |
| Advanced GTFS support | ❌ | ✅ |
| Enhanced error handling | ❌ | ✅ |
| Comprehensive logging | ❌ | ✅ |
| Request debouncing | ✅ | ❌ |

## Consolidation Plan

### Phase 1: Rename and Enhance
1. Rename `enhancedTranzyApi.ts` → `tranzyApiService.ts`
2. Merge useful features from legacy service (request debouncing)
3. Update the class name to `TranzyApiService`

### Phase 2: Update Imports
1. Update all imports to use the consolidated service
2. Remove the old `tranzyApiService.ts`
3. Update type definitions if needed

### Phase 3: Interface Alignment
1. Ensure the consolidated service implements the `TranzyApiService` interface
2. Add any missing methods needed by existing consumers
3. Maintain backward compatibility during transition

## Benefits
- Single source of truth for API interactions
- Consistent caching and error handling across the app
- Reduced maintenance overhead
- Clearer architecture for developers
- Better performance through unified caching strategy

## Implementation Status
- [x] Phase 1: Rename and enhance
- [x] Phase 2: Update imports
- [x] Phase 3: Interface alignment
- [x] Phase 4: Remove legacy service
- [x] Phase 5: Update documentation

## Changes Made

### Files Consolidated
- `enhancedTranzyApi.ts` → `tranzyApiService.ts` (renamed and enhanced)
- `tranzyApiService.ts` → `tranzyApiService.legacy.ts` → deleted

### Features Added to Consolidated Service
- **Request debouncing** from legacy service (500ms debounce)
- **Dynamic agency ID resolution** - No more hardcoded agency IDs
- **Legacy interface compatibility** methods:
  - `validateApiKey()` - Uses configured agency ID
  - `getBusesForCity()` - Uses configured agency ID
  - `getStationsForCity()` - Uses configured agency ID
  - `getBusesAtStation()` - Uses configured agency ID
- **Multiple export patterns** for backward compatibility:
  - `tranzyApiService()` - Factory function
  - `createTranzyApiService()` - Factory function
  - `enhancedTranzyApi` - Singleton instance

### Import Updates
Updated 15+ files to import from the consolidated service:
- All stores (`agencyStore`, `busStore`, `enhancedBusStore`, `favoriteBusStore`)
- All services (`agencyService`, `routeMappingService`, `vehicleCacheService`, etc.)
- Components and test files

### Benefits Achieved
- ✅ Single source of truth for API interactions
- ✅ Consistent caching and error handling
- ✅ Reduced maintenance overhead
- ✅ Backward compatibility maintained
- ✅ Enhanced features available to all consumers
- ✅ Request debouncing prevents API spam
- ✅ Cleaner architecture and imports

## Technical Details

### Class Structure
```typescript
export class TranzyApiService {
  // Enhanced features (caching, logging, error handling)
  // + Legacy compatibility methods
  // + Request debouncing
}
```

### Export Pattern
```typescript
// Multiple export patterns for compatibility
export const tranzyApiService = (): TranzyApiService => { /* factory */ };
export const enhancedTranzyApi = new TranzyApiService(); // singleton
export const createTranzyApiService = (): TranzyApiService => { /* factory */ };
```

The consolidation successfully eliminated the confusion between two similar services while preserving all functionality and maintaining backward compatibility.