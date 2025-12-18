# Cluj Bus App - Developer Guide

## 🚨 **CRITICAL: Deployment Policy**

### **NEVER Deploy to Production Automatically**

**❌ FORBIDDEN**: `netlify deploy --prod` without explicit request  
**✅ REQUIRED**: Wait for specific "deploy to prod" instruction

#### Workflow:
1. Make changes and test locally (`npm run build`)
2. Commit and push to repository (`git commit && git push`)
3. **STOP** - Do not deploy to production
4. Wait for explicit deployment request
5. Only then run `netlify deploy --prod`

This ensures all changes are reviewed before going live to users.

---

## 🏗️ Architecture Overview

### Tech Stack
- **React 19.2.0** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **Material-UI 7.3.6** for component library
- **Zustand 5.0.9** for lightweight state management
- **Tailwind CSS 4.1.18** for utility-first styling
- **Leaflet + React-Leaflet** for map functionality

### Project Structure
```
src/
├── components/          # React components
│   ├── features/       # Business logic components
│   ├── ui/             # Reusable UI components
│   └── layout/         # Layout components
├── services/           # API services and business logic
├── stores/             # Zustand state management
├── hooks/              # Custom React hooks (modern data architecture)
├── utils/              # Pure utility functions
├── types/              # TypeScript definitions
└── theme/              # Material-UI theme
```

### Modern Data Architecture (December 2024)

**API Service Architecture**:
- **Single Source of Truth**: All components must use `enhancedTranzyApi` singleton instance
- **Unified Authentication**: API key set once on singleton, shared across entire app

**State Management Architecture**:
- **Zustand Stores**: Lightweight, TypeScript-first state management
- **4-Store System**: Clean, focused stores with single responsibilities
- **Event-Based Communication**: Stores communicate via events, not direct calls
- **No Legacy Code**: Clean implementation without backward compatibility concerns

#### Store Architecture (Clean 4-Store System)

**Core Stores**:
- `configStore`: User configuration, theme, and agency management
- `vehicleStore`: All vehicle/bus data (live, scheduled, enhanced) + offline functionality
- `locationStore`: GPS and geolocation management (existing, well-designed)
- `favoritesStore`: Simple user favorites management

**Shared Utilities**:
- `storeEvents`: Type-safe event system for store communication
- `autoRefresh`: Unified auto-refresh manager
- `errorHandler`: Standardized error handling
- `cacheManager`: Unified cache management

#### Store Responsibilities

**ConfigStore**:
- User configuration (API keys, locations, settings)
- Theme management (light/dark mode with system detection)
- Agency management (fetching, validation, caching)
- Encrypted storage for sensitive data

**VehicleStore**:
- All vehicle data (live, scheduled, enhanced)
- Station information
- Cache and offline management
- Auto-refresh coordination
- Error handling for data operations

**LocationStore** (Keep Existing):
- GPS and geolocation services
- Permission management
- Distance calculations
- Location watching and validation

**FavoritesStore**:
- Simple favorite routes and stations
- User preference persistence
- Event-based reactivity to config/vehicle changes

**Usage Example**:
```typescript
// Clean, simple store usage
const { config, theme, setTheme } = useConfigStore();
const { vehicles, refreshVehicles, isLoading } = useVehicleStore();
const { currentLocation, requestLocation } = useLocationStore();
const { favoriteRoutes, addFavoriteRoute } = useFavoritesStore();

// Event-based communication
StoreEventManager.emit(StoreEvents.CONFIG_CHANGED, { 
  config: newConfig, 
  changes: updates 
});
```
- **Pattern-Based Usage**: Use singleton for data operations, factory for validation

**Individual Data Hooks** (Recommended):
- `useStationData` - Station/stop data with intelligent caching
- `useVehicleData` - Live vehicle positions with auto-refresh
- `useRouteData` - Route information with caching
- `useStopTimesData` - Schedule data with GTFS integration

