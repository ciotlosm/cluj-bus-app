# Data Hooks to Store Migration - Design Document

## Overview

This design document outlines the complete migration from data hooks to store-based architecture to eliminate architectural duplication and inconsistency. Currently, both data hooks (useVehicleData, useStationData, etc.) and Zustand stores handle data fetching, caching, and state management, creating maintenance overhead and potential inconsistencies. This migration will remove all data hooks and consolidate data operations into the unified store architecture, reducing complexity by 1,500+ lines of duplicate code.

## Architecture

### Current Architecture (Problematic - Duplication)

```
┌─────────────────────────────────────────────────────────────┐
│  Controller Hooks                                           │
│  useVehicleDisplay, useRouteManager                         │
│  - Using data hooks instead of stores                      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  Data Hooks (DUPLICATE LOGIC - TO BE REMOVED)              │
│  useStationData, useVehicleData, useRouteData, etc.        │
│  - API calls, caching, retry logic (1,500+ lines)          │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  Store Layer (ALSO HAS SAME LOGIC)                         │
│  vehicleStore, configStore, locationStore                  │
│  - API calls, caching, retry logic (DUPLICATE!)            │
└─────────────────────────────────────────────────────────────┘
```

### Target Architecture (Store-Based - Single Source of Truth)

```
┌─────────────────────────────────────────────────────────────┐
│  Component Layer                                            │
│  - Subscribe to store state                                 │
│  - Call store methods for actions                           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  Controller Layer (store-based)                            │
│  useNearbyViewController, useVehicleDisplay                 │
│  - Use store subscriptions and methods only                 │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  Processing Layer (unchanged)                               │
│  useVehicleFiltering, useVehicleGrouping, etc.             │
│  - Pure functions, work with store data                     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  Store Layer (SINGLE SOURCE OF TRUTH)                      │
│  vehicleStore, configStore, locationStore                  │
│  - All API calls, caching, retry logic, state management   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Simple Composition Hook (New)

```typescript
/**
 * Simple composition hook for basic vehicle display needs
 * Replaces useVehicleProcessingOrchestration for simple use cases
 */
export interface UseVehicleDisplayOptions {
  agencyId?: string;
  filterByFavorites?: boolean;
  favoriteRoutes?: FavoriteRoute[];
  maxStations?: number;
  maxVehiclesPerStation?: number;
  userLocation?: Coordinates;
}

export interface UseVehicleDisplayResult {
  stationVehicleGroups: StationVehicleGroup[];
  isLoading: boolean;
  error: Error | null;
  effectiveLocationForDisplay: Coordinates | null;
  favoriteRoutes: FavoriteRoute[];
  allStations: Station[];
  vehicles: LiveVehicle[];
}

export const useVehicleDisplay = (options: UseVehicleDisplayOptions): UseVehicleDisplayResult;
```

### 2. Enhanced Data Hooks (Modified)

```typescript
/**
 * Enhanced data hooks with store integration
 * Maintains existing interface but adds store coordination
 */
export interface DataHookOptions {
  agencyId?: string;
  forceRefresh?: boolean;
  cacheMaxAge?: number;
  useStoreCache?: boolean; // New: Use store-managed cache
}

