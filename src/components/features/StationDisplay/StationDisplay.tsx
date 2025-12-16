import React from 'react';
import {
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import { useLocationStore } from '../../../stores/locationStore';
import { useConfigStore } from '../../../stores/configStore';
import { getEffectiveLocation } from '../../../utils/locationUtils';
import { withPerformanceMonitoring } from '../../../utils/performance';
import { logger } from '../../../utils/logger';
import { calculateDistance } from '../../../utils/distanceUtils';
import { BusIcon, MapPinIcon } from '../../ui/Icons/Icons';
import { enhancedTranzyApi } from '../../../services/tranzyApiService';
import { BusRouteMapModal } from '../FavoriteBuses/components/BusRouteMapModal';
import { VehicleCard } from '../shared/VehicleCard';
import { StationHeader } from '../shared/StationHeader';
import { RouteFilterChips } from '../shared/RouteFilterChips';
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

  // Find closest stations that actually have vehicles serving them
  const targetStations = React.useMemo(() => {
    if (!effectiveLocationForDisplay || !allStations.length) return [];

    const maxSearchRadius = 5000; // Expanded to 5km to find stations with actual service
    const maxStationsToCheck = 20; // Check up to 20 closest stations to find ones with vehicles

    // Get stations sorted by distance - we'll let the vehicle processing determine which have service
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
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxStationsToCheck); // Take the closest stations to check for service

    return stationsWithDistances;
  }, [effectiveLocationForDisplay, allStations, vehicles, calculateDistance]);

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
        const allStationVehicleGroups = targetStations.map(stationInfo => {
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

        // Apply 200m proximity rule: only show closest station + second station if within 200m
        const stationVehicleGroups = [];
        
        // Filter to only include stations that have vehicles
        const stationsWithVehicles = allStationVehicleGroups.filter(group => group.vehicles.length > 0);
        
        if (stationsWithVehicles.length > 0) {
          // Always include the closest station with vehicles
          stationVehicleGroups.push(stationsWithVehicles[0]);
          
          // Check if there's a second station within 200m of the first
          if (stationsWithVehicles.length > 1) {
            const firstStation = stationsWithVehicles[0].station.station;
            
            for (let i = 1; i < stationsWithVehicles.length; i++) {
              const candidateStation = stationsWithVehicles[i].station.station;
              
              try {
                const distanceBetweenStations = calculateDistance(
                  firstStation.coordinates,
                  candidateStation.coordinates
                );
                
                // Only add second station if it's within 200m of the first
                if (distanceBetweenStations <= 200) {
                  stationVehicleGroups.push(stationsWithVehicles[i]);
                  break; // Only add one additional station
                }
              } catch (error) {
                // Skip this station if distance calculation fails
                continue;
              }
            }
          }
        }

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
          stationsFiltered: allStationVehicleGroups.length - stationVehicleGroups.length,
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

        // If no stations have vehicles, expand search to find stations with service
        let finalStationGroups = stationVehicleGroups;
        
        if (stationVehicleGroups.length === 0 && targetStations.length > 0) {
          logger.debug('No vehicles found at initial stations, expanding search...', {
            initialStationsChecked: targetStations.length,
            expandingSearchRadius: true
          }, 'COMPONENT');
          
          // Try with more stations from our expanded list
          const expandedStationGroups = [];
          
          // Process more stations from our targetStations list
          for (const stationInfo of targetStations) {
            // Check if this station has vehicles serving it using the same logic
            const vehiclesForThisStation = baseEnhancedVehicles.filter(baseVehicle => {
              if (!baseVehicle.vehicle?.tripId) return false;
              
              const tripStops = tripStopSequenceMap.get(baseVehicle.vehicle.tripId);
              if (!tripStops) return false;
              
              return tripStops.some(stop => stop.stopId === stationInfo.station.id);
            });
            
            if (vehiclesForThisStation.length > 0) {
              // Process vehicles for this station (same logic as above)
              const enhancedVehiclesForStation = vehiclesForThisStation.map(baseVehicle => {
                const { directionStatus, estimatedMinutes } = analyzeVehicleDirection(
                  matchingVehicles.find(v => v.id === baseVehicle.id)!,
                  stationInfo.station
                );

                const vehicleTripStops = tripStopSequenceMap.get(baseVehicle.vehicle?.tripId || '');
                let stopSequence = [];

                if (vehicleTripStops) {
                  const sortedStops = vehicleTripStops.sort((a, b) => a.sequence - b.sequence);
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
              
              // Apply the same vehicle selection logic
              const maxVehicles = config?.maxVehiclesPerStation || 5;
              const routeGroups = new Map();
              
              enhancedVehiclesForStation.forEach(vehicle => {
                const routeId = vehicle.routeId;
                if (!routeGroups.has(routeId)) {
                  routeGroups.set(routeId, []);
                }
                routeGroups.get(routeId).push(vehicle);
              });

              const bestVehiclePerRoute = Array.from(routeGroups.entries()).map(([routeId, vehicles]) => {
                return vehicles.sort((a, b) => {
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
                })[0];
              });

              const finalVehicles = bestVehiclePerRoute
                .sort((a, b) => a.minutesAway - b.minutesAway)
                .slice(0, maxVehicles);
              
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
              
              expandedStationGroups.push({
                station: stationInfo,
                vehicles: finalVehicles,
                allRoutes: allRoutesAtStation
              });
              
              // For the first station, always add it
              if (expandedStationGroups.length === 1) {
                // For the second station, only add if it's within 200m of the first station
                const firstStation = expandedStationGroups[0].station.station;
                try {
                  const distanceBetweenStations = calculateDistance(
                    firstStation.coordinates,
                    stationInfo.station.coordinates
                  );
                  
                  // Only add second station if it's within 200m of the first
                  if (distanceBetweenStations <= 200) {
                    // This station is close enough, add it
                  } else {
                    // This station is too far, skip it and stop searching
                    break;
                  }
                } catch (error) {
                  // Skip this station if distance calculation fails
                  break;
                }
              }
              
              // Stop after finding 2 stations (1 closest + 1 within 200m if available)
              if (expandedStationGroups.length >= 2) {
                break;
              }
            }
          }
          
          finalStationGroups = expandedStationGroups;
          
          logger.debug('Expanded search completed', {
            stationsChecked: targetStations.length,
            stationsWithVehicles: expandedStationGroups.length,
            foundStations: expandedStationGroups.map(g => ({
              name: g.station.station.name,
              distance: Math.round(g.station.distance),
              vehicleCount: g.vehicles.length
            }))
          }, 'COMPONENT');
        }

        // Debug logging for station groups
        logger.debug('Station groups processing completed', {
          totalGroups: finalStationGroups.length,
          totalMatchingVehicles: matchingVehicles.length,
          groupDetails: finalStationGroups.map(group => ({
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
        setStationVehicleGroups(finalStationGroups);
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
        {/* Only show stations that have vehicles serving them */}
        {stationVehicleGroups.map((stationGroup, stationIndex) => {
          // Get the station info from targetStations for distance information
          const stationInfo = targetStations.find(
            ts => ts.station.id === stationGroup.station.station.id
          );
          
          // Skip if we don't have station info (shouldn't happen) or no vehicles
          if (!stationInfo || !stationGroup.vehicles.length) {
            return null;
          }
          
          return (
            <Box key={stationGroup.station.station.id}>
              {/* Station Section Header */}
              <Box sx={{ mb: 2 }}>
                <StationHeader
                  stationName={stationGroup.station.station.name}
                  distance={stationInfo.distance}
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