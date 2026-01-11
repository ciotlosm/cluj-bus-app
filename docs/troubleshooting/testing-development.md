# Testing and Development Issues

## React Component Issues

**Problem**: Maximum update depth exceeded in AnimatedVehicleMarker **Solution**: Fixed circular useEffect dependencies causing infinite re-renders

**Problem**: Leaflet map container reuse error during development **Solution**: Added unique key prop to MapContainer and proper cleanup in useEffect

## Long-Running Tests and Memory Issues

### Problem: JavaScript Heap Out of Memory
**Symptoms**: Tests crash with "JavaScript heap out of memory" after 30-60 seconds, one test taking 7+ seconds

**Root Causes**:
1. **MSW Mock Data Generation**: Fast-check generating excessive mock data (30+ items per test)
2. **Memory Leaks**: Store state not properly reset between tests
3. **Timeout Issues**: Tests waiting for network timeouts instead of failing fast
4. **Concurrent Test Execution**: Multiple tests running simultaneously consuming memory

**Solutions**:

#### 1. Optimize Mock Data Generation
```typescript
// In mswSetup.ts - Reduce mock data sizes
const mockRoutes = fc.sample(tranzyRouteResponseArb, 3); // Was 10
const mockStops = fc.sample(tranzyStopResponseArb, 5);   // Was 20  
const mockVehicles = fc.sample(tranzyVehicleResponseArb, 3); // Was 15
const mockStopTimes = fc.sample(tranzyStopTimeResponseArb, 5); // Was 30
```

#### 2. Fix Vitest Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 5000,        // Reduced from 10000
    maxConcurrency: 1,        // Prevent parallel execution
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true } // Use single fork
    },
    clearMocks: true,
    restoreMocks: true,
  }
})
```

#### 3. Proper Test Cleanup
```typescript
// In test files
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  // Reset all stores
  useVehicleStore.setState(initialState);
  useConfigStore.setState(initialState);
  useLocationStore.setState(initialState);
  // Clear localStorage
  localStorage.clear();
});
```

#### 4. Fast-Fail Network Tests
```typescript
// Replace long timeouts with immediate failures
it('should handle network errors', async () => {
  mockNetworkError('/api/tranzy/v1/opendata/vehicles');
  
  const result = await store.getVehicleData();
  
  expect(result.error).toBeTruthy();
}, 1000); // Short timeout
```

### Problem: Slow Individual Tests
**Symptoms**: Single tests taking 5-10 seconds, especially data fetching tests

**Solutions**:

#### 1. Mock Heavy Operations
```typescript
// Mock expensive operations
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));
```

#### 2. Use Minimal Test Data
```typescript
// Use createMockData helpers instead of fast-check generators
const mockVehicle = createMockData.liveVehicle({ id: 'test-1' });
// Instead of: fc.sample(liveVehicleArb, 1)[0]
```

#### 3. Skip Integration Tests in Unit Mode
```typescript
// Add test.skip for heavy integration tests during development
test.skip('heavy integration test', () => {
  // Only run in CI or when specifically needed
});
```

### Problem: Memory Leaks in Store Tests
**Symptoms**: Memory usage growing with each test, eventual crash

**Solutions**:

#### 1. Complete Store Reset
```typescript
const resetAllStores = () => {
  useVehicleStore.setState({
    vehicles: [],
    stations: [],
    routes: [],
    isLoading: false,
    error: null,
    lastUpdated: null
  });
  
  useConfigStore.setState({
    config: null,
    theme: 'light',
    isConfigured: false
  });
  
  useLocationStore.setState({
    currentLocation: null,
    isLoading: false,
    error: null
  });
};
```

#### 2. Clear Persistent Storage
```typescript
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetAllStores();
});
```

### Problem: MSW Server Memory Issues
**Symptoms**: Mock service worker consuming excessive memory

**Solutions**:

#### 1. Optimize MSW Handlers
```typescript
// Use static responses instead of generated data where possible
http.get('/api/tranzy/v1/opendata/agency', () => {
  return HttpResponse.json([{
    agency_id: 1,
    agency_name: 'Local Transit Authority',
    agency_url: 'https://ctpcj.ro',
    agency_timezone: 'Europe/Bucharest',
    agency_lang: 'ro'
  }]);
});
```

#### 2. Reduce Handler Complexity
```typescript
// Simplify complex handlers
http.get('/api/tranzy/v1/opendata/vehicles', () => {
  // Return minimal data instead of generated arrays
  return HttpResponse.json([]);
});
```

### Test Performance Monitoring

#### 1. Add Performance Logging
```typescript
// In test files
const startTime = performance.now();
// ... test code ...
const endTime = performance.now();
console.log(`Test took ${endTime - startTime}ms`);
```

#### 2. Memory Usage Tracking
```bash
# Run tests with memory monitoring
node --max-old-space-size=4096 node_modules/.bin/vitest --run
```

#### 3. Identify Slow Tests
```bash
# Run with reporter to see timing
npm test -- --reporter=verbose
```

### Quick Fixes for Immediate Relief

#### 1. Increase Node Memory (Temporary)
```json
// package.json
{
  "scripts": {
    "test": "node --max-old-space-size=8192 node_modules/.bin/vitest --run"
  }
}
```

#### 2. Run Tests in Batches
```bash
# Run specific test files
npm test -- vehicleStore
npm test -- integration
```

#### 3. Skip Heavy Tests During Development
```typescript
// Use test.skip for memory-intensive tests
test.skip('memory intensive integration test', () => {
  // Skip during development
});
```

## Hook Architecture Testing Issues

### Problem: Generic Hook Type Errors
**Symptoms**: TypeScript errors when using `useStoreData<T>` with different data types

**Solutions**:

#### 1. Correct Type Usage
```typescript
// Correct - specify the data type
const { data: vehicles } = useStoreData<LiveVehicle>({
  dataType: 'vehicles'
});

