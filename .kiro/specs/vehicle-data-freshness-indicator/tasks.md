# Implementation Plan: Vehicle Data Age Indicator

## Overview

Implement GPS data age indicators and improved tooltips for vehicle cards. The implementation follows a simple approach: add one utility file, update constants, modify the VehicleCard component, and simplify the arrival tooltip.

## Tasks

- [x] 1. Add GPS data age constants
  - Add `GPS_DATA_AGE_THRESHOLDS` section to `src/utils/core/constants.ts`
  - Define `CURRENT_THRESHOLD`, `STALE_THRESHOLD`, and `FETCH_FRESH_THRESHOLD`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Create data age utility
  - [x] 2.1 Create `src/utils/vehicle/dataAgeUtils.ts`
    - Define `DataAgeStatus` type and `DataAgeResult` interface
    - Implement `calculateDataAge()` function with logic from design
    - Handle edge cases: invalid timestamps, GPS newer than fetch
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2_

  - [ ]* 2.2 Write property test for data age calculation
    - **Property 1: Data Age Status Calculation**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [-] 3. Add detailed relative time formatting
  - [x] 3.1 Add `formatDetailedRelativeTime()` to `src/utils/time/timestampFormatUtils.ts`
    - Format as "Xm Ys ago" for detailed display
    - Handle seconds, minutes, and hours appropriately
    - _Requirements: 6.3, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 3.2 Write property test for time formatting
    - **Property 2: Timestamp Format Consistency**
    - **Property 7: Relative Time Unit Selection**
    - **Validates: Requirements 2.3, 2.4, 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 4. Implement data age indicator in VehicleCard
  - [x] 4.1 Add data age calculation to VehicleCard component
    - Import `calculateDataAge` and `GPS_DATA_AGE_THRESHOLDS`
    - Calculate data age result using vehicle timestamp and vehicleRefreshTimestamp
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 4.2 Create inline DataAgeIcon component
    - Display green clock for 'current', yellow warning for 'aging', red error for 'stale'
    - Use Material-UI icons: `AccessTimeIcon`, `WarningIcon`, `ErrorIcon`
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_

  - [x] 4.3 Create inline DataPopupContent component
    - Display vehicle GPS timestamp with absolute and relative time
    - Display API fetch timestamp with absolute and relative time
    - Display contextual tip from data age result
    - _Requirements: 2.3, 2.4, 3.1, 3.2, 3.3_

  - [ ]* 4.4 Write property test for tip relevance
    - **Property 4: Tip Contextual Relevance**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 5. Add mobile-friendly tooltip interaction
  - [x] 5.1 Add state for popup open/close
    - Add `useState` for controlling popup visibility
    - Detect mobile using window width or `useMediaQuery`
    - _Requirements: 2.1, 2.2, 5.1, 5.2_

  - [x] 5.2 Enhance timestamp Tooltip with click handler
    - Add `onClick` handler to toggle popup
    - Add `disableHoverListener` for mobile
    - Ensure touch target is at least 44x44 pixels
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 5.1, 5.3, 5.4_

  - [ ]* 5.3 Write integration tests for tooltip interactions
    - Test hover opens tooltip on desktop
    - Test tap opens tooltip on mobile
    - Test outside click closes tooltip
    - _Requirements: 2.1, 2.2, 2.6, 5.1, 5.2, 5.3_

- [x] 6. Simplify arrival chip tooltip
  - [x] 6.1 Refactor arrival chip tooltip content
    - Keep: arrival time, position method/confidence, speed method/confidence
    - Remove: vehicle ID, coordinates, speeds, vehicle data age, precise ETA
    - Format as simple text with emojis
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 6.2 Write property tests for arrival tooltip content
    - **Property 5: Arrival Tooltip Content Completeness**
    - **Property 6: Arrival Tooltip Content Exclusion**
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6, 4.7**

- [x] 7. Update timestamp display in VehicleCard
  - [x] 7.1 Replace TimeIcon with DataAgeIcon
    - Position data age icon before timestamp
    - Wire up data age status from calculation
    - _Requirements: 1.5_

  - [x] 7.2 Replace simple tooltip with data popup
    - Use DataPopupContent component
    - Wire up mobile-friendly interaction
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Handle edge cases and error conditions
  - [ ] 9.1 Add error handling for invalid timestamps
    - Handle unparseable timestamps
    - Handle future timestamps
    - Handle missing timestamps
    - _Requirements: 6.5_

  - [ ]* 9.2 Write unit tests for edge cases
    - Test invalid timestamp strings
    - Test future timestamps
    - Test null/undefined timestamps
    - _Requirements: 6.5_

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate UI interactions
