# Unified Cache System Architecture

**Date**: December 14, 2024  
**Type**: Architecture Refactoring  
**Impact**: Major simplification of caching strategy

## Overview

Refactored the entire caching system from multiple, inconsistent cache implementations to a single, unified cache system with consistent behavior across the application.

## Problem Statement

### Previous Cache Complexity
The application had **5 different cache implementations**:

1. **DataCacheManager** (`dataCache.ts`) - Complex cache with different TTLs per data type
2. **VehicleCacheService** - Separate 30-second cache for vehicles
3. **DataCache** (`cacheUtils.ts`) - Generic cache utility used in busStore
4. **GoogleTransitService** - Own 5-minute cache for transit estimates
5. **AgencyService** - Simple in-memory caching

### Issues with Previous System
- **Inconsistent TTLs**: Different cache durations (30s, 5min, 24h, 7d)
- **Complex Configuration**: Multiple cache configs and behaviors
- **No UI Updates**: Cache updates didn't trigger UI refreshes
- **Maintenance Overhead**: Multiple cache systems to maintain
- **Memory Inefficiency**: Overlapping cache storage

## New Unified Architecture

### Single Cache System
- **One TTL**: 30 seconds for all live data
- **Event-Driven**: UI components automatically update when cache refreshes
- **Consistent API**: Same interface for all cache operations
- **Automatic Cleanup**: Built-in expired entry removal

### Core Components

#### UnifiedCacheManager (`src/services/unifiedCache.ts`)
```typescript
class UnifiedCacheManager {
  // Single 30-second TTL for all data
  private readonly TTL = 30 * 1000;
  
  // Event system for UI updates
  private listeners = new Map<string, Set<CacheEventListener<any>>>();
  
  // Main cache operations
  async get<T>(key: string, fetcher: () => Promise<T>, forceRefresh = false): Promise<T>
  set<T>(key: string, data: T): void
  subscribe<T>(key: string, listener: CacheEventListener<T>): () => void
}
```

#### Cache Keys (`CacheKeys`)
Centralized key management:
```typescript
export const CacheKeys = {
  vehicles: (agencyId: number) => `vehicles:${agencyId}`,
  busInfo: (city: string) => `busInfo:${city}`,
  stations: (city: string) => `stations:${city}`,
  transitEstimate: (origin: string, destination: string) => `transit:${origin}-${destination}`,
} as const;
```

## Migration Details

### 1. Vehicle Cache Service
**Before**: Custom 30-second cache with Map storage
```typescript
class VehicleCacheService {
  private cache: CachedVehicleData | null = null;
  private readonly CACHE_DURATION = 30 * 1000;
}
```

**After**: Uses unified cache
```typescript
async getVehiclesForRoutes(agencyId: number, routeIds: string[]): Promise<Map<string, any[]>> {
  return unifiedCache.get(
    CacheKeys.vehicles(agencyId),
    () => this.fetchAllVehicles(agencyId)
  );
}
```

### 2. Bus Store
**Before**: Custom DataCache instances
```typescript
const busCache = new DataCache<BusInfo[]>();
const stationCache = new DataCache<Station[]>();
```

**After**: Unified cache with automatic stale data handling
```typescript
buses = await unifiedCache.get(
  CacheKeys.busInfo(config.city),
  async () => {
    return await withRetry(fetchBusData, { maxRetries: 3 });
  },
  forceRefresh
);
```

### 3. Google Transit Service
**Before**: Custom 5-minute cache
```typescript
private cache = new Map<string, TransitEstimate>();
private readonly CACHE_DURATION_MS = 5 * 60 * 1000;
```

**After**: Unified 30-second cache
```typescript
return unifiedCache.get(
  cacheKey,
  async () => {
    const estimate = await this.fetchGoogleTransitEstimate(request, apiKey);
    return estimate;
  }
);
```

## Key Benefits

