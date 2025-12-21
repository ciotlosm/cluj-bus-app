# Design Document

## Overview

This design implements a clean, minimal architecture for the Bus Tracking App that eliminates complexity and follows the principle of using raw API data throughout the application. The architecture prioritizes simplicity, maintainability, and direct data flow from API to UI.

## Architecture

### Core Principles

1. **Raw API Data Flow**: API responses flow directly to UI without transformation
2. **Domain-Focused Services**: Each service handles one specific domain
3. **Minimal Components**: Small, focused React components under 100 lines
4. **Simple State**: One store per domain with minimal computed values
5. **No Over-Engineering**: Direct solutions without complex abstractions

### Layer Structure

```
┌─────────────────────────────────────────┐
│                   UI Layer              │
│  (React Components - Raw API Display)  │
├─────────────────────────────────────────┤
│                State Layer              │
│     (Zustand Stores - Raw API Data)    │
├─────────────────────────────────────────┤
│               Service Layer             │
│    (Domain Services - Direct API)      │
├─────────────────────────────────────────┤
│                 API Layer               │
│        (Axios + Raw Responses)         │
└─────────────────────────────────────────┘
```

## Components and Interfaces

### Service Layer

#### AgencyService
```typescript
interface AgencyService {
  getAgencies(): Promise<TranzyAgencyResponse[]>;
  getAgencyByCity(city: string): Promise<TranzyAgencyResponse | null>;
}
```

#### RouteService  
```typescript
interface RouteService {
  getRoutes(agency_id: number): Promise<TranzyRouteResponse[]>;
  getRouteById(route_id: number): Promise<TranzyRouteResponse | null>;
}
```

#### StationService
```typescript
interface StationService {
  getStops(agency_id: number): Promise<TranzyStopResponse[]>;
  getStopsByLocation(lat: number, lon: number, radius: number): Promise<TranzyStopResponse[]>;
}
```

#### VehicleService
```typescript
interface VehicleService {
  getVehicles(agency_id: number, route_id?: number): Promise<TranzyVehicleResponse[]>;
  getVehiclesByStop(stop_id: number): Promise<TranzyVehicleResponse[]>;
}
```

#### ScheduleService
```typescript
interface ScheduleService {
  getStopTimes(agency_id: number, stop_id?: number): Promise<TranzyStopTimeResponse[]>;
  getTrips(agency_id: number, route_id?: number): Promise<TranzyTripResponse[]>;
}
```

### State Layer

#### ConfigStore
```typescript
interface ConfigStore {
  // Raw config data
  apiKey: string | null;
  agency_id: number | null;
  home_location: { lat: number; lon: number } | null;
  work_location: { lat: number; lon: number } | null;
  
  // Actions
  setApiKey: (key: string) => void;
  setAgency: (agency_id: number) => void;
  setHomeLocation: (lat: number, lon: number) => void;
  setWorkLocation: (lat: number, lon: number) => void;
}
```

#### VehicleStore
```typescript
interface VehicleStore {
  // Raw API data
  vehicles: TranzyVehicleResponse[];
  loading: boolean;
  error: string | null;
  
  // Actions
  loadVehicles: (agency_id: number, route_id?: number) => Promise<void>;
  clearVehicles: () => void;
}
```

#### StationStore
```typescript
interface StationStore {
  // Raw API data
  stops: TranzyStopResponse[];
  loading: boolean;
  error: string | null;
  
  // Actions
  loadStops: (agency_id: number) => Promise<void>;
  loadStopsByLocation: (lat: number, lon: number) => Promise<void>;
}
```

### UI Layer

#### Layout Components
- **AppLayout** (< 50 lines): Header + Content + Navigation
- **Header** (< 30 lines): Title + Status indicators
- **Navigation** (< 40 lines): Bottom navigation tabs

#### View Components  
- **StationView** (< 80 lines): Display stops and vehicles
- **SettingsView** (< 60 lines): Configuration form

#### Display Components
- **VehicleList** (< 50 lines): Simple list of vehicles using raw API fields
- **StopList** (< 40 lines): Simple list of stops using raw API fields
- **LocationPicker** (< 70 lines): Basic location selection

## Data Models

### Raw API Types (No Transformation)

