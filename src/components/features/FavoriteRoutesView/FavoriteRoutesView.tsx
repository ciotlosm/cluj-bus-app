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
import { useLocationStore } from '../../../stores/locationStore';
import { useConfigStore } from '../../../stores/configStore';
import { useFavoriteBusStore } from '../../../stores/favoriteBusStore';
import { getEffectiveLocation } from '../../../utils/locationUtils';
import { withPerformanceMonitoring } from '../../../utils/performance';
import { logger } from '../../../utils/logger';
import { calculateDistance } from '../../../utils/distanceUtils';
import { BusIcon, MapPinIcon } from '../../ui/Icons/Icons';
import { enhancedTranzyApi } from '../../../services/tranzyApiService';
import { BusRouteMapModal } from '../FavoriteBuses/components/BusRouteMapModal';
import { VehicleCard } from '../shared/VehicleCard';
import { RouteFilterChips } from '../shared/RouteFilterChips';
import { StationHeader } from '../shared/StationHeader';
import type { EnhancedVehicleInfo, Station, LiveVehicle } from '../../../types';
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
  const { currentLocation } = useLocationStore();
  const { config } = useConfigStore();
  const { favoriteBusResult } = useFavoriteBusStore();
  const theme = useTheme();
  
  const [allStations, setAllStations] = React.useState<Station[]>([]);
  const [isLoadingStations, setIsLoadingStations] = React.useState(false);
  const [vehicles, setVehicles] = React.useState<LiveVehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = React.useState(false);

  const [stationVehicleGroups, setStationVehicleGroups] = React.useState<Array<{
    station: { station: Station; distance: number };
    vehicles: EnhancedVehicleInfoWithDirection[];
    allRoutes: Array<{
      routeId: string;
      routeName: string;
      vehicleCount: number;
    }>;
  }>>([]);
  const [isProcessingVehicles, setIsProcessingVehicles] = React.useState(false);
  
  // State for managing expanded stops per vehicle
  const [expandedVehicles, setExpandedVehicles] = React.useState<Set<string>>(new Set());
  
  // State for managing map modal
  const [mapModalOpen, setMapModalOpen] = React.useState(false);
  const [selectedVehicleForMap, setSelectedVehicleForMap] = React.useState<EnhancedVehicleInfoWithDirection | null>(null);
  const [targetStationId, setTargetStationId] = React.useState<string>('');
  
  // State for route filtering per station
  const [selectedRoutePerStation, setSelectedRoutePerStation] = React.useState<Map<string, string>>(new Map());

  // Get effective location with fallback priority
  const effectiveLocationForDisplay = getEffectiveLocation(
    currentLocation,
    config?.homeLocation,
    config?.workLocation,
    config?.defaultLocation
  );

  // Get favorite route names from config
  const favoriteRoutes = React.useMemo(() => {
    return config?.favoriteBuses || [];
  }, [config?.favoriteBuses]);

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
            logger.warn('Failed to calculate distance to station', { 
              stationId: stop.stopId, 
              error 
            }, 'COMPONENT');
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

  // Fetch all available stations when component mounts or config changes
  React.useEffect(() => {
    const fetchAllStations = async () => {
      if (!config?.agencyId || !config?.apiKey) return;

      setIsLoadingStations(true);
      try {
        enhancedTranzyApi.setApiKey(config.apiKey);
        const agencyId = parseInt(config.agencyId);
        const stations = await enhancedTranzyApi.getStops(agencyId);
        setAllStations(stations);
        
        logger.debug('Fetched all stations for favorite routes view', {
          stationCount: stations.length,
          agencyId
        }, 'COMPONENT');
      } catch (error) {
        logger.error('Failed to fetch stations for favorite routes view', { error }, 'COMPONENT');
        setAllStations([]);
      } finally {
        setIsLoadingStations(false);
      }
    };

    fetchAllStations();
  }, [config?.agencyId, config?.apiKey]);

  // Fetch vehicles directly when component mounts or config changes
  React.useEffect(() => {
    const fetchVehicles = async () => {
      if (!config?.apiKey || !config?.agencyId) return;

      setIsLoadingVehicles(true);
      try {
        enhancedTranzyApi.setApiKey(config.apiKey);
        const agencyId = parseInt(config.agencyId);
        const vehicleData = await enhancedTranzyApi.getVehicles(agencyId);
        setVehicles(vehicleData);
        
        logger.debug('Fetched vehicles for favorite routes view', {
          vehicleCount: vehicleData.length,
          agencyId
        }, 'COMPONENT');
      } catch (error) {
        logger.error('Failed to fetch vehicles for favorite routes view', { error }, 'COMPONENT');
        setVehicles([]);
      } finally {
        setIsLoadingVehicles(false);
      }
    };

    fetchVehicles();
  }, [config?.apiKey, config?.agencyId]);

  // Process vehicles based on favorite routes and find closest stations
  React.useEffect(() => {
    const processVehicles = async () => {
      if (!effectiveLocationForDisplay || !vehicles.length || !config?.agencyId || !favoriteRoutes.length || !allStations.length) {
        setStationVehicleGroups([]);
        return;
      }

      setIsProcessingVehicles(true);
      
      try {
        logger.debug('Starting favorite routes vehicle processing', {
          favoriteRoutes,
          vehiclesCount: vehicles.length,
          agencyId: config.agencyId,
          userLocation: effectiveLocationForDisplay
        });

        // Step 1: Get routes data to map route names to route IDs
        const routes = await enhancedTranzyApi.getRoutes(parseInt(config.agencyId));
        const routesMap = new Map(routes.map(route => [route.routeName, route])); // Map by route name (what user sees)
        const routeIdMap = new Map(routes.map(route => [route.id, route])); // Map by route ID (for vehicle lookup)

        // Step 2: Filter vehicles that belong to favorite routes
        // Handle both string array (legacy) and FavoriteRoute object array formats
        const favoriteRouteNames = favoriteRoutes.map(route => 
          typeof route === 'string' ? route : route.routeName
        );
        
        const favoriteRouteIds = favoriteRouteNames
          .map(routeName => routesMap.get(routeName)?.id)
          .filter(id => id !== undefined);

        logger.debug('Favorite route mapping', {
          favoriteRoutes,
          favoriteRouteNames,
          favoriteRouteIds,
          routesMapSize: routesMap.size,
          availableRouteNames: Array.from(routesMap.keys()).slice(0, 10), // Show first 10 for debugging
          missingRoutes: favoriteRouteNames.filter(name => !routesMap.has(name))
        });

        const favoriteVehicles = vehicles.filter(vehicle => 
          vehicle.routeId && favoriteRouteIds.includes(vehicle.routeId)
        );

        if (favoriteVehicles.length === 0) {
          logger.debug('No vehicles found for favorite routes, continuing to fallback logic');
          // Don't return early - continue to fallback logic to show stations from schedule data
        }

        // Step 3: Get stop_times data to find which stations these vehicles serve
        const allStopTimes = await enhancedTranzyApi.getStopTimes(parseInt(config.agencyId));
        
        if (!allStopTimes || allStopTimes.length === 0) {
          logger.warn('No stop_times data available for favorite routes');
          setStationVehicleGroups([]);
          return;
        }

        // Step 4: Find all stations that favorite route vehicles serve
        const favoriteVehicleTripIds = new Set(
          favoriteVehicles
            .map(v => v.tripId)
            .filter(tripId => tripId !== null && tripId !== undefined)
        );

        const stationsServedByFavoriteRoutes = new Set<string>();
        allStopTimes.forEach(stopTime => {
          if (favoriteVehicleTripIds.has(stopTime.tripId)) {
            stationsServedByFavoriteRoutes.add(stopTime.stopId);
          }
        });

        // Step 5: Find closest stations to user from the stations served by favorite routes
        // If no active vehicles found, fall back to all stations that serve favorite routes from schedule data
        let candidateStations = allStations.filter(station => 
          stationsServedByFavoriteRoutes.has(station.id)
        );

        // Fallback: if no stations found from active vehicles, use schedule data to find all stations for favorite routes
        if (candidateStations.length === 0) {
          logger.debug('No stations found from active vehicles, falling back to schedule data');
          
          // Get trips to map trip IDs to route IDs
          const trips = await enhancedTranzyApi.getTrips(parseInt(config.agencyId));
          const tripToRouteMap = new Map(trips.map(trip => [trip.id, trip.routeId]));
          
          const favoriteRouteStations = new Set<string>();
          allStopTimes.forEach(stopTime => {
            // Get route ID from trip ID
            const routeId = tripToRouteMap.get(stopTime.tripId);
            if (routeId) {
              const route = routeIdMap.get(routeId);
              if (route && favoriteRouteNames.includes(route.routeName)) {
                favoriteRouteStations.add(stopTime.stopId);
              }
            }
          });
          
          candidateStations = allStations.filter(station => 
            favoriteRouteStations.has(station.id)
          );
          
          logger.debug('Fallback station search results', {
            favoriteRouteStations: favoriteRouteStations.size,
            candidateStations: candidateStations.length
          });
        }

        const stationsWithDistances = candidateStations
          .map(station => {
            try {
              const distance = calculateDistance(effectiveLocationForDisplay, station.coordinates);
              return { station, distance };
            } catch (error) {
              return null;
            }
          })
          .filter(item => item !== null)
          .sort((a, b) => a.distance - b.distance);

        // Step 6: Use only the closest station to the user
        const targetStations = stationsWithDistances.slice(0, 1);

        if (targetStations.length === 0) {
          logger.debug('No nearby stations found for favorite routes', {
            candidateStationsCount: candidateStations.length,
            stationsWithDistancesCount: stationsWithDistances.length,
            favoriteRoutes,
            favoriteRouteIds,
            stationsServedByFavoriteRoutesCount: stationsServedByFavoriteRoutes.size
          });
          setStationVehicleGroups([]);
          return;
        }

        logger.debug('Selected closest station for favorite routes', {
          closestStation: targetStations.length > 0 ? {
            id: targetStations[0].station.id,
            name: targetStations[0].station.name,
            distance: Math.round(targetStations[0].distance)
          } : null,
          totalCandidates: candidateStations.length,
          favoriteRoutes,
          favoriteRouteIds
        });

        // Step 7: Build a map of trip_id -> stop sequence data for efficient lookup
        const tripStopSequenceMap = new Map<string, Array<{stopId: string, sequence: number}>>();
        allStopTimes.forEach(stopTime => {
          if (!tripStopSequenceMap.has(stopTime.tripId)) {
            tripStopSequenceMap.set(stopTime.tripId, []);
          }
          tripStopSequenceMap.get(stopTime.tripId)!.push({
            stopId: stopTime.stopId,
            sequence: stopTime.sequence
          });
        });

        // Helper function to analyze vehicle direction for a specific station
        const analyzeVehicleDirection = (vehicle: LiveVehicle, targetStation: Station) => {
          let directionStatus: 'arriving' | 'departing' | 'unknown' = 'unknown';
          let estimatedMinutes = 0;
          
          if (vehicle.tripId && tripStopSequenceMap.has(vehicle.tripId)) {
            try {
              const tripStops = tripStopSequenceMap.get(vehicle.tripId)!;
              
              const targetStationStop = tripStops.find(stop => stop.stopId === targetStation.id);
              
              if (targetStationStop) {
                const targetSequence = targetStationStop.sequence;
                
                const vehiclePosition = { latitude: vehicle.position.latitude, longitude: vehicle.position.longitude };
                let closestStopDistance = Infinity;
                let closestStopSequence = 0;
                
                for (const tripStop of tripStops) {
                  const stop = allStations.find(s => s.id === tripStop.stopId);
                  if (stop) {
                    const distance = calculateDistance(vehiclePosition, stop.coordinates);
                    if (distance < closestStopDistance) {
                      closestStopDistance = distance;
                      closestStopSequence = tripStop.sequence;
                    }
                  }
                }
                
                if (closestStopSequence < targetSequence) {
                  directionStatus = 'arriving';
                  const remainingStops = targetSequence - closestStopSequence;
                  estimatedMinutes = Math.max(1, remainingStops * 2);
                } else if (closestStopSequence > targetSequence) {
                  directionStatus = 'departing';
                  const stopsSinceDeparture = closestStopSequence - targetSequence;
                  estimatedMinutes = stopsSinceDeparture * 2;
                } else {
                  directionStatus = 'arriving';
                  estimatedMinutes = 0;
                }
              }
            } catch (error) {
              logger.warn('Failed to analyze vehicle direction for favorite routes', { 
                vehicleId: vehicle.id, 
                tripId: vehicle.tripId, 
                targetStationId: targetStation.id,
                error 
              }, 'COMPONENT');
            }
          }
          
          return { directionStatus, estimatedMinutes };
        };

        // Step 8: Create enhanced vehicles for favorite routes
        const baseEnhancedVehicles = favoriteVehicles.map(vehicle => {
          const route = routeIdMap.get(vehicle.routeId || '');
          
          return {
            id: vehicle.id,
            routeId: vehicle.routeId || '',
            route: route?.routeName || `Route ${vehicle.routeId}`,
            destination: route?.routeDesc || 'Unknown destination',
            vehicle: {
              id: vehicle.id,
              routeId: vehicle.routeId || '',
              tripId: vehicle.tripId,
              label: vehicle.label,
              position: vehicle.position,
              timestamp: vehicle.timestamp,
              speed: vehicle.speed,
              isWheelchairAccessible: vehicle.isWheelchairAccessible,
              isBikeAccessible: vehicle.isBikeAccessible,
            },
            isLive: true,
            isScheduled: false,
            confidence: 'high' as const,
            direction: 'unknown' as 'work' | 'home' | 'unknown',
          };
        });
        
        // Step 9: Create station groups for display
        const stationVehicleGroups = targetStations.map(stationInfo => {
          const vehiclesForThisStation = baseEnhancedVehicles.filter(baseVehicle => {
            if (!baseVehicle.vehicle?.tripId) return false;
            
            const tripStops = tripStopSequenceMap.get(baseVehicle.vehicle.tripId);
            if (!tripStops) return false;
            
            return tripStops.some(stop => stop.stopId === stationInfo.station.id);
          });

          const enhancedVehiclesForStation: EnhancedVehicleInfoWithDirection[] = vehiclesForThisStation.map(baseVehicle => {
            const { directionStatus, estimatedMinutes } = analyzeVehicleDirection(
              favoriteVehicles.find(v => v.id === baseVehicle.id)!,
              stationInfo.station
            );

            // Build stop sequence for this vehicle's trip (short version for favorite routes)
            const vehicleTripStops = tripStopSequenceMap.get(baseVehicle.vehicle?.tripId || '');
            let stopSequence: Array<{
              stopId: string;
              stopName: string;
              sequence: number;
              isCurrent: boolean;
              isDestination: boolean;
            }> = [];

            if (vehicleTripStops) {
              const sortedStops = vehicleTripStops.sort((a, b) => a.sequence - b.sequence);
              
              const vehicle = favoriteVehicles.find(v => v.id === baseVehicle.id)!;
              const vehiclePosition = { latitude: vehicle.position.latitude, longitude: vehicle.position.longitude };
              let closestStopSequence = 0;
              let closestStopDistance = Infinity;
              
              for (const tripStop of sortedStops) {
                const stop = allStations.find(s => s.id === tripStop.stopId);
                if (stop) {
                  const distance = calculateDistance(vehiclePosition, stop.coordinates);
                  if (distance < closestStopDistance) {
                    closestStopDistance = distance;
                    closestStopSequence = tripStop.sequence;
                  }
                }
              }

              stopSequence = sortedStops.map(tripStop => {
                const stop = allStations.find(s => s.id === tripStop.stopId);
                return {
                  stopId: tripStop.stopId,
                  stopName: stop?.name || `Stop ${tripStop.stopId}`,
                  sequence: tripStop.sequence,
                  isCurrent: tripStop.sequence === closestStopSequence,
                  isDestination: tripStop.sequence === Math.max(...sortedStops.map(s => s.sequence))
                };
              });
            }

            return {
              ...baseVehicle,
              station: stationInfo.station,
              minutesAway: estimatedMinutes,
              estimatedArrival: new Date(Date.now() + estimatedMinutes * 60000),
              _internalDirection: directionStatus,
              stopSequence,
            };
          });
          
          // No vehicle limit for favorite routes view - show all vehicles
          
          // Group vehicles by route_id and select the best one per route (same logic as station display)
          const routeGroups = new Map<string, EnhancedVehicleInfoWithDirection[]>();
          
          enhancedVehiclesForStation.forEach(vehicle => {
            const routeId = vehicle.routeId;
            if (!routeGroups.has(routeId)) {
              routeGroups.set(routeId, []);
            }
            routeGroups.get(routeId)!.push(vehicle);
          });

          const bestVehiclePerRoute = Array.from(routeGroups.entries()).map(([routeId, vehicles]) => {
            const sortedVehicles = vehicles.sort((a, b) => {
              const aAtStation = a.minutesAway === 0 && a._internalDirection === 'arriving';
              const bAtStation = b.minutesAway === 0 && b._internalDirection === 'arriving';
              
              if (aAtStation && !bAtStation) return -1;
              if (!aAtStation && bAtStation) return 1;
              
              const aArriving = a._internalDirection === 'arriving' && a.minutesAway > 0;
              const bArriving = b._internalDirection === 'arriving' && b.minutesAway > 0;
              
              if (aArriving && !bArriving) return -1;
              if (!aArriving && bArriving) return 1;
              
              if (aArriving && bArriving) {
                return a.minutesAway - b.minutesAway;
              }
              
              const aDeparted = a._internalDirection === 'departing';
              const bDeparted = b._internalDirection === 'departing';
              
              if (aDeparted && !bDeparted) return 1;
              if (!aDeparted && bDeparted) return -1;
              
              if (aDeparted && bDeparted) {
                return String(a.id).localeCompare(String(b.id));
              }
              
              return a.minutesAway - b.minutesAway;
            });
            
            return sortedVehicles[0];
          });

          // Check if a specific route is selected for this station
          const selectedRoute = selectedRoutePerStation.get(stationInfo.station.id);
          
          let finalVehicles: EnhancedVehicleInfoWithDirection[];
          
          if (selectedRoute) {
            finalVehicles = enhancedVehiclesForStation
              .filter(vehicle => vehicle.routeId === selectedRoute)
              .sort((a, b) => {
                const aAtStation = a.minutesAway === 0 && a._internalDirection === 'arriving';
                const bAtStation = b.minutesAway === 0 && b._internalDirection === 'arriving';
                
                if (aAtStation && !bAtStation) return -1;
                if (!aAtStation && bAtStation) return 1;
                
                const aArriving = a._internalDirection === 'arriving' && a.minutesAway > 0;
                const bArriving = b._internalDirection === 'arriving' && b.minutesAway > 0;
                
                if (aArriving && !bArriving) return -1;
                if (!aArriving && bArriving) return 1;
                
                if (aArriving && bArriving) {
                  return a.minutesAway - b.minutesAway;
                }
                
                return a.minutesAway - b.minutesAway;
              });
          } else {
            const uniqueRoutes = Array.from(new Set(enhancedVehiclesForStation.map(v => v.routeId)));
            
            if (uniqueRoutes.length === 1) {
              // Single route: show all vehicles from that route (no limit)
              finalVehicles = enhancedVehiclesForStation
                .sort((a, b) => a.minutesAway - b.minutesAway);
            } else {
              // Multiple routes: show all vehicles (no deduplication, no limit)
              finalVehicles = enhancedVehiclesForStation
                .sort((a, b) => a.minutesAway - b.minutesAway);
            }
          }
          
          // Collect all unique routes for this station
          const allRoutesAtStation = Array.from(new Set(
            enhancedVehiclesForStation.map(v => v.routeId)
          )).map(routeId => {
            const vehicle = enhancedVehiclesForStation.find(v => v.routeId === routeId);
            return {
              routeId,
              routeName: vehicle?.route || routeId,
              vehicleCount: enhancedVehiclesForStation.filter(v => v.routeId === routeId).length
            };
          }).sort((a, b) => a.routeName.localeCompare(b.routeName));
          
          return {
            station: stationInfo,
            vehicles: finalVehicles,
            allRoutes: allRoutesAtStation
          };
        });

        logger.debug('Favorite routes processing completed', {
          closestStation: targetStations.length > 0 ? {
            id: targetStations[0].station.id,
            name: targetStations[0].station.name,
            distance: Math.round(targetStations[0].distance)
          } : null,
          favoriteVehicles: favoriteVehicles.length,
          stationGroups: stationVehicleGroups.length,
          vehiclesByStation: stationVehicleGroups.map(group => ({
            stationName: group.station.station.name,
            vehicleCount: group.vehicles.length
          }))
        });
        
        setStationVehicleGroups(stationVehicleGroups);
      } catch (error) {
        logger.error('Failed to process vehicles for favorite routes', { error }, 'COMPONENT');
        setStationVehicleGroups([]);
      } finally {
        setIsProcessingVehicles(false);
      }
    };

    processVehicles();
  }, [effectiveLocationForDisplay, vehicles, config?.agencyId, favoriteRoutes, allStations, selectedRoutePerStation]);

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

  if (isLoadingStations || isProcessingVehicles || isLoadingVehicles) {
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
    </Box>
  );
};

export const FavoriteRoutesView = withPerformanceMonitoring(
  FavoriteRoutesViewComponent,
  'FavoriteRoutesView'
);