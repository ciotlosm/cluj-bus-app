import React from 'react';
import {
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import { useConfigStore } from '../../../stores/configStore';
import { withPerformanceMonitoring } from '../../../utils/performance';
import { logger } from '../../../utils/shared/logger';
import { calculateDistance } from '../../../utils/data-processing/distanceUtils';
import { MapPinIcon } from '../../ui/base/Icons/Icons';
import { EmptyState } from '../../ui';
import { BusRouteMapModal } from '../shared/BusRouteMapModal';
import { VehicleCard } from '../shared/VehicleCard';
import { StationHeader } from '../shared/StationHeader';
import { StationMapModal } from '../shared/StationMapModal';
import { RouteFilterChips } from '../shared/RouteFilterChips';
import { useVehicleDisplay } from '../../../hooks/controllers/useVehicleDisplay';
import { RouteType } from '../../../types/coreVehicle';
import type { 
  TransformedVehicleData, 
  VehicleDisplayData, 
  TransformationContext 
} from '../../../types/presentationLayer';
import type { CoreVehicle } from '../../../types/coreVehicle';
import type { MapModalBusInfo } from '../../../types/mapModal';


import { useRefreshSystem } from '../../../hooks/shared/useRefreshSystem';

interface StationDisplayProps {
  // No props needed - maxVehicles comes from config
}

const StationDisplayComponent: React.FC<StationDisplayProps> = () => {
  const { config } = useConfigStore();
  
  // State for route filtering per station (must be declared before use)
  const [selectedRoutePerStation, setSelectedRoutePerStation] = React.useState<Map<string, string>>(new Map());
  
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
  
  // The hook handles auto-refresh internally, no manual refresh needed
  
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

  // Additional debug logging for empty states (will be added after processedStationGroups is defined)

  // Get all stations for map functionality - use stations from transformation context
  const allStations = transformedData?.stationInfo ? 
    Array.from(transformedData.stationInfo.values()).map(stationInfo => ({
      id: stationInfo.id,
      name: stationInfo.name,
      coordinates: stationInfo.coordinates,
      routes: [], // Route information is handled by StationSelector
      isFavorite: false
    })) : [];
  
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
      isLoading,
      hasError,
      errorMessage: error?.message,
      stationGroupsCount: stationVehicleGroups.length,
      processedGroupsCount: processedStationGroups.length,
      groupsWithVehicles: processedStationGroups.filter(g => g.vehicles.length > 0).length,
      hasStationsWithVehicles,
      effectiveLocation: !!effectiveLocationForDisplay,
      locationCoords: effectiveLocationForDisplay ? 
        `${effectiveLocationForDisplay.latitude.toFixed(4)}, ${effectiveLocationForDisplay.longitude.toFixed(4)}` : 
        'none'
    }, 'STATION_DISPLAY_DEBUG');
  }, [isLoading, hasError, error?.message, stationVehicleGroups.length, processedStationGroups.length, hasStationsWithVehicles, effectiveLocationForDisplay]);

  // Build a detailed message about which stations were checked using StationSelectionResult
  const checkedStationsInfo = React.useMemo(() => {
    // Don't process if still isLoading
    if (isLoading || !stationSelectionResult) {
      return null;
    }

    const checkedStations: Array<{ name: string; routeCount: number; distance: number }> = [];
    
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
      .filter(rejected => rejected.rejectionReason === 'threshold_exceeded')
      .slice(0, 2) // Show up to 2 additional nearby stations
      .map(rejected => {
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
  }, [stationSelectionResult, isLoading, effectiveLocationForDisplay]);

  const emptyMessage = React.useMemo(() => {
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
  }, [checkedStationsInfo]);

  // Show empty state if no stations have vehicles
  if (!isLoading && !hasError && !hasStationsWithVehicles) {
    return (
      <EmptyState
        title="No Vehicles Found"
        message={emptyMessage}
        variant="default"
      />
    );
  }

  // Convert vehicle to MapModalBusInfo format for map modal
  const convertVehicleToMapModalBusInfo = (
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
    targetStationId: string
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

  // Handle transformation service errors with appropriate messages
  if (hasError) {
    const getErrorMessage = () => {
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

    const { title, message } = getErrorMessage();

    return (
      <Box sx={{ px: 3, pb: 3, pt: 1 }}>
        <Card sx={{ 
          bgcolor: 'rgba(30, 41, 59, 0.3)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(100, 116, 139, 0.2)'
        }}>
          <CardContent>
            <Stack spacing={3} alignItems="center" sx={{ py: 8 }}>
              <Box sx={{ 
                width: 64, 
                height: 64, 
                borderRadius: 3,
                bgcolor: 'rgba(71, 85, 105, 0.5)',
                border: '1px solid rgba(100, 116, 139, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Box sx={{ color: '#9e9e9e' }}>
                  <MapPinIcon size={28} />
                </Box>
              </Box>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                {title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'grey.400', textAlign: 'center' }}>
                {message}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ px: 3, pb: 3, pt: 1 }}>
        <Card sx={{ 
          bgcolor: 'rgba(30, 41, 59, 0.3)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(100, 116, 139, 0.2)'
        }}>
          <CardContent>
            <Stack spacing={3} alignItems="center" sx={{ py: 8 }}>
              <CircularProgress size={48} sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                Loading Station Data
              </Typography>
              <Typography variant="body2" sx={{ color: 'grey.400', textAlign: 'center' }}>
                Finding buses that serve nearby stations...
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
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
          bus={convertVehicleToMapModalBusInfo(selectedVehicleForMap, targetStationId)}
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
            isFavorite: false // Station display doesn't track favorites
          , routeIds: [], accessibility: { wheelchairAccessible: false, bikeAccessible: false, bikeRacks: false, audioAnnouncements: false }}}
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

export const StationDisplay = withPerformanceMonitoring(
  StationDisplayComponent,
  'StationDisplay'
);