/**
 * Arrival Time Utilities - Main exports
 * Pure functions for arrival time calculations
 */

// Main calculation functions
export {
  calculateVehicleArrivalTime,
  calculateMultipleArrivals,
  sortVehiclesByArrival
} from './arrivalUtils.ts';

// Vehicle position utilities
export {
  identifyNextStop,
  determineNextStopEnhanced,
  getSortedTripStops,
  findClosestStopInTrip,
  getNextStopInSequence
} from './vehiclePositionUtils.ts';

// Geometry utilities
export {
  calculateProgressAlongSegment,
  distancePointToLineSegment,
  projectPointToSegment
} from './geometryUtils.ts';

// Distance calculation utilities
export {
  calculateDistanceAlongShape,
  calculateDistanceViaStops,
  projectPointToShape
} from './distanceUtils.ts';

// Distance Calculator class
export { DistanceCalculator, distanceCalculator } from './DistanceCalculator.ts';

// Time calculation utilities
export {
  calculateArrivalTime,
  calculateDwellTime,
  calculateSpeedAdjustedTime,
  calculateTimeRange
} from './timeUtils.ts';

// Status message utilities
export {
  generateStatusMessage,
  getArrivalStatus,
  generateStatusWithConfidence
} from './statusUtils.ts';

// Re-export types and constants for convenience
export type {
  ArrivalTimeResult,
  DistanceResult,
  Vehicle,
  Stop,
  Trip,
  RouteShape,
  ArrivalStatus
} from '../../types/arrivalTime.ts';

export { ARRIVAL_STATUS_SORT_ORDER } from '../../types/arrivalTime.ts';

// Re-export existing coordinate type
export type { Coordinates } from '../location/distanceUtils.ts';