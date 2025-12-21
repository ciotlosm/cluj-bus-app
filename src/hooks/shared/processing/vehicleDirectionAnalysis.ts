import type { Station, StopTime } from '../../../types';
import type { CoreVehicle } from '../../../types/coreVehicle';
import type { DirectionAnalysisResult } from './types';
import { DirectionStatus, ConfidenceLevel } from '../../../types/coreVehicle';
import { logger } from '../../../utils/shared/logger';

/**
 * Analyze vehicle direction and arrival/departure status relative to a station
 * 
 * This utility function determines whether a vehicle is arriving at or departing from
 * a target station based on stop sequence data and timing information.
 * 
 * @param vehicle Live vehicle to analyze
 * @param targetStation Station to analyze direction relative to
 * @param stopTimes Stop times data for the vehicle's trip
 * @returns Direction analysis result with confidence scoring
 */
export const analyzeVehicleDirection = (
  vehicle: CoreVehicle,
  targetStation: Station,
  stopTimes: StopTime[]
): DirectionAnalysisResult => {
  // Input validation
  if (!vehicle?.tripId || !targetStation?.id || !Array.isArray(stopTimes)) {
    return { direction: DirectionStatus.UNKNOWN, estimatedMinutes: 0, confidence: ConfidenceLevel.LOW };
  }

  // Filter stop times for this vehicle's trip
  const tripStopTimes = stopTimes.filter(stopTime => 
    stopTime && 
    stopTime.tripId === vehicle.tripId &&
    stopTime.stopId &&
    typeof stopTime.sequence === 'number' &&
    !isNaN(stopTime.sequence)
  );

  if (tripStopTimes.length === 0) {
    return { direction: DirectionStatus.UNKNOWN, estimatedMinutes: 0, confidence: ConfidenceLevel.LOW };
  }

  // Sort stop times by sequence
  const sortedStopTimes = tripStopTimes.sort((a, b) => a.sequence - b.sequence);

  // Find the target station in the trip's stop sequence
  const targetStopTime = sortedStopTimes.find(stopTime => stopTime.stopId === targetStation.id);
  
  if (!targetStopTime) {
    return { direction: DirectionStatus.UNKNOWN, estimatedMinutes: 0, confidence: ConfidenceLevel.LOW };
  }

  const targetSequence = targetStopTime.sequence;

  // Simplified approach: estimate position based on time if available
  const now = new Date();
  const vehicleTimestamp = vehicle.timestamp instanceof Date ? vehicle.timestamp : new Date(vehicle.timestamp);
  
  // Calculate time since last vehicle update (in minutes)
  const minutesSinceUpdate = Math.max(0, (now.getTime() - vehicleTimestamp.getTime()) / (1000 * 60));

  let estimatedCurrentSequence = 0;
  let confidence: ConfidenceLevel = ConfidenceLevel.LOW;

  if (targetStopTime.arrivalTime && typeof targetStopTime.arrivalTime === 'string') {
    try {
      // Parse arrival time (HH:MM:SS format)
      const [hours, minutes, seconds] = targetStopTime.arrivalTime.split(':').map(Number);
      const scheduledArrival = new Date();
      scheduledArrival.setHours(hours, minutes, seconds || 0, 0);

      // Calculate time difference
      const timeDiffMinutes = (scheduledArrival.getTime() - now.getTime()) / (1000 * 60);

      if (timeDiffMinutes > 0) {
        // Vehicle should arrive in the future
        estimatedCurrentSequence = Math.max(0, targetSequence - Math.ceil(timeDiffMinutes / 2)); // Assume 2 minutes per stop
        confidence = ConfidenceLevel.MEDIUM;
      } else if (timeDiffMinutes > -10) {
        // Vehicle should have arrived recently (within 10 minutes)
        estimatedCurrentSequence = targetSequence;
        confidence = ConfidenceLevel.MEDIUM;
      } else {
        // Vehicle is likely past this stop
        estimatedCurrentSequence = targetSequence + Math.ceil(Math.abs(timeDiffMinutes) / 2);
        confidence = ConfidenceLevel.LOW;
      }
    } catch (error) {
      // Fallback to sequence-based estimation
      estimatedCurrentSequence = Math.floor(sortedStopTimes.length / 2);
      confidence = ConfidenceLevel.LOW;
    }
  } else {
    // No time data available, use middle of sequence as estimate
    estimatedCurrentSequence = Math.floor(sortedStopTimes.length / 2);
    confidence = ConfidenceLevel.LOW;
  }

  // Determine direction based on sequence comparison
  let direction: DirectionStatus = DirectionStatus.UNKNOWN;
  let estimatedMinutes = 0;

  if (estimatedCurrentSequence < targetSequence) {
    // Vehicle is before the target station → arriving
    direction = DirectionStatus.ARRIVING;
    const remainingStops = targetSequence - estimatedCurrentSequence;
    estimatedMinutes = Math.max(1, remainingStops * 2); // 2 minutes per stop estimate
    
    // Adjust for vehicle age
    estimatedMinutes = Math.max(1, estimatedMinutes - minutesSinceUpdate);
    
    if (confidence === ConfidenceLevel.MEDIUM && remainingStops <= 3) {
      confidence = ConfidenceLevel.HIGH; // High confidence for nearby arrivals with time data
    }
  } else if (estimatedCurrentSequence > targetSequence) {
    // Vehicle is after the target station → departing
    direction = DirectionStatus.DEPARTING;
    const stopsSinceDeparture = estimatedCurrentSequence - targetSequence;
    estimatedMinutes = stopsSinceDeparture * 2; // Time since departure
    
    // Departing vehicles have lower confidence unless very recent
    if (stopsSinceDeparture <= 2 && confidence === ConfidenceLevel.MEDIUM) {
      confidence = ConfidenceLevel.MEDIUM;
    } else {
      confidence = ConfidenceLevel.LOW;
    }
  } else {
    // Vehicle is at or very near the target station
    direction = DirectionStatus.ARRIVING;
    estimatedMinutes = 0; // At station
    
    if (confidence === ConfidenceLevel.MEDIUM) {
      confidence = ConfidenceLevel.HIGH; // High confidence when at station with time data
    }
  }

  // Build stop sequence information if we have enough data
  let stopSequence: DirectionAnalysisResult['stopSequence'] = undefined;
  
  if (sortedStopTimes.length > 1) {
    stopSequence = sortedStopTimes.map((stopTime, index) => {
      const isCurrent = stopTime.sequence === estimatedCurrentSequence;
      const isDestination = index === sortedStopTimes.length - 1;
      
      return {
        stopId: stopTime.stopId,
        stopName: `Stop ${stopTime.stopId}`, // Would need station data for actual names
        sequence: stopTime.sequence,
        isCurrent,
        isDestination
      };
    });
  }

  const result: DirectionAnalysisResult = {
    direction,
    estimatedMinutes: Math.round(estimatedMinutes),
    confidence,
    stopSequence
  };

  logger.debug('Direction analysis completed', {
    vehicleId: vehicle.id,
    tripId: vehicle.tripId,
    targetStationId: targetStation.id,
    result: {
      direction: result.direction,
      estimatedMinutes: result.estimatedMinutes,
      confidence: result.confidence
    }
  }, 'analyzeVehicleDirection');

  return result;
};