/**
 * Example usage of the transformation pipeline infrastructure
 * 
 * This file demonstrates how to use the TransformationPipeline class
 * and related interfaces to create a composable data processing pipeline.
 */

import {
  TransformationPipeline,
  TransformationError,
  createSuccessValidation,
  createFailureValidation,
  createValidationError,
} from './transformationPipeline';
import type { TransformationStep, TransformationValidationResult } from './transformationPipeline';
import type { TransformationContext } from './presentationLayer';
import { ConfidenceLevel } from './coreVehicle';

// Example: Simple data transformation pipeline

interface RawApiData {
  vehicles: Array<{
    id: string;
    lat: number;
    lng: number;
    route: string;
  }>;
}

interface NormalizedData {
  vehicles: Array<{
    id: string;
    position: { latitude: number; longitude: number };
    routeId: string;
  }>;
}

interface EnrichedData extends NormalizedData {
  vehicles: Array<{
    id: string;
    position: { latitude: number; longitude: number };
    routeId: string;
    distanceFromUser?: number;
  }>;
}

interface DisplayData {
  vehicles: Array<{
    id: string;
    displayName: string;
    location: string;
    distance: string;
  }>;
}

// Step 1: Normalize API data
const normalizeApiDataStep: TransformationStep<RawApiData, NormalizedData> = {
  name: 'normalizeApiData',
  
  validate: (input: RawApiData): TransformationValidationResult => {
    if (!input || !Array.isArray(input.vehicles)) {
      return createFailureValidation([
        createValidationError('vehicles', 'Vehicles array is required', 'MISSING_VEHICLES')
      ]);
    }
    
    const invalidVehicles = input.vehicles.filter(v => 
      !v.id || typeof v.lat !== 'number' || typeof v.lng !== 'number' || !v.route
    );
    
    if (invalidVehicles.length > 0) {
      return createFailureValidation([
        createValidationError(
          'vehicles', 
          `${invalidVehicles.length} vehicles have invalid data`, 
          'INVALID_VEHICLE_DATA'
        )
      ]);
    }
    
    return createSuccessValidation();
  },
  
  transform: (input: RawApiData, context: TransformationContext): NormalizedData => {
    return {
      vehicles: input.vehicles.map(vehicle => ({
        id: vehicle.id,
        position: {
          latitude: vehicle.lat,
          longitude: vehicle.lng,
        },
        routeId: vehicle.route,
      })),
    };
  },
};

// Step 2: Enrich with user context
const enrichWithUserContextStep: TransformationStep<NormalizedData, EnrichedData> = {
  name: 'enrichWithUserContext',
  
  transform: (input: NormalizedData, context: TransformationContext): EnrichedData => {
    const enrichedVehicles = input.vehicles.map(vehicle => {
      let distanceFromUser: number | undefined;
      
      if (context.userLocation) {
        // Simple distance calculation (in a real implementation, you'd use a proper distance function)
        const latDiff = vehicle.position.latitude - context.userLocation.latitude;
        const lngDiff = vehicle.position.longitude - context.userLocation.longitude;
        distanceFromUser = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111000; // Rough conversion to meters
      }
      
      return {
        ...vehicle,
        distanceFromUser,
      };
    });
    
    return {
      vehicles: enrichedVehicles,
    };
  },
};

// Step 3: Generate display data
const generateDisplayDataStep: TransformationStep<EnrichedData, DisplayData> = {
  name: 'generateDisplayData',
  
  transform: (input: EnrichedData, context: TransformationContext): DisplayData => {
    return {
      vehicles: input.vehicles.map(vehicle => ({
        id: vehicle.id,
        displayName: `Route ${vehicle.routeId}`,
        location: `${vehicle.position.latitude.toFixed(4)}, ${vehicle.position.longitude.toFixed(4)}`,
        distance: vehicle.distanceFromUser 
          ? `${Math.round(vehicle.distanceFromUser)}m away`
          : 'Distance unknown',
      })),
    };
  },
};

// Example usage
export function createVehicleDataPipeline(): TransformationPipeline {
  return new TransformationPipeline()
    .addStep(normalizeApiDataStep)
    .addStep(enrichWithUserContextStep)
    .addStep(generateDisplayDataStep);
}

// Example of using the pipeline
export function processVehicleData(
  rawData: RawApiData,
  context: TransformationContext
): DisplayData {
  const pipeline = createVehicleDataPipeline();
  
  try {
    return pipeline.execute(rawData, context);
  } catch (error) {
    if (error instanceof TransformationError) {
      console.error('Transformation failed:', error.toDetailedString());
      
      // Handle recoverable errors
      if (error.recoverable) {
        console.log('Attempting to continue with partial data...');
        // Implement fallback logic here
      }
    }
    
    throw error;
  }
}

// Example context
const exampleContext: TransformationContext = {
  favoriteRoutes: ['24', '35'],
  targetStations: [],
  preferences: {
    timeFormat: '24h',
    distanceUnit: 'metric',
    language: 'en',
    maxWalkingDistance: 500,
    arrivalBuffer: 5,
    wheelchairAccessibleOnly: false,
    bikeAccessibleOnly: false,
    preferredRouteTypes: [],
    preferRealTimeData: true,
    confidenceThreshold: ConfidenceLevel.MEDIUM
  },
  timestamp: new Date(),
  timezone: 'Europe/Bucharest',
  userContext: 'unknown',
  maxVehiclesPerRoute: 5,
  maxRoutes: 10,
  includeScheduleData: true,
  includeDirectionAnalysis: true,
  apiConfig: {
    apiKey: 'test-api-key',
    agencyId: 'test-agency',
    timeout: 5000
  },
  userLocation: {
    latitude: 46.7712,
    longitude: 23.6236,
  },
};

// Example raw data
const exampleRawData: RawApiData = {
  vehicles: [
    {
      id: 'vehicle-1',
      lat: 46.7700,
      lng: 23.6200,
      route: '24',
    },
    {
      id: 'vehicle-2',
      lat: 46.7750,
      lng: 23.6300,
      route: '35',
    },
  ],
};

// Process the data
if (typeof window === 'undefined') {
  // Only run in Node.js environment (for testing)
  try {
    const result = processVehicleData(exampleRawData, exampleContext);
    console.log('Processed vehicle data:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Failed to process vehicle data:', error);
  }
}