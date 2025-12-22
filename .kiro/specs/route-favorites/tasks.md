# Implementation Plan: Route Favorites

## Overview

Implement a route favorites system that integrates with the existing route filtering architecture. The implementation follows the established patterns: Zustand store with persistence, route enhancement utilities, filter utilities, and Material-UI components.

## Tasks

- [x] 1. Create favorites store with localStorage persistence
  - Create `src/stores/favoritesStore.ts` with Zustand persist middleware
  - Implement Set-based storage for O(1) lookups
  - Add actions: addFavorite, removeFavorite, toggleFavorite, isFavorite, clearFavorites
  - Handle localStorage failures gracefully (fallback to in-memory state)
  - Transform Set↔Array for JSON serialization
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 5.5_

- [ ]* 1.1 Write property test for favorites localStorage round-trip
  - **Property 1: Favorites localStorage round-trip**
  - **Validates: Requirements 1.1, 1.3**

- [ ]* 1.2 Write property test for favorites store initialization
  - **Property 2: Favorites store initialization**
  - **Validates: Requirements 1.2**

- [ ]* 1.3 Write property test for favorites set behavior
  - **Property 3: Favorites set behavior**
  - **Validates: Requirements 1.4, 5.2**

- [ ]* 1.4 Write property test for graceful localStorage handling
  - **Property 12: Graceful localStorage initialization**
  - **Property 13: Graceful removal handling**
  - **Property 14: localStorage failure resilience**
  - **Validates: Requirements 5.1, 5.3, 5.5**

- [x] 2. Extend route enhancement to include favorites
  - Update `src/types/routeFilter.ts` to add `isFavorite` to EnhancedRoute interface
  - Modify `src/utils/route/routeEnhancementUtils.ts` enhanceRoute() to accept favorites set
  - Add `isFavorite` property based on route ID lookup in favorites set
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ]* 2.1 Write property test for route enhancement with favorites
  - **Property 4: Route enhancement with favorites**
  - **Validates: Requirements 2.1, 2.2**

- [ ]* 2.2 Write property test for enhancement preservation
  - **Property 5: Enhancement preservation**
  - **Validates: Requirements 2.3**

- [x] 3. Update useRouteFilter hook to integrate favorites
  - Modify `src/hooks/useRouteFilter.ts` to access favorites store
  - Pass favorites set to enhanceRoutes() function
  - Ensure memoization still works correctly with new dependency
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 4. Extend route filtering to support favorites filter
  - Update `src/types/routeFilter.ts` MetaFilters to add `favorites: boolean`
  - Update DEFAULT_FILTER_STATE to include `favorites: false`
  - Modify `src/utils/route/routeFilterUtils.ts` filterRoutes() to handle favorites filter
  - Implement favorites filter logic: when active, show only routes with isFavorite=true
  - Maintain AND logic with existing elevi and external filters
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 4.1 Write property test for favorites filter isolation
  - **Property 6: Favorites filter isolation**
  - **Validates: Requirements 3.1**

- [ ]* 4.2 Write property test for combined filter logic
  - **Property 7: Combined filter logic**
  - **Validates: Requirements 3.2**

- [ ]* 4.3 Write property test for empty favorites filter
  - **Property 8: Empty favorites filter**
  - **Validates: Requirements 3.3**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create HeartToggle component
  - Create `src/components/features/controls/HeartToggle.tsx`
  - Use Material-UI IconButton with Favorite and FavoriteBorder icons
  - Implement controlled component pattern (receives isFavorite, emits onToggle)
  - Add proper ARIA labels for accessibility
  - Support size prop ('small' | 'medium')
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 6.1 Write property test for heart toggle icon rendering
  - **Property 9: Heart toggle icon rendering**
  - **Validates: Requirements 4.2, 4.3**

- [ ]* 6.2 Write property test for heart toggle interaction
  - **Property 10: Heart toggle interaction**
  - **Validates: Requirements 4.4**

- [ ]* 6.3 Write property test for heart toggle reactivity
  - **Property 11: Heart toggle reactivity**
  - **Validates: Requirements 4.5**

- [x] 7. Integrate HeartToggle into RouteList component
  - Modify `src/components/features/lists/RouteList.tsx`
  - Add HeartToggle to the right side of each ListItem
  - Connect to favorites store (useFavoritesStore)
  - Wire up toggleFavorite action to HeartToggle onToggle
  - Pass route.isFavorite to HeartToggle component
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8. Add favorites filter to RouteFilterBar component
  - Modify `src/components/features/filters/RouteFilterBar.tsx`
  - Add favorites chip to META_FILTER_OPTIONS with Favorite icon
  - Update handleMetaFilterToggle to support favorites filter
  - Maintain exclusivity logic: activating one meta filter deactivates others
  - Position favorites chip with other meta filters (after divider)
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- The implementation follows existing patterns: clean stores, enhancement utilities, filter utilities, Material-UI components
