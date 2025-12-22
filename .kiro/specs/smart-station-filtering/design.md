# Design Document

## Overview

The Smart Station Filtering system enhances the existing StationView component with intelligent location-based filtering, trip validation, and favorites-based filtering. The system finds the closest station with active bus service, then optionally includes a second nearby station if it meets proximity and service criteria. Additionally, when users have configured favorite routes, the system can filter stations to show only those serving the user's preferred routes. The design leverages existing location services, distance utilities, trip data, and the favorites store while maintaining the application's clean architecture patterns.

## Architecture

The system follows a layered architecture with clear separation of concerns:

1. **Presentation Layer**: Enhanced StationView component with filtering UI and favorites controls
2. **Hook Layer**: Custom `useSmartStationFilter` hook encapsulating filtering logic
3. **Service Layer**: Existing location, station, and trip services
4. **Data Layer**: Existing stores (location, station, trip, favorites) with no modifications needed

The design maintains the existing clean architecture by extending rather than modifying current services and stores.

## Components and Interfaces

### Core Hook Interface

```typescript
interface SmartStationFilterResult {
  filteredStations: FilteredStation[];
  loading: boolean;
  error: string | null;
  isFiltering: boolean;
  totalStations: number;
  toggleFiltering: () => void;
  retryFiltering: () => void;
  // Favorites filtering
  favoritesFilterEnabled: boolean;
  toggleFavoritesFilter: () => void;
  hasFavoriteRoutes: boolean;
}

interface FilteredStation {
  station: TranzyStopResponse;
  distance: number;
  hasActiveTrips: boolean;
  stationType: 'primary' | 'secondary' | 'other';
  matchesFavorites: boolean; // NEW: indicates if station serves favorite routes
  favoriteRouteCount: number; // NEW: number of favorite routes served
}

interface FilteringOptions {
  enableCaching?: boolean;
  requireTrips?: boolean;
  enableFavoritesFilter?: boolean; // NEW: control favorites filtering
}
```

### Enhanced StationView Component

The StationView component will be enhanced to:
- Use the `useSmartStationFilter` hook
- Display filtering status and controls
- Show distance and trip information
- Provide fallback to unfiltered view
- Display favorites filter toggle when user has favorite routes
- Show indicators for stations serving favorite routes

### Smart Station Filter Hook

The `useSmartStationFilter` hook will:
- Integrate with existing location, station, trip, and favorites stores
- Implement the core filtering algorithm including favorites filtering
- Manage caching for performance
- Handle error states and fallbacks
- Provide favorites filter controls when applicable

## Data Models

The filtering system will work with existing data models from the current stores:
- `TranzyStopResponse` from the station store
- `TranzyStopTimeResponse` from the trip store  
- `GeolocationPosition` from the location store
- `FavoritesStore` state from the favorites store (route IDs)

The hook will process this existing data without requiring new data models or caching layers. The favorites integration will use the existing route matching logic to determine if a station's active trips include any favorite routes.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Distance-based station sorting
*For any* user location and set of stations, when location is available, the filtered stations should be sorted by distance from closest to farthest
**Validates: Requirements 1.1**

### Property 2: Location change triggers re-sorting
*For any* significant location change, the station filter should re-sort all stations based on the new location
**Validates: Requirements 1.5**

### Property 3: Trip validation for all stations
*For any* set of stations being evaluated, each station should be checked for associated stop times during the filtering process
**Validates: Requirements 2.1**

### Property 4: Stations without trips are excluded
*For any* station that has no stop times, it should be excluded from the filtered results and processing should continue with the next closest station
**Validates: Requirements 2.2**

### Property 5: Trip validation for stations with stop times
*For any* station that has stop times, the system should validate that the trips are currently active
**Validates: Requirements 2.3**

### Property 6: Primary station selection
*For any* set of stations, the first station found with valid trips should be designated as the primary station
**Validates: Requirements 2.4**

### Property 7: Secondary station search radius
*For any* identified primary station, the system should search for additional stations within exactly 100 meters
**Validates: Requirements 3.1**

### Property 8: Secondary station trip validation
*For any* potential secondary station, it should be validated for active trips before inclusion
**Validates: Requirements 3.2**

### Property 9: Valid secondary station inclusion
*For any* valid secondary station found within the distance threshold, it should be included in the results
**Validates: Requirements 3.3**

### Property 10: Closest secondary station selection
*For any* set of multiple valid secondary stations, the system should select the one closest to the primary station
**Validates: Requirements 3.4**

### Property 11: Hook return value consistency
*For any* call to the station hook, it should return an object containing filtered stations, loading state, and error state
**Validates: Requirements 4.2**

### Property 12: Reactive recalculation
*For any* change in location or station data, the hook should automatically recalculate the filtered results
**Validates: Requirements 4.3**

### Property 13: Distance information display
*For any* filtered station displayed, the UI should include distance information from the user's location
**Validates: Requirements 5.2**

### Property 14: Primary station indication
*For any* primary station displayed, the UI should indicate it as the recommended closest option
**Validates: Requirements 5.3**

