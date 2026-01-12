# Implementation Plan: Dynamic Speed Prediction

## Overview

This implementation plan creates a dynamic speed prediction system that enhances vehicle arrival time accuracy by using real-time speed data, traffic-aware calculations, and intelligent fallback mechanisms. The system integrates with the existing `EnhancedVehicleData` pattern and vehicle enhancement utilities to provide unified prediction metadata.

## Tasks

- [x] 1. Extend configuration constants with speed prediction parameters
  - Add `SPEED_PREDICTION_CONFIG` to `src/utils/core/constants.ts`
  - Include speed threshold, nearby radius, location-based speed parameters, and performance limits
  - Add configuration validation utilities
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Extend EnhancedVehicleData interface with speed prediction metadata
  - Update `src/utils/vehicle/vehicleEnhancementUtils.ts` to add speed prediction fields to `predictionMetadata`
  - Add optional fields: `predictedSpeed`, `speedMethod`, `speedConfidence`, `speedApplied`, etc.
  - Maintain backward compatibility with existing position prediction metadata
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Implement core SpeedPredictor class
  - [x] 3.1 Create `src/utils/vehicle/speedPredictionUtils.ts` with SpeedPredictor class
    - Implement main `predictSpeed()` method with hierarchical fallback logic
    - Add API speed validation and unit conversion methods
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 3.2 Write property test for API speed validation and usage
    - **Property 1: API Speed Validation and Usage**
    - **Validates: Requirements 1.1, 1.2, 1.5**

  - [ ]* 3.3 Write property test for stationary vehicle classification
    - **Property 2: Stationary Vehicle Classification**
    - **Validates: Requirements 1.3**

  - [ ]* 3.4 Write property test for fallback hierarchy correctness
    - **Property 3: Fallback Hierarchy Correctness**
    - **Validates: Requirements 1.4, 2.4, 4.1, 4.2, 4.3, 4.4, 4.5**

- [x] 4. Implement nearby vehicle analysis functionality
  - [x] 4.1 Add nearby vehicle filtering and averaging methods to SpeedPredictor
    - Implement `filterNearbyVehicles()` with spatial distance calculations
    - Implement `calculateNearbyAverage()` with speed validation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 4.2 Write property test for nearby vehicle spatial query and filtering
    - **Property 4: Nearby Vehicle Spatial Query and Filtering**
    - **Validates: Requirements 2.1, 2.2, 2.5**

  - [ ]* 4.3 Write property test for nearby vehicle average calculation
    - **Property 5: Nearby Vehicle Average Calculation**
    - **Validates: Requirements 2.3**

- [x] 5. Implement station density calculation system
  - [x] 5.1 Create StationDensityCalculator class in speedPredictionUtils.ts
    - Implement `calculateDensityCenter()` method for geographic centroid calculation
    - Add caching mechanism for density center results
    - _Requirements: 3.1, 3.2_

  - [ ]* 5.2 Write property test for station density center calculation
    - **Property 6: Station Density Center Calculation**
    - **Validates: Requirements 3.1**

- [x] 6. Implement location-based speed estimation
  - [x] 6.1 Add location-based speed calculation methods to SpeedPredictor
    - Implement distance-to-center calculations and speed formula
    - Apply urban vs suburban speed adjustments based on density
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.2 Write property test for distance-speed relationship
    - **Property 7: Distance-Speed Relationship**
    - **Validates: Requirements 3.2, 3.3, 3.4**

  - [ ]* 6.3 Write property test for location-based speed formula
    - **Property 8: Location-Based Speed Formula**
    - **Validates: Requirements 3.5**

