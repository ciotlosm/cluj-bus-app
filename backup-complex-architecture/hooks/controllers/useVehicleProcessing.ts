/**
 * Main useVehicleProcessing hook - now uses the new VehicleTransformationService architecture
 * 
 * This file has been updated to use the new transformation service that provides:
 * - Centralized vehicle data transformations through VehicleTransformationService
 * - Unified type system with CoreVehicle, VehicleSchedule, VehicleDirection interfaces
 * - Separation of concerns between data, business logic, and presentation layers
 * - Performance optimizations with caching and efficient data structures
 * - Comprehensive error handling and validation
 * 
 * Requirements: 2.4, 8.1, 8.2
 */

// Re-export the updated hook that uses VehicleTransformationService
export {
  useVehicleDisplay as useVehicleProcessing,
  type UseVehicleDisplayOptions as VehicleProcessingOptions,
  type UseVehicleDisplayResult as VehicleProcessingResult
} from './useVehicleDisplay';