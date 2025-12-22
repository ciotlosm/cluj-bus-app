# Design Document: Route Multi-Filter

## Overview

The route multi-filter system enhances the existing RouteView with a chip-based filtering interface that allows users to filter routes by transport type (single selection) and meta-categories (toggle selection). The system uses enhanced route data with computed attributes and provides intuitive filter interactions with default exclusion of special route categories.

## Architecture

### Component Hierarchy
```
RouteView
├── RouteFilterBar (new)
│   ├── TransportTypeChips (new)
│   └── MetaFilterChips (new)
└── RouteList (existing, enhanced with filtering)
```

### Data Flow
```
RouteStore → useRouteFilter(routes, filterState) → Enhanced & Filtered Routes → RouteList
```

### State Management
- **RouteStore**: Maintains raw route data (existing)
- **Local Component State**: Filter selections managed in RouteView component
- **useRouteFilter**: Custom hook that handles route enhancement and filtering logic

## Components and Interfaces

### Enhanced Route Interface
```typescript
interface EnhancedRoute extends TranzyRouteResponse {
  isElevi: boolean;
  isExternal: boolean;
}

interface RouteFilterState {
  transportType: 'all' | 'bus' | 'tram' | 'trolleybus';
  metaFilters: {
    elevi: boolean;
    external: boolean;
  };
}
```

### RouteFilterBar Component
```typescript
interface RouteFilterBarProps {
  filterState: RouteFilterState;
  onFilterChange: (newState: RouteFilterState) => void;
  routeCount: number;
}
```

**Responsibilities:**
- Render transport type chips (single selection)
- Render meta filter chips (toggle selection)
- Display filtered route count
- Handle filter interaction logic through callbacks

### useRouteFilter Hook
```typescript
interface UseRouteFilterReturn {
  enhancedRoutes: EnhancedRoute[];
  filteredRoutes: EnhancedRoute[];
}

// Usage: const { filteredRoutes } = useRouteFilter(routes, filterState);
```

**Responsibilities:**
- Enhance raw routes with computed attributes (isElevi, isExternal)
- Apply filtering logic based on provided filter state
- Memoize expensive computations for performance
- Pure function approach - no internal state management

## Data Models

### Filter State Model
```typescript
const DEFAULT_FILTER_STATE: RouteFilterState = {
  transportType: 'all',
  metaFilters: {
    elevi: false,
    external: false
  }
};
```

### Route Enhancement Logic
```typescript
const enhanceRoute = (route: TranzyRouteResponse): EnhancedRoute => ({
  ...route,
  isElevi: route.route_short_name.startsWith('TE') || 
           route.route_desc.startsWith('TE'),
  isExternal: route.route_short_name.startsWith('M')
});
```

