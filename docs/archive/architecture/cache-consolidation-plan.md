# Cache System Consolidation Plan

**Date:** December 15, 2024  
**Status:** In Progress  
**Priority:** High - Reduces complexity and confusion

## Problem Statement

The Cluj Bus App currently has **two separate cache systems** that serve overlapping purposes:

### Current Cache Systems

1. **`unifiedCache.ts`** - Event-driven, simple TTL
   - Used by: `busStore`, `googleTransitService`, `vehicleCacheService`, UI refresh indicators
   - Features: Event system, 30-second TTL for all data
   - Purpose: Real-time data with UI notifications

2. **`dataCache.ts`** - Complex configurations, no events
   - Used by: `enhancedTranzyApi`
   - Features: Different TTLs per data type, stale-while-revalidate
   - Purpose: Static/semi-static data (agencies, routes, stops)

### Issues with Current Approach

- **Confusion:** Developers don't know which cache to use
- **Inconsistency:** Different APIs for similar functionality
- **Maintenance:** Two systems to maintain and debug
- **Performance:** Potential conflicts and redundant storage

## Solution: Consolidated Cache System

### New Architecture: `consolidatedCache.ts`

Combines the best features of both systems:

```typescript
// Flexible configurations (from dataCache)
export const CACHE_CONFIGS = {
  agencies: { ttl: 24h, maxAge: 7d, staleWhileRevalidate: true },
  vehicles: { ttl: 30s, maxAge: 5m, staleWhileRevalidate: true },
  liveData: { ttl: 30s, maxAge: 2m, staleWhileRevalidate: true },
};

// Event system (from unifiedCache)
consolidatedCache.subscribe(key, (event) => {
  if (event.type === 'updated') {
    // Update UI
  }
});

// Unified API
const data = await consolidatedCache.get(key, fetcher, CACHE_CONFIGS.vehicles);
```

### Key Benefits

1. **Single Source of Truth:** One cache system for all needs
2. **Flexible Configurations:** Different TTLs for different data types
3. **Event-Driven UI Updates:** Automatic refresh indicators
4. **Backward Compatibility:** Legacy aliases during migration
5. **Better Performance:** No conflicts or redundant storage

## Migration Strategy

### Phase 1: Create Consolidated System ✅
- [x] Create `consolidatedCache.ts` with combined features
- [x] Include backward compatibility aliases
- [x] Maintain existing API contracts

### Phase 2: Update Services ✅
- [x] Update `enhancedTranzyApi.ts` to use consolidated cache
- [x] Update `busStore.ts` to use consolidated cache
- [x] Update `vehicleCacheService.ts` to use consolidated cache
- [x] Update `googleTransitService.ts` to use consolidated cache

### Phase 3: Update UI Components ✅
- [x] Update refresh indicator hooks to use consolidated cache
- [x] Update components to use new cache keys
- [x] Test event system integration

### Phase 4: Remove Legacy Systems ✅
- [x] Remove `unifiedCache.ts`
- [x] Remove `dataCache.ts`
- [x] Update all imports
- [ ] Remove backward compatibility aliases (can be done later)

### Phase 5: Documentation and Testing
- [ ] Update architecture documentation
- [ ] Add comprehensive tests
- [ ] Performance benchmarking
- [ ] Migration guide for future developers

## Implementation Details

### Cache Key Strategy

Unified cache keys for all data types:

```typescript
export const CacheKeys = {
  // Live data (30s TTL)
  vehicles: (agencyId: number) => `vehicles:${agencyId}`,
  busInfo: (city: string) => `busInfo:${city}`,
  
  // Static data (24h TTL)
  agencies: () => 'agencies:all',
  routes: (agencyId: number) => `routes:agency:${agencyId}`,
  stops: (agencyId: number) => `stops:agency:${agencyId}`,
  
  // Semi-static data (24h TTL)
  schedules: (agencyId: number) => `schedules:agency:${agencyId}`,
  stopTimes: (agencyId: number, stopId?: number) => 
    `stop_times:agency:${agencyId}${stopId ? `:stop:${stopId}` : ''}`,
};
```

### Configuration Mapping

| Data Type | TTL | Max Age | Stale While Revalidate |
|-----------|-----|---------|------------------------|
| Agencies | 24h | 7d | ✅ |
| Routes | 24h | 7d | ✅ |
| Stops | 24h | 7d | ✅ |
| Schedules | 24h | 3d | ✅ |
| Stop Times | 24h | 3d | ✅ |
| Vehicles | 30s | 5m | ✅ |
| Live Data | 30s | 2m | ✅ |
| Transit Estimates | 5m | 15m | ✅ |

### Event System Integration

All cache updates trigger events for UI refresh indicators:

```typescript
// Automatic UI updates
consolidatedCache.subscribe('vehicles:2', (event) => {
  if (event.type === 'updated') {
    showRefreshIndicator(500); // 0.5 second indicator
  }
});
```

## Risk Assessment

### Low Risk
- **Backward Compatibility:** Legacy aliases prevent breaking changes
- **Gradual Migration:** Can migrate services one by one
- **Testing:** Existing functionality remains unchanged during migration

### Medium Risk
- **Performance Impact:** Need to benchmark consolidated system
- **Event System:** Ensure no memory leaks in subscriptions
- **Storage Migration:** Need to handle localStorage key changes

### Mitigation Strategies
- Comprehensive testing before each migration step
- Performance monitoring during rollout
- Rollback plan if issues arise
- Gradual feature flag-based migration

## Success Metrics

### Technical Metrics
- **Reduced Complexity:** Single cache system instead of two
- **Performance:** No degradation in cache hit rates
- **Memory Usage:** Reduced overall memory footprint
- **Event Efficiency:** Fast UI update notifications

### Developer Experience
- **Clarity:** Clear documentation on which cache to use (always consolidated)
- **Consistency:** Single API for all caching needs
- **Maintainability:** Easier debugging and feature additions

## Timeline

| Phase | Duration | Completion |
|-------|----------|------------|
| Phase 1: Create System | 1 day | ✅ Complete |
| Phase 2: Migrate Services | 2 days | 🔄 In Progress |
| Phase 3: Update UI | 1 day | ⏳ Pending |
| Phase 4: Remove Legacy | 1 day | ⏳ Pending |
| Phase 5: Documentation | 1 day | ⏳ Pending |

**Total Estimated Time:** 6 days

## Next Steps

1. **Immediate:** Update `enhancedTranzyApi.ts` to use consolidated cache
2. **Today:** Migrate remaining services
3. **Tomorrow:** Update UI components and test event system
4. **This Week:** Remove legacy systems and complete documentation

This consolidation will significantly improve the codebase maintainability and developer experience while maintaining all existing functionality.