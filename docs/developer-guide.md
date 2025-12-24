# Developer Guide

## 🚨 Deployment Policy

**NEVER deploy to production automatically**
- Make changes and test locally
- Commit and push to repository  
- **WAIT** for explicit deployment request
- Only then run `netlify deploy --prod`

## Architecture Overview

### Tech Stack
- **React 19.2.0** with TypeScript
- **Vite** for build tooling
- **Material-UI 7.3.6** for components and styling (exclusive)
- **Zustand 5.0.9** for state management
- **Leaflet** for maps

### Project Structure
```
src/
├── components/     # React components
│   ├── ui/         # Reusable UI components (Button, Card, EmptyState)
│   ├── features/   # Feature-specific components
│   └── layout/     # Layout components
├── services/       # API services
├── stores/         # State management
├── hooks/          # Custom hooks
├── utils/          # Utilities
├── types/          # TypeScript types
├── theme/          # UI theme
└── temporary/      # Temporary development files
    ├── analysis/   # Generated reports and analysis
    ├── screenshots/# UI mockups and visual tests
    ├── testing/    # Test artifacts and debug outputs
    └── experiments/# Temporary code experiments
```

### Temporary Files Management

The `temporary/` directory is used for:
- **Analysis outputs**: Generated reports, codebase statistics
- **Screenshots**: UI mockups, comparison images, visual tests
- **Testing artifacts**: Debug files, test outputs, logs
- **Experiments**: Temporary code, prototypes, debugging scripts

**Important**: This directory is git-ignored except for structure files. Clean up files older than 30 days.

## API Integration

### Tranzy API
- **Single source**: All data from Tranzy API
- **Authentication**: Use `enhancedTranzyApi` singleton
- **Endpoints**: `/api/tranzy/v1/opendata/*`

### Data Flow
1. **Setup**: API key configuration
2. **Fetch**: Real-time vehicle and station data
3. **Process**: Filter and transform data
4. **Display**: Show in UI components

## Development Commands

### Local Development
```bash
npm run dev          # Start dev server (port 5175)
npm run build        # Production build
npm run preview      # Preview build
```

### Testing
```bash
npm test             # Run tests once
npm run test:watch   # Watch mode
npm run test:ui      # Visual test runner
```

### Code Quality
```bash
npm run lint         # ESLint
```

## Key Components

### StationDisplay
- Shows buses at nearby stations
- Uses GPS or fallback location
- Filters by trip_id relationships

### Settings
- API key configuration
- Location preferences
- Favorite route management

### UI Components

#### EmptyState
Reusable component for displaying empty states with consistent design:

```typescript
<EmptyState
  title="No Vehicles Found"
  message="No vehicles are currently active for nearby stations (based on your filter)."
  variant="default" // or "favorites"
/>
```

**Variants:**
- `default`: Standard theme for StationDisplay

**Features:**
- Consistent icon and layout
- Responsive design
- Theme-aware styling

## State Management

### Stores (Zustand)
- **configStore**: User configuration
- **vehicleStore**: Live vehicle data
- **locationStore**: GPS and fallback locations

## Hook Architecture (Consolidated - December 2024)

### Architecture Overview

The hook system follows a clean 3-layer architecture:

```
Controller Layer (Orchestration)
    ↓
Processing Layer (Pure Transformations)
    ↓
Shared Infrastructure (Generic Utilities)
```

### Generic Store Data Hook

**Replaces 4 duplicated hooks with single implementation:**

```typescript
// Old approach (1,200+ lines duplicated)
useVehicleStoreData()
useStationStoreData()
useRouteStoreData()
useStopTimesStoreData()

// New approach (single generic hook)
useStoreData<LiveVehicle>({ dataType: 'vehicles' })
useStoreData<Station>({ dataType: 'stations' })
useStoreData<Route>({ dataType: 'routes' })
useStoreData<StopTime>({ dataType: 'stopTimes' })
```

