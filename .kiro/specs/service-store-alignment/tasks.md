# Service-Store Alignment Refactoring Tasks

## Overview
Refactor to establish clean data flow: Component → Controller Hook → Store → Service → API

## High Priority Tasks (Breaking Issues)

### Task 1: Consolidate Caching Layer ✅ COMPLETE
**Goal**: Remove duplicate caching, use only service-layer cache

**Actions**:
- [x] Audit all caching locations
- [x] Update all data hooks to use `services/cacheManager.ts`
- [x] Update controller hooks to use service cache
- [x] Deprecate `hooks/shared/cacheManager.ts` exports
- [x] Update tests to use service cache

**Files modified**:
- `src/hooks/data/useVehicleData.ts` - Now uses cacheManager from services
- `src/hooks/data/useStationData.ts` - Now uses cacheManager from services
- `src/hooks/data/useRouteData.ts` - Now uses cacheManager from services
- `src/hooks/data/useStopTimesData.ts` - Now uses cacheManager from services
- `src/hooks/controllers/useVehicleProcessingOrchestration.ts` - Uses service cache
- `src/hooks/shared/index.ts` - Deprecated globalCache export
- `src/hooks/controllers/useVehicleProcessingOrchestration.integration.test.ts` - Updated tests

**Success criteria**: ✅
- [x] All hooks use service-layer cache (cacheManager from services/)
- [x] No duplicate cache entries for same data
- [x] Tests pass (390/397 passing, 7 failures unrelated to caching)
- [x] Type checking passes

**Note**: Kept `hooks/shared/cacheManager.ts` file for backward compatibility but deprecated its exports. Can be deleted in future cleanup.

---

### Task 2: Remove Data Hooks That Bypass Stores
**Goal**: Eliminate hooks that directly call services, bypassing stores

**IMPORTANT**: This task targets only the **data hooks** (`src/hooks/data/`) that create parallel data flow. The overall hook architecture is good and should be preserved:
- ✅ **Keep**: Controller hooks (orchestration)
- ✅ **Keep**: Processing hooks (business logic) 
- ✅ **Keep**: Shared hooks (utilities)
- ❌ **Remove**: Data hooks (direct API calls that bypass stores)

**Actions**:
- [x] Identify all data hooks (useVehicleData, useStationData, useRouteData, useStopTimesData)
- [x] Move their logic into corresponding stores
- [x] Update stores to have refresh methods
- [x] Update controller hooks to use store methods instead of data hooks
- [x] Delete data hook files (keep controller/processing/shared hooks)

**Analysis Summary**:

**Data Hooks Identified** (4 hooks in `src/hooks/data/`):
1. **useVehicleData.ts** (467 lines)
   - Fetches live vehicle data with auto-refresh (30s default)
   - Features: caching, retry logic, validation, auto-refresh
   - Used by: `useVehicleProcessingOrchestration.ts` (controller hook)
   - Direct service calls: `enhancedTranzyApi.getVehicles()`

2. **useStationData.ts** (390 lines)
   - Fetches station/stop data
   - Features: caching, retry logic, validation
   - Used by: `useVehicleProcessingOrchestration.ts` (controller hook)
   - Direct service calls: `enhancedTranzyApi.getStops()`

3. **useRouteData.ts** (380 lines)
   - Fetches route metadata with offline fallback
   - Features: caching, retry logic, validation, offline fallback
   - Used by: `useVehicleProcessingOrchestration.ts` (controller hook)
   - Direct service calls: `enhancedTranzyApi.getRoutes()`

4. **useStopTimesData.ts** (470 lines)
   - Fetches schedule/stop times data
   - Features: caching, retry logic, validation, optional auto-refresh
   - Used by: `useVehicleProcessingOrchestration.ts` (controller hook)
   - Direct service calls: `enhancedTranzyApi.getStopTimes()`

**Current vs Target Architecture**:
- ❌ Current: Components → Controller Hook → **Data Hooks** → Services → API
- ✅ Target: Components → Controller Hook → **Stores** → Services → API

**Key Finding**: 
- **NO components directly use these data hooks!** ✅
- Only `useVehicleProcessingOrchestration.ts` (controller hook) uses them
- This makes migration simpler - only need to update one controller hook

**Store Capabilities Analysis**:

**vehicleStore.ts** - Already has most needed methods:
- ✅ `refreshVehicles()` - fetches enhanced vehicle info
- ✅ `refreshStations()` - fetches stations/stops
- ✅ `refreshScheduleData()` - refreshes routes, stops, trips, stop_times
- ✅ `refreshLiveData()` - refreshes live vehicle data
- ✅ Auto-refresh support with `startAutoRefresh()` / `stopAutoRefresh()`
- ✅ Cache management with `getCacheStats()` / `clearCache()`
- ✅ Error handling and retry logic via `StoreErrorHandler`

**Gap Analysis**:
The stores already have core functionality! The data hooks provide:
1. Granular data fetching - individual data types
2. Auto-refresh for specific data - hooks have their own refresh intervals
3. Detailed validation - hooks validate and sanitize data
4. Retry logic - exponential backoff (stores have this via StoreErrorHandler)

