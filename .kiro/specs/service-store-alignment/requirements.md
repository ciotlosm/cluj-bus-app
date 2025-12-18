# Domain Alignment Analysis: Services ↔ Stores ↔ Hooks

## ✅ Strengths - Well-Aligned Domains

### 1. Clear Layered Architecture

The architecture follows a clean separation:

- **Services Layer**: Data fetching & business logic
- **Stores Layer**: State management (3 unified stores)
- **Hooks Layer**: React integration (4 sub-layers: data, processing, shared, controllers)

### 2. Store Consolidation is Excellent

✅ **useConfigStore** → Configuration, theme, agencies, favorites  
✅ **useVehicleStore** → Unified vehicle data (live + scheduled)  
✅ **useLocationStore** → GPS and geolocation

This consolidation eliminates the previous fragmentation and creates clear domain boundaries.

### 3. Services Support Store Domains Well

Each store has corresponding service support:

- **ConfigStore** ← `agencyService`, `routeMappingService`
- **VehicleStore** ← `tranzyApiService`, `liveVehicleService`, `favoriteBusService`
- **LocationStore** ← `geocodingService`
## ⚠️ Issues - Domain Misalignments

### Issue 1: Hook-Service Coupling Bypasses Stores

**Problem**: Data hooks directly call services, bypassing stores:

```typescript
// ❌ CURRENT: useVehicleData hook calls service directly
const vehicles = await enhancedTranzyApi.getVehicles(agencyId, routeId);

// ✅ SHOULD BE: Hook uses store, store calls service
const { vehicles, refreshVehicles } = useVehicleStore();
```

**Impact**:
- Duplicate state management (hooks have their own state + stores have state)
- Cache inconsistency (hook cache vs service cache vs store cache)
- Multiple sources of truth for the same data

**Affected Hooks**:
- `useVehicleData` - bypasses vehicleStore
- `useStationData` - bypasses vehicleStore.stations
- `useRouteData` - bypasses configStore.agencies
- `useStopTimesData` - bypasses vehicleStore
### Issue 2: Multiple Caching Layers

**Problem**: 3 separate caching systems:

1. **Service Layer**: `cacheManager` (in `services/cacheManager.ts`)
2. **Hook Layer**: `globalCache` (in `hooks/shared/cacheManager.ts`)
3. **Store Layer**: Zustand persist + cacheStats

**Impact**:
- Cache invalidation complexity
- Memory overhead
- Inconsistent TTL strategies
- Difficult to debug cache issues
### Issue 3: Business Logic Duplication

**Problem**: Direction analysis logic exists in multiple places:

```typescript
// In useDirectionAnalysis hook (processing layer)
export const useDirectionAnalysis = (vehicle, station, stopTimes) => { ... }

// In useVehicleProcessingOrchestration (controller layer)
const analyzeVehicleDirection = (vehicle, station, stopTimes) => { ... }

// In vehicleStore (store layer)
const classifiedVehicles = vehicles.map((vehicle) => {
  // Direction classification logic
});
```

**Impact**:
- Maintenance burden (update in 3 places)
- Potential inconsistencies
- Unclear source of truth
### Issue 4: Service Dependencies Not Clear

**Problem**: Services have hidden dependencies:

```typescript
// favoriteBusService depends on:
- enhancedTranzyApi
- agencyService
- routeMappingService
- liveVehicleService

// But these dependencies aren't explicit in constructor/interface
```

**Impact**:
- Difficult to test in isolation
- Circular dependency risks
- Hard to understand data flow
### Issue 5: Store-Service Communication Pattern Inconsistent

**Problem**: Mixed patterns for store-service interaction:

```typescript
// Pattern 1: Store imports service directly
import { enhancedTranzyApi } from '../services/tranzyApiService';

// Pattern 2: Store uses dynamic import
const { useConfigStore } = await import('../stores/configStore');

// Pattern 3: Hook calls service, then updates store
const vehicles = await service.getVehicles();
useVehicleStore.setState({ vehicles });
```

**Impact**:
- Inconsistent architecture
- Harder to maintain
- Unclear best practices
## 📋 Recommended Fixes

### Fix 1: Establish Clear Data Flow

**✅ CORRECT PATTERN:**
```
Component → Hook (Controller) → Store → Service → API
```

**Example:**
```typescript
function MyComponent() {
  const { vehicles, refreshVehicles } = useVehicleStore();
  // Hook only orchestrates, doesn't fetch
  useEffect(() => {
    refreshVehicles(); // Store method calls service
  }, []);
}
```
### Fix 2: Consolidate Caching

**✅ Single cache layer in services:**
- **Services** → `cacheManager` (single source)
- **Stores** → Use service cache (no duplicate)
- **Hooks** → Use store data (no cache)

**Remove:**
- `hooks/shared/cacheManager.ts` (globalCache)
- Store-level caching (use service cache)
### Fix 3: Move Business Logic to Services

**✅ Create `directionAnalysisService.ts`:**
```typescript
export class DirectionAnalysisService {
  analyzeDirection(vehicle, station, stopTimes) { ... }
}

// Stores and hooks call service:
const direction = directionAnalysisService.analyzeDirection(...);
```
### Fix 4: Explicit Service Dependencies

**✅ Use dependency injection pattern:**
```typescript
export class FavoriteBusService {
  constructor(
    private tranzyApi: TranzyApiService,
    private agencyService: AgencyService,
    private routeMapping: RouteMappingService,
    private liveVehicle: LiveVehicleService
  ) {}
}

// Export configured instance
export const favoriteBusService = new FavoriteBusService(
  enhancedTranzyApi,
  agencyService,
  routeMappingService,
  liveVehicleService
);
```
### Fix 5: Standardize Store-Service Pattern

**✅ Standard pattern for all stores:**
```typescript
export const useVehicleStore = create<VehicleStore>((set, get) => ({
  vehicles: [],
  
  refreshVehicles: async () => {
    set({ isLoading: true });
    try {
      // Store calls service directly (no hook intermediary)
      const vehicles = await vehicleService.getVehicles();
      set({ vehicles, isLoading: false });
    } catch (error) {
      set({ error, isLoading: false });
    }
  }
}));
```
## 🎯 Priority Actions

### High Priority (Breaking Issues)
- ✅ Remove data hooks (`useVehicleData`, `useStationData`, etc.) - they bypass stores
- ✅ Consolidate caching - use only service-layer cache
- ✅ Move business logic to services - eliminate duplication

### Medium Priority (Architecture Improvements)
- ✅ Explicit service dependencies - use dependency injection
- ✅ Standardize store-service pattern - consistent communication

### Low Priority (Nice to Have)
- ✅ Service registry - centralized service discovery
- ✅ Event bus - decouple cross-domain communication
## 📊 Current State Assessment

**Domain Alignment Score: 6.5/10**

### ✅ Strengths:
- Clean store consolidation (3 stores)
- Good service separation
- Clear hook layering

### ❌ Weaknesses:
- Hooks bypass stores (major issue)
- Multiple caching layers
- Business logic duplication
- Unclear dependencies

## 🚀 Conclusion

The services are partially aligned with stores and hooks. The main issue is that data hooks create a parallel data flow that bypasses the store layer, leading to duplicate state management and cache inconsistency.

**Recommendation**: Refactor to eliminate data hooks and have controller hooks use stores directly. This will create a clean, unidirectional data flow:

```
Component → Controller Hook → Store → Service → API
```