// Incorrect - missing type parameter
const { data } = useStoreData({ dataType: 'vehicles' });
```

#### 2. Import Proper Types
```typescript
import type { LiveVehicle, Station, Route, StopTime } from '@/types';
```

### Problem: Cache-Related Test Failures
**Symptoms**: Tests failing due to cached data from previous tests

**Solutions**:

#### 1. Clear Unified Cache
```typescript
import { unifiedCache } from '@/hooks/shared/cache/instance';

beforeEach(() => {
  unifiedCache.clear();
});
```

#### 2. Mock Cache in Tests
```typescript
vi.mock('@/hooks/shared/cache/instance', () => ({
  unifiedCache: {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
    clear: vi.fn()
  }
}));
```

### Problem: Property-Based Test Failures
**Symptoms**: Property tests failing with generated data that doesn't match real API responses

**Solutions**:

#### 1. Constrain Generators
```typescript
// Ensure generated data matches API constraints
const validVehicleArb = fc.record({
  vehicle_id: fc.string({ minLength: 1 }),
  trip_id: fc.string({ minLength: 1 }),
  latitude: fc.float({ min: 46.7, max: 46.8 }), // Example city bounds
  longitude: fc.float({ min: 23.5, max: 23.7 })
});
```

#### 2. Use Real Data Samples
```typescript
// Use actual API response samples for property tests
const realVehicleData = [/* actual API responses */];
const vehicleArb = fc.constantFrom(...realVehicleData);
```

### Prevention Strategies

#### 1. Test Size Limits
- Unit tests: < 100ms each
- Integration tests: < 500ms each  
- Total test suite: < 30 seconds

#### 2. Memory Monitoring
- Monitor heap usage during test runs
- Set up CI alerts for memory spikes
- Regular cleanup of test artifacts

#### 3. Selective Test Execution
```bash
# Development workflow
npm test -- --changed  # Only changed files
npm test -- --watch    # Watch mode for active development
npm test -- --ui       # Visual test runner for debugging
```