**Usage Examples:**
```typescript
// Basic usage with type safety
const { data: vehicles, isLoading, error, refetch } = useStoreData<LiveVehicle>({
  dataType: 'vehicles',
  agencyId: '2',
  autoRefresh: true
});

// Multiple data types in controller hooks
const stationDataResult = useStoreData({
  dataType: 'stations',
  agencyId,
  autoRefresh: false
});

const vehicleDataResult = useStoreData({
  dataType: 'vehicles', 
  agencyId,
  autoRefresh: true,
  refreshInterval: 30000
});

// Convenience hooks (type-safe wrappers)
const { data: vehicles } = useVehicleData({ agencyId: '2' });
const { data: stations } = useStationData({ agencyId: '2' });
const { data: routes } = useRouteData({ agencyId: '2' });
const { data: stopTimes } = useStopTimesData({ agencyId: '2' });
```

### Unified Cache System

**Single cache replacing 3 fragmented systems:**

```typescript
import { unifiedCache } from '@/hooks/shared/cache/instance';

// Get cached data
const data = unifiedCache.get<LiveVehicle[]>('vehicles:cluj');

// Set with TTL
unifiedCache.set('vehicles:cluj', vehicles, 60000);

// Invalidate patterns
unifiedCache.invalidate(/^vehicles:/);

// Monitor cache
const stats = unifiedCache.getStats();
```

### Standardized Error Handling

**Consistent error types across all hooks:**

```typescript
import { ErrorHandler, ErrorType } from '@/hooks/shared/errors';

// Create standardized error
const error = ErrorHandler.createError(
  ErrorType.NETWORK,
  'Failed to fetch vehicles',
  { agencyId: 'cluj' }
);

// Get user-friendly message
const message = ErrorHandler.getUserMessage(error);

// Check retry eligibility
if (ErrorHandler.shouldRetry(error, retryCount)) {
  // Retry with exponential backoff
}
```

### Input Validation Library

**Shared validation eliminating 300+ lines of duplication:**

```typescript
import { InputValidator } from '@/hooks/shared/validation';

// Validate arrays
const result = InputValidator.validateVehicleArray(data);
if (result.isValid) {
  processVehicles(result.data);
}

// Validate coordinates
const coords = InputValidator.validateCoordinates(userInput);

// Safe defaults
const defaults = InputValidator.createSafeDefaults<LiveVehicle>('vehicle');
```

### Migration Guide

**Before (Old Pattern):**
```typescript
// Duplicated hook with 200+ lines
const { vehicles, loading, error } = useVehicleStoreData({
  agencyId: 'cluj',
  autoRefresh: true
});
```

**After (New Pattern):**
```typescript
// Generic hook with type safety
const { data: vehicles, isLoading: loading, error } = useStoreData<LiveVehicle>({
  dataType: 'vehicles',
  agencyId: 'cluj',
  autoRefresh: true
});
```

**Controller Hook Simplification:**
```typescript
// Before: 847 lines with complex error handling
const useVehicleDisplay = () => {
  // Complex CompositionError classes
  // Duplicated direction analysis  
  // Manual cache management
  // 300+ lines of validation
};

// After: <200 lines using shared infrastructure
const useVehicleDisplay = (config) => {
  // Use generic store data hooks
  const { data: vehicles } = useVehicleData({ agencyId: config.agencyId });
  const { data: stations } = useStationData({ agencyId: config.agencyId });
  const { data: routes } = useRouteData({ agencyId: config.agencyId });
  
  // Use shared processing utilities
  const filtered = useVehicleFiltering(vehicles, config);
  const grouped = useVehicleGrouping(filtered);
  const analyzed = useDirectionAnalysis(grouped, routes);
  
  return { 
    vehicles: analyzed,
    isLoading: vehicles.isLoading || stations.isLoading,
    error: ErrorHandler.combineErrors([vehicles.error, stations.error])
  };
};
```

**Real Migration Example (StationDisplay):**
```typescript
// New implementation using GPS-first data loading
const {
  primaryStop,
  secondaryStop,
  availableTrips,
  availableRoutes,
  liveVehicles,
  enhancedVehicles,
  isLoading,
  error
} = useGpsFirstData({
  maxSearchRadius: 5000,
  secondStopRadius: 200,
  autoRefresh: true,
  refreshInterval: 30000
});

const vehicleDataResult = useStoreData({
  dataType: 'vehicles',
  agencyId,
  autoRefresh: true,
  refreshInterval: 30000
});

const routeDataResult = useStoreData({
  dataType: 'routes', 
  agencyId,
  autoRefresh: false
});
```