**Critical Patterns**:
```typescript
// ✅ CORRECT - Use singleton for data operations (has API key)
import { enhancedTranzyApi } from '../../services/tranzyApiService';
const agencies = await enhancedTranzyApi.getAgencies();

// ✅ CORRECT - Use factory for API key validation (testing new keys)
import { tranzyApiService } from '../../services/tranzyApiService';
const testService = tranzyApiService();
testService.setApiKey(newApiKey);
const isValid = await testService.validateApiKey(newApiKey);

// ❌ WRONG - Factory for data operations (no API key)
const apiService = tranzyApiService();
const agencies = await apiService.getAgencies(); // Will fail
```
- `useRouteData` - Route information with caching
- `useStopTimesData` - GTFS schedule data with caching
- `useModernRefreshSystem` - Centralized refresh control

**Benefits**:
- ✅ Single source of truth for each data type
- ✅ Focused, efficient caching per data type
- ✅ No duplicate API calls
- ✅ Clear separation of concerns
- ✅ Better performance and maintainability

**Usage Example**:
```typescript
const { data: stations, isLoading, refresh } = useStationData({
  agencyId: config.agencyId,
  forceRefresh: false,
  cacheMaxAge: 60000 // 1 minute
});
```

## 🔌 API Integration

### Data Sources (Priority Order)
1. **🔴 Live Vehicle Data** - Real-time GPS from Tranzy API
2. **📋 Official CTP Cluj Schedules** - Runtime fetched from ctpcj.ro
3. **⏱️ API Fallback Data** - Tranzy schedule data when available

### Proxy Configuration
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api/tranzy': {
        target: 'https://api.tranzy.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tranzy/, ''),
      },
      '/api/ctp-cluj': {
        target: 'https://ctpcj.ro',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ctp-cluj/, ''),
      },
    },
  },
});
```

### Route Mapping
**Critical**: Route IDs vs Route Labels
- **Tranzy API Route ID**: "40"
- **CTP Cluj Route Label**: "42"
- **User sees**: Route 42
- **Code uses**: ID 40 for API calls, Label 42 for CTP Cluj schedules

## 🪝 Hook Architecture

### Layered Hook System (December 2024 Refactoring)

The app uses a three-layer hook architecture that replaced the original monolithic `useVehicleProcessing` hook (829 lines) with focused, composable hooks:

```
┌─────────────────────────────────────────────────────────┐
│                 Orchestration Layer                     │
│  useVehicleProcessing() - Coordinates all sub-hooks    │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                 Processing Layer                        │
│  useVehicleFiltering()    useVehicleGrouping()         │
│  useDirectionAnalysis()   useProximityCalculation()    │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                   Data Layer                            │
│  useStationData()    useVehicleData()                  │
│  useRouteData()      useStopTimesData()                │
└─────────────────────────────────────────────────────────┘
```

#### Data Layer Hooks
Focused hooks for API data fetching with caching and error handling:

```typescript
// Station data with caching
const { data: stations, isLoading, error, refetch } = useStationData({
  agencyId: '123',
  cacheMaxAge: 5 * 60 * 1000, // 5 minutes
  forceRefresh: false
});

// Live vehicle data with auto-refresh
const { data: vehicles } = useVehicleData({
  agencyId: '123',
  autoRefresh: true,
  refreshInterval: 30 * 1000 // 30 seconds
});
```

#### Processing Layer Hooks
Pure business logic hooks that transform data without side effects:

```typescript
// Filter vehicles by criteria
const { filteredVehicles, filterStats } = useVehicleFiltering(vehicles, {
  filterByFavorites: true,
  favoriteRoutes: ['42', '24'],
  maxSearchRadius: 5000,
  userLocation: currentLocation
});

// Group vehicles by stations
const { stationGroups, groupingStats } = useVehicleGrouping(
  filteredVehicles,
  stations,
  userLocation,
  { maxStations: 2, proximityThreshold: 200 }
);
```

#### Orchestration Layer Hook
Coordinates all sub-hooks while maintaining backward compatibility:

```typescript
// Main hook with exact API compatibility
const {
  stationVehicleGroups,
  isLoading,
  effectiveLocationForDisplay,
  favoriteRoutes,
  allStations,
  vehicles,
  error
} = useVehicleProcessing({
  filterByFavorites: true,
  maxStations: 2,
  maxVehiclesPerStation: 5,
  showAllVehiclesPerRoute: false
});
```

#### Migration Support
Gradual migration with feature flags:

```typescript
// Migration wrapper with automatic switching
const result = useVehicleProcessingMigrated(options, 'ComponentName');

