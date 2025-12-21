import React from 'react';
import { useConfigStore } from '../../../stores/configStore';
import { useVehicleDisplay } from '../../../../hooks/controllers/useVehicleDisplay';
import { logger } from '../../../../utils/shared/logger';
import type { 
  TransformedVehicleData, 
  VehicleDisplayData 
} from '../../../../types/presentationLayer';
import type { CoreVehicle } from '../../../../types/coreVehicle';
import type { StandardError } from '../../../../hooks/shared/errors/types';

// Use the actual types from the hook
interface StationVehicleGroup {
  station: {
    station: { id: string; name: string; coordinates: { latitude: number; longitude: number } };
    distance: number;
  };
  vehicles: Array<{
    displayData: VehicleDisplayData;
    coreVehicle: CoreVehicle;
    stopSequence: Array<{
      stopId: string;
      stopName: string;
      sequence: number;
      isCurrent: boolean;
      isDestination: boolean;
    }>;
  }>;
  allRoutes: Array<{ routeId: string; routeName: string; vehicleCount: number }>;
}

export interface StationDisplayData {
  stationVehicleGroups: StationVehicleGroup[];
  transformedData: TransformedVehicleData | null;
  stationSelectionResult: any;
  stationSelectionMetadata: any;
  isLoading: boolean;
  error: StandardError | null;
  effectiveLocationForDisplay: { latitude: number; longitude: number } | null;
  hasError: boolean;
  allStations: Array<{
    id: string;
    name: string;
    coordinates: { latitude: number; longitude: number };
    routes: any[];
    isFavorite: boolean;
  }>;
}

export const useStationDisplayData = (): StationDisplayData => {
  const { config } = useConfigStore();
  
  // Use the new vehicle display hook that uses VehicleTransformationService
  const {
    stationVehicleGroups: hookStationGroups,
    transformedData,
    stationSelectionResult,
    stationSelectionMetadata,
    isLoading,
    error
  } = useVehicleDisplay({
    maxVehiclesPerStation: config?.maxVehiclesPerStation || 10
  });
  
  // Convert hook data to the format expected by the component
  const stationVehicleGroups = React.useMemo(() => {
    if (!hookStationGroups || !transformedData) return [];

    return hookStationGroups.map(group => ({
      station: group.station,
      vehicles: group.vehicles.map(displayData => {
        const coreVehicle = transformedData.vehicles.get(displayData.vehicleId);
        if (!coreVehicle) {
          // Fallback: create a minimal core vehicle from display data
          return {
            displayData,
            coreVehicle: {
              id: displayData.vehicleId,
              routeId: displayData.routeName,
              tripId: '',
              label: displayData.vehicleLabel,
              position: { latitude: 0, longitude: 0 },
              timestamp: displayData.lastUpdated,
              isWheelchairAccessible: displayData.isWheelchairAccessible,
              isBikeAccessible: displayData.isBikeAccessible
            },
            stopSequence: [] // No stop sequence for fallback vehicles
          };
        }
        
        // Extract stop sequence from enhanced direction analysis data
        const directionData = transformedData.directions.get(displayData.vehicleId);
        const stopSequence = directionData?.stopSequence || [];
        
        return {
          displayData,
          coreVehicle,
          stopSequence
        };
      }),
      allRoutes: group.allRoutes
    }));
  }, [hookStationGroups, transformedData]);

  // Create effectiveLocationForDisplay from transformation context
  const effectiveLocationForDisplay = transformedData?.metadata.contextSnapshot.userLocation || null;

  // Use error from vehicle display hook
  const hasError = !!error;

  // Log transformation service integration for debugging
  React.useEffect(() => {
    if (transformedData) {
      logger.info('🎯 StationDisplay using VehicleTransformationService', {
        stationGroupsCount: stationVehicleGroups.length,
        vehiclesProcessed: transformedData.metadata.vehiclesProcessed,
        vehiclesTransformed: transformedData.metadata.vehiclesTransformed,
        transformationDuration: `${transformedData.metadata.transformationDuration}ms`,
        stationsFound: transformedData.stationInfo.size,
        routesFound: transformedData.routeInfo.size,
        hasError: !!error,
        realTimeVehicles: transformedData.realTimeVehicles.size,
        scheduledVehicles: transformedData.scheduledVehicles.size
      }, 'STATION_DISPLAY_TRANSFORMATION');
    }
  }, [transformedData, stationVehicleGroups.length, error]);

  // Get all stations for map functionality - use stations from transformation context
  const allStations = transformedData?.stationInfo ? 
    Array.from(transformedData.stationInfo.values()).map(stationInfo => ({
      id: stationInfo.id,
      name: stationInfo.name,
      coordinates: stationInfo.coordinates,
      routes: [], // Route information is handled by StationSelector
      isFavorite: false
    })) : [];

  return {
    stationVehicleGroups,
    transformedData,
    stationSelectionResult,
    stationSelectionMetadata,
    isLoading,
    error,
    effectiveLocationForDisplay,
    hasError,
    allStations
  };
};