- [-] 7. Integrate speed prediction with vehicle enhancement system
  - [x] 7.1 Add speed prediction integration functions to vehicleEnhancementUtils.ts
    - Implement `enhanceVehicleWithSpeedPrediction()` function
    - Implement `enhanceVehiclesWithSpeedPredictions()` function
    - Merge speed prediction data into existing `predictionMetadata`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 7.2 Update vehicleService.ts to include speed predictions in enhancement pipeline
    - Modify `getVehicles()` method to apply speed predictions after position predictions
    - Ensure proper error handling and fallback to position-only predictions
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 8. Implement enhanced movement estimation with dynamic speed
  - [x] 8.1 Create enhanced movement estimator in speedPredictionUtils.ts
    - Implement `simulateMovementWithDynamicSpeed()` method
    - Use `predictionMetadata.predictedSpeed` instead of static constants
    - Add dwell time application for stationary vehicles near stations
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 8.2 Write property test for movement calculation integration
    - **Property 9: Movement Calculation Integration**
    - **Validates: Requirements 5.1, 5.3**

  - [ ]* 8.3 Write property test for stationary vehicle dwell time
    - **Property 10: Stationary Vehicle Dwell Time**
    - **Validates: Requirements 5.2**

  - [ ]* 8.4 Write property test for dynamic speed recalculation
    - **Property 11: Dynamic Speed Recalculation**
    - **Validates: Requirements 5.4**

- [x] 9. Implement speed display enhancements
  - [x] 9.1 Create SpeedDisplayFormatter class in speedPredictionUtils.ts
    - Implement `formatSpeedDisplay()` method with km/h formatting and status logic
    - Add confidence indication for low-confidence predictions
    - Handle "At Stop" status for stationary vehicles near stations
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 9.2 Write property test for speed display format and status
    - **Property 12: Speed Display Format and Status**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [ ]* 9.3 Write property test for confidence indication
    - **Property 13: Confidence Indication**
    - **Validates: Requirements 6.4**

- [ ] 10. Add comprehensive error handling and performance optimization
  - [ ] 10.1 Implement error handling methods in SpeedPredictor
    - Add timeout protection for calculations (50ms limit)
    - Implement graceful fallback for invalid inputs and calculation errors
    - Add structured logging for debugging and monitoring
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 10.2 Write property test for configuration parameter validation
    - **Property 14: Configuration Parameter Validation**
    - **Validates: Requirements 7.4**

  - [ ]* 10.3 Write property test for graceful error handling
    - **Property 15: Graceful Error Handling**
    - **Validates: Requirements 8.3, 8.4**

- [x] 11. Add utility functions and summary reporting
  - [x] 11.1 Add speed prediction utility functions to vehicleEnhancementUtils.ts
    - Implement `hasSpeedPredictionApplied()` function
    - Implement `getSpeedPredictionSummary()` function for monitoring
    - Add debugging and analysis utilities
    - _Requirements: 8.5_

- [ ] 12. Checkpoint - Ensure all tests pass and integration works
  - Ensure all property-based tests pass with minimum 100 iterations
  - Verify integration with existing position prediction system
  - Test error handling and fallback scenarios
  - Ask the user if questions arise.

- [x] 13. Update arrival calculation integration
  - [x] 13.1 Update arrival calculation utilities to use predicted speeds
    - Modify `src/utils/arrival/timeUtils.ts` to use `predictionMetadata.predictedSpeed`
    - Update movement simulation in `src/utils/vehicle/positionPredictionUtils.ts`
    - Ensure backward compatibility with existing arrival calculations
    - _Requirements: 5.1, 5.3, 5.4_

- [ ] 14. Final integration and validation
  - [ ] 14.1 Update vehicle display components to show speed predictions
    - Modify vehicle display components to use SpeedDisplayFormatter
    - Add speed and confidence indicators to UI components
    - Test real-time updates and display accuracy
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 14.2 Performance testing and optimization
    - Verify calculation times meet 50ms requirement
    - Test with large vehicle datasets
    - Optimize caching and memory usage
    - _Requirements: 8.1, 8.2_

- [ ] 15. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all requirements are met
  - Test end-to-end speed prediction → movement estimation → arrival calculation flow
  - Validate performance and reliability requirements

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- The system integrates seamlessly with existing position prediction and vehicle enhancement utilities
- All speed prediction data is merged into the existing `predictionMetadata` structure for unified access