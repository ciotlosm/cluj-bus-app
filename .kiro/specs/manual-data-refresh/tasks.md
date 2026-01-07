# Implementation Plan: Manual Data Refresh

## Overview

This implementation plan converts the manual data refresh design into discrete coding tasks. The approach focuses on extending existing stores, creating the refresh button component, and implementing the data freshness monitoring system. Each task builds incrementally to ensure the feature integrates seamlessly with the existing codebase.

## Tasks

- [x] 1. Extend existing stores with refresh functionality
  - Add `lastUpdated`, `refreshData()`, `persistToStorage()`, and `loadFromStorage()` methods to all stores
  - Update existing `loadVehicles()`, `loadStops()`, etc. methods to set timestamps and persist data
  - Ensure `isDataFresh()` method exists in all stores (already exists in vehicleStore)
  - _Requirements: 4.1, 4.2, 4.4, 5.1, 5.2, 5.3_

- [ ]* 1.1 Write property test for store data persistence
  - **Property 10: Local Storage Persistence**
  - **Validates: Requirements 4.1**

- [ ]* 1.2 Write property test for offline data serving
  - **Property 11: Offline Data Serving**
  - **Validates: Requirements 4.2, 5.3**

- [x] 2. Create Data Freshness Monitor utility
  - Implement monitor that reads timestamps from all stores
  - Calculate freshness status based on vehicle (5min) and general data (24hr) thresholds
  - Provide subscription mechanism for reactive updates
  - Add periodic 30-second check for time-based staleness detection
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 2.1 Write property test for freshness calculations
  - **Property 8: Staleness Calculation Accuracy**
  - **Validates: Requirements 3.2, 3.3**

- [ ]* 2.2 Write property test for monitor data reading
  - **Property 7: Freshness Monitor Reads Store Timestamps**
  - **Validates: Requirements 3.1, 3.5**

- [x] 3. Create Manual Refresh Button component
  - Implement button with color-coded status (green/red) based on data freshness
  - Add loading state during refresh operations
  - Include timer countdown display for next vehicle refresh
  - Integrate with Material-UI design system to match existing header controls
  - _Requirements: 1.4, 1.5, 2.1, 2.2, 2.4, 2.5, 2.6, 8.2, 8.3, 8.5_

- [ ]* 3.1 Write property test for button color accuracy
  - **Property 5: Button Color Reflects Data Freshness**
  - **Validates: Requirements 1.5, 2.1, 2.2, 2.5**

- [ ]* 3.2 Write property test for loading feedback
  - **Property 4: Button Provides Loading Feedback**
  - **Validates: Requirements 1.4, 8.2, 8.3**

- [x] 4. Implement Manual Refresh System
  - Create system that coordinates refresh across all stores
  - Handle network connectivity checks using existing StatusStore
  - Implement error handling for API failures and network issues
  - Ensure refresh operations are atomic and prevent concurrent executions
  - _Requirements: 1.1, 1.2, 1.3, 5.4, 8.4_

- [ ]* 4.1 Write property test for manual refresh coordination
  - **Property 1: Manual Refresh Triggers All Stores**
  - **Validates: Requirements 1.1**

- [ ]* 4.2 Write property test for successful refresh behavior
  - **Property 2: Successful Refresh Updates All Stores**
  - **Validates: Requirements 1.2**

- [ ]* 4.3 Write property test for network failure handling
  - **Property 3: Network Failure Preserves Cache**
  - **Validates: Requirements 1.3**

- [x] 5. Checkpoint - Ensure core functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement automatic refresh timers
  - Add 1-minute automatic refresh timer for vehicle data when app is in foreground
  - Implement startup data loading with cache-first strategy
  - Add automatic refresh for stale data when network becomes available
  - Handle app visibility changes (foreground/background) for timer management
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 6.1 Write property test for cache-first startup
  - **Property 12: Cache-First Startup Strategy**
  - **Validates: Requirements 7.1**

- [ ]* 6.2 Write property test for automatic vehicle refresh
  - **Property 13: Automatic Vehicle Refresh Timer**
  - **Validates: Requirements 7.2**

- [ ]* 6.3 Write property test for automatic stale data refresh
  - **Property 15: Automatic Stale Data Refresh**
  - **Validates: Requirements 7.5**

- [x] 7. Implement loading states for first-time users
  - Add loading states to components when cache is empty
  - Ensure seamless UI updates when background fetch completes
  - Handle first load scenarios with proper user feedback
  - _Requirements: 7.6, 7.7_

- [ ]* 7.1 Write property test for first load loading states
  - **Property 16: First Load Loading States**
  - **Validates: Requirements 7.6**

- [ ]* 7.2 Write property test for seamless background updates
  - **Property 17: Seamless Background Updates**
  - **Validates: Requirements 7.7**

- [x] 8. Integrate Manual Refresh Button into Header
  - Add button to Header component near the settings button
  - Connect button to Manual Refresh System and Data Freshness Monitor
  - Ensure proper accessibility and responsive design
  - Test integration with existing header functionality
  - _Requirements: 8.1, 8.4_

- [ ]* 8.1 Write integration test for header integration
  - Test complete refresh cycle from button click to UI update
  - Test button positioning and accessibility
  - _Requirements: 8.1, 8.4_

- [x] ~~9. Implement data loading priority system~~ **REMOVED**
  - ~~Ensure vehicle data is prioritized over general data during startup~~
  - ~~Implement proper sequencing for data loading operations~~
  - ~~Add monitoring for loading priority compliance~~
  - ~~_Requirements: 5.4_~~
  - **Note: Removed per user request - keeping it simple with different timers for different data**

- [ ]* ~~9.1 Write property test for loading priority~~ **REMOVED**
  - ~~**Property 14: Startup Data Loading Priority**~~
  - ~~**Validates: Requirements 5.4**~~

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using Vitest with fast-check library
- Unit tests validate specific examples and edge cases
- Integration tests ensure components work together properly