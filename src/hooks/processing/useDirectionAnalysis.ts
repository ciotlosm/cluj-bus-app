import { useMemo } from 'react';
import type { Station, StopTime } from '../../types';
import type { CoreVehicle } from '../../types/coreVehicle';
import { DirectionStatus, ConfidenceLevel } from '../../types/coreVehicle';
import type { DirectionAnalysisResult } from '../shared/processing/types';
// Distance calculation handled by direction analysis utilities
import { logger } from '../../utils/shared/logger';
import { InputValidator } from '../shared/validation/InputValidator';
import { validateCoordinates } from '../shared/validation/coordinateValidators';
import { validateArray } from '../shared/validation/arrayValidators';
import { ErrorHandler } from '../shared/errors/ErrorHandler';
import { ErrorType } from '../shared/errors/types';





// DirectionAnalysisResult is imported from shared/processing/types

/**
 * Hook for analyzing vehicle direction and arrival/departure status
 * 
 * This is a pure processing hook that takes a vehicle, target station, and stop times
 * and determines whether the vehicle is arriving at or departing from the station.
 * It handles:
 * - Arrival/departure analysis using stop sequence data
 * - Confidence scoring based on data quality
 * - Estimated arrival time calculations
 * - Input validation and safe defaults
 * 
 * @param vehicle Live vehicle to analyze
 * @param targetStation Station to analyze direction relative to
 * @param stopTimes Stop times data for the vehicle's trip
 * @returns Direction analysis result with confidence scoring
 */
