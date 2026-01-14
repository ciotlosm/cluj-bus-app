# Implementation Plan: Vehicle Position Prediction

## Overview

This implementation plan creates a vehicle position prediction system that calculates current vehicle positions based on timestamp age and route movement simulation. The system integrates seamlessly with existing arrival calculations and map visualization while maintaining full backward compatibility.

## Tasks

- [x] 1. Create core position prediction utilities
  - Create `src/utils/vehicle/positionPredictionUtils.ts` with timestamp parsing and movement simulation logic
  - Implement route shape-based movement calculation using existing projection utilities
  - Add station encounter detection and dwell time calculation
  - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 3.1, 3.2, 3.3_

- [ ]* 1.1 Write property test for timestamp processing consistency
  - **Property 1: Timestamp Processing Consistency**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

- [ ]* 1.2 Write property test for route shape handling
  - **Property 2: Route Shape Handling**
  - **Validates: Requirements 2.1, 2.3, 2.5**

- [ ]* 1.3 Write property test for movement simulation consistency
  - **Property 3: Movement Simulation Consistency**
  - **Validates: Requirements 2.2, 3.1, 3.2, 3.3, 3.5**

- [x] 2. Create vehicle data enhancement layer
  - Create `src/utils/vehicle/vehicleEnhancementUtils.ts` to extend vehicle data with predictions
  - Implement seamless integration that preserves original API coordinates
  - Add prediction metadata for debug visualization
  - _Requirements: 4.1, 6.1, 6.4_

- [ ]* 2.1 Write property test for system integration consistency
  - **Property 4: System Integration Consistency**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ]* 2.2 Write property test for error handling consistency
  - **Property 6: Error Handling Consistency**
  - **Validates: Requirements 6.4, 7.1, 7.2**

- [x] 3. Integrate with existing arrival calculations
  - Update `src/utils/arrival/arrivalUtils.ts` to use enhanced vehicle data
  - Modify vehicle service integration to apply predictions before calculations
  - Ensure all distance calculations use predicted coordinates
  - _Requirements: 4.1, 4.3, 4.4_

- [x] 4. Update map visualization components
  - Modify `src/components/features/maps/VehicleLayer.tsx` to use predicted positions
  - Update vehicle rendering to display at predicted coordinates
  - Maintain existing vehicle popup and interaction functionality
  - _Requirements: 4.2, 4.5_

- [x] 5. Enhance debug visualization
  - Extend `src/components/features/maps/DebugLayer.tsx` to show both API and predicted positions
  - Add washed/grey styling for API positions in debug mode
  - Include prediction metadata in debug popups
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 5.1 Write property test for debug visualization completeness
  - **Property 5: Debug Visualization Completeness**
  - **Validates: Requirements 5.1, 5.4, 5.5**

- [ ] 6. Add prediction recalculation safeguards
  - Implement non-caching behavior to ensure fresh calculations
  - Add performance monitoring for prediction calculations
  - Verify time-dependent results are always current
  - _Requirements: 7.3_

- [ ]* 6.1 Write property test for prediction recalculation
  - **Property 7: Prediction Recalculation**
  - **Validates: Requirements 7.3**

- [ ] 7. Integration testing and validation
  - Test end-to-end integration with existing vehicle tracking system
  - Verify backward compatibility with existing arrival time calculations
  - Validate debug visualization shows both positions correctly
  - _Requirements: 6.2, 6.3_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation reuses existing utilities to minimize new code
- All changes maintain backward compatibility with current system