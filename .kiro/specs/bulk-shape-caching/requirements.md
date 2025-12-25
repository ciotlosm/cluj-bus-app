# Requirements Document

## Introduction

The current route shape system fetches shapes individually by `shape_id`, causing multiple API calls and performance bottlenecks. This feature will optimize the system to fetch all shapes in bulk, implement persistent localStorage caching, and provide a centralized store for shape data access throughout the application.

## Glossary

- **Shape**: Route geometry data (polylines) that defines the physical path a transit vehicle follows
- **Shape_Service**: API service responsible for fetching shape data from the Tranzy API
- **Shape_Store**: Zustand store that manages shape data state and localStorage persistence
- **Route_Shape**: Processed shape data with distance calculations used for arrival time predictions
- **Bulk_Fetch**: Single API call to retrieve all available shapes instead of individual requests
- **Cache_Layer**: localStorage-based persistence layer for shape data with expiration management

## Requirements

### Requirement 1: Smart Shape Loading Strategy

**User Story:** As a user, I want the app to load instantly with cached data while staying up-to-date, so that I get immediate access to transit information with fresh data.

#### Acceptance Criteria

1. WHEN the app starts and cached shapes exist, THE Shape_Store SHALL load from localStorage immediately for instant availability
2. WHEN cached shapes are loaded, THE Shape_Store SHALL trigger a background refresh of all shapes without blocking the UI
3. WHEN no cached shapes exist, THE Shape_Store SHALL fetch all shapes in one API request without shape_id parameter
4. WHEN the background refresh completes and data differs from cached data, THE Shape_Store SHALL update the cache and notify components of the changes

### Requirement 2: Bulk Shape API Integration

**User Story:** As a system, I want to use the bulk shapes API endpoint efficiently, so that I can get all shape data in a single request.

#### Acceptance Criteria

1. WHEN fetching shapes, THE Shape_Service SHALL call the shapes API without shape_id parameter to get all shapes
2. WHEN the bulk fetch completes, THE Shape_Service SHALL return a collection of all available shapes indexed by shape_id
3. WHEN processing bulk shape data, THE Shape_Service SHALL convert raw API responses to RouteShape format
4. WHEN the bulk fetching is implemented and tested, THE Shape_Service SHALL remove the old getShapePoints(shapeId) method and related individual fetching logic

### Requirement 3: Persistent Shape Caching

**User Story:** As a user, I want shape data to be cached locally, so that the app loads faster and works better with poor network connections.

#### Acceptance Criteria

1. WHEN shapes are fetched successfully, THE Cache_Layer SHALL store them in localStorage with timestamps
2. WHEN the app starts, THE Cache_Layer SHALL load cached shapes if they are still valid
3. WHEN cached shapes are expired, THE Cache_Layer SHALL trigger a fresh fetch from the API
4. WHEN localStorage operations fail, THE Cache_Layer SHALL continue functioning with in-memory storage
5. WHEN shape data is updated, THE Cache_Layer SHALL persist the changes immediately to localStorage

### Requirement 4: Centralized Shape Store

**User Story:** As a developer, I want a centralized store for shape data, so that all components can access shapes consistently without duplicate fetching.

#### Acceptance Criteria

1. THE Shape_Store SHALL provide a single source of truth for all shape data in the application
2. WHEN components need shape data, THE Shape_Store SHALL provide access without triggering additional API calls
3. WHEN the store is initialized, THE Shape_Store SHALL load shapes from cache or trigger a fresh fetch
4. WHEN multiple components request the same shape, THE Shape_Store SHALL serve the data from memory
5. THE Shape_Store SHALL follow existing store patterns with loading states and error handling

### Requirement 5: Backward Compatibility

**User Story:** As a developer, I want existing code to continue working, so that the optimization doesn't break current functionality.

#### Acceptance Criteria

1. WHEN existing code requests shapes by shape_id, THE Shape_Store SHALL provide the requested shape from the bulk collection
2. WHEN route shape utilities need specific shapes, THE Shape_Store SHALL maintain the same interface as current implementations
3. WHEN arrival time calculations request shapes, THE Shape_Store SHALL provide RouteShape objects in the expected format
4. WHEN the bulk fetch fails, THE Shape_Store SHALL gracefully fallback to the current individual fetch approach

### Requirement 6: Performance Optimization

**User Story:** As a user, I want faster app performance, so that I can get transit information quickly without delays.

#### Acceptance Criteria

1. WHEN the app loads, THE Shape_Store SHALL reduce total API requests by at least 80% compared to individual fetching
2. WHEN shapes are cached, THE Shape_Store SHALL serve data instantly without network delays
3. WHEN memory usage is a concern, THE Shape_Store SHALL implement efficient data structures for shape storage
4. WHEN the cache is fresh, THE Shape_Store SHALL avoid unnecessary API calls during the session
5. WHEN network conditions are poor, THE Shape_Store SHALL rely on cached data to maintain functionality

### Requirement 7: Cache Management

**User Story:** As a system administrator, I want intelligent cache management, so that the app balances performance with data freshness.

#### Acceptance Criteria

1. WHEN shapes are cached, THE Cache_Layer SHALL expire data after a configurable time period (default 24 hours)
2. WHEN cache size grows large, THE Cache_Layer SHALL implement size limits and cleanup strategies
3. WHEN the app detects stale data, THE Cache_Layer SHALL refresh shapes in the background
4. WHEN localStorage is full, THE Cache_Layer SHALL handle quota exceeded errors gracefully
5. WHEN cache corruption is detected, THE Cache_Layer SHALL clear invalid data and refetch

### Requirement 7: Efficient Change Detection

**User Story:** As a system, I want to detect shape data changes efficiently, so that I only update components when data actually changes.

#### Acceptance Criteria

1. WHEN shapes are fetched, THE Shape_Store SHALL generate a hash of the shape data for change detection
2. WHEN comparing cached vs fresh data, THE Shape_Store SHALL use hash comparison instead of deep object comparison
3. WHEN hashes are identical, THE Shape_Store SHALL skip cache updates and component notifications
4. WHEN hashes differ, THE Shape_Store SHALL update the cache and notify subscribed components
5. WHEN generating hashes, THE Shape_Store SHALL use a fast hashing algorithm suitable for large datasets

### Requirement 8: Error Handling and Resilience

**User Story:** As a user, I want the app to work reliably, so that I can access transit information even when there are technical issues.

#### Acceptance Criteria

1. WHEN the bulk fetch fails, THE Shape_Store SHALL fallback to individual shape fetching for critical shapes
2. WHEN localStorage is unavailable, THE Shape_Store SHALL continue operating with in-memory storage only
3. WHEN network errors occur, THE Shape_Store SHALL retry with exponential backoff up to 3 attempts
5. WHEN the API returns a response, THE Shape_Store SHALL validate JSON parsing and basic structure, treating parsing failures as errors requiring retry or fallback

### Requirement 9: Shape Utilities Consolidation

**User Story:** As a developer, I want all shape-related utilities consolidated in one location, so that I can maintain and extend shape functionality efficiently.

#### Acceptance Criteria

1. WHEN shape utilities are needed, THE Shape_Utils SHALL be available from a single utils/shapes/ directory
2. WHEN moving existing shape functions, THE Shape_Utils SHALL maintain the same interfaces and functionality
3. WHEN consolidating shape utilities, THE Shape_Utils SHALL include conversion, caching, processing, and validation functions
4. WHEN the consolidation is complete, THE Shape_Utils SHALL remove duplicate functionality and update all imports
5. WHEN other files reference shape utilities, THE Shape_Utils SHALL update all import paths to use the consolidated location

