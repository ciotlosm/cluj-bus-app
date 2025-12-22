# Design Document

## Overview

The route favorites system extends the existing route filtering architecture to allow users to mark specific bus routes as favorites for quick access. The system integrates seamlessly with the current route enhancement and filtering pipeline, adding a new `favorite` property to routes and a new `favorites` filter alongside existing elevi and external filters.

The design follows the established patterns in the codebase:
- Clean Zustand stores with persistence
- Route enhancement utilities that add computed properties
- Filter utilities that apply logical constraints
- Material-UI components with consistent styling

## Architecture

### System Integration Points

The favorites system integrates with existing components:

1. **Route Enhancement Pipeline**: Extends `enhanceRoutes()` to add `favorite` property
2. **Route Filtering System**: Adds `favorites` filter to existing meta filters
3. **Route List UI**: Adds heart toggle controls to existing route items
4. **Filter Bar UI**: Adds favorites chip to existing filter chips

### Data Flow

```
Raw Routes (API) → Route Enhancement → Enhanced Routes → Route Filtering → Filtered Routes → UI Display
                        ↓                                      ↑
                  Favorites Store ←→ Local Storage      Filter State (includes favorites)
```

## Components and Interfaces

### Favorites Store

**Location**: `src/stores/favoritesStore.ts`

```typescript
interface FavoritesStore {
  // Core state
  favoriteRouteIds: Set<string>;
  
  // Actions
  addFavorite: (routeId: string) => void;
  removeFavorite: (routeId: string) => void;
  toggleFavorite: (routeId: string) => void;
  isFavorite: (routeId: string) => boolean;
  clearFavorites: () => void;
  
  // Utilities
  getFavoriteCount: () => number;
  getFavoriteRouteIds: () => string[];
}
```

**Key Design Decisions**:
- Uses `Set<string>` for O(1) lookup performance
- Persists to localStorage using Zustand persist middleware
- Follows existing store patterns (simple actions, no cross-dependencies)
- Graceful handling of localStorage failures (continues with in-memory state)

### Enhanced Route Interface Extension

**Location**: `src/types/routeFilter.ts`

```typescript
export interface EnhancedRoute extends TranzyRouteResponse {
  isFavorite: boolean; // NEW: Added by favorites enhancement
}
```

### Route Filter State Extension

**Location**: `src/types/routeFilter.ts`

```typescript
export interface MetaFilters {
  elevi: boolean;
  external: boolean;
  favorites: boolean; // NEW: Favorites filter toggle
}
```

### Heart Toggle Component

**Location**: `src/components/features/controls/HeartToggle.tsx`

```typescript
interface HeartToggleProps {
  routeId: string;
  isFavorite: boolean;
  onToggle: (routeId: string) => void;
  size?: 'small' | 'medium';
}
```

**Key Design Decisions**:
- Controlled component pattern (receives state, emits events)
- Uses Material-UI `IconButton` with `Favorite` and `FavoriteBorder` icons
- Consistent sizing with existing UI components
- Accessible with proper ARIA labels

## Data Models

### Favorites Persistence Model

**localStorage key**: `favorites-store`

```typescript
interface FavoritesPersistedState {
  favoriteRouteIds: string[]; // Array for JSON serialization
}
```

**Transformation Logic**:
- Store: `Set<string>` → Persist: `string[]`
- Load: `string[]` → Store: `Set<string>`
- Handles corrupted data gracefully (falls back to empty set)

### Route Enhancement Extension

The existing `enhanceRoute()` function will be extended:

```typescript
export function enhanceRoute(
  route: TranzyRouteResponse, 
  favoriteRouteIds: Set<string>
): EnhancedRoute {
  // NEW: Add favorite status
  const isFavorite = favoriteRouteIds.has(route.route_id);
  
  return {
    ...route,
    isFavorite
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Now I need to analyze the acceptance criteria to determine which ones can be tested as properties. Let me use the prework tool:
### Property Reflection

After analyzing the acceptance criteria, I identified several properties that can be consolidated:

**Redundancy Analysis:**
- Properties 4.2 and 4.3 (filled vs outlined heart icons) can be combined into one comprehensive property about correct icon rendering based on favorite status
- Properties 1.1 and 1.3 (add/remove persistence) can be combined into one round-trip property about localStorage synchronization
- Properties 2.1 and 2.2 (adding favorite property and checking store) can be combined into one property about correct favorite status assignment

**Final Properties (after consolidation):**

Property 1: Favorites localStorage round-trip
*For any* route ID, adding it to favorites then checking localStorage should show it persisted, and removing it should remove it from localStorage
**Validates: Requirements 1.1, 1.3**

Property 2: Favorites store initialization
*For any* set of route IDs in localStorage, initializing the store should load them correctly into the favorites set
**Validates: Requirements 1.2**

Property 3: Favorites set behavior
*For any* route ID, adding it multiple times should result in only one entry, and the store should provide O(1) lookup
**Validates: Requirements 1.4, 5.2**

Property 4: Route enhancement with favorites
*For any* collection of routes and favorites set, each enhanced route should have a favorite property that matches whether its ID exists in the favorites set
**Validates: Requirements 2.1, 2.2**

Property 5: Enhancement preservation
*For any* route with existing properties, adding favorite enhancement should preserve those properties unchanged
**Validates: Requirements 2.3**

Property 6: Favorites filter isolation
*For any* collection of routes with some marked as favorites, enabling only the favorites filter should return exactly the routes marked as favorites
**Validates: Requirements 3.1**

Property 7: Combined filter logic
*For any* collection of routes with various properties (elevi, external, favorite), applying multiple filters should return only routes that match ALL active filters
**Validates: Requirements 3.2**

Property 8: Empty favorites filter
*For any* collection of routes where none are marked as favorites, enabling the favorites filter should return an empty result set
**Validates: Requirements 3.3**

Property 9: Heart toggle icon rendering
*For any* favorite status (true/false), the HeartToggle component should render the correct icon (filled for true, outlined for false)
**Validates: Requirements 4.2, 4.3**

Property 10: Heart toggle interaction
*For any* route ID, clicking the HeartToggle should call the onToggle callback with that route ID
**Validates: Requirements 4.4**

Property 11: Heart toggle reactivity
*For any* change in isFavorite prop, the HeartToggle should update its rendered icon immediately
**Validates: Requirements 4.5**

Property 12: Graceful localStorage initialization
*For any* corrupted or missing localStorage data, the favorites store should initialize with an empty set and continue functioning
**Validates: Requirements 5.1**

Property 13: Graceful removal handling
*For any* route ID not in favorites, attempting to remove it should not cause errors and should leave the store unchanged
**Validates: Requirements 5.3**

Property 14: localStorage failure resilience
*For any* localStorage operation failure, the store should continue functioning with in-memory state
**Validates: Requirements 5.5**

## Error Handling

### Favorites Store Error Handling

**localStorage Failures**:
- Initialization: Falls back to empty Set if localStorage is corrupted or unavailable
- Persistence: Continues with in-memory state if localStorage writes fail
- Loading: Gracefully handles JSON parsing errors

**Invalid Data Handling**:
- Non-string route IDs: Converts to string or filters out invalid entries
- Duplicate additions: Set data structure naturally prevents duplicates
- Non-existent removals: No-op, doesn't throw errors

### Route Enhancement Error Handling

**Missing Dependencies**:
- If favorites store is unavailable: Defaults `isFavorite` to `false`
- If route ID is missing: Uses empty string as fallback

**Integration Errors**:
- Preserves existing enhancement logic even if favorites enhancement fails
- Maintains backward compatibility with existing enhanced route consumers

### UI Component Error Handling

**HeartToggle Component**:
- Missing props: Provides sensible defaults
- Callback errors: Prevents UI crashes, logs errors
- Icon loading failures: Falls back to text indicators

## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit tests for specific examples and edge cases with property-based tests for universal correctness guarantees:

**Unit Tests**:
- Specific examples of favorite operations (add, remove, toggle)
- Edge cases like empty route lists, corrupted localStorage
- Integration points between components
- UI component rendering with specific props

**Property-Based Tests**:
- Universal properties across all possible inputs using fast-check library
- Each property test runs minimum 100 iterations for comprehensive coverage
- Tests validate the correctness properties defined above

**Property Test Configuration**:
- Library: fast-check (already in project dependencies)
- Iterations: 100 minimum per property test
- Each test tagged with: **Feature: route-favorites, Property N: [property description]**
- Each property test references its corresponding design document property

**Test Organization**:
- Unit tests: Co-located with source files (`.test.ts` suffix)
- Property tests: Separate files for each major component (`.property.test.ts` suffix)
- Integration tests: Test cross-component interactions

**Coverage Requirements**:
- All correctness properties must have corresponding property-based tests
- All error handling paths must have unit tests
- All UI components must have rendering and interaction tests