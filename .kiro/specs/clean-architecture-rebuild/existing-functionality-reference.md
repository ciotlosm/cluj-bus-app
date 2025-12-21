# Existing Functionality Reference

## Purpose
This document catalogs all existing functionality in the current Bus Tracking App that must be preserved in the clean architecture rebuild. Use this as a checklist to ensure no features are lost.

## Core Application Features

### 1. Real-Time Vehicle Tracking
**Current Implementation:** Complex VehicleTransformationService with multiple data sources
**Must Preserve:**
- Live GPS vehicle positions from Tranzy API
- Vehicle route information (route_short_name, route_long_name)
- Vehicle bearing and speed data
- Timestamp and data freshness indicators
- Vehicle-to-stop proximity calculations

### 2. Station/Stop Management
**Current Implementation:** Multiple services for stop data
**Must Preserve:**
- Stop/station lookup by location (GPS coordinates)
- Stop information (stop_name, coordinates)
- Nearby stops within configurable radius
- Stop-to-route associations
- Favorite stops functionality

### 3. Schedule Integration
**Current Implementation:** Complex schedule merging with live data
**Must Preserve:**
- Stop times from Tranzy API (arrival_time, departure_time)
- Trip information (trip_id, headsign)
- Route schedules and sequences
- ETA calculations based on schedule + live data

### 4. User Configuration
**Current Implementation:** Complex configuration management
**Must Preserve:**
- API key setup and validation
- City/agency selection (agency_id) - supports multiple cities via Tranzy API
- Home and work location settings
- Refresh rate configuration
- Theme preferences (light/dark mode)

### 5. Location Services
**Current Implementation:** LocationPicker with map integration
**Must Preserve:**
- GPS location detection
- Manual location selection via map
- Location-based stop filtering
- Home/work location management
- Location permissions handling

### 6. Offline Support
**Current Implementation:** Service worker with complex caching
**Must Preserve:**
- Offline data caching for stops and routes
- Service worker for PWA functionality
- Offline indicator when network unavailable
- Cache management and cleanup

### 7. Error Handling & Status
**Current Implementation:** Complex error management system
**Must Preserve:**
- API connection status monitoring
- Network error detection and retry
- User-friendly error messages
- Loading states for async operations
- Status indicators (online/offline, API status)

### 8. UI/UX Features
**Current Implementation:** Material Design with custom components
**Must Preserve:**
- Material Design 3 theming
- Responsive mobile-first layout
- Bottom navigation (Station/Settings views)
- Pull-to-refresh functionality
- Loading indicators and progress bars
- Dark/light theme switching

## API Endpoints Currently Used

### Tranzy API Endpoints
```
GET /opendata/agency - Agency information
GET /opendata/routes - Route data (route_short_name, route_long_name, etc.)
GET /opendata/stops - Stop/station data (stop_name, coordinates)
GET /opendata/vehicles - Live vehicle positions
GET /opendata/stop_times - Schedule data (arrival_time, departure_time)
GET /opendata/trips - Trip information (trip_id, headsign)
```

### Required API Fields (Raw Names)
```typescript
// Agency
agency_id, agency_name, agency_timezone

// Routes  
route_id, agency_id, route_short_name, route_long_name, route_type, route_color

// Stops
stop_id, stop_name, stop_lat, stop_lon

// Vehicles
vehicle_id, trip_id, route_id, position_latitude, position_longitude, bearing, speed, timestamp

// Stop Times
trip_id, stop_id, arrival_time, departure_time, stop_sequence

// Trips
trip_id, route_id, service_id, trip_headsign, direction_id
```

## Current User Workflows

### 1. Initial Setup Flow
1. User opens app for first time
2. Setup wizard prompts for API key
3. API key validation against Tranzy API
4. City/agency selection from available agencies (not limited to Cluj-Napoca)
5. Home location setup via GPS or map
6. Work location setup via GPS or map
7. App becomes fully functional

### 2. Daily Usage Flow
1. User opens app (shows Station view)
2. App detects current location
3. Finds nearby stops within radius
4. Loads live vehicles for those stops
5. Displays vehicles with ETA and route info
6. User can refresh data manually
7. User can switch to Settings for configuration

### 3. Settings Management Flow
1. User navigates to Settings view
2. Can modify API key, locations, preferences
3. Can clear cache or reset app
4. Can toggle theme and refresh settings
5. Changes are persisted and take effect immediately

## Performance Requirements

### Current Performance Targets
- TypeScript compilation: < 10 seconds
- Production bundle size: < 2MB
- API response time: < 3 seconds
- UI responsiveness: < 100ms interactions
- Offline functionality: Core features work without network

### Current Caching Strategy
- API responses cached for 5-30 minutes depending on data type
- Offline cache for essential data (stops, routes)
- Service worker handles network failures gracefully

## Integration Points

### External Dependencies
- **Tranzy API**: Primary data source for all transit data
- **Material-UI**: UI component library
- **Leaflet**: Map functionality for location picking
- **Zustand**: State management
- **Axios**: HTTP client for API calls

### Browser APIs Used
- **Geolocation API**: For GPS location detection
- **Service Worker API**: For offline functionality and PWA
- **Local Storage**: For configuration persistence
- **Cache API**: For offline data storage

## Critical Business Logic

### ETA Calculation Logic
- Combines live vehicle position with schedule data
- Accounts for vehicle speed and bearing
- Provides confidence levels based on data freshness
- Handles edge cases (no live data, schedule-only, etc.)

### Location-Based Filtering
- Finds stops within configurable radius of user location
- Prioritizes stops based on user's home/work locations
- Handles GPS accuracy and permission issues

### Data Freshness Management
- Tracks timestamp of all API data
- Shows confidence indicators based on data age
- Automatically refreshes stale data
- Handles offline/online transitions

## Migration Strategy

When implementing the clean architecture:

1. **Start with API types** - Define exact TypeScript interfaces matching current API responses
2. **Preserve all endpoints** - Ensure all current Tranzy API endpoints are accessible
3. **Maintain user workflows** - Keep the same setup and daily usage flows
4. **Test feature parity** - Verify each feature works identically to current implementation
5. **Performance validation** - Ensure new architecture meets or exceeds current performance
6. **Data migration** - Preserve user settings and cached data during transition

## Testing Checklist

Before considering the rebuild complete, verify:
- [ ] All API endpoints return expected data with raw field names
- [ ] Setup wizard works identically to current version
- [ ] Location detection and manual selection work
- [ ] Vehicle tracking shows live positions and ETAs
- [ ] Offline functionality works without network
- [ ] Settings can be modified and persist correctly
- [ ] Performance meets or exceeds current benchmarks
- [ ] All user workflows function as expected