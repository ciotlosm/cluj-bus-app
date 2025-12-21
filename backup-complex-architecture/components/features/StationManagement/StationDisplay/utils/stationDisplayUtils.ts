import React from 'react';
import { calculateDistance } from '../../../../utils/data-processing/distanceUtils';
import { RouteType } from '../../../../types/coreVehicle';
import type { 
  VehicleDisplayData, 
  TransformedVehicleData 
} from '../../../../types/presentationLayer';
import type { CoreVehicle } from '../../../../types/coreVehicle';
import type { MapModalBusInfo } from '../../../../types/mapModal';
import type { StandardError } from '../../../../hooks/shared/errors/types';

export interface CheckedStationInfo {
  name: string;
  routeCount: number;
  distance: number;
}

export const buildCheckedStationsInfo = (
  stationSelectionResult: any,
  isLoading: boolean,
  effectiveLocationForDisplay: { latitude: number; longitude: number } | null
): CheckedStationInfo[] | null => {
  // Don't process if still isLoading
  if (isLoading || !stationSelectionResult) {
    return null;
  }

  const checkedStations: CheckedStationInfo[] = [];
  
  // Use stations that were actually evaluated by StationSelector
  if (stationSelectionResult.closestStation) {
    checkedStations.push({
      name: stationSelectionResult.closestStation.name,
      routeCount: stationSelectionResult.closestStation.associatedRoutes.length,
      distance: stationSelectionResult.closestStation.distanceFromUser
    });
  }
  
  if (stationSelectionResult.secondStation) {
    checkedStations.push({
      name: stationSelectionResult.secondStation.name,
      routeCount: stationSelectionResult.secondStation.associatedRoutes.length,
      distance: stationSelectionResult.secondStation.distanceFromUser
    });
  }
  
  // Include rejected stations for context (optional, to show what was checked)
  const nearbyRejectedStations = stationSelectionResult.rejectedStations
    .filter((rejected: any) => rejected.rejectionReason === 'threshold_exceeded')
    .slice(0, 2) // Show up to 2 additional nearby stations
    .map((rejected: any) => {
      // Calculate distance for rejected stations if not available
      const distance = effectiveLocationForDisplay 
        ? calculateDistance(effectiveLocationForDisplay, rejected.station.coordinates)
        : 0;
      
      return {
        name: rejected.station.name,
        routeCount: rejected.station.routeIds?.length || 0,
        distance: distance
      };
    });
  
  checkedStations.push(...nearbyRejectedStations);
  
  // Sort by distance from user location as required
  return checkedStations.sort((a, b) => a.distance - b.distance);
};

export const buildEmptyMessage = (checkedStationsInfo: CheckedStationInfo[] | null): string => {
  if (!checkedStationsInfo || checkedStationsInfo.length === 0) {
    return "No vehicles are currently active for nearby stations (based on your filter).";
  }

  // Check if any stations have route information
  const stationsWithRoutes = checkedStationsInfo.filter(s => s.routeCount > 0);
  
  if (stationsWithRoutes.length > 0) {
    // Show enhanced message with route counts and distances
    const stationList = stationsWithRoutes
      .map(s => `${s.name} (${s.routeCount} route${s.routeCount > 1 ? 's' : ''}, ${Math.round(s.distance)}m)`)
      .join(', ');
    return `No vehicles are currently active. Checked stations with active routes: ${stationList}`;
  } else {
    // Show simplified message with just station names and distances (no route info available)
    const stationList = checkedStationsInfo
      .map(s => `${s.name} (${Math.round(s.distance)}m)`)
      .join(', ');
    return `No vehicles are currently active. Checked nearby stations: ${stationList}`;
  }
};

export const convertVehicleToMapModalBusInfo = (
  vehicle: {
    displayData: VehicleDisplayData;
    coreVehicle: CoreVehicle;
    stopSequence?: Array<{
      stopId: string;
      stopName: string;
      sequence: number;
      isCurrent: boolean;
      isDestination: boolean;
    }>;
  }, 
  targetStationId: string,
  transformedData: TransformedVehicleData | null
): MapModalBusInfo => {
  return {
    routeName: vehicle.displayData.routeName,
    routeDesc: vehicle.displayData.destination,
    routeType: RouteType.BUS,
    vehicleId: vehicle.coreVehicle.id,
    tripId: vehicle.coreVehicle.tripId || '',
    label: vehicle.coreVehicle.label,
    destination: vehicle.displayData.destination,
    latitude: vehicle.coreVehicle.position?.latitude || 0,
    longitude: vehicle.coreVehicle.position?.longitude || 0,
    speed: vehicle.coreVehicle.speed,
    bearing: vehicle.coreVehicle.bearing,
    lastUpdate: vehicle.coreVehicle.timestamp instanceof Date 
      ? vehicle.coreVehicle.timestamp 
      : vehicle.coreVehicle.timestamp 
        ? new Date(vehicle.coreVehicle.timestamp)
        : new Date(),
    currentStation: null, // TODO: Extract from station info if needed
    stopSequence: vehicle.stopSequence?.map(stop => {
      // Find the corresponding station coordinates from transformed data
      const stationInfo = transformedData?.stationInfo.get(stop.stopId);
      
      return {
        id: stop.stopId,
        name: stop.stopName,
        sequence: stop.sequence,
        coordinates: stationInfo?.coordinates || { latitude: 0, longitude: 0 },
        arrivalTime: undefined,
        isCurrent: stop.isCurrent,
        isClosestToUser: stop.stopId === targetStationId, // Mark the target station (where vehicle is arriving)
        distanceToUser: undefined,
        distanceFromBus: undefined
      };
    }),
    direction: undefined,
    distanceFromUser: undefined
  };
};

export const getErrorMessage = (error: StandardError | null) => {
  const errorMessage = error?.message || '';
  
  if (errorMessage.includes('location')) {
    return {
      title: 'Location Required',
      message: 'Please enable location services to see nearby stations'
    };
  }
  if (errorMessage.includes('stations') || errorMessage.includes('stops')) {
    return {
      title: 'No Nearby Stations',
      message: 'No bus stations found within 5km of your location'
    };
  }
  if (errorMessage.includes('routes') || errorMessage.includes('trips')) {
    return {
      title: 'No Active Routes',
      message: 'No active routes found for nearby stations'
    };
  }
  if (errorMessage.includes('configuration') || errorMessage.includes('API')) {
    return {
      title: 'Configuration Required',
      message: 'Please configure your API settings to see bus data'
    };
  }
  return {
    title: 'Unable to Load Data',
    message: errorMessage || 'Please try again later'
  };
};