export interface DataHookResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}
```



## Data Models

### StationVehicleGroup (Unchanged)

```typescript
interface StationVehicleGroup {
  station: { station: Station; distance: number };
  vehicles: EnhancedVehicleInfoWithDirection[];
  allRoutes: Array<{
    routeId: string;
    routeName: string;
    vehicleCount: number;
  }>;
}
```

### CompositionMetadata (New)

```typescript
interface CompositionMetadata {
  dataHooksUsed: string[];
  processingHooksUsed: string[];
  totalExecutionTime: number;
  cacheHits: number;
  cacheMisses: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Functional Equivalence
*For any* valid input options, the new composition pattern should produce identical output to the original orchestration hook
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 2: Performance Improvement
*For any* sequence of hook calls, the new architecture should make fewer or equal API calls compared to the original implementation
**Validates: Requirements 6.1, 6.2**

### Property 3: Store Integration Consistency
*For any* data hook invocation, when store cache is available, the hook should use store data before making API calls
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: Error Propagation Preservation
*For any* error scenario, the new composition pattern should propagate errors with the same structure and context as the original implementation
**Validates: Requirements 4.2, 4.4**

### Property 5: Loading State Consistency
*For any* combination of loading states from data hooks, the composed loading state should accurately reflect the overall loading status
**Validates: Requirements 4.2, 4.5**



### Property 7: Composition Idempotence
*For any* set of input options, calling the composition hook multiple times with the same options should not trigger duplicate API calls
**Validates: Requirements 6.1, 6.2**

### Property 8: Controller Pattern Consistency
*For any* complex orchestration scenario, using useNearbyViewController should follow the same patterns and conventions as the new composition approach
**Validates: Requirements 7.1, 7.2, 7.3**

## Error Handling

### Error Categories

1. **Migration Errors**: Errors during transition from old to new patterns
2. **Composition Errors**: Errors in combining multiple hooks
3. **Store Integration Errors**: Errors in store-hook coordination
4. **Backward Compatibility Errors**: Errors in maintaining API compatibility

### Error Handling Strategy

```typescript
class CompositionError extends Error {
  constructor(
    message: string,
    public hookName: string,
    public context: Record<string, any>,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'CompositionError';
  }
}

// Error handling in composition
try {
  const stations = useStationData(options);
  const vehicles = useVehicleData(options);
  
  if (stations.error || vehicles.error) {
    throw new CompositionError(
      'Data fetching failed',
      'useVehicleDisplay',
      { stationsError: stations.error, vehiclesError: vehicles.error }
    );
  }
} catch (error) {
  // Propagate with context
  logger.error('Composition failed', { error, options });
  return { error, isLoading: false, data: null };
}
```

## Testing Strategy

### Unit Testing

**Data Hook Tests:**
- Test each data hook independently with mocked API responses
- Verify caching behavior and TTL management
- Test error handling and retry logic
- Validate store integration when enabled

**Composition Hook Tests:**
- Test composition logic with mocked data hooks
- Verify correct combination of loading states
- Test error aggregation from multiple hooks
- Validate output format matches original API

**Processing Hook Tests:**
- Test filtering and grouping logic with various inputs
- Verify statistics and metadata generation
- Test edge cases and boundary conditions

### Property-Based Testing

**Property 1: Functional Equivalence Test**
```typescript
// Generate random valid options
// Call both old and new implementations
// Assert outputs are structurally equivalent
```

**Property 2: Performance Improvement Test**
```typescript
// Generate random hook call sequences
// Count API calls in old vs new implementation
// Assert new implementation makes fewer or equal calls
```

**Property 3: Store Integration Test**
```typescript
// Generate random store states
// Call data hooks with store cache enabled
// Assert store data is used when available
```

### Integration Testing

**Component Migration Tests:**
- Test each migrated component maintains identical behavior
- Verify all props and callbacks work correctly
- Test loading states and error handling
- Validate data transformation and display

**End-to-End Tests:**
- Test complete user flows with new architecture
- Verify no regressions in user-facing functionality
- Test performance under realistic conditions
- Validate error recovery and fallback behaviors

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Create simple composition hook (useVehicleDisplay)
- Add store integration to data hooks
- Implement migration support wrapper
- Write comprehensive unit tests

### Phase 2: Component Migration (Week 2-3)
- Migrate StationDisplay component
- Migrate FavoriteRoutesView component
- Update any other components using orchestration hook
- Add deprecation warnings to old hook

### Phase 3: Cleanup and Optimization (Week 4)
- Remove useVehicleProcessingOrchestration
- Clean up unused dependencies
- Optimize performance based on metrics
- Update all documentation

### Phase 4: Validation (Week 5)
- Run comprehensive test suite
- Perform performance benchmarking
- Validate code reduction metrics
- Final documentation review

## Refactoring Patterns

### Current Pattern (To Remove)

```typescript
const {
  stationVehicleGroups,
  isLoading,
  error
} = useVehicleProcessingOrchestration({
  filterByFavorites: true,
  maxStations: 2,
  maxVehiclesPerStation: 5
});
```

### New Pattern - Simple Composition

```typescript
const {
  stationVehicleGroups,
  isLoading,
  error
} = useVehicleDisplay({
  filterByFavorites: true,
  maxStations: 2,
  maxVehiclesPerStation: 5
});
```

### New Pattern - Complex Orchestration

```typescript
const {
  stationVehicleGroups,
  isLoading,
  error
} = useNearbyViewController({
  enableSecondStation: true,
  maxVehiclesPerStation: 5,
  autoRefresh: true
});
```

## Performance Considerations

### Expected Improvements

1. **Reduced API Calls**: Eliminate duplicate fetching (estimated 30-50% reduction)
2. **Faster Rendering**: Simpler hooks with less memoization overhead (estimated 10-20% improvement)
3. **Lower Memory Usage**: Remove complex dependency tracking (estimated 15-25% reduction)
4. **Better Cache Utilization**: Unified caching through stores (estimated 40-60% improvement)

### Monitoring

- Track API call counts before and after migration
- Measure component render times
- Monitor memory usage patterns
- Track cache hit/miss ratios

## Success Criteria

1. ✅ Remove 1,000+ lines of orchestration code
2. ✅ All existing tests pass without modification
3. ✅ No user-facing regressions
4. ✅ Performance metrics improved or maintained
5. ✅ All components migrated successfully
6. ✅ Documentation fully updated
7. ✅ Deprecation warnings in place
8. ✅ Code review approved by team