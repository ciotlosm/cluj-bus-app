import React from 'react';
import {
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Button,
  IconButton,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import { Favorite as FavoriteIcon } from '@mui/icons-material';
import { useConfigStore } from '../../../stores/configStore';
import { useFavoriteBusStore } from '../../../stores/favoriteBusStore';
import { withPerformanceMonitoring } from '../../../utils/performance';
import { calculateDistance } from '../../../utils/distanceUtils';
import { BusIcon, MapPinIcon } from '../../ui/Icons/Icons';
import { BusRouteMapModal } from '../FavoriteBuses/components/BusRouteMapModal';
import { VehicleCard } from '../shared/VehicleCard';
import { RouteFilterChips } from '../shared/RouteFilterChips';
import { StationHeader } from '../shared/StationHeader';
import { StationMapModal } from '../shared/StationMapModal';
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

interface FavoriteRoutesViewProps {
  onNavigateToSettings?: () => void;
}

const FavoriteRoutesViewComponent: React.FC<FavoriteRoutesViewProps> = ({ onNavigateToSettings }) => {
  const { config } = useConfigStore();
  const { favoriteBusResult } = useFavoriteBusStore();
  const theme = useTheme();
  
  // Use the shared vehicle processing hook
  const {
    stationVehicleGroups,
    isLoading,
    effectiveLocationForDisplay,
    favoriteRoutes,
    allStations,
  } = useVehicleProcessing({
    filterByFavorites: true,
    maxStations: 1,
    maxVehiclesPerStation: 999, // No limit for favorites
    showAllVehiclesPerRoute: true,
    maxSearchRadius: 10000, // Larger radius for favorites
    maxStationsToCheck: 50,
    proximityThreshold: 0, // No proximity limit for favorites
  });
  
  // State for managing expanded stops per vehicle
  const [expandedVehicles, setExpandedVehicles] = React.useState<Set<string>>(new Set());
  
  // State for managing map modal
  const [mapModalOpen, setMapModalOpen] = React.useState(false);
  const [selectedVehicleForMap, setSelectedVehicleForMap] = React.useState<EnhancedVehicleInfoWithDirection | null>(null);
  const [targetStationId, setTargetStationId] = React.useState<string>('');
  
  // State for managing station map modal
  const [stationMapModalOpen, setStationMapModalOpen] = React.useState(false);
  const [selectedStationForMap, setSelectedStationForMap] = React.useState<{
    station: Station;
    distance: number;
    vehicles: EnhancedVehicleInfoWithDirection[];
  } | null>(null);
  
  // State for route filtering per station
  const [selectedRoutePerStation, setSelectedRoutePerStation] = React.useState<Map<string, string>>(new Map());

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
        distance: 0,
        isAtStation: vehicle.minutesAway === 0
      } : null,
      stopSequence: vehicle.stopSequence?.map(stop => {
        const stationCoords = allStations.find(s => s.id === stop.stopId)?.coordinates;
        
        // Calculate distance from user to this station if user location is available
        let distanceToUser: number | undefined;
        if (effectiveLocationForDisplay && stationCoords) {
          try {
            distanceToUser = calculateDistance(effectiveLocationForDisplay, stationCoords);
          } catch (error) {
            // Ignore distance calculation errors for map modal
          }
        }
        
        return {
          id: stop.stopId,
          name: stop.stopName,
          sequence: stop.sequence,
          coordinates: stationCoords || { latitude: 0, longitude: 0 },
          arrivalTime: undefined,
          isCurrent: stop.isCurrent,
          isClosestToUser: stop.stopId === targetStationId,
          distanceToUser,
          distanceFromBus: undefined
        };
      }),
      direction: undefined,
      distanceFromUser: undefined
    };
  };

  // Show setup required if no favorite routes configured
  if (!favoriteRoutes.length) {
    return (
      <Box sx={{ p: 3 }}>
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
                <BusIcon size={28} className="text-gray-400" />
              </Box>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                No Favorite Routes
              </Typography>
              <Typography variant="body2" sx={{ color: 'grey.400', textAlign: 'center' }}>
                Add some favorite routes to see buses at nearby stations
              </Typography>
              
              <Button
                variant="contained"
                onClick={onNavigateToSettings}
                sx={{
                  mt: 2,
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                }}
              >
                Add Favorite Routes
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!effectiveLocationForDisplay) {
    return (
      <Box sx={{ p: 3 }}>
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
                Please enable location services to see favorite route buses at nearby stations
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Card sx={{ 
          bgcolor: 'rgba(30, 41, 59, 0.3)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(100, 116, 139, 0.2)'
        }}>
          <CardContent>
            <Stack spacing={3} alignItems="center" sx={{ py: 8 }}>
              <CircularProgress size={48} sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                Loading Favorite Routes
              </Typography>
              <Typography variant="body2" sx={{ color: 'grey.400', textAlign: 'center' }}>
                Finding buses for your favorite routes at nearby stations...
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!stationVehicleGroups.length) {
    return (
      <Box sx={{ p: 3 }}>
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
                <BusIcon size={28} className="text-gray-400" />
              </Box>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                No nearby stations
              </Typography>
              <Typography variant="body2" sx={{ color: 'grey.400', textAlign: 'center' }}>
                No stations found that serve your favorite routes
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', p: 3 }}>
      {/* Heart icon button in top right corner */}
      <Tooltip
        title={
          <Box sx={{ p: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Your Favorite Routes:
            </Typography>
            {favoriteRoutes.length > 0 ? (
              <Stack spacing={0.5}>
                {favoriteRoutes.map((route, index) => (
                  <Typography 
                    key={index} 
                    variant="body2" 
                    sx={{ 
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: 'currentColor',
                        flexShrink: 0,
                      }}
                    />
                    {typeof route === 'string' ? route : route.routeName}
                  </Typography>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                No favorite routes configured
              </Typography>
            )}
            <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.8 }}>
              Click to manage favorites
            </Typography>
          </Box>
        }
        placement="bottom-end"
        arrow
        enterDelay={500}
        leaveDelay={200}
      >
        <IconButton
          onClick={onNavigateToSettings}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            color: theme.palette.primary.main,
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.2),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
              transform: 'scale(1.05)',
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
          aria-label="Manage favorite routes"
        >
          <FavoriteIcon />
        </IconButton>
      </Tooltip>
      
      <Stack spacing={4}>
        {stationVehicleGroups.map((stationGroup, stationIndex) => (
          <Box key={stationGroup.station.station.id}>
            {/* Station Section Header */}
            <Box sx={{ mb: 2 }}>
              <StationHeader
                stationName={stationGroup.station.station.name}
                distance={stationGroup.station.distance}
                isClosest={stationIndex === 0}
                onClick={() => {
                  setSelectedStationForMap({
                    station: stationGroup.station.station,
                    distance: stationGroup.station.distance,
                    vehicles: stationGroup.vehicles
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
            {stationGroup.vehicles.length > 0 ? (
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
                    showShortStopList={true} // Show short stop list always visible
                    showFullStopsButton={true} // Show "Show all stops" button
                  />
                ))}
              </Stack>
            ) : (
              <Card sx={{ 
                bgcolor: 'rgba(30, 41, 59, 0.3)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(100, 116, 139, 0.2)'
              }}>
                <CardContent>
                  <Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
                    <BusIcon size={24} className="text-gray-500" />
                    <Typography variant="body1" sx={{ color: 'grey.400', textAlign: 'center' }}>
                      No favorite route buses currently at this station
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'grey.500', textAlign: 'center' }}>
                      Check back in a few minutes or try refreshing
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Box>
        ))}
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
          userLocation={effectiveLocationForDisplay}
          cityName={config?.city || 'Cluj-Napoca'}
        />
      )}
      
      {/* Station Map Modal */}
      {selectedStationForMap && (
        <StationMapModal
          open={stationMapModalOpen}
          onClose={() => {
            setStationMapModalOpen(false);
            setSelectedStationForMap(null);
          }}
          station={selectedStationForMap.station}
          vehicles={selectedStationForMap.vehicles}
          userLocation={effectiveLocationForDisplay}
          cityName={config?.city || 'Cluj-Napoca'}
          agencyId={config?.agencyId}
        />
      )}
    </Box>
  );
};

export const FavoriteRoutesView = withPerformanceMonitoring(
  FavoriteRoutesViewComponent,
  'FavoriteRoutesView'
);