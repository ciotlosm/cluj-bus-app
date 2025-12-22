# Implementation Plan: Global App Context

## Overview

This implementation plan converts the current parameter-passing architecture to a clean global context system. The approach eliminates all manual config store imports and API credential parameters while maintaining existing functionality through a complete architectural replacement.

## Tasks

- [x] 1. Create core app context module
  - Create `src/context/appContext.ts` with module-level state management
  - Implement `initializeAppContext`, `updateAppContext`, `getApiConfig`, and `isContextReady` functions
  - Add proper TypeScript interfaces for `ApiConfig` and `AppContextState`
  - Include comprehensive error handling with custom error classes
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [ ]* 1.1 Write property test for context configuration synchronization
  - **Property 1: Context Configuration Synchronization**
  - **Validates: Requirements 1.2, 4.2, 3.3, 4.5**

- [ ]* 1.2 Write unit tests for context module
  - Test initialization with valid/invalid configurations
  - Test error conditions for uninitialized access
  - Test type safety and interface compliance
  - _Requirements: 1.1, 1.3, 1.4_

- [x] 2. Create context initialization service
  - Create `src/context/contextInitializer.ts` for automatic setup
  - Implement `setupAppContext` function with config store subscription
  - Add logic to initialize context with current config on startup
  - Handle config store changes and update context automatically
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 2.1 Write property test for configuration state handling
  - **Property 5: Configuration State Handling**
  - **Validates: Requirements 4.3**

- [x] 3. Integrate context initialization in main app
  - Update `src/main.tsx` to call `setupAppContext()` before rendering
  - Ensure context is initialized before any services are used
  - Add error boundary for context initialization failures
  - _Requirements: 4.1, 4.5_

- [x] 4. Update vehicle service to use context
  - Remove `apiKey` and `agency_id` parameters from `getVehicles` method
  - Update method to use `getApiConfig()` from app context
  - Maintain existing error handling and status tracking functionality
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [ ]* 4.1 Write property test for service layer context usage
  - **Property 2: Service Layer Context Usage**
  - **Validates: Requirements 2.1, 2.5**

- [ ]* 4.2 Write unit tests for updated vehicle service
  - Test service behavior with valid context
  - Test error handling when context is not initialized
  - Verify API calls work correctly with context credentials
  - _Requirements: 2.4, 2.5_

- [x] 5. Update station service to use context
  - Remove `apiKey` and `agency_id` parameters from `getStops` method
  - Update method to use `getApiConfig()` from app context
  - Maintain existing error handling and status tracking functionality
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 6. Update all other services to use context
  - Remove credential parameters from all service methods
  - Update services to use app context for API credentials
  - Ensure all services maintain existing functionality
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [ ]* 6.1 Write property test for context error handling
  - **Property 4: Context Error Handling**
  - **Validates: Requirements 1.4, 2.4, 3.4, 4.4**

- [x] 7. Update station store to use context
  - Remove manual config store import from `src/stores/stationStore.ts`
  - Update `loadStops` method to use app context instead of parameters
  - Maintain existing store functionality and error handling
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [ ]* 7.1 Write property test for store layer context integration
  - **Property 3: Store Layer Context Integration**
  - **Validates: Requirements 3.1, 3.5**

- [x] 8. Update all hooks to use context
  - Remove manual config store imports from `src/hooks/useStationFilter.ts`
  - Update hooks to use services without passing credential parameters
  - Ensure hooks maintain existing functionality
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [ ]* 8.1 Write property test for type safety guarantee
  - **Property 6: Type Safety Guarantee**
  - **Validates: Requirements 1.3**

- [ ] 9. Clean up legacy patterns
  - Search and remove all `await import('../stores/configStore')` patterns
  - Verify no service methods accept credential parameters
  - Remove any remaining manual config store dependencies
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 9.1 Write unit tests for migration completeness
  - Test that no manual config imports exist in codebase
  - Test that service methods don't accept credential parameters
  - Verify all files use new context system exclusively
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 10. Integration testing and validation
  - Test full application startup with context initialization
  - Verify all services work correctly with context system
  - Test configuration changes propagate through entire system
  - Ensure no regressions in existing functionality
  - _Requirements: 4.1, 4.5, 2.5, 3.5_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Complete architectural replacement with no backward compatibility