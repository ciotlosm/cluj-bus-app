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
import { MapPinIcon } from '../../ui/Icons/Icons';
import { BusRouteMapModal } from '../FavoriteBuses/components/BusRouteMapModal';
import { VehicleCard } from '../shared/VehicleCard';
import { StationHeader } from '../shared/StationHeader';
import { RouteFilterChips } from '../shared/RouteFilterChips';
import { useVehicleProcessing } from '../../../hooks/useVehicleProcessing';
import type { EnhancedVehicleInfo } from '../../../types';
import type { FavoriteBusInfo } from '../../../services/favoriteBusService';

interface EnhancedVehicleInfoWithDirection extends EnhancedVehicleInfo {
  _internalDirection?: 'arriving' | 'departing' | 'unknown';
  stopSequence?: Array<{
    stopId: string;
    stopName: string;
    sequence: number;
    isCurrent: boolean;
    isDestination: boolean;
  }>;
}

interface StationDisplayProps {
  // No props needed - maxVehicles comes from config
}

const StationDisplayComponent: React.FC<StationDisplayProps> = () => {
  const { config } = useConfigStore();
  
  // State for route filtering per station (must be declared before use)
  const [selectedRoutePerStation, setSelectedRoutePerStation] = React.useState<Map<string, string>>(new Map());
  
  // Use the shared vehicle processing hook
  // Always get full vehicle data, we'll handle filtering per station
  const {
    stationVehicleGroups,
    isLoading,
    effectiveLocationForDisplay,
    allStations,
  } = useVehicleProcessing({
    filterByFavorites: false,
    maxStations: 2,
    maxVehiclesPerStation: 999, // Get all vehicles, we'll filter per station
    showAllVehiclesPerRoute: true, // Get all vehicles per route
    maxSearchRadius: 5000,
    maxStationsToCheck: 20,
    proximityThreshold: 200,
  });
  
  // State for managing expanded stops per vehicle
  const [expandedVehicles, setExpandedVehicles] = React.useState<Set<string>>(new Set());
  
  // State for managing map modal
  const [mapModalOpen, setMapModalOpen] = React.useState(false);
  const [selectedVehicleForMap, setSelectedVehicleForMap] = React.useState<EnhancedVehicleInfoWithDirection | null>(null);
  const [targetStationId, setTargetStationId] = React.useState<string>('');

  // Process station groups with per-station route filtering and deduplication
  const processedStationGroups = React.useMemo(() => {
    const maxVehicles = config?.maxVehiclesPerStation || 5;
    
    return stationVehicleGroups.map(stationGroup => {
      const selectedRoute = selectedRoutePerStation.get(stationGroup.station.station.id);
      
      if (selectedRoute) {
        // Filter to show only vehicles from the selected route (all vehicles for that route)
        const filteredVehicles = stationGroup.vehicles.filter(vehicle => 
          vehicle.routeId === selectedRoute
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
          const routeId = vehicle.routeId;
          if (!routeGroups.has(routeId)) {
            routeGroups.set(routeId, []);
          }
          routeGroups.get(routeId)!.push(vehicle);
        });

        // Select the best vehicle per route based on priority
        const bestVehiclePerRoute = Array.from(routeGroups.entries()).map(([routeId, vehicles]) => {
          // Sort vehicles within this route by priority
          const sortedVehicles = vehicles.sort((a, b) => {
            // Priority 1: At station (minutesAway = 0 and arriving)
            const aAtStation = a.minutesAway === 0 && a._internalDirection === 'arriving';
            const bAtStation = b.minutesAway === 0 && b._internalDirection === 'arriving';
            
            if (aAtStation && !bAtStation) return -1;
            if (!aAtStation && bAtStation) return 1;
            
            // Priority 2: Arriving vehicles (sorted by minutes ascending)
            const aArriving = a._internalDirection === 'arriving' && a.minutesAway > 0;
            const bArriving = b._internalDirection === 'arriving' && b.minutesAway > 0;
            
            if (aArriving && !bArriving) return -1;
            if (!aArriving && bArriving) return 1;
            
            // If both are arriving, sort by minutes (closest first)
            if (aArriving && bArriving) {
              return a.minutesAway - b.minutesAway;
            }
            
            // Priority 3: Departed vehicles (at the end)
            const aDeparted = a._internalDirection === 'departing';
            const bDeparted = b._internalDirection === 'departing';
            
            if (aDeparted && !bDeparted) return 1;
            if (!aDeparted && bDeparted) return -1;
            
            // Fallback: sort by vehicle ID for consistency
            return String(a.id).localeCompare(String(b.id));
          });
          
          // Return the best vehicle for this route
          return sortedVehicles[0];
        });

        // Sort by priority and apply vehicle limit
        const finalVehicles = bestVehiclePerRoute
          .sort((a, b) => {
            // Priority 1: At station
            const aAtStation = a.minutesAway === 0 && a._internalDirection === 'arriving';
            const bAtStation = b.minutesAway === 0 && b._internalDirection === 'arriving';
            
            if (aAtStation && !bAtStation) return -1;
            if (!aAtStation && bAtStation) return 1;
            
            // Priority 2: Arriving vehicles (sorted by minutes ascending)
            const aArriving = a._internalDirection === 'arriving' && a.minutesAway > 0;
            const bArriving = b._internalDirection === 'arriving' && b.minutesAway > 0;
            
            if (aArriving && !bArriving) return -1;
            if (!aArriving && bArriving) return 1;
            
            if (aArriving && bArriving) {
              return a.minutesAway - b.minutesAway;
            }
            
            // Priority 3: Departed vehicles
            const aDeparted = a._internalDirection === 'departing';
            const bDeparted = b._internalDirection === 'departing';
            
            if (aDeparted && !bDeparted) return 1;
            if (!aDeparted && bDeparted) return -1;
            
            // If both departed, sort by route name
            if (aDeparted && bDeparted) {
              return (a.route || '').localeCompare(b.route || '');
            }
            
            return a.minutesAway - b.minutesAway;
          })
          .slice(0, maxVehicles);

        return {
          ...stationGroup,
          vehicles: finalVehicles
        };
      }
    });
  }, [stationVehicleGroups, selectedRoutePerStation, config?.maxVehiclesPerStation]);

  // Convert vehicle to FavoriteBusInfo format for map modal
  const convertVehicleToFavoriteBusInfo = (vehicle: EnhancedVehicleInfoWithDirection, targetStationId: string): FavoriteBusInfo => {
    return {
      routeName: vehicle.route || 'Unknown',
      routeDesc: vehicle.destination,
      routeType: 'bus' as const,
      vehicleId: vehicle.id,
      tripId: vehicle.vehicle?.tripId || '',
      label: vehicle.vehicle?.label,
      destination: vehicle.destination,
      latitude: vehicle.vehicle?.position?.latitude || 0,
      longitude: vehicle.vehicle?.position?.longitude || 0,
      speed: vehicle.vehicle?.speed,
      bearing: undefined,
      lastUpdate: vehicle.vehicle?.timestamp instanceof Date 
        ? vehicle.vehicle.timestamp 
        : vehicle.vehicle?.timestamp 
          ? new Date(vehicle.vehicle.timestamp)
          : new Date(),
      currentStation: vehicle.station ? {
        id: vehicle.station.id,
        name: vehicle.station.name,
        distance: 0, // We don't have this data readily available
        isAtStation: vehicle.minutesAway === 0
      } : null,
      stopSequence: vehicle.stopSequence?.map(stop => {
        // Find the corresponding station coordinates
        const stationCoords = allStations.find(s => s.id === stop.stopId)?.coordinates;
        
        return {
          id: stop.stopId,
          name: stop.stopName,
          sequence: stop.sequence,
          coordinates: stationCoords || { latitude: 0, longitude: 0 },
          arrivalTime: undefined,
          isCurrent: false, // Don't mark where the bus currently is
          isClosestToUser: stop.stopId === targetStationId, // Mark the target station (where vehicle is arriving)
          distanceToUser: undefined,
          distanceFromBus: undefined
        };
      }),
      direction: undefined,
      distanceFromUser: undefined
    };
  };

  if (!effectiveLocationForDisplay) {
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
                <MapPinIcon size={28} className="text-gray-400" />
              </Box>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                Location Required
              </Typography>
              <Typography variant="body2" sx={{ color: 'grey.400', textAlign: 'center' }}>
                Please enable location services to see nearby station buses
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

  if (!effectiveLocationForDisplay) {
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
                <MapPinIcon size={28} className="text-gray-400" />
              </Box>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                No nearby stations
              </Typography>
              <Typography variant="body2" sx={{ color: 'grey.400', textAlign: 'center' }}>
                {!stationVehicleGroups.length ? 'No bus stations found within 5km of your location' : 'Please enable location services to see nearby station buses'}
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
                    key={`${vehicle.id}-${stationGroup.station.station.id}-${index}`}
                    vehicle={vehicle}
                    stationId={stationGroup.station.station.id}
                    isExpanded={expandedVehicles.has(vehicle.id)}
                    onToggleExpanded={() => {
                      const newExpanded = new Set(expandedVehicles);
                      if (expandedVehicles.has(vehicle.id)) {
                        newExpanded.delete(vehicle.id);
                      } else {
                        newExpanded.add(vehicle.id);
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
                      const isSelected = selectedRoutePerStation.get(stationGroup.station.station.id) === vehicle.routeId;
                      
                      if (isSelected) {
                        newSelection.delete(stationGroup.station.station.id);
                      } else {
                        newSelection.set(stationGroup.station.station.id, vehicle.routeId);
                      }
                      setSelectedRoutePerStation(newSelection);
                    }}
                    showShortStopList={false} // Don't show short stop list in station view
                    showFullStopsButton={true} // Show "Show all stops" button
                  />
                ))}
              </Stack>
            </Box>
          );
        }).filter(Boolean)}
      </Stack>
      
      {/* Map Modal */}
      {selectedVehicleForMap && (
        <BusRouteMapModal
          open={mapModalOpen}
          onClose={() => {
            setMapModalOpen(false);
            setSelectedVehicleForMap(null);
            setTargetStationId('');
          }}
          bus={convertVehicleToFavoriteBusInfo(selectedVehicleForMap, targetStationId)}
          userLocation={null} // Don't show user location as requested
          cityName={config?.city || 'Cluj-Napoca'}
        />
      )}
    </Box>
  );
};

export const StationDisplay = withPerformanceMonitoring(
  StationDisplayComponent,
  'StationDisplay'
);