### Filtering Logic
```typescript
// Simple utility function approach
const enhanceRoutes = (routes: TranzyRouteResponse[]): EnhancedRoute[] => {
  return routes.map(route => ({
    ...route,
    isElevi: route.route_short_name.startsWith('TE') || 
             route.route_desc.startsWith('TE'),
    isExternal: route.route_short_name.startsWith('M')
  }));
};

const filterRoutes = (
  routes: EnhancedRoute[], 
  filterState: RouteFilterState
): EnhancedRoute[] => {
  return routes.filter(route => {
    // Step 1: Apply meta filter constraints
    const { elevi, external } = filterState.metaFilters;
    
    if (elevi && !route.isElevi) return false;
    if (external && !route.isExternal) return false;
    
    // Step 2: If no meta filters active, exclude special routes
    if (!elevi && !external) {
      if (route.isElevi || route.isExternal) return false;
    }
    
    // Step 3: Apply transport type filter
    if (filterState.transportType !== 'all') {
      const typeMap = { bus: 3, tram: 0, trolleybus: 11 };
      if (route.route_type !== typeMap[filterState.transportType]) {
        return false;
      }
    }
    
    return true;
  });
};

// Hook implementation
const useRouteFilter = (routes: TranzyRouteResponse[], filterState: RouteFilterState) => {
  const enhancedRoutes = useMemo(() => enhanceRoutes(routes), [routes]);
  const filteredRoutes = useMemo(() => 
    filterRoutes(enhancedRoutes, filterState), 
    [enhancedRoutes, filterState]
  );
  
  return { enhancedRoutes, filteredRoutes };
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

<function_calls>
<invoke name="prework">
<parameter name="featureName">route-multi-filter

### Property Reflection

After reviewing the prework analysis, I identified several properties that can be consolidated:
- Properties 1.1 and 1.3 (enhancement consistency) can be combined into one comprehensive property
- Properties 1.2 and 1.4 (specific enhancement rules) can be combined into one property
- Properties 2.4, 2.5, 2.6 (transport type filtering) can be combined into one property
- Properties 3.3 and 3.4 (meta filter logic) can be combined into one property

### Correctness Properties

Property 1: Route Enhancement Consistency
*For any* route data, the enhancement process should consistently compute isElevi and isExternal attributes based on the defined naming patterns
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

Property 2: Transport Type Filtering
*For any* transport type selection (bus, tram, trolleybus), the filtered results should contain only routes matching that specific route_type value
**Validates: Requirements 2.4, 2.5, 2.6**

Property 3: Meta Filter Exclusivity
*For any* meta filter activation, only one meta filter should be active at a time and the transport type should reset to "All"
**Validates: Requirements 4.1, 4.2**

Property 4: Default Special Route Exclusion
*For any* route dataset when no meta filters are active, routes with isElevi=true OR isExternal=true should be excluded from results
**Validates: Requirements 5.2, 5.5**

Property 5: Combined Filter Logic
*For any* combination of active transport type and meta filters, the results should match both constraints using AND logic
**Validates: Requirements 5.1**

Property 6: Single Transport Type Selection
*For any* transport type filter interaction, only one transport type option should be selectable at a time
**Validates: Requirements 2.2**

Property 7: Meta Filter Constraint Application
*For any* active meta filter (elevi or external), only routes matching that specific meta attribute should be included
**Validates: Requirements 3.3, 3.4**

Property 8: Enhancement Performance
*For any* route data load, the enhancement computation should occur exactly once per route
**Validates: Requirements 8.5**

## Error Handling

### Filter State Validation
- Validate filter state structure before applying filters
- Handle invalid transport type selections gracefully
- Ensure meta filter boolean values are properly typed

### Route Data Validation
- Handle missing or null route_short_name and route_desc fields
- Validate route_type values against expected GTFS standards
- Gracefully handle malformed route data during enhancement

### Performance Error Handling
- Implement timeout protection for large dataset filtering
- Handle memory constraints for very large route collections
- Provide fallback behavior if enhancement computation fails

## Testing Strategy

### Dual Testing Approach
The system will use both unit tests and property-based tests for comprehensive coverage:

**Unit Tests:**
- Specific examples of filter interactions
- Edge cases (empty datasets, malformed data)
- Component rendering and user interactions
- Integration between RouteView and filter components

**Property-Based Tests:**
- Universal properties across all route data combinations
- Filter logic validation with generated test data
- Performance characteristics with varying dataset sizes
- Each property test will run minimum 100 iterations

### Property Test Configuration
Using **fast-check** library for property-based testing:
- Minimum 100 iterations per property test
- Custom generators for route data and filter states
- Each test tagged with: **Feature: route-multi-filter, Property {number}: {property_text}**

### Test Organization
- Co-located test files: `useRouteFilter.test.ts`, `RouteFilterBar.test.tsx`
- Property tests: `routeFilter.property.test.ts`
- Integration tests: `RouteView.integration.test.tsx`

### Performance Testing
- Filter response time validation (target: <100ms)
- Memory usage monitoring for large datasets
- Component re-render optimization verification