// Monitor migration status
const migrationStatus = useVehicleProcessingMigrationStatus('ComponentName');
```

#### Benefits Achieved
- **Code Reduction**: 829-line hook → focused sub-hooks
- **Testability**: Each hook can be tested independently
- **Reusability**: Hooks can be composed in different ways
- **Performance**: Selective re-execution and focused caching
- **Maintainability**: Single responsibility per hook

#### Documentation
- **[Hook Architecture Guide](hook-architecture-guide.md)**: Comprehensive architecture overview
- **[Hook Examples](hook-examples.md)**: Practical usage examples
- **[Migration Guide](hook-migration-guide.md)**: Best practices for future migrations

### ⚠️ **CRITICAL: Data Hooks Architecture Review (December 2024)**

**Executive Summary**: The `useVehicleProcessingOrchestration` hook requires immediate rethinking due to over-engineering and architectural issues.

#### **Current Status Analysis**

**❌ useVehicleProcessingOrchestration Hook - NEEDS REMOVAL**
- **1,113 lines** of complex orchestration logic
- **Duplicates functionality** already handled by data hooks
- **Mixed concerns**: Inline direction analysis, error handling, business logic
- **Dual orchestration paths**: Both nearby view AND legacy processing
- **Performance overhead**: Complex memoization and dependency tracking

**✅ Data Layer Hooks - EXCELLENT**
- `useStationData`, `useVehicleData`, `useRouteData`, `useStopTimesData`
- Clean error handling with exponential backoff retry
- Proper caching with configurable TTL
- Auto-refresh capabilities for live data
- Comprehensive validation and sanitization

**✅ Processing Layer Hooks - SOLID**
- `useVehicleFiltering`, `useVehicleGrouping`, `useDirectionAnalysis`
- Pure functions with clear inputs/outputs
- Comprehensive validation and statistics
- Good performance with memoization

**✅ useNearbyViewController - WELL ARCHITECTED**
- Clean integration with data hooks
- Proper error handling with context
- Configurable options and stability tracking

#### **Immediate Action Required**

**Replace orchestration hook with simple composition:**

```typescript
// REMOVE: useVehicleProcessingOrchestration (1,113 lines)
// REPLACE WITH: Simple composition (50 lines)
export const useVehicleDisplay = (options) => {
  const stations = useStationData({ agencyId: options.agencyId });
  const vehicles = useVehicleData({ agencyId: options.agencyId, autoRefresh: true });
  
  const filtered = useVehicleFiltering(vehicles.data || [], options);
  const grouped = useVehicleGrouping(filtered.filteredVehicles, stations.data || [], options.userLocation);
  
  return {
    stationVehicleGroups: grouped.stationGroups,
    isLoading: stations.isLoading || vehicles.isLoading,
    error: stations.error || vehicles.error
  };
};
```

**Benefits**: Remove 1,000+ lines of complex code, eliminate duplicate processing, improve maintainability.

**Migration Strategy**: Replace component by component, add deprecation warnings, preserve functionality.

## 🏪 State Management

### Zustand Stores

#### Enhanced Bus Store (`src/stores/enhancedBusStore.ts`)
```typescript
interface EnhancedBusStore {
  routes: Route[];
  vehicles: Vehicle[];
  schedules: Schedule[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchRoutes: () => Promise<void>;
  fetchVehicles: (routeId: string) => Promise<void>;
  fetchSchedules: (routeId: string) => Promise<void>;
}
```

#### Config Store (`src/stores/configStore.ts`)
```typescript
interface ConfigStore {
  apiKey: string;
  homeLocation: Location | null;
  workLocation: Location | null;
  favoriteRoutes: string[];
  