### Property 15: Secondary station proximity display
*For any* secondary station displayed, the UI should show proximity information relative to the primary station
**Validates: Requirements 5.4**

### Property 16: Distance calculation caching
*For any* repeated distance calculation between the same coordinates, the system should use cached results instead of recalculating
**Validates: Requirements 6.1**

### Property 17: Trip validation caching
*For any* repeated trip validation for the same station, the system should use cached stop time results
**Validates: Requirements 6.2**

### Property 18: Minimal location change cache usage
*For any* location change below the threshold, the system should use cached results instead of recalculating
**Validates: Requirements 6.3**

### Property 19: Cache invalidation on data updates
*For any* update to station data, the system should automatically invalidate relevant caches
**Validates: Requirements 6.4**

### Property 20: Station count accuracy
*For any* filtered result set, the UI should display accurate counts of stations found versus total available
**Validates: Requirements 8.2**

### Property 21: Distance display for all stations
*For any* station displayed with location data, the UI should show the distance from the user's location
**Validates: Requirements 8.3**

### Property 22: Trip validation status indication
*For any* station that has been validated for trips, the UI should indicate the verification status
**Validates: Requirements 8.5**

### Property 23: Favorites filter control visibility with favorites
*For any* user configuration with favorite routes, the favorites filter control should be displayed and enabled by default
**Validates: Requirements 9.1**

### Property 24: Favorites filter station inclusion
*For any* set of stations and favorite routes, when favorites filter is active, only stations whose active trips contain at least one favorite route should be included
**Validates: Requirements 9.2**

### Property 25: Complete trip evaluation for favorites
*For any* station being evaluated for favorites filtering, all active trips at that station should be checked against the user's favorite route list
**Validates: Requirements 9.3**

### Property 26: Non-matching station exclusion
*For any* station with active trips that don't match any favorite routes, that station should be excluded from results when favorites filter is active
**Validates: Requirements 9.4**

### Property 27: Favorites filter control visibility without favorites
*For any* user configuration with no favorite routes, the favorites filter control should not be displayed
**Validates: Requirements 9.5**

### Property 28: Favorites filter disabled behavior
*For any* filtering operation when favorites filter is disabled, only location and trip validation filters should be applied
**Validates: Requirements 9.6**

### Property 29: Combined filter logic with favorites
*For any* combination of active filters including favorites, all filters should be applied using logical AND operation
**Validates: Requirements 9.7**

## Error Handling

The system implements comprehensive error handling at multiple levels:

### Location Service Errors
- GPS unavailable: Fall back to unfiltered station display
- Location permission denied: Graceful degradation with user notification
- Low GPS accuracy: Continue filtering with confidence indicators

### Trip Validation Errors
- API failures: Use cached data when available, show warning for unverified stations
- Missing stop times: Skip stations without valid data, continue processing
- Validation timeouts: Implement retry logic with exponential backoff

### Distance Calculation Errors
- Invalid coordinates: Skip problematic stations, continue with others
- Calculation failures: Log errors, exclude affected stations from results
- Performance issues: Implement caching and batch processing

### UI Error States
- Loading states: Show progress indicators during filtering operations
- Error messages: Provide clear, actionable feedback to users
- Recovery options: Offer retry mechanisms and fallback to unfiltered view

### Favorites Integration Errors
- Favorites store unavailable: Disable favorites filtering gracefully, continue with other filters
- Route matching failures: Log errors but continue processing other stations
- Invalid favorite route data: Filter out invalid entries, continue with valid favorites
- Favorites filter toggle errors: Maintain current filter state, provide user feedback

## Testing Strategy

The testing approach combines unit tests for specific scenarios with property-based tests for comprehensive coverage:

### Unit Testing Focus
- **Specific examples**: Test known station configurations and expected results
- **Edge cases**: Handle empty station lists, single stations, no GPS scenarios
- **Error conditions**: Validate error handling for API failures and invalid data
- **Integration points**: Test hook integration with existing stores and services

### Property-Based Testing Focus
- **Universal properties**: Test filtering behavior across all possible inputs
- **Randomized testing**: Generate random station sets, locations, and trip data
- **Comprehensive coverage**: Validate properties hold for 100+ test iterations
- **Performance validation**: Ensure caching and optimization properties work correctly

### Testing Configuration
- **Minimum 100 iterations** per property test for thorough randomization
- **Property test tags**: Each test references its design document property
- **Tag format**: **Feature: smart-station-filtering, Property {number}: {property_text}**
- **Test library**: Use fast-check for property-based testing in TypeScript

### Test Data Generation
- **Smart generators**: Create realistic station distributions and GPS coordinates
- **Edge case inclusion**: Generate boundary conditions (exactly 100m, no trips, etc.)
- **Performance scenarios**: Test with large station datasets for caching validation
- **Error injection**: Simulate API failures and invalid data for resilience testing

The dual testing approach ensures both specific functionality works correctly and universal properties hold across all possible inputs, providing confidence in the system's reliability and correctness.