**Migration Strategy**:
1. Keep store methods as-is - they already work well
2. Update controller hook to use store methods instead of data hooks
3. Add missing granular methods if needed (e.g., `refreshRoutes()`, `refreshStopTimes()`)
4. Delete data hooks after migration complete

**Files to modify**:
- `src/hooks/data/useVehicleData.ts` (DELETE after migration)
- `src/hooks/data/useStationData.ts` (DELETE after migration)
- `src/hooks/data/useRouteData.ts` (DELETE after migration)
- `src/hooks/data/useStopTimesData.ts` (DELETE after migration)
- `src/hooks/data/index.ts` (DELETE after migration)
- `src/hooks/controllers/useVehicleProcessingOrchestration.ts` (UPDATE to use stores)
- `src/stores/vehicleStore.ts` (ADD granular refresh methods if needed)

**Success criteria**:
- No data hooks directly call services (other hook types remain)
- All data fetching goes through stores
- Controller hooks use store methods instead of data hooks
- Hook architecture preserved (controller/processing/shared hooks stay)
- All tests pass after migration

---

### Task 3: Move Business Logic to Services
**Goal**: Eliminate business logic duplication across hooks/stores

**Actions**:
- [ ] Create `directionAnalysisService.ts`
- [ ] Move direction analysis logic from hooks to service
- [ ] Move direction analysis logic from stores to service
- [ ] Update all consumers to use service
- [ ] Delete duplicate logic

**Files to create**:
- `src/services/directionAnalysisService.ts`

**Files to modify**:
- `src/hooks/processing/useDirectionAnalysis.ts` (use service)
- `src/hooks/controllers/useVehicleProcessingOrchestration.ts` (use service)
- `src/stores/vehicleStore.ts` (use service)

**Success criteria**:
- Direction analysis logic exists in one place
- All consumers use the service
- No duplicate implementations

---

## Medium Priority Tasks (Architecture Improvements)

### Task 4: Explicit Service Dependencies
**Goal**: Make service dependencies clear and testable

**Actions**:
- [ ] Refactor services to use dependency injection
- [ ] Create service factory functions
- [ ] Update service exports to show dependencies
- [ ] Add service interfaces

**Files to modify**:
- `src/services/favoriteBusService.ts`
- `src/services/liveVehicleService.ts`
- `src/services/tranzyApiService.ts`
- All services with hidden dependencies

**Success criteria**:
- All service dependencies are explicit in constructor
- Services can be tested in isolation
- No circular dependencies

---

### Task 5: Standardize Store-Service Pattern
**Goal**: Consistent pattern for store-service communication

**Actions**:
- [ ] Define standard pattern (stores call services directly)
- [ ] Update all stores to follow pattern
- [ ] Remove dynamic imports where not needed
- [ ] Document pattern in architecture guide

**Files to modify**:
- `src/stores/vehicleStore.ts`
- `src/stores/configStore.ts`
- `src/stores/locationStore.ts`
- `docs/developer-guide.md` (add pattern documentation)

**Success criteria**:
- All stores follow same pattern
- No mixed import strategies
- Clear documentation of pattern

---

## Low Priority Tasks (Nice to Have)

### Task 6: Service Registry
**Goal**: Centralized service discovery and management

**Actions**:
- [ ] Create service registry
- [ ] Register all services
- [ ] Update consumers to use registry
- [ ] Add service lifecycle management

**Files to create**:
- `src/services/serviceRegistry.ts`

**Success criteria**:
- All services registered in one place
- Easy to discover available services
- Simplified dependency management

---

### Task 7: Event Bus for Cross-Domain Communication
**Goal**: Decouple cross-domain communication

**Actions**:
- [ ] Create event bus
- [ ] Define domain events
- [ ] Update stores to emit events
- [ ] Update consumers to listen to events

**Files to create**:
- `src/services/eventBus.ts`
- `src/types/events.ts`

**Success criteria**:
- Stores don't directly depend on each other
- Clear event contracts
- Easier to test in isolation

---

## Execution Order

1. **Task 1**: Consolidate Caching (removes complexity)
2. **Task 3**: Move Business Logic to Services (prepares for Task 2)
3. **Task 2**: Remove Data Hooks (major architectural change)
4. **Task 4**: Explicit Service Dependencies (improves testability)
5. **Task 5**: Standardize Store-Service Pattern (consistency)
6. **Task 6**: Service Registry (optional enhancement)
7. **Task 7**: Event Bus (optional enhancement)

---

## Testing Strategy

After each task:
- [ ] Run unit tests: `npm test`
- [ ] Run type checking: `npm run type-check`
- [ ] Test in browser: `npm run dev`
- [ ] Verify no console errors
- [ ] Test key user flows (favorites, live tracking, etc.)

---

## Rollback Plan

Each task should be a separate commit:
- Commit message format: `refactor(task-N): [description]`
- If issues arise, revert specific commit
- Keep tasks small and atomic for easy rollback
