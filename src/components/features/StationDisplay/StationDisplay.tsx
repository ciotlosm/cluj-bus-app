import React from 'react';
import {
  Box,
  Stack,
  Typography,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  alpha,
  useTheme,
} from '@mui/material';
import { 
  ExpandMore, 
  ExpandLess, 
  DirectionsBus, 
  LocationOn,
  FlagOutlined,
  Map as MapIcon
} from '@mui/icons-material';
import { useLocationStore } from '../../../stores/locationStore';
import { useConfigStore } from '../../../stores/configStore';
import { getEffectiveLocation } from '../../../utils/locationUtils';
import { withPerformanceMonitoring } from '../../../utils/performance';
import { logger } from '../../../utils/logger';
import { calculateDistance } from '../../../utils/distanceUtils';
import { BusIcon, MapPinIcon } from '../../ui/Icons/Icons';
import { formatTime24 } from '../../../utils/timeFormat';
import { enhancedTranzyApi } from '../../../services/tranzyApiService';
import { BusRouteMapModal } from '../FavoriteBuses/components/BusRouteMapModal';
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

interface StationDisplayProps {
  // No props needed - maxVehicles comes from config
}

const StationDisplayComponent: React.FC<StationDisplayProps> = () => {
  const theme = useTheme();
  const { currentLocation } = useLocationStore();
  const { config } = useConfigStore();
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

  // Get effective location with fallback priority
  const effectiveLocationForDisplay = getEffectiveLocation(
    currentLocation,
    config?.homeLocation,
    config?.workLocation,
    config?.defaultLocation
  );

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
        
        logger.debug('Fetched all stations for station display', {
          stationCount: stations.length,
          agencyId
        }, 'COMPONENT');
      } catch (error) {
        logger.error('Failed to fetch stations for station display', { error }, 'COMPONENT');
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
        
        logger.debug('Fetched vehicles for station display', {
          vehicleCount: vehicleData.length,
          agencyId
        }, 'COMPONENT');
      } catch (error) {
        logger.error('Failed to fetch vehicles for station display', { error }, 'COMPONENT');
        setVehicles([]);
      } finally {
        setIsLoadingVehicles(false);
      }
    };

    fetchVehicles();
  }, [config?.apiKey, config?.agencyId]);

  // Find closest stations (keep 1-2 stations that are close to each other)
  const targetStations = React.useMemo(() => {
    if (!effectiveLocationForDisplay || !allStations.length) return [];

    const maxSearchRadius = 2000; // 2km search radius
    const nearbyThreshold = 100; // 100m threshold for second station

    // Get all stations within search radius with distances
    const stationsWithDistances = allStations
      .map(station => {
        try {
          const distance = calculateDistance(effectiveLocationForDisplay, station.coordinates);
          return distance <= maxSearchRadius ? { station, distance } : null;
        } catch (error) {
          return null;
        }
      })
      .filter(item => item !== null)
      .sort((a, b) => a.distance - b.distance);

    if (stationsWithDistances.length === 0) return [];

    // Always include the closest station
    const result = [stationsWithDistances[0]];
    const closestStation = stationsWithDistances[0];

    // Find one additional station within 100m of the closest station
    for (let i = 1; i < stationsWithDistances.length && result.length < 2; i++) {
      const candidate = stationsWithDistances[i];
      try {
        const distanceBetweenStations = calculateDistance(
          closestStation.station.coordinates,
          candidate.station.coordinates
        );
        
        if (distanceBetweenStations <= nearbyThreshold) {
          result.push(candidate);
          break; // Only add one additional station
        }
      } catch (error) {
        // Skip this station if distance calculation fails
      }
    }

    return result;
  }, [effectiveLocationForDisplay, allStations, calculateDistance]);

  // Process vehicles using trip_id filtering based on stop_times data
  React.useEffect(() => {
    const processVehicles = async () => {
      if (!targetStations.length || !vehicles.length || !config?.agencyId) {
        setStationVehicleGroups([]);
        return;
      }

      setIsProcessingVehicles(true);
      
      try {
        logger.debug('Starting trip-based vehicle filtering', {
          targetStationsCount: targetStations.length,
          vehiclesCount: vehicles.length,
          agencyId: config.agencyId
        });

        // Step 1: Get stop_times data to find which trips serve our target stations
        const allStopTimes = await enhancedTranzyApi.getStopTimes(parseInt(config.agencyId));
        
        if (!allStopTimes || allStopTimes.length === 0) {
          logger.warn('No stop_times data available');
          setStationVehicleGroups([]);
          return;
        }

        // Step 2: Filter stop_times by target station IDs to get relevant trip_ids
        const stationIds = targetStations.map(ts => ts.station.id);
        const relevantTripIds = new Set<string>();
        
        allStopTimes.forEach(stopTime => {
          if (stationIds.includes(stopTime.stopId)) {
            relevantTripIds.add(stopTime.tripId);
          }
        });

        // Step 3: Filter vehicles by those trip_ids (only vehicles that actually serve these stations)
        const matchingVehicles = vehicles.filter(vehicle => 
          vehicle.tripId && relevantTripIds.has(vehicle.tripId)
        );

        // Step 4: Get routes data to enrich vehicle information
        const routes = await enhancedTranzyApi.getRoutes(parseInt(config.agencyId));
        const routesMap = new Map(routes.map(route => [route.id, route]));

        // Step 5: Build a map of trip_id -> stop sequence data for efficient lookup
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
              
              // Find the target station's sequence in this trip
              const targetStationStop = tripStops.find(stop => stop.stopId === targetStation.id);
              
              if (targetStationStop) {
                const targetSequence = targetStationStop.sequence;
                
                // Find the closest stop to vehicle's current GPS position
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
                
                // Determine direction based on sequence comparison
                if (closestStopSequence < targetSequence) {
                  // Vehicle is before the target station → arriving
                  directionStatus = 'arriving';
                  const remainingStops = targetSequence - closestStopSequence;
                  estimatedMinutes = Math.max(1, remainingStops * 2); // 2 minutes per stop estimate
                } else if (closestStopSequence > targetSequence) {
                  // Vehicle is after the target station → departing
                  directionStatus = 'departing';
                  const stopsSinceDeparture = closestStopSequence - targetSequence;
                  estimatedMinutes = stopsSinceDeparture * 2; // 2 minutes per stop estimate
                } else {
                  // Vehicle is at the target station (sequence match)
                  directionStatus = 'arriving';
                  estimatedMinutes = 0; // At station = "At station"
                }
              }
            } catch (error) {
              logger.warn('Failed to analyze vehicle direction', { 
                vehicleId: vehicle.id, 
                tripId: vehicle.tripId, 
                targetStationId: targetStation.id,
                error 
              }, 'COMPONENT');
            }
          }
          
          return { directionStatus, estimatedMinutes };
        };

        // Create base enhanced vehicles (we'll recalculate direction per station later)
        const baseEnhancedVehicles = matchingVehicles.map(vehicle => {
          const route = routesMap.get(vehicle.routeId || '');
          
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
        
        // Create station groups for display - properly assign vehicles to their actual stations
        const stationVehicleGroups = targetStations.map(stationInfo => {
          // Filter vehicles that actually serve this specific station
          const vehiclesForThisStation = baseEnhancedVehicles.filter(baseVehicle => {
            if (!baseVehicle.vehicle?.tripId) return false;
            
            // Check if this vehicle's trip serves this specific station
            const tripStops = tripStopSequenceMap.get(baseVehicle.vehicle.tripId);
            if (!tripStops) return false;
            
            return tripStops.some(stop => stop.stopId === stationInfo.station.id);
          });

          // Calculate direction and timing for each vehicle relative to THIS specific station
          const enhancedVehiclesForStation: EnhancedVehicleInfoWithDirection[] = vehiclesForThisStation.map(baseVehicle => {
            const { directionStatus, estimatedMinutes } = analyzeVehicleDirection(
              matchingVehicles.find(v => v.id === baseVehicle.id)!,
              stationInfo.station
            );

            // Build stop sequence for this vehicle's trip
            const vehicleTripStops = tripStopSequenceMap.get(baseVehicle.vehicle?.tripId || '');
            let stopSequence: Array<{
              stopId: string;
              stopName: string;
              sequence: number;
              isCurrent: boolean;
              isDestination: boolean;
            }> = [];

            if (vehicleTripStops) {
              // Sort stops by sequence
              const sortedStops = vehicleTripStops.sort((a, b) => a.sequence - b.sequence);
              
              // Find current vehicle position (closest stop)
              const vehicle = matchingVehicles.find(v => v.id === baseVehicle.id)!;
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

              // Build the stop sequence with markers
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
          
          // Get max vehicles setting from config (default: 5)
          const maxVehicles = config?.maxVehiclesPerStation || 5;
          
          // Debug logging for vehicle processing
          logger.debug('Vehicle processing for station', {
            stationId: stationInfo.station.id,
            stationName: stationInfo.station.name,
            vehiclesForThisStation: vehiclesForThisStation.length,
            enhancedVehiclesForStation: enhancedVehiclesForStation.length,
            maxVehicles,
            configMaxVehicles: config?.maxVehiclesPerStation,
            configExists: !!config
          }, 'COMPONENT');

          // Group vehicles by route_id and select the best one per route
          const routeGroups = new Map<string, EnhancedVehicleInfoWithDirection[]>();
          
          enhancedVehiclesForStation.forEach(vehicle => {
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
              
              // If both departed, sort by vehicle ID for consistency
              if (aDeparted && bDeparted) {
                return String(a.id).localeCompare(String(b.id));
              }
              
              // Fallback: sort by minutes away
              return a.minutesAway - b.minutesAway;
            });
            
            // Return the best vehicle for this route
            return sortedVehicles[0];
          });

          // Check if a specific route is selected for this station
          const selectedRoute = selectedRoutePerStation.get(stationInfo.station.id);
          
          // If a route is selected, show ALL vehicles from that route (no deduplication, no limit)
          let finalVehicles: EnhancedVehicleInfoWithDirection[];
          
          if (selectedRoute) {
            // Show all vehicles from the selected route
            finalVehicles = enhancedVehiclesForStation
              .filter(vehicle => vehicle.routeId === selectedRoute)
              .sort((a, b) => {
                // Same priority sorting as before
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
          } else {
            // Check if there's only one route at this station
            const uniqueRoutes = Array.from(new Set(enhancedVehiclesForStation.map(v => v.routeId)));
            
            if (uniqueRoutes.length === 1) {
              // Single route: show all vehicles from that route (up to maxVehicles limit)
              finalVehicles = enhancedVehiclesForStation
                .sort((a, b) => {
                  // Same priority sorting as before
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
                })
                .slice(0, maxVehicles);
            } else {
              // Multiple routes: deduplicate by route and limit to maxVehicles
              finalVehicles = bestVehiclePerRoute
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
            }
          }
          
          // Collect all unique routes for this station (for the header chips)
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

        logger.debug('Trip-based vehicle filtering completed', {
          targetStations: targetStations.map(ts => ({
            id: ts.station.id,
            name: ts.station.name,
            distance: Math.round(ts.distance)
          })),
          totalStopTimes: allStopTimes.length,
          stopTimesForStations: allStopTimes.filter(st => stationIds.includes(st.stopId)).length,
          relevantTripIds: relevantTripIds.size,
          totalVehicles: vehicles.length,
          vehiclesWithTripId: vehicles.filter(v => v.tripId).length,
          matchingVehicles: matchingVehicles.length,
          stationGroups: stationVehicleGroups.length,
          vehiclesByStation: stationVehicleGroups.map(group => ({
            stationName: group.station.station.name,
            vehicleCount: group.vehicles.length,
            vehicles: group.vehicles.map(v => ({
              id: v.id,
              route: v.route,
              direction: v._internalDirection,
              minutesAway: v.minutesAway
            }))
          }))
        });

        // Debug logging for station groups
        logger.debug('Station groups processing completed', {
          totalGroups: stationVehicleGroups.length,
          totalMatchingVehicles: matchingVehicles.length,
          groupDetails: stationVehicleGroups.map(group => ({
            stationId: group.station.station.id,
            stationName: group.station.station.name,
            vehicleCount: group.vehicles.length,
            vehicles: group.vehicles.map(v => ({
              id: v.id,
              route: v.route,
              direction: v.direction,
              minutesAway: v.minutesAway
            }))
          }))
        }, 'COMPONENT');
        
        // Store grouped vehicles
        setStationVehicleGroups(stationVehicleGroups);
      } catch (error) {
        logger.error('Failed to process vehicles for stations', { error }, 'COMPONENT');
        setStationVehicleGroups([]);
      } finally {
        setIsProcessingVehicles(false);
      }
    };

    processVehicles();
  }, [targetStations, vehicles, config?.agencyId, config?.maxVehiclesPerStation, selectedRoutePerStation]);

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
                Please enable location services to see nearby station buses
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

  if (!targetStations.length) {
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
                No nearby stations
              </Typography>
              <Typography variant="body2" sx={{ color: 'grey.400', textAlign: 'center' }}>
                No bus stations found within 2km of your location
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={4}>
        {/* Always show stations, even if they have no vehicles */}
        {targetStations.map((stationInfo, stationIndex) => {
          // Find the corresponding group for this station
          const stationGroup = stationVehicleGroups.find(
            group => group.station.station.id === stationInfo.station.id
          );
          
          // Debug logging to understand the issue
          logger.debug('Station display rendering', {
            stationId: stationInfo.station.id,
            stationName: stationInfo.station.name,
            stationGroupFound: !!stationGroup,
            stationGroupVehicleCount: stationGroup?.vehicles.length || 0,
            allStationGroups: stationVehicleGroups.map(g => ({
              id: g.station.station.id,
              name: g.station.station.name,
              vehicleCount: g.vehicles.length
            }))
          }, 'COMPONENT');
          
          return (
            <Box key={stationInfo.station.id}>
              {/* Station Section Header - Always show */}
              <Box sx={{ mb: 2 }}>
                {/* Station name and distance */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Chip
                    icon={<MapPinIcon size={16} className="text-blue-400" />}
                    label={stationInfo.station.name}
                    sx={{
                      bgcolor: 'rgba(59, 130, 246, 0.1)',
                      color: 'rgb(147, 197, 253)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    label={`${Math.round(stationInfo.distance)}m away`}
                    sx={{
                      bgcolor: stationIndex === 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                      color: stationIndex === 0 ? 'rgb(134, 239, 172)' : 'rgb(196, 181, 253)',
                      border: stationIndex === 0 ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(168, 85, 247, 0.3)',
                      fontWeight: 600,
                    }}
                  />
                </Box>
                
                {/* Route filter buttons */}
                {stationGroup && stationGroup.allRoutes && stationGroup.allRoutes.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {stationGroup.allRoutes.map((route) => {
                      const isSelected = selectedRoutePerStation.get(stationInfo.station.id) === route.routeId;
                      return (
                        <Box 
                          key={route.routeId}
                          onClick={() => {
                            const newSelection = new Map(selectedRoutePerStation);
                            if (isSelected) {
                              // Deselect if already selected
                              newSelection.delete(stationInfo.station.id);
                            } else {
                              // Select this route
                              newSelection.set(stationInfo.station.id, route.routeId);
                            }
                            setSelectedRoutePerStation(newSelection);
                          }}
                          sx={{
                            minWidth: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: isSelected ? 'primary.main' : 'rgba(100, 116, 139, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: isSelected ? 'none' : '1px solid rgba(100, 116, 139, 0.4)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              bgcolor: isSelected ? 'primary.dark' : 'rgba(100, 116, 139, 0.4)',
                              transform: 'scale(1.05)',
                            },
                            '&:active': {
                              transform: 'scale(0.95)',
                            }
                          }}
                        >
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              color: isSelected ? 'white' : 'rgb(148, 163, 184)', 
                              fontWeight: 'bold'
                            }}
                          >
                            {route.routeName}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>
              
              {/* Vehicles for this station or "No buses" message */}
              {stationGroup && stationGroup.vehicles.length > 0 ? (
                <Stack spacing={2}>
                  {stationGroup.vehicles.map((vehicle, index) => (
                    <Card
                      key={`${vehicle.id}-${stationInfo.station.id}-${index}`}
                      sx={{
                        bgcolor: 'rgba(30, 41, 59, 0.3)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(100, 116, 139, 0.2)',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          bgcolor: 'rgba(30, 41, 59, 0.5)',
                          border: '1px solid rgba(100, 116, 139, 0.4)',
                        },
                      }}
                    >
                      <CardContent sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box 
                            onClick={() => {
                              const newSelection = new Map(selectedRoutePerStation);
                              const isSelected = selectedRoutePerStation.get(stationInfo.station.id) === vehicle.routeId;
                              
                              if (isSelected) {
                                // Deselect if already selected
                                newSelection.delete(stationInfo.station.id);
                              } else {
                                // Select this route
                                newSelection.set(stationInfo.station.id, vehicle.routeId);
                              }
                              setSelectedRoutePerStation(newSelection);
                            }}
                            sx={{
                              minWidth: 48,
                              height: 48,
                              borderRadius: 2,
                              bgcolor: 'primary.main',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                bgcolor: 'primary.dark',
                                transform: 'scale(1.05)',
                              },
                              '&:active': {
                                transform: 'scale(0.95)',
                              }
                            }}
                          >
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                              {vehicle.route}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body1" sx={{ color: 'white', fontWeight: 600 }}>
                              {vehicle.destination || 'Unknown destination'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Typography variant="body2" sx={{ color: 'grey.400' }}>
                                Vehicle: {vehicle.vehicle?.label || vehicle.vehicle?.id || 'Unknown'}
                              </Typography>
                              {vehicle._internalDirection !== 'unknown' && (
                                <Chip
                                  label={
                                    vehicle._internalDirection === 'arriving' 
                                      ? vehicle.minutesAway === 0 
                                        ? 'At station'
                                        : vehicle.minutesAway === 1 
                                          ? 'Arriving next'
                                          : `Arriving in ${vehicle.minutesAway}min`
                                      : `Already left`
                                  }
                                  size="small"
                                  sx={{
                                    bgcolor: vehicle._internalDirection === 'arriving' 
                                      ? vehicle.minutesAway === 0
                                        ? 'rgba(251, 191, 36, 0.1)' // Yellow background for "At station"
                                        : 'rgba(34, 197, 94, 0.1)'  // Green background for "Arriving"
                                      : 'rgba(239, 68, 68, 0.1)', // Red background for "Already left"
                                    color: vehicle._internalDirection === 'arriving' 
                                      ? vehicle.minutesAway === 0
                                        ? 'rgb(252, 211, 77)' // Yellow text for "At station"
                                        : 'rgb(134, 239, 172)' // Green text for "Arriving"
                                      : 'rgb(248, 113, 113)', // Red text for "Already left"
                                    border: vehicle._internalDirection === 'arriving' 
                                      ? vehicle.minutesAway === 0
                                        ? '1px solid rgba(251, 191, 36, 0.3)' // Yellow border for "At station"
                                        : '1px solid rgba(34, 197, 94, 0.3)'  // Green border for "Arriving"
                                      : '1px solid rgba(239, 68, 68, 0.3)', // Red border for "Already left"
                                    fontSize: '0.75rem',
                                    height: 20,
                                  }}
                                />
                              )}
                            </Box>
                            
                            {/* Expandable stops toggle and map button */}
                            {vehicle.stopSequence && vehicle.stopSequence.length > 0 && (
                              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                {/* Stops toggle button */}
                                <Box
                                  onClick={() => {
                                    const newExpanded = new Set(expandedVehicles);
                                    if (expandedVehicles.has(vehicle.id)) {
                                      newExpanded.delete(vehicle.id);
                                    } else {
                                      newExpanded.add(vehicle.id);
                                    }
                                    setExpandedVehicles(newExpanded);
                                  }}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    py: 0.5,
                                    px: 1,
                                    borderRadius: 1,
                                    bgcolor: 'rgba(100, 116, 139, 0.1)',
                                    flex: 1,
                                    '&:hover': {
                                      bgcolor: 'rgba(100, 116, 139, 0.2)',
                                    },
                                    '&:active': {
                                      bgcolor: 'rgba(100, 116, 139, 0.3)',
                                    }
                                  }}
                                >
                                  <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                                    {expandedVehicles.has(vehicle.id) ? (
                                      <ExpandLess fontSize="small" />
                                    ) : (
                                      <ExpandMore fontSize="small" />
                                    )}
                                  </Box>
                                  <Typography variant="caption" color="text.secondary">
                                    {expandedVehicles.has(vehicle.id) ? 'Hide' : 'Show'} stops ({vehicle.stopSequence.length})
                                  </Typography>
                                </Box>
                                
                                {/* Map button */}
                                <Box
                                  onClick={() => {
                                    setSelectedVehicleForMap(vehicle);
                                    setTargetStationId(stationInfo.station.id);
                                    setMapModalOpen(true);
                                  }}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    py: 0.5,
                                    px: 1,
                                    borderRadius: 1,
                                    bgcolor: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    '&:hover': {
                                      bgcolor: 'rgba(59, 130, 246, 0.2)',
                                    },
                                    '&:active': {
                                      bgcolor: 'rgba(59, 130, 246, 0.3)',
                                    }
                                  }}
                                >
                                  <MapIcon fontSize="small" sx={{ color: 'rgb(147, 197, 253)' }} />
                                </Box>
                              </Box>
                            )}
                          </Box>

                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                              Live
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'grey.500' }}>
                              {formatTime24(
                                vehicle.vehicle?.timestamp instanceof Date 
                                  ? vehicle.vehicle.timestamp 
                                  : vehicle.vehicle?.timestamp 
                                    ? new Date(vehicle.vehicle.timestamp)
                                    : new Date()
                              )}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                      
                      {/* Collapsible stops list */}
                      <Collapse in={expandedVehicles.has(vehicle.id)}>
                        <Box sx={{ px: 2, pb: 2 }}>
                          <Typography variant="caption" sx={{ color: 'grey.500', mb: 1, display: 'block' }}>
                            Route stops for {vehicle.route}
                          </Typography>
                          <List dense sx={{ py: 0 }}>
                            {vehicle.stopSequence?.map((stop) => (
                              <ListItem
                                key={`${vehicle.id}-stop-${stop.stopId}-${stop.sequence}`}
                                sx={{
                                  py: 0.5,
                                  px: 1,
                                  borderRadius: 1,
                                  bgcolor: stop.isCurrent
                                    ? alpha(theme.palette.primary.main, 0.1)
                                    : 'transparent',
                                  border: stop.isCurrent
                                    ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                                    : '1px solid transparent',
                                  mb: 0.5,
                                }}
                              >
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                  <Box
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      bgcolor: theme.palette.background.paper,
                                      border: `1px solid ${theme.palette.divider}`,
                                    }}
                                  >
                                    {stop.isCurrent ? (
                                      <DirectionsBus 
                                        sx={{ 
                                          fontSize: 14, 
                                          color: theme.palette.primary.main
                                        }} 
                                      />
                                    ) : stop.isDestination ? (
                                      <FlagOutlined 
                                        sx={{ 
                                          fontSize: 14, 
                                          color: theme.palette.success.main
                                        }} 
                                      />
                                    ) : (
                                      <Box
                                        sx={{
                                          width: 8,
                                          height: 8,
                                          borderRadius: '50%',
                                          bgcolor: theme.palette.text.disabled,
                                        }}
                                      />
                                    )}
                                  </Box>
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Typography 
                                      variant="body2" 
                                      sx={{
                                        fontSize: '0.8rem',
                                        fontWeight: stop.isCurrent ? 600 : 400,
                                        color: stop.isCurrent 
                                          ? theme.palette.primary.main 
                                          : theme.palette.text.primary,
                                        lineHeight: 1.2,
                                      }}
                                    >
                                      {stop.stopName}
                                    </Typography>
                                  }
                                  secondary={
                                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                      {stop.isCurrent && 'Bus is currently closest to this stop'}
                                      {stop.isDestination && 'Final destination'}
                                      {!stop.isCurrent && !stop.isDestination && `Stop ${stop.sequence}`}
                                    </Typography>
                                  }
                                />
                                {stop.isCurrent && (
                                  <Chip
                                    label="Current"
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{
                                      height: 16,
                                      fontSize: '0.6rem',
                                      '& .MuiChip-label': {
                                        px: 0.5,
                                      },
                                    }}
                                  />
                                )}

                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      </Collapse>
                    </Card>
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
                        No buses currently at this station
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'grey.500', textAlign: 'center' }}>
                        Check back in a few minutes or try refreshing
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Box>
          );
        })}
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