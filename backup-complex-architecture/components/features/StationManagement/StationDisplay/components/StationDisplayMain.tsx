import React from 'react';
import {
  Box,
  Stack,
} from '@mui/material';
import { useConfigStore } from '../../../stores/configStore';
import { VehicleCard } from '../VehicleTracking/VehicleCard';
import { StationHeader } from '../../StationHeader';
import { RouteFilterChips } from '../VehicleTracking/RouteFilterChips';
import { BusRouteMapModal } from '../MapVisualization/BusRouteMapModal';
import { StationMapModal } from '../MapVisualization/StationMapModal';
import { useStationDisplayData } from './hooks/useStationDisplayData';
import { useStationGroupProcessing } from './hooks/useStationGroupProcessing';
import { 
  buildCheckedStationsInfo, 
  buildEmptyMessage, 
  convertVehicleToMapModalBusInfo, 
  getErrorMessage 
} from '../utils/stationDisplayUtils';
import { LoadingState, ErrorState, EmptyVehiclesState } from './StationDisplayStates';
import type { VehicleDisplayData } from '../../../../types/presentationLayer';
import type { CoreVehicle } from '../../../../types/coreVehicle';

interface StationDisplayMainProps {}

export const StationDisplayMain: React.FC<StationDisplayMainProps> = () => {
  const { config } = useConfigStore();
  
  // State for route filtering per station
  const [selectedRoutePerStation, setSelectedRoutePerStation] = React.useState<Map<string, string>>(new Map());
  
  // State for managing expanded stops per vehicle
  const [expandedVehicles, setExpandedVehicles] = React.useState<Set<string>>(new Set());
  
  // State for managing individual bus route map modal
  const [mapModalOpen, setMapModalOpen] = React.useState(false);
  const [selectedVehicleForMap, setSelectedVehicleForMap] = React.useState<{
    displayData: VehicleDisplayData;
    coreVehicle: CoreVehicle;
    stopSequence?: Array<{
      stopId: string;
      stopName: string;
      sequence: number;
      isCurrent: boolean;
      isDestination: boolean;
    }>;
  } | null>(null);
  const [targetStationId, setTargetStationId] = React.useState<string>('');
  
  // State for managing station map modal (all routes for a station)
  const [stationMapModalOpen, setStationMapModalOpen] = React.useState(false);
  const [selectedStationForMap, setSelectedStationForMap] = React.useState<{
    station: { id: string; name: string; coordinates: { latitude: number; longitude: number } };
    distance: number;
    vehicles: Array<{
      displayData: VehicleDisplayData;
      coreVehicle: CoreVehicle;
      stopSequence?: Array<{
        stopId: string;
        stopName: string;
        sequence: number;
        isCurrent: boolean;
        isDestination: boolean;
      }>;
    }>;
    allVehicles: Array<{
      displayData: VehicleDisplayData;
      coreVehicle: CoreVehicle;
      stopSequence?: Array<{
        stopId: string;
        stopName: string;
        sequence: number;
        isCurrent: boolean;
        isDestination: boolean;
      }>;
    }>; // All vehicles for map, not deduplicated
  } | null>(null);

  // Get station display data
  const {
    stationVehicleGroups,
    transformedData,
    stationSelectionResult,
    isLoading,
    error,
    effectiveLocationForDisplay,
    hasError
  } = useStationDisplayData();

  // Process station groups with filtering and deduplication
  const { processedStationGroups, hasStationsWithVehicles } = useStationGroupProcessing(
    stationVehicleGroups,
    selectedRoutePerStation
  );

  // Build checked stations info and empty message
  const checkedStationsInfo = React.useMemo(() => 
    buildCheckedStationsInfo(stationSelectionResult, isLoading, effectiveLocationForDisplay),
    [stationSelectionResult, isLoading, effectiveLocationForDisplay]
  );

  const emptyMessage = React.useMemo(() => 
    buildEmptyMessage(checkedStationsInfo),
    [checkedStationsInfo]
  );

  // Show loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Handle transformation service errors
  if (hasError) {
    const { title, message } = getErrorMessage(error);
    return <ErrorState title={title} message={message} />;
  }

  // Show empty state if no stations have vehicles
  if (!hasStationsWithVehicles) {
    return <EmptyVehiclesState emptyMessage={emptyMessage} />;
  }

  return (
    <Box sx={{ px: 3, pb: 3, pt: 1 }}>
      <Stack spacing={4}>
        {/* Only show stations that have vehicles serving them */}
        {processedStationGroups.map((stationGroup, stationIndex) => {
          // Skip if no vehicles
          if (!stationGroup.vehicles.length) {
            return null;
          }
          
          return (
            <Box key={stationGroup.station.station.id}>
              {/* Station Section Header */}
              <Box sx={{ mb: 2 }}>
                <StationHeader
                  stationName={stationGroup.station.station.name}
                  distance={stationGroup.station.distance}
                  isClosest={stationIndex === 0}
                  onClick={() => {
                    // Find the original station group with all vehicles (before deduplication)
                    const originalStationGroup = stationVehicleGroups.find(
                      sg => sg.station.station.id === stationGroup.station.station.id
                    );
                    
                    setSelectedStationForMap({
                      station: stationGroup.station.station,
                      distance: stationGroup.station.distance,
                      vehicles: stationGroup.vehicles, // Deduplicated vehicles for display context
                      allVehicles: originalStationGroup?.vehicles || stationGroup.vehicles // All vehicles for map
                    });
                    setStationMapModalOpen(true);
                  }}
                />
                
                {/* Route filter buttons */}
                {stationGroup.allRoutes && stationGroup.allRoutes.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <RouteFilterChips
                      routes={stationGroup.allRoutes}
                      selectedRouteId={selectedRoutePerStation.get(stationGroup.station.station.id)}
                      onRouteSelect={(routeId) => {
                        const newSelection = new Map(selectedRoutePerStation);
                        if (routeId) {
                          newSelection.set(stationGroup.station.station.id, routeId);
                        } else {
                          newSelection.delete(stationGroup.station.station.id);
                        }
                        setSelectedRoutePerStation(newSelection);
                      }}
                    />
                  </Box>
                )}
              </Box>
              
              {/* Vehicles for this station */}
              <Stack spacing={2}>
                {stationGroup.vehicles.map((vehicle, index) => (
                  <VehicleCard
                    key={`${vehicle.coreVehicle.id}-${stationGroup.station.station.id}-${index}`}
                    vehicle={vehicle.coreVehicle}
                    stationId={stationGroup.station.station.id}
                    isExpanded={expandedVehicles.has(vehicle.coreVehicle.id)}
                    arrivalText={vehicle.displayData?.arrivalText}
                    destination={vehicle.displayData?.destination}
                    onToggleExpanded={() => {
                      const newExpanded = new Set(expandedVehicles);
                      if (expandedVehicles.has(vehicle.coreVehicle.id)) {
                        newExpanded.delete(vehicle.coreVehicle.id);
                      } else {
                        newExpanded.add(vehicle.coreVehicle.id);
                      }
                      setExpandedVehicles(newExpanded);
                    }}
                    onShowMap={() => {
                      setSelectedVehicleForMap(vehicle);
                      setTargetStationId(stationGroup.station.station.id);
                      setMapModalOpen(true);
                    }}
                    onRouteClick={() => {
                      const newSelection = new Map(selectedRoutePerStation);
                      const isSelected = selectedRoutePerStation.get(stationGroup.station.station.id) === vehicle.coreVehicle.routeId;
                      
                      if (isSelected) {
                        newSelection.delete(stationGroup.station.station.id);
                      } else {
                        newSelection.set(stationGroup.station.station.id, vehicle.coreVehicle.routeId);
                      }
                      setSelectedRoutePerStation(newSelection);
                    }}
                    showShortStopList={false} // Don't show short stop list in station view
                    showFullStopsButton={true} // Show "Show all stops" button
                    stopSequence={vehicle.stopSequence}
                  />
                ))}
              </Stack>
            </Box>
          );
        }).filter(Boolean)}
      </Stack>
      
      {/* Individual Bus Route Map Modal */}
      {selectedVehicleForMap && (
        <BusRouteMapModal
          open={mapModalOpen}
          onClose={() => {
            setMapModalOpen(false);
            setSelectedVehicleForMap(null);
            setTargetStationId('');
          }}
          bus={convertVehicleToMapModalBusInfo(selectedVehicleForMap, targetStationId, transformedData)}
          userLocation={null} // Don't show user location as requested
          cityName={config?.city || 'Cluj-Napoca'}
        />
      )}

      {/* Station Map Modal (All Routes for Station) */}
      {selectedStationForMap && selectedStationForMap.allVehicles && (
        <StationMapModal
          open={stationMapModalOpen}
          onClose={() => {
            setStationMapModalOpen(false);
            setSelectedStationForMap(null);
          }}
          station={{
            ...selectedStationForMap.station,
            isFavorite: false, // Station display doesn't track favorites
            routeIds: [], 
            accessibility: { 
              wheelchairAccessible: false, 
              bikeAccessible: false, 
              bikeRacks: false, 
              audioAnnouncements: false 
            }
          }}
          vehicles={selectedStationForMap.allVehicles.map(vehicle => ({
            id: vehicle.coreVehicle.id,
            routeId: vehicle.coreVehicle.routeId,
            route: vehicle.displayData.routeName,
            destination: vehicle.displayData.destination,
            vehicle: (vehicle.coreVehicle.position?.latitude && vehicle.coreVehicle.position?.longitude) ? {
              position: {
                latitude: vehicle.coreVehicle.position.latitude,
                longitude: vehicle.coreVehicle.position.longitude
              },
              tripId: vehicle.coreVehicle.tripId
            } : undefined,
            minutesAway: parseInt(vehicle.displayData.arrivalText.match(/\d+/)?.[0] || '0'),
            _internalDirection: (vehicle.displayData.directionText?.includes('left') ? 'departing' : 'arriving') as 'departing' | 'arriving' | 'unknown'
          })).filter(vehicle => 
            vehicle.vehicle?.position && 
            !isNaN(vehicle.vehicle.position.latitude) && 
            !isNaN(vehicle.vehicle.position.longitude)
          )}
          userLocation={effectiveLocationForDisplay}
          cityName={config?.city || 'Cluj-Napoca'}
          agencyId={config?.agencyId}
        />
      )}
    </Box>
  );
};