### 1. Simplified Architecture
- **Single Cache System**: One implementation to maintain
- **Consistent Behavior**: Same TTL and error handling everywhere
- **Reduced Complexity**: No more cache configuration management

### 2. Automatic UI Updates
- **Event System**: Components can subscribe to cache updates
- **Real-time Refresh**: UI automatically updates when cache refreshes
- **Better UX**: Users see fresh data immediately

### 3. Performance Improvements
- **Unified Storage**: Single localStorage persistence
- **Efficient Cleanup**: Automatic expired entry removal
- **Memory Optimization**: No overlapping cache storage

### 4. Developer Experience
- **Simple API**: Same interface for all cache operations
- **Type Safety**: Full TypeScript support with generics
- **Easy Testing**: Single cache system to mock

## Cache Strategy

### Live Data (30-second TTL)
All dynamic data uses 30-second cache:
- Vehicle positions and status
- Bus arrival information
- Transit time estimates
- Route-specific data

### Stale Data Handling
- **Automatic Fallback**: Returns stale data (up to 5 minutes) if fresh fetch fails
- **Background Refresh**: Continues trying to fetch fresh data
- **Offline Support**: Persists to localStorage for offline access

### Error Resilience
- **Graceful Degradation**: Shows stale data instead of errors
- **Retry Logic**: Built into individual service fetchers
- **User Feedback**: Clear indicators when using cached/stale data

## Implementation Guidelines

### Using the Unified Cache
```typescript
// Basic usage
const data = await unifiedCache.get(
  'my-cache-key',
  () => fetchDataFromAPI()
);

// Force refresh
const freshData = await unifiedCache.get(
  'my-cache-key',
  () => fetchDataFromAPI(),
  true // forceRefresh
);

// Subscribe to updates
const unsubscribe = unifiedCache.subscribe('my-cache-key', (event) => {
  if (event.type === 'updated') {
    // Update UI with fresh data
    updateComponent(event.data);
  }
});
```

### Cache Key Conventions
- Use `CacheKeys` constants for consistency
- Include relevant parameters in key (agencyId, city, etc.)
- Keep keys descriptive and unique

### Error Handling
- Let unified cache handle stale data fallback
- Implement proper error handling in fetcher functions
- Use appropriate retry logic in service layers

## Settings vs Cache

### Application Settings (localStorage)
**Separate from cache system**:
- User preferences (theme, language)
- Configuration data (API keys, locations)
- Persistent across sessions
- Not subject to TTL expiration

### Cache Data (unified cache)
**Temporary live data**:
- API responses
- Computed results
- Real-time information
- Subject to 30-second TTL

## Migration Checklist

### ✅ Completed
- [x] Created UnifiedCacheManager
- [x] Migrated VehicleCacheService
- [x] Updated BusStore
- [x] Refactored GoogleTransitService
- [x] Removed old cache implementations
- [x] Updated imports and dependencies

### 🔄 Future Considerations
- [ ] Add cache metrics and monitoring
- [ ] Implement cache warming strategies
- [ ] Add cache size limits and LRU eviction
- [ ] Consider cache compression for large datasets

## Performance Impact

### Before Refactoring
- Multiple cache systems with different cleanup intervals
- Inconsistent memory usage patterns
- Complex cache invalidation logic
- No automatic UI updates

### After Refactoring
- Single cleanup interval (30 seconds)
- Predictable memory usage (30s + 5min stale data)
- Simple cache invalidation (TTL-based)
- Automatic UI updates via event system

## Testing Strategy

### Unit Tests
- Test unified cache operations (get, set, clear)
- Verify TTL and stale data handling
- Test event system and subscriptions

### Integration Tests
- Verify service layer cache integration
- Test UI component cache subscriptions
- Validate offline/error scenarios

### Performance Tests
- Monitor cache hit/miss ratios
- Measure memory usage patterns
- Validate cleanup efficiency

---

**Result**: Simplified caching architecture with consistent 30-second TTL, automatic UI updates, and improved developer experience while maintaining all existing functionality.