export const useDirectionAnalysis = (
  vehicle: CoreVehicle | null,
  targetStation: Station | null,
  stopTimes: StopTime[]
): DirectionAnalysisResult => {
  return useMemo(() => {
    const unknownResult: DirectionAnalysisResult = {
      direction: DirectionStatus.UNKNOWN,
      estimatedMinutes: 0,
      confidence: ConfidenceLevel.LOW
    };

    // Input validation using shared validation library
    const vehicleValidation = InputValidator.validateObject(
      vehicle,
      'vehicle',
      ['id', 'tripId', 'position']
    );
    
    if (!vehicleValidation.isValid) {
      const error = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Invalid vehicle provided for direction analysis',
        { 
          vehicle,
          validationErrors: vehicleValidation.errors
        }
      );
      
      logger.debug(error.message, ErrorHandler.createErrorReport(error), 'useDirectionAnalysis');
      return unknownResult;
    }

    const stationValidation = InputValidator.validateObject(
      targetStation,
      'targetStation',
      ['id', 'coordinates']
    );
    
    if (!stationValidation.isValid) {
      const error = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Invalid target station provided for direction analysis',
        { 
          targetStation,
          validationErrors: stationValidation.errors
        }
      );
      
      logger.debug(error.message, ErrorHandler.createErrorReport(error), 'useDirectionAnalysis');
      return unknownResult;
    }

    // Validate stop times array using shared validation
    const stopTimesValidation = validateArray(
      stopTimes,
      (item) => {
        const stopTimeValidation = InputValidator.validateObject(
          item,
          'stopTime',
          ['tripId', 'stopId', 'sequence']
        );
        return stopTimeValidation;
      },
      'stopTimes',
      true // allow empty
    );
    
    if (!stopTimesValidation.isValid) {
      const error = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Invalid stop times provided for direction analysis',
        { 
          stopTimes,
          validationErrors: stopTimesValidation.errors
        }
      );
      
      logger.debug(error.message, ErrorHandler.createErrorReport(error), 'useDirectionAnalysis');
      return unknownResult;
    }

    // Validate vehicle position coordinates
    const vehiclePositionValidation = validateCoordinates(vehicle!.position, 'vehicle.position');
    if (!vehiclePositionValidation.isValid) {
      const error = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Vehicle position coordinates are invalid',
        { 
          vehicleId: vehicle!.id,
          position: vehicle!.position,
          validationErrors: vehiclePositionValidation.errors
        }
      );
      
      logger.debug(error.message, ErrorHandler.createErrorReport(error), 'useDirectionAnalysis');
      return unknownResult;
    }

    // Validate target station coordinates
    const stationCoordinatesValidation = validateCoordinates(targetStation!.coordinates, 'targetStation.coordinates');
    if (!stationCoordinatesValidation.isValid) {
      const error = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Target station coordinates are invalid',
        { 
          stationId: targetStation!.id,
          coordinates: targetStation!.coordinates,
          validationErrors: stationCoordinatesValidation.errors
        }
      );
      
      logger.debug(error.message, ErrorHandler.createErrorReport(error), 'useDirectionAnalysis');
      return unknownResult;
    }

    // Filter stop times for this vehicle's trip using validated data
    const validStopTimes = stopTimesValidation.data!;
    const tripStopTimes = validStopTimes.filter(stopTime => 
      stopTime.tripId === vehicle.tripId &&
      stopTime.stopId &&
      typeof stopTime.sequence === 'number' &&
      !isNaN(stopTime.sequence)
    );

    if (tripStopTimes.length === 0) {
      logger.debug('No valid stop times found for vehicle trip', {
        vehicleId: vehicle.id,
        tripId: vehicle.tripId,
        totalStopTimes: stopTimes.length
      }, 'useDirectionAnalysis');
      
      return {
        direction: DirectionStatus.UNKNOWN,
        estimatedMinutes: 0,
        confidence: ConfidenceLevel.LOW
      };
    }

    // Sort stop times by sequence
    const sortedStopTimes = tripStopTimes.sort((a, b) => Number(a.sequence) - Number(b.sequence));

    // Find the target station in the trip's stop sequence
    const targetStopTime = sortedStopTimes.find(stopTime => stopTime.stopId === targetStation.id);
    
    if (!targetStopTime) {
      logger.debug('Target station not found in vehicle trip', {
        vehicleId: vehicle.id,
        tripId: vehicle.tripId,
        targetStationId: targetStation.id,
        tripStops: sortedStopTimes.map(st => st.stopId)
      }, 'useDirectionAnalysis');
      
      return {
        direction: DirectionStatus.UNKNOWN,
        estimatedMinutes: 0,
        confidence: ConfidenceLevel.LOW
      };
    }

    const targetSequence = targetStopTime.sequence as number;

    // Find the vehicle's current position in the stop sequence
    // We'll determine this by finding the closest stop to the vehicle's GPS position
    // Note: These variables are for future implementation when station coordinates are available

    // We need station data to calculate distances, but we don't have it directly
    // For now, we'll use a simplified approach based on sequence position
    // In a real implementation, this would need access to all station coordinates

    // Simplified approach: assume the vehicle is progressing through the sequence
    // and estimate position based on time if available
    const now = new Date();
    const vehicleTimestamp = vehicle.timestamp instanceof Date ? vehicle.timestamp : new Date(vehicle.timestamp);
    
    // Calculate time since last vehicle update (in minutes)
    const minutesSinceUpdate = Math.max(0, (now.getTime() - vehicleTimestamp.getTime()) / (1000 * 60));

    // If we have arrival times, use them for better analysis
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
        logger.debug('Failed to parse arrival time', {
          arrivalTime: targetStopTime.arrivalTime,
          error: error instanceof Error ? error.message : String(error)
        }, 'useDirectionAnalysis');
        
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
        
        // Estimate arrival time for each stop
        let estimatedArrival: Date | undefined;
        if (stopTime.arrivalTime) {
          try {
            const [hours, minutes, seconds] = (stopTime.arrivalTime as string).split(':').map(Number);
            estimatedArrival = new Date();
            estimatedArrival.setHours(hours, minutes, seconds || 0, 0);
          } catch (error) {
            // Ignore parsing errors
          }
        }

        return {
          stopId: stopTime.stopId as string,
          stopName: `Stop ${stopTime.stopId}`, // Would need station data for actual names
          sequence: stopTime.sequence as number,
          isCurrent,
          isDestination,
          estimatedArrival
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
      },
      analysis: {
        targetSequence,
        estimatedCurrentSequence,
        totalStops: sortedStopTimes.length,
        hasTimeData: !!targetStopTime.arrivalTime
      }
    }, 'useDirectionAnalysis');

    return result;
  }, [vehicle, targetStation, stopTimes]);
};