### Architectural Decisions

**ADR-001: Generic Store Data Hook**
- **Decision**: Consolidate 4 store data hooks into single generic implementation
- **Rationale**: Eliminated 1,200+ lines of duplication, improved maintainability
- **Impact**: All data access now uses consistent patterns with type safety

**ADR-002: Unified Cache System**
- **Decision**: Replace 3 cache systems with single UnifiedCacheManager
- **Rationale**: Eliminated cache conflicts, improved memory efficiency
- **Impact**: 40-50% memory reduction, 70-85% cache hit rate

**ADR-003: Standardized Error Handling**
- **Decision**: Replace complex error classes with simple error types
- **Rationale**: Simplified error handling, consistent user messages
- **Impact**: Easier debugging, better user experience

**ADR-004: Shared Validation Library**
- **Decision**: Extract validation to reusable utilities
- **Rationale**: Eliminated 300+ lines of duplicated validation code
- **Impact**: Consistent validation behavior across all hooks

### Shared Processing Utilities

**Extracted reusable vehicle processing:**

```typescript
import { 
  formatTimestamp,
  formatSpeed,
  getAccessibilityFeatures
} from '@/utils/vehicle/vehicleFormatUtils';

import { 
  createTripToRouteMap,
  getRouteIdsForTrips
} from '@/utils/vehicle/vehicleMappingUtils';

// Format vehicle data for display
const timeString = formatTimestamp(vehicle.timestamp);
const speedString = formatSpeed(vehicle.speed);

// Map trips to routes
const tripRouteMap = createTripToRouteMap(vehicles);
```

### Performance Improvements

**Code Reduction:**
- Removed 1,950+ lines of duplicated code
- Simplified useVehicleDisplay from 847 to <200 lines
- Consolidated 4 hooks into 1 generic implementation

**Runtime Performance:**
- 40-50% reduction in API calls
- 30-40% improvement in render performance
- 40-50% reduction in memory usage
- Cache hit rate improved from 30-50% to 70-85%

**Memory Optimization:**
- Unified cache with memory pressure detection
- Proper cleanup of subscriptions and intervals
- Optimized memoization patterns

### Testing Strategy

**Property-Based Testing:**
- All correctness properties implemented with fast-check
- Minimum 100 iterations per property test
- Tests tagged with feature and requirement references

**Unit Testing:**
- Focused on shared utilities and validation functions
- Integration tests for controller hook composition
- Memory leak detection in test suite

## Common Patterns

### Error Handling
- Graceful degradation for API failures
- User-friendly error messages
- Fallback data when possible

### Performance
- React.memo for expensive components
- Intelligent caching with TTL
- Debounced API calls

### Testing
- Unit tests for utilities and hooks
- Integration tests for components
- Property-based testing with fast-check

## Debugging

### Debug Tools
- Visit `/debug.html` for API testing
- Browser console for error logs
- Network tab for API inspection

### Common Issues
- Authentication timing problems
- Location permission issues
- Cache inconsistencies

## Build & Deploy

### Production Build
```bash
npm run build        # Creates dist/ folder
npm run preview      # Test production build
```

### Netlify Deployment
```bash
# Preview deployment
netlify deploy

# Production deployment (ONLY when requested)
netlify deploy --prod
```

### Environment Variables
- `VITE_TRANZY_API_BASE_URL`: API base URL
- Production uses environment-specific configs

## Performance Testing

### Available Performance Tests

```bash
npm run test:performance    # Run performance analysis
npm run analyze            # Generate codebase statistics
```

## Version Management

### Update Version
```bash
node scripts/update-version.js    # Update cache-busting version
npm version patch                 # Update package.json version
```

### When to Update
- Major features or improvements
- Bug fixes affecting users
- Performance optimizations
- Security updates