```typescript
// Direct from Tranzy API - no field renaming
interface TranzyRouteResponse {
  route_id: number;
  agency_id: number;
  route_short_name: string;    // Use directly in UI
  route_long_name: string;     // Use directly in UI
  route_type: number;
  route_color?: string;
  route_text_color?: string;
}

interface TranzyStopResponse {
  stop_id: number;
  stop_name: string;           // Use directly in UI
  stop_lat: number;
  stop_lon: number;
  location_type?: number;
}

interface TranzyVehicleResponse {
  vehicle_id: string;
  trip_id?: string;
  route_id?: number;
  position_latitude: number;   // Use directly in UI
  position_longitude: number;  // Use directly in UI
  bearing?: number;
  speed?: number;
  timestamp: number;
}

interface TranzyStopTimeResponse {
  trip_id: string;
  stop_id: number;
  arrival_time: string;        // Use directly in UI
  departure_time: string;      // Use directly in UI
  stop_sequence: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

<function_calls>
<invoke name="prework">
<parameter name="featureName">clean-architecture-rebuild

### Property 1: Raw API Field Preservation
*For any* API response field, the same field name should be used throughout the codebase from service layer to UI components without transformation
**Validates: Requirements 1.1, 1.2, 1.4**

### Property 2: No Field Transformation Functions
*For any* codebase search, there should be no functions that map or transform API field names to different names
**Validates: Requirements 1.5, 6.1, 6.4**

### Property 3: Direct API Field Usage in UI
*For any* React component that displays route information, it should reference route_short_name directly and never routeName
**Validates: Requirements 1.3, 6.2**

### Property 4: Service File Size Constraint
*For any* service file in the services directory, the file should contain between 50-100 lines maximum
**Validates: Requirements 2.2**

### Property 5: Component File Size Constraint  
*For any* React component file (.tsx), the file should contain 100 lines maximum
**Validates: Requirements 3.1**

### Property 6: Direct MUI Usage
*For any* React component, Material-UI imports should come directly from @mui/material without custom wrapper components
**Validates: Requirements 3.2**

### Property 7: Flat Component Structure
*For any* component folder, the nesting depth should not exceed 2 levels from src/components
**Validates: Requirements 3.5**

### Property 8: Store Data Structure Matching
*For any* Zustand store that holds API data, the data structure should match the API response structure exactly
**Validates: Requirements 4.3, 6.5**

### Property 9: Store Independence
*For any* Zustand store file, it should not import or depend on other store files
**Validates: Requirements 4.5**

### Property 10: Required Store Properties
*For any* Zustand store, it should contain loading and error state properties
**Validates: Requirements 4.4**

### Property 11: Named Import Usage
*For any* import statement, it should use named import syntax instead of default imports for tree-shaking
**Validates: Requirements 7.4**

### Property 12: No Circular Dependencies
*For any* file in the codebase, it should not create circular dependency chains with other files
**Validates: Requirements 7.5**

### Property 13: Layer Separation
*For any* file, it should only import from its own layer or lower layers (UI → State → Service → API)
**Validates: Requirements 8.1**

### Property 14: TypeScript Interface Completeness
*For any* API endpoint, there should be a corresponding TypeScript interface with matching field names
**Validates: Requirements 8.4**

## Error Handling

### Service Layer Error Handling
- Services return Promise rejections for API failures
- No complex error transformation - pass through raw API errors
- Simple retry logic with exponential backoff for network errors

### Store Layer Error Handling
- Each store maintains simple error state (string | null)
- Loading states prevent multiple concurrent requests
- Clear error state on successful operations

### UI Layer Error Handling
- Display raw error messages to users
- Simple retry buttons that call store actions
- Loading indicators during async operations

## Testing Strategy

### Property-Based Testing
- Use **fast-check** library for property-based testing
- Each correctness property implemented as property-based test
- Minimum 100 iterations per property test
- Tests tagged with: **Feature: clean-architecture-rebuild, Property X: [property text]**

### Unit Testing
- Focus on service layer API integration
- Test store state transitions
- Test component rendering with raw API data
- Avoid complex mocking - use simple test data

### Integration Testing
- Test complete data flow from API to UI
- Verify raw field names preserved throughout
- Test error handling at each layer
- Performance testing for build times and bundle size

### Testing Balance
- Property tests verify architectural constraints
- Unit tests verify specific functionality
- Integration tests verify end-to-end data flow
- Performance tests verify build and runtime metrics