import React from 'react';
import { useConfigStore } from '../../../stores/configStore';
import { logger } from '../../../../utils/shared/logger';

// Use the same type structure as in useStationDisplayData
interface StationVehicleGroup {
  station: {
    station: { id: string; name: string; coordinates: { latitude: number; longitude: number } };
    distance: number;
  };
  vehicles: Array<{
    displayData: any; // VehicleDisplayData
    coreVehicle: any; // CoreVehicle
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

export interface ProcessedStationGroups {
  processedStationGroups: StationVehicleGroup[];
  hasStationsWithVehicles: boolean;
}

export const useStationGroupProcessing = (
  stationVehicleGroups: StationVehicleGroup[],
  selectedRoutePerStation: Map<string, string>
): ProcessedStationGroups => {
  const { config } = useConfigStore();

  // Process station groups with per-station route filtering and deduplication
  const processedStationGroups = React.useMemo(() => {
    const maxVehicles = config?.maxVehiclesPerStation || 5;
    
    return stationVehicleGroups.map(stationGroup => {
      const selectedRoute = selectedRoutePerStation.get(stationGroup.station.station.id);
      
      if (selectedRoute) {
        // Filter to show only vehicles from the selected route (all vehicles for that route)
        const filteredVehicles = stationGroup.vehicles.filter(vehicle => 
          vehicle.coreVehicle.routeId === selectedRoute
        );

        return {
          ...stationGroup,
          vehicles: filteredVehicles
        };
      } else {
        // No filter active for this station - apply deduplication (best vehicle per route)
        const routeGroups = new Map<string, typeof stationGroup.vehicles>();
        
        // Group vehicles by route
        stationGroup.vehicles.forEach(vehicle => {
          const routeId = vehicle.coreVehicle.routeId;
          if (!routeGroups.has(routeId)) {
            routeGroups.set(routeId, []);
          }
          routeGroups.get(routeId)!.push(vehicle);
        });

        // Select the best vehicle per route based on priority
        const bestVehiclePerRoute = Array.from(routeGroups.entries()).map(([routeId, vehicles]) => {
          // Sort vehicles within this route by priority using display data
          const sortedVehicles = vehicles.sort((a, b) => {
            // Use display priority from VehicleDisplayData
            return b.displayData.displayPriority - a.displayData.displayPriority;
          });
          
          // Return the best vehicle for this route
          return sortedVehicles[0];
        });

        // Sort by display priority and apply vehicle limit
        const finalVehicles = bestVehiclePerRoute
          .sort((a, b) => {
            return b.displayData.displayPriority - a.displayData.displayPriority;
          })
          .slice(0, maxVehicles);

        return {
          ...stationGroup,
          vehicles: finalVehicles
        };
      }
    });
  }, [stationVehicleGroups, selectedRoutePerStation, config?.maxVehiclesPerStation]);

  // Check if we have any stations with vehicles after processing
  const hasStationsWithVehicles = processedStationGroups.some(group => group.vehicles.length > 0);

  // Debug logging for processed data
  React.useEffect(() => {
    logger.debug('StationDisplay processed data state', {
      stationGroupsCount: stationVehicleGroups.length,
      processedGroupsCount: processedStationGroups.length,
      groupsWithVehicles: processedStationGroups.filter(g => g.vehicles.length > 0).length,
      hasStationsWithVehicles
    }, 'STATION_DISPLAY_DEBUG');
  }, [stationVehicleGroups.length, processedStationGroups.length, hasStationsWithVehicles]);

  return {
    processedStationGroups,
    hasStationsWithVehicles
  };
};