  // Actions
  setApiKey: (key: string) => void;
  addFavoriteRoute: (routeId: string) => void;
}
```

## 🧙‍♂️ Setup Flow

### Initial Setup Wizard (`src/components/features/Setup/SetupWizard.tsx`)
Two-step wizard for first-time configuration:

```typescript
// Step 1: API Key validation
const validateApiKey = async (key: string): Promise<boolean> => {
  const isValid = await validateAndFetchAgencies(key.trim());
  // Automatically fetches available cities/agencies
  return isValid;
};

// Step 2: City Selection (one-time)
const handleComplete = async () => {
  await updateConfig({
    apiKey: apiKey.trim(),
    city: selectedCity.value,
    agencyId: selectedCity.agencyId, // Stored permanently
  });
};
```

### Configuration Storage
- **API Key**: Stored in config, can be changed in Settings > API Keys tab
- **City/Agency**: Set once during setup, stored permanently in localStorage
- **Other settings**: Configurable in main Settings tab

## 📍 View Components Data Architecture

### Favorite Routes View vs Closest Station View

Both views share the same core data structures but implement different filtering and display philosophies:

#### **Data Structure Differences**

| Aspect | Favorite Routes View | Closest Station View |
|--------|---------------------|---------------------|
| **Data Source** | Filters by `config.favoriteBuses` | Shows ALL vehicles at nearby stations |
| **Station Selection** | Single closest station serving favorites | Up to 2 stations within 200m |
| **Vehicle Filtering** | Shows ALL vehicles from favorite routes | Deduplicates by route (best vehicle per route) |
| **Vehicle Limits** | No limits - shows everything | `maxVehiclesPerStation` limit (default: 5) |
| **Stop List Display** | `showShortStopList={true}` (always visible) | `showShortStopList={false}` (expandable only) |

#### **Shared Data Structures**

Both views use identical core interfaces:

```typescript
interface EnhancedVehicleInfoWithDirection extends EnhancedVehicleInfo {
  _internalDirection?: 'arriving' | 'departing' | 'unknown';
  stopSequence?: Array<{
    stopId: string;
    stopName: string;
    sequence: number;
    isCurrent: boolean;
    isDestination: boolean;
  }>;
}

// Station Vehicle Groups (identical structure)
Array<{
  station: { station: Station; distance: number };
  vehicles: EnhancedVehicleInfoWithDirection[];
  allRoutes: Array<{
    routeId: string;
    routeName: string;
    vehicleCount: number;
  }>;
}>
```

#### **Processing Logic Differences**

**Favorite Routes View Processing:**
1. Maps favorite route names to route IDs via `routesMap.get(routeName)`
2. Filters vehicles: `vehicles.filter(v => favoriteRouteIds.includes(v.routeId))`
3. Finds stations serving those specific vehicles only
4. Shows closest station with ALL favorite route vehicles (no deduplication)
5. No vehicle count limits - comprehensive view of user's routes

**Closest Station View Processing:**
1. Finds nearby stations within 5km radius: `calculateDistance(userLocation, station.coordinates)`
2. Gets ALL vehicles serving those stations (any route)
3. Deduplicates by route: `bestVehiclePerRoute = routeGroups.map(vehicles => vehicles.sort(prioritySort)[0])`
4. Applies limits: `finalVehicles.slice(0, maxVehicles)`
5. Shows up to 2 stations if within 200m proximity

#### **Code Duplication Refactoring (COMPLETED)**

**✅ Successfully Refactored (December 2024):**
Created shared `useVehicleProcessing` hook that eliminated ~670 lines of duplicate code between FavoriteRoutesView and StationDisplay components.

**Shared Hook Implementation:**
```typescript
// src/hooks/useVehicleProcessing.ts
const useVehicleProcessing = (options: VehicleProcessingOptions) => {
  // Configurable vehicle processing for both views
  return { 
    stationVehicleGroups, 
    isLoading, 
    effectiveLocationForDisplay,
    favoriteRoutes,
    allStations 
  };
};
```

**Configuration Options:**
- `filterByFavorites`: Route filtering mode (favorites vs all routes)
- `maxStations`: Number of stations to display (1 for favorites, 2 for station view)
- `maxVehiclesPerStation`: Vehicle limit per station
- `showAllVehiclesPerRoute`: Show all vehicles vs best per route
- `maxSearchRadius`: Search area in meters
- `proximityThreshold`: Station proximity rules

**Results:**
- **Code Reduction**: 670+ lines eliminated
- **Maintainability**: Single source of truth for vehicle processing
- **Consistency**: Both views use identical algorithms
- **Performance**: Optimized with configurable options

## 📍 Station Display Component

### Overview (`src/components/features/StationDisplay/StationDisplay.tsx`)
Location-aware component that shows buses arriving at the station closest to the user's current position.

### Key Features
- **Multi-Station Detection**: Finds all stations within 100m of the closest station
- **Smart Station Prioritization**: Prioritizes stations based on user's proximity to home/work
- **Station Identification**: Material Design chips showing station names and distances
- **Route Deduplication**: Shows earliest bus from each unique route per station
- **Real-World Optimization**: Handles main streets with stations on opposite sides

### Implementation Details

```typescript
const StationDisplay: React.FC<StationDisplayProps> = ({ maxBuses = 5 }) => {
  const { buses } = useEnhancedBusStore();
  const { currentLocation, calculateDistance } = useLocationStore();
  const { config } = useConfigStore();

  // Find closest station to user's current location
  const closestStation = React.useMemo(() => {
    if (!currentLocation || !buses.length) return null;
    
    const stations = Array.from(
      new Map(buses.map(bus => [bus.station.id, bus.station])).values()
    );
    
    let closest: Station | null = null;
    let minDistance = Infinity;
    
    for (const station of stations) {
      const distance = calculateDistance(currentLocation, station.coordinates);
      if (distance < minDistance) {
        minDistance = distance;
        closest = station;
      }
    }
    
    return closest;
  }, [currentLocation, buses, calculateDistance]);

  // Categorize buses by direction
  const stationBuses = React.useMemo(() => {
    if (!closestStation) return { toWork: [], toOther: [] };
    
    const busesAtStation = buses.filter(bus => bus.station.id === closestStation.id);
    const isNearHome = config?.homeLocation && currentLocation ? 
      calculateDistance(currentLocation, config.homeLocation) < 0.5 : false;
    
    // Group by route to avoid duplicates
    const routeGroups = new Map<string, EnhancedBusInfo[]>();
    busesAtStation.forEach(bus => {
      const routeKey = bus.route;
      if (!routeGroups.has(routeKey)) {
        routeGroups.set(routeKey, []);
      }
      routeGroups.get(routeKey)!.push(bus);
    });
    
    // Categorize earliest bus from each route
    const toWork: EnhancedBusInfo[] = [];
    const toOther: EnhancedBusInfo[] = [];
    
    routeGroups.forEach((routeBuses) => {
      const earliestBus = routeBuses.sort((a, b) => 
        a.estimatedArrival.getTime() - b.estimatedArrival.getTime()
      )[0];
      
      if (isNearHome && config?.workLocation) {
        // Determine if bus goes towards work
        const distanceToWork = calculateDistance(
          earliestBus.station.coordinates, 
          config.workLocation
        );
        const distanceToHome = calculateDistance(
          earliestBus.station.coordinates, 
          config.homeLocation!
        );
        
        if (distanceToWork < distanceToHome) {
          toWork.push(earliestBus);
        } else {
          toOther.push(earliestBus);
        }
      } else {
        toOther.push(earliestBus);
      }
    });
    
    return { toWork, toOther };
  }, [closestStation, buses, config, currentLocation, calculateDistance]);
};
```

### Data Flow
1. **Location Detection**: Uses `useLocationStore` to get current GPS coordinates
2. **Station Finding**: Calculates distances to all available stations using Haversine formula
3. **Bus Filtering**: Gets all buses at the closest station from `useEnhancedBusStore`
4. **Route Deduplication**: Groups buses by route number, takes earliest from each group
5. **Direction Analysis**: Uses home/work locations to categorize bus destinations
6. **Display Rendering**: Shows categorized buses with real-time arrival information

### Dependencies
- **useEnhancedBusStore**: Provides bus data with live tracking and schedule information
- **useLocationStore**: Provides GPS coordinates and distance calculation utilities
- **useConfigStore**: Provides user's home/work locations for direction detection
- **Performance Monitoring**: Wrapped with `withPerformanceMonitoring` for optimization tracking

### Cache Integration
- **Read-Only Cache Access**: Only reads from existing cache, never triggers updates
- **Subscription-Based Updates**: Automatically refreshes when cache data changes
- **No Network Requests**: Relies entirely on data already fetched by other components

## 🔧 Key Services

### Favorite Bus Service (`src/services/favoriteBusService.ts`)
Main business logic for route scheduling:

```typescript
class FavoriteBusService {
  // Get next departures with multiple data sources
  async getNextDepartures(routeId: string, stationId: string): Promise<Departure[]> {
    // 1. Try live vehicle data
    const liveData = await this.getLiveVehicleData(routeId);
    
    // 2. Try official CTP Cluj schedules
    const officialData = await this.getOfficialSchedule(routeId, stationId);
    
    // 3. Fallback to API schedule data
    const fallbackData = await this.getAPISchedule(routeId, stationId);
    
    return this.mergeAndPrioritize([liveData, officialData, fallbackData]);
  }
}
```

### CTP Cluj Schedule Service (`src/services/ctpClujScheduleService.ts`)
Fetches official schedules from CTP Cluj website:

```typescript
class CTPClujScheduleService {
  async getNextDeparture(routeSlug: string, stationId: string, currentTime: Date) {
    // Fetch route page via proxy
    const response = await fetch(`/api/ctp-cluj/orare/orar_linia.php?linia=${routeSlug}`);
    
    // Extract schedule data
    const schedule = await this.parseScheduleFromHTML(response);
    
    // Return next departure with confidence indicator
    return {
      time: nextDeparture,
      confidence: 'official' as const
    };
  }
}
```

### Enhanced Tranzy API (`src/services/enhancedTranzyApi.ts`)
Handles all Tranzy API interactions:

```typescript
class EnhancedTranzyAPI {
  async getVehicles(routeId: string): Promise<Vehicle[]> {
    const response = await fetch(`/api/tranzy/vehicles?route=${routeId}`);
    return response.json();
  }
  
  async getRoutes(): Promise<Route[]> {
    const response = await fetch('/api/tranzy/routes');
    return response.json();
  }
}
```

## 🧪 Testing Strategy

### Test Structure
- **Unit Tests**: Individual functions and components
- **Integration Tests**: API interactions and data flow
- **Component Tests**: React component behavior
- **E2E Tests**: Critical user flows

### Running Tests
```bash
npm test              # Run all tests once (vitest --run)
npm run test:watch    # Watch mode (vitest)
npm run test:ui       # Visual test runner (vitest --ui)
```

**Test Command Details:**
- **`npm test`** - Single run, exits after completion (for CI/production)
- **`npm run test:watch`** - Watch mode, re-runs on file changes (for development)
- **`npm run test:ui`** - Browser-based visual test runner
- **`npm test -- <pattern>`** - Run specific tests (e.g., `npm test -- stationSelector`)
- **`npm test -- --verbose`** - Detailed test output

### Test Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10000,
  },
});
```

### Complete Test Command Reference

**Available Scripts (from package.json):**
```json
{
  "test": "vitest --run",
  "test:watch": "vitest", 
  "test:ui": "vitest --ui"
}
```

**Command Usage:**
- **`npm test`** - Run all tests once and exit (CI/production)
- **`npm run test:watch`** - Run tests in watch mode (development)
- **`npm run test:ui`** - Launch visual test runner in browser
- **`npm test -- <pattern>`** - Run specific test files
- **`npm test -- --reporter=verbose`** - Show detailed test output
- **`npm test -- --clearCache`** - Clear test cache before running
- **`npm test -- --update`** - Update test snapshots

**Examples:**
```bash
# Run all tests
npm test

# Run specific test file
npm test -- stationSelector.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should handle errors"

# Run tests with coverage info
npm test -- --coverage

# Run tests with detailed output
npm test -- --reporter=verbose

# Clear cache and run tests
npm test -- --clearCache
```

**⚠️ Important Notes:**
- **NEVER** use `npm test -- --run` - the `--run` flag is already in the script definition
- **NO** `npm run test:coverage` script exists - use `npm test -- --coverage`
- **NO** `npm run test` script exists - use `npm test` (without "run")
- **NO** `--verbose` option - use `--reporter=verbose` instead
- Use `--` to pass arguments to vitest through npm
- Use `--testNamePattern` instead of `--grep` for pattern matching

## 🔄 Development Workflow

### Local Development
```bash
# Start development server
npm run dev

# Run tests in watch mode
npm run test:watch

# Check code quality
npm run lint
```

### Code Quality
- **ESLint** for code quality
- **TypeScript** for type safety
- **Prettier** for formatting (via ESLint)
- **Vitest** for testing

### Build Process
```bash
# Production build
npm run build

# Preview build locally
npm run preview

# Analyze bundle
npm run build -- --analyze
```

## 🚀 Deployment

### Build Configuration
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          maps: ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
});
```

### Performance Optimizations
- **Code splitting** with manual chunks
- **Tree shaking** for smaller bundles
- **Service worker** for offline functionality
- **React deduplication** in Vite config

## 🐛 Debugging

### Debug Tools
Located in `tools/debug/`:
- `debug-config.js` - Configuration debugging
- `debug-favorites.js` - Favorites system debugging
- `debug-schedule-issue.js` - Schedule service debugging
- `check-config.html` - Configuration validation

### Common Debug Scenarios

#### Route Mapping Issues
```typescript
// Check route ID vs label mapping
const routeDetails = allRoutes.find(route => route.id === routeId);
const routeLabel = routeDetails?.shortName || routeId;
console.log(`Route ID: ${routeId}, Label: ${routeLabel}`);
```

#### API Proxy Issues
```bash
# Check proxy logs in terminal
# Look for "Proxying request" messages
# Verify target URLs and response codes
```

#### Schedule Data Issues
```typescript
// Enable debug logging
localStorage.setItem('debug', 'schedule:*');
// Check browser console for detailed logs
```

## 📊 Performance Monitoring

### Key Metrics
- **Bundle size**: < 1MB gzipped
- **First load**: < 2 seconds
- **Test coverage**: > 90%
- **TypeScript coverage**: 100%

### Optimization Techniques
- **Lazy loading** for non-critical components
- **React.memo** for expensive components
- **useCallback/useMemo** for performance
- **Service worker caching** for offline support

## 🔧 Configuration

### Environment Variables
```bash
# .env.local
VITE_API_BASE_URL=http://localhost:5175/api
VITE_DEBUG_MODE=true
```

### Build Targets
- **Development**: Fast builds, source maps, HMR
- **Production**: Optimized bundles, minification, tree shaking
- **Preview**: Production build with local server

## 📝 Code Conventions

### Component Naming
- **Material Components**: Prefix with `Material` (e.g., `MaterialButton`)
- **Feature Components**: Descriptive names (e.g., `IntelligentBusDisplay`)
- **File Names**: PascalCase matching component name

### Import Organization
```typescript
// External libraries
import React from 'react';
import { Button } from '@mui/material';

// Internal imports (relative paths)
import { useConfigStore } from '../stores';
import { logger } from '../utils/logger';
```

### Error Handling
```typescript
// Consistent error types
interface APIError {
  type: 'network' | 'parsing' | 'authentication' | 'partial';
  message: string;
  details?: unknown;
}
```

## 🔄 Version Management

### Updating Versions
```bash
# Update app version for major changes
node scripts/update-version.js    # Updates timestamp-based version
npm version patch                 # Updates semantic version

# For different types of changes
npm version patch    # Bug fixes (1.0.0 → 1.0.1)
npm version minor    # New features (1.0.0 → 1.1.0)
npm version major    # Breaking changes (1.0.0 → 2.0.0)
```

### Version Display
- Version shown in app footer via MaterialVersionControl component
- Helps users and developers track which version is running
- Essential for debugging and support

---

**Need help with a specific technical issue?** Check the [troubleshooting guide](troubleshooting.md) or examine the debug tools in `tools/debug/`.