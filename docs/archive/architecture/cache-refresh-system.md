# Cache Refresh System Architecture

**Date:** December 15, 2024  
**Status:** Implemented  
**Version:** 1.0

## Overview

The Cluj Bus App implements a comprehensive cache refresh system that provides real-time data updates with visual feedback to users. The system consists of background refresh jobs, intelligent caching, and UI refresh indicators.

## Architecture Components

### 1. Background Refresh Job (`busStore.ts`)

The background refresh system runs automatically based on user configuration:

```typescript
// Auto-refresh configuration
startAutoRefresh: () => {
  const config = useConfigStore.getState().config;
  refreshIntervalId = setInterval(async () => {
    const currentState = get();
    if (!currentState.isLoading) {
      await currentState.refreshBuses();
    }
  }, config.refreshRate); // User-configurable interval
}
```

**Key Features:**
- Configurable refresh rate (user setting)
- Prevents overlapping requests
- Automatic start/stop based on app lifecycle
- Error handling with retry logic

### 2. Unified Cache System (`unifiedCache.ts`)

The cache system provides consistent data storage with event notifications:

```typescript
// Cache with event system
export class UnifiedCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private listeners = new Map<string, Set<CacheEventListener<any>>>();
  
  // Set data and notify listeners
  set<T>(key: string, data: T): void {
    // Store data
    this.cache.set(key, entry);
    
    // Notify all subscribers
    this.notifyListeners(key, {
      type: 'updated',
      key,
      data,
      timestamp: Date.now(),
    });
  }
}
```

**Cache Keys:**
- `busInfo:${city}` - Main bus data for a city
- `vehicles:${agencyId}` - Live vehicle positions
- `routeVehicles:${agencyId}:${routeId}` - Route-specific vehicles

### 3. Cache Event Subscription System

Components can subscribe to cache updates for automatic UI refresh:

```typescript
// Subscribe to cache events
const unsubscribe = unifiedCache.subscribe(cacheKey, (event) => {
  if (event.type === 'updated') {
    // Trigger UI update
    setRefreshState({ isRefreshing: true });
    setTimeout(() => setRefreshState({ isRefreshing: false }), 500);
  }
});
```

### 4. UI Refresh Indicators

Visual feedback system using Material Design components:

#### MaterialRefreshIndicator Component
- Small hourglass chip that appears for 0.5 seconds
- Positioned in top-right corner of cards
- Animated spinning icon
- Fade in/out transitions

#### AutoRefreshIndicator Wrapper
- Automatically wraps components with refresh indicators
- Monitors multiple cache keys
- Configurable position and styling

## Data Flow

```
1. Background Timer (every X seconds)
   ↓
2. Fetch Fresh Data (API call)
   ↓
3. Update Unified Cache
   ↓
4. Trigger Cache Events
   ↓
5. UI Components Receive Events
   ↓
6. Show Refresh Indicators (0.5s)
   ↓
7. Update Component State
   ↓
8. Re-render with Fresh Data
```

## Implementation Details

### Cache Key Strategy

Each UI component monitors relevant cache keys:

```typescript
// FavoriteBusCard cache keys
const cacheKeys = config ? [
  CacheKeys.busInfo(config.city),           // General bus data
  CacheKeys.vehicles(2),                    // CTP Cluj vehicles
  CacheKeys.routeVehicles(2, bus.routeName) // Specific route
] : [];
```

### Refresh Indicator Integration

Components use the `AutoRefreshIndicator` wrapper:

```typescript
<AutoRefreshIndicator cacheKeys={cacheKeys} position="top-right">
  <BusCard {...props} />
</AutoRefreshIndicator>
```

### Event Timing

- **Cache TTL:** 30 seconds for live data
- **Refresh Indicator Duration:** 500ms
- **Background Refresh:** User configurable (default: 30s)
- **Stale Data Threshold:** 5 minutes

## Benefits

### User Experience
- **Visual Feedback:** Users see when data is being updated
- **Real-time Feel:** Smooth updates without jarring refreshes
- **Confidence:** Clear indication of data freshness

### Performance
- **Intelligent Caching:** Reduces API calls
- **Background Updates:** Non-blocking refresh process
- **Stale-While-Revalidate:** Always responsive UI

### Reliability
- **Offline Support:** Falls back to cached data
- **Error Handling:** Graceful degradation
- **Retry Logic:** Automatic recovery from failures

## Configuration

### User Settings
- `refreshRate`: How often to refresh data (milliseconds)
- `staleDataThreshold`: When to mark data as stale (minutes)

### Cache Settings
- `TTL`: 30 seconds for live data
- `maxAge`: 5 minutes for stale data retention
- `cleanupInterval`: 30 seconds for expired entry removal

## Future Enhancements

1. **Smart Refresh Rates:** Adjust based on data volatility
2. **Predictive Caching:** Pre-fetch likely needed data
3. **WebSocket Integration:** Real-time push updates
4. **Offline Queue:** Queue updates when offline
5. **Performance Metrics:** Track cache hit rates and refresh timing

## Related Files

- `src/stores/busStore.ts` - Background refresh logic
- `src/services/unifiedCache.ts` - Cache management
- `src/hooks/useCacheRefreshIndicator.ts` - React hooks
- `src/components/ui/RefreshIndicator/` - UI components
- `src/components/features/FavoriteBuses/` - Implementation example

## Testing Strategy

- Unit tests for cache operations
- Integration tests for refresh cycles
- Visual tests for indicator timing
- Performance tests for cache efficiency
- User acceptance tests for UX validation