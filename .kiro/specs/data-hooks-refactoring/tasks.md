# Data Hooks to Store Migration - Implementation Tasks

## Phase 1: Enhance Stores to Replace Data Hooks

- [ ] 1. Add specific data fetching methods to vehicle store
  - Add `getStationData(options)` method to replace useStationData
  - Add `getVehicleData(options)` method to replace useVehicleData  
  - Add `getRouteData(options)` method to replace useRouteData
  - Add `getStopTimesData(options)` method to replace useStopTimesData
  - Ensure all methods support same options as current data hooks
  - _Requirements: 1.1, 3.1, 3.2_

- [ ] 2. Add store subscription helpers for reactive data access
  - Create `useVehicleStoreData()` hook for reactive vehicle data access
  - Create `useStationStoreData()` hook for reactive station data access
  - Create `useRouteStoreData()` hook for reactive route data access
  - Ensure hooks provide same interface as current data hooks
  - _Requirements: 2.1, 2.2_

- [ ]* 3. Write property test for store data consistency
  - **Property 1: Store Data Consistency**
  - **Validates: Requirements 3.4, 3.5**

- [ ]* 4. Write unit tests for enhanced store methods
  - Test new store methods with various options
  - Verify caching and error handling
  - Test reactive subscription hooks
  - _Requirements: 8.1, 8.3_

## Phase 2: Migrate Controller Hooks to Store-Based Architecture

- [ ] 5. Refactor useVehicleDisplay to use store methods instead of data hooks
  - Replace useStationData with vehicleStore.getStationData()
  - Replace useVehicleData with vehicleStore.getVehicleData()
  - Replace useRouteData with vehicleStore.getRouteData()
  - Use store subscriptions for reactive updates
  - Maintain exact same interface and functionality
  - _Requirements: 1.1, 2.1, 2.2_

- [ ]* 6. Write property test for store-based equivalence
  - **Property 2: Store Migration Equivalence**
  - **Validates: Requirements 4.1, 4.2**

- [ ]* 7. Write integration tests for migrated useVehicleDisplay
  - Test hook behavior with store-based data
  - Verify loading states and error handling
  - Test caching and refresh functionality
  - _Requirements: 8.1, 8.2_

- [ ] 8. Refactor useRouteManager to use store methods instead of data hooks
  - Replace useRouteData with vehicleStore.getRouteData()
  - Use configStore for favorites management (already partially done)
  - Ensure reactive updates through store subscriptions
  - Maintain all existing route management functionality
  - _Requirements: 1.1, 2.1, 2.3_

- [ ]* 9. Write integration tests for migrated useRouteManager
  - Test route filtering and selection
  - Verify favorites integration with config store
  - Test error scenarios and loading states
  - _Requirements: 8.2, 8.3_

- [ ] 10. Update useModernRefreshSystem to use store methods
  - Replace data hook calls with store refresh methods
  - Use store event system for coordination
  - Maintain all refresh functionality and timing
  - _Requirements: 1.2, 2.4_

- [ ] 11. Update useModernCacheManager to use store cache systems
  - Replace data hook cache operations with store cache methods
  - Use unified store cache statistics and management
  - Maintain all cache management functionality
  - _Requirements: 1.3, 3.3_

## Phase 3: Remove Data Hooks Entirely

- [ ] 12. Remove useVehicleData hook
  - Delete src/hooks/data/useVehicleData.ts (400+ lines)
  - Update all imports to use store methods instead
  - Ensure no remaining references in codebase
  - _Requirements: 1.1, 10.1, 10.2_

- [ ] 13. Remove useStationData hook
  - Delete src/hooks/data/useStationData.ts (300+ lines)
  - Update all imports to use store methods instead
  - Ensure no remaining references in codebase
  - _Requirements: 1.1, 10.1, 10.2_

- [ ] 14. Remove useRouteData hook
  - Delete src/hooks/data/useRouteData.ts (300+ lines)
  - Update all imports to use store methods instead
  - Ensure no remaining references in codebase
  - _Requirements: 1.1, 10.1, 10.2_

- [ ] 15. Remove useStopTimesData hook
  - Delete src/hooks/data/useStopTimesData.ts (400+ lines)
  - Update all imports to use store methods instead
  - Ensure no remaining references in codebase
  - _Requirements: 1.1, 10.1, 10.2_

- [ ] 16. Remove data hooks directory and exports
  - Delete entire src/hooks/data/ directory
  - Remove data hook exports from src/hooks/index.ts
  - Clean up any remaining imports or references
  - _Requirements: 10.1, 10.2_

- [ ]* 17. Verify all tests still pass after data hook removal
  - Run complete test suite
  - Ensure no broken imports or references
  - Update test mocks to use stores instead of data hooks
  - _Requirements: 8.1, 8.4, 10.5_

## Phase 4: Performance Optimization and Validation

- [ ] 18. Optimize store-based performance
  - Add intelligent memoization where needed
  - Implement request deduplication in stores
  - Optimize cache utilization across stores
  - _Requirements: 6.1, 6.2, 6.3_

- [ ]* 19. Write property test for composition idempotence
  - **Property 7: Composition Idempotence**
  - **Validates: Requirements 6.1, 6.2**

- [ ] 20. Benchmark performance improvements
  - Measure API call reduction
  - Track rendering performance improvements
  - Document memory usage optimizations
  - Compare before/after metrics
  - _Requirements: 10.2, 10.3_

## Phase 5: Documentation and Final Validation

- [x] 21. Update developer guide with store-based patterns
  - Document store-based patterns with examples
  - Update hook architecture section
  - Add migration guide with before/after examples
  - Remove references to data hooks
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 22. Update component documentation
  - Update all component examples to use store patterns
  - Add best practices for store-based architecture
  - Document when to use stores vs controller patterns
  - _Requirements: 9.4, 9.5_

- [ ] 23. Run comprehensive test suite validation
  - Execute all unit tests and ensure 100% pass rate
  - Run integration tests for all migrated components
  - Verify property-based tests pass consistently
  - _Requirements: 8.1, 8.4, 10.4_

- [ ]* 24. Write property test for error propagation
  - **Property 4: Error Propagation Preservation**
  - **Validates: Requirements 4.2, 4.4**

- [ ]* 25. Write property test for loading state consistency
  - **Property 5: Loading State Consistency**
  - **Validates: Requirements 4.2, 4.5**

- [ ] 26. End-to-end testing validation
  - Test complete user workflows with new architecture
  - Verify no regressions in user-facing functionality
  - Test error recovery and fallback behaviors
  - _Requirements: 8.4, 10.5_

- [ ] 27. Measure and document performance improvements
  - Compare API call counts before and after
  - Measure component render time improvements
  - Document memory usage reductions
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 28. Validate code reduction metrics
  - Confirm removal of 1,500+ lines of data hook code
  - Document complexity reduction metrics
  - Measure maintainability improvements
  - _Requirements: 10.1, 10.4_

- [ ] 29. Create migration completion report
  - Document all changes made during migration
  - Provide performance improvement metrics
  - Create lessons learned documentation
  - _Requirements: 10.4, 10.5_

- [ ] 30. Ensure all tests pass, ask the user if questions arise
  - Run complete test suite one final time
  - Verify all property-based tests pass
  - Confirm no regressions in functionality
  - _Requirements: 8.1, 8.4, 10.4, 10.5_

## Success Metrics

- ✅ Remove 1,000+ lines of complex orchestration code
- ✅ All existing tests pass without modification  
- ✅ No user-facing functionality regressions
- ✅ Performance improvements in API calls and rendering
- ✅ All components successfully migrated
- ✅ Comprehensive documentation updated
- ✅ Property-based tests validate correctness properties

## Current Status

**🔄 STORE MIGRATION STATUS:**

**✅ Previous Refactoring Completed:**
- ✅ **useVehicleProcessingOrchestration removed** - 1,113-line orchestration hook eliminated
- ✅ **useVehicleDisplay composition hook created** - Currently uses data hooks (needs migration)
- ✅ **StationDisplay migrated** - Already uses useNearbyViewController (store-based)
- ✅ **Store architecture implemented** - vehicleStore, configStore, locationStore ready

**❌ Current Architectural Problem:**
- ❌ **Data hooks still exist** - 1,500+ lines of duplicate API logic in src/hooks/data/
- ❌ **Mixed architecture** - Some controllers use stores, others use data hooks
- ❌ **Duplication** - Both data hooks AND stores handle API calls, caching, retry logic
- ❌ **Inconsistency** - useVehicleDisplay uses data hooks, useNearbyViewController uses stores

**🎯 Migration Goals:**
- 🎯 **Remove all data hooks** - Eliminate src/hooks/data/ directory entirely
- 🎯 **Store-only architecture** - All data operations through stores exclusively
- 🎯 **Update controllers** - useVehicleDisplay, useRouteManager to use stores
- 🎯 **Single source of truth** - No duplicate API calling logic

**📋 Next Steps:**
1. Enhance stores to handle all data hook scenarios
2. Migrate controller hooks to use stores instead of data hooks
3. Remove all data hooks entirely (1,500+ lines of duplicate code)
4. Update tests to mock stores instead of data hooks