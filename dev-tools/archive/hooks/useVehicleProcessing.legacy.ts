/**
 * ARCHIVED: Original useVehicleProcessing hook (829 lines)
 * 
 * This file contains the original "God Hook" implementation that was refactored
 * into focused, composable hooks as part of the hook refactoring initiative.
 * 
 * Archived on: December 17, 2024
 * Reason: Replaced by useVehicleProcessingOrchestration.ts with focused sub-hooks
 * 
 * Original issues:
 * - Single Responsibility Violation: 11+ distinct responsibilities in one hook
 * - Complex Dependencies: Memoized hashes to prevent infinite loops
 * - Testing Difficulty: Cannot test individual pieces in isolation
 * - Reusability Problems: Cannot reuse logic across different components
 * - Performance Bottlenecks: Re-executes entire pipeline on any change
 * 
 * Replaced by:
 * - Data layer hooks: useStationData, useVehicleData, useRouteData, useStopTimesData
 * - Processing layer hooks: useVehicleFiltering, useVehicleGrouping, useDirectionAnalysis, useProximityCalculation
 * - Orchestration layer: useVehicleProcessingOrchestration (maintains backward compatibility)
 * 
 * Migration path:
 * - Components now use useVehicleProcessingMigrated with feature flags
 * - New implementation provides exact API compatibility
 * - Performance improvements through focused caching and selective re-execution
 */

import React from 'react';
import { useLocationStore } from '../../stores/locationStore';
import { useConfigStore } from '../../stores/configStore';
import { useEnhancedBusStore } from '../../stores/enhancedBusStore';
import { useApiConfig } from '../useApiConfig';
import { useAsyncOperation } from '../useAsyncOperation';
import { getEffectiveLocation } from '../../utils/locationUtils';
import { logger } from '../../utils/logger';
import { calculateDistance } from '../../utils/distanceUtils';
import { enhancedTranzyApi } from '../../services/tranzyApiService';
import type { EnhancedVehicleInfo, Station, LiveVehicle } from '../../types';

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

interface VehicleProcessingOptions {
  filterByFavorites?: boolean;
  maxStations?: number;
  maxVehiclesPerStation?: number;
  showAllVehiclesPerRoute?: boolean;
  maxSearchRadius?: number;
  maxStationsToCheck?: number;
  proximityThreshold?: number;
}

interface StationVehicleGroup {
  station: { station: Station; distance: number };
  vehicles: EnhancedVehicleInfoWithDirection[];
  allRoutes: Array<{
    routeId: string;
    routeName: string;
    vehicleCount: number;
  }>;
}

export const useVehicleProcessingLegacy = (options: VehicleProcessingOptions = {}) => {
  const {
    filterByFavorites = false,
    maxStations = 2,
    maxVehiclesPerStation = 5,
    showAllVehiclesPerRoute = false,
    maxSearchRadius = 5000,
    maxStationsToCheck = 20,
    proximityThreshold = 200,
  } = options;

  const { currentLocation } = useLocationStore();
  const { config } = useConfigStore();
  const { setupApi, isConfigured } = useApiConfig();
  const stationsOperation = useAsyncOperation<Station[]>();
  const vehiclesOperation = useAsyncOperation<LiveVehicle[]>();
  const processingOperation = useAsyncOperation<StationVehicleGroup[]>();
  
  const [allStations, setAllStations] = React.useState<Station[]>([]);
  const [vehicles, setVehicles] = React.useState<LiveVehicle[]>([]);
  const [stationVehicleGroups, setStationVehicleGroups] = React.useState<StationVehicleGroup[]>([]);
  
  // Separate loading states to avoid infinite re-renders
  const [isLoadingStations, setIsLoadingStations] = React.useState(false);
  const [isLoadingVehicles, setIsLoadingVehicles] = React.useState(false);
  const [isProcessingVehicles, setIsProcessingVehicles] = React.useState(false);

  // Get effective location with fallback priority
  const effectiveLocationForDisplay = getEffectiveLocation(
    currentLocation,
    config?.homeLocation,
    config?.workLocation,
    config?.defaultLocation
  );

  // Get favorite route names from config (only used when filterByFavorites is true)
  const favoriteRoutes = React.useMemo(() => {
    return filterByFavorites ? (config?.favoriteBuses || []) : [];
  }, [config?.favoriteBuses, filterByFavorites]);

  // Get stations from cache via API service (cache-aware)
  React.useEffect(() => {
    if (!isConfigured) {
      setAllStations([]);
      setIsLoadingStations(false);
      return;
    }

    setIsLoadingStations(true);
    stationsOperation.execute(
      async () => {
        const agencyId = setupApi();
        const stations = await enhancedTranzyApi.getStops(agencyId, false);
        
        logger.debug('Fetched stations from cache for vehicle processing', {
          stationCount: stations.length,
          agencyId,
          filterByFavorites
        }, 'VEHICLE_PROCESSING');
        
        return stations;
      },
      {
        errorMessage: 'Failed to fetch stations for vehicle processing',
        logCategory: 'VEHICLE_PROCESSING',
      }
    ).then(stations => {
      if (stations) {
        setAllStations(stations);
      } else {
        setAllStations([]);
      }
      setIsLoadingStations(false);
    }).catch(() => {
      setIsLoadingStations(false);
    });
  }, [isConfigured, filterByFavorites]); // Removed stationsOperation and setupApi from dependencies

  // Get vehicles from cache via API service (cache-aware)
  React.useEffect(() => {
    if (!isConfigured) {
      setVehicles([]);
      setIsLoadingVehicles(false);
      return;
    }

    setIsLoadingVehicles(true);
    vehiclesOperation.execute(
      async () => {
        const agencyId = setupApi();
        const vehicleData = await enhancedTranzyApi.getVehicles(agencyId);
        
        logger.debug('Fetched vehicles from cache for vehicle processing', {
          vehicleCount: vehicleData.length,
          agencyId,
          filterByFavorites
        }, 'VEHICLE_PROCESSING');
        
        return vehicleData;
      },
      {
        errorMessage: 'Failed to fetch vehicles for vehicle processing',
        logCategory: 'VEHICLE_PROCESSING',
      }
    ).then(vehicles => {
      if (vehicles) {
        setVehicles(vehicles);
      } else {
        setVehicles([]);
      }
      setIsLoadingVehicles(false);
    }).catch(() => {
      setIsLoadingVehicles(false);
    });
  }, [isConfigured, filterByFavorites]); // Removed vehiclesOperation and setupApi from dependencies

  // Find target stations based on filtering mode
  const targetStations = React.useMemo(() => {
    if (!effectiveLocationForDisplay || !allStations.length) return [];

    if (filterByFavorites && favoriteRoutes.length === 0) return [];

    // Get stations sorted by distance - optimized with early filtering
    const stationsWithDistances = [];
    
    for (const station of allStations) {
      try {
        const distance = calculateDistance(effectiveLocationForDisplay, station.coordinates);
        if (distance <= maxSearchRadius) {
          stationsWithDistances.push({ station, distance });
        }
      } catch (error) {
        // Skip stations with invalid coordinates
        continue;
      }
    }

    // Sort and limit results
    stationsWithDistances.sort((a, b) => a.distance - b.distance);
    return stationsWithDistances.slice(0, maxStationsToCheck);
  }, [effectiveLocationForDisplay, allStations, filterByFavorites, favoriteRoutes.length, maxSearchRadius, maxStationsToCheck]);

  // Helper function to analyze vehicle direction for a specific station
  const analyzeVehicleDirection = React.useCallback((
    vehicle: LiveVehicle, 
    targetStation: Station,
    tripStopSequenceMap: Map<string, Array<{stopId: string, sequence: number}>>
  ) => {
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
        }, 'HOOK');
      }
    }
    
    return { directionStatus, estimatedMinutes };
  }, []); // Remove dependencies that cause infinite loops - function is stable within the effect

  // Process vehicles using trip_id filtering based on stop_times data
  React.useEffect(() => {
    if (!targetStations.length || !vehicles.length || !config?.agencyId) {
      setStationVehicleGroups([]);
      setIsProcessingVehicles(false);
      return;
    }

    // For favorites mode, check if we have favorite routes configured
    if (filterByFavorites && favoriteRoutes.length === 0) {
      setStationVehicleGroups([]);
      setIsProcessingVehicles(false);
      return;
    }

    setIsProcessingVehicles(true);
    processingOperation.execute(
      async () => {
        logger.debug('Starting vehicle processing', {
          targetStationsCount: targetStations.length,
          vehiclesCount: vehicles.length,
          agencyId: config.agencyId,
          filterByFavorites,
          favoriteRoutes: filterByFavorites ? favoriteRoutes : 'N/A'
        });

        // Step 1: Get routes data from cache to map route names to route IDs (for favorites mode)
        const routes = await enhancedTranzyApi.getRoutes(parseInt(config.agencyId), false);
        
        // Build maps more efficiently
        const routesMap = new Map<string, any>();
        const routeIdMap = new Map<string, any>();
        
        for (const route of routes) {
          routesMap.set(route.routeName, route);
          routeIdMap.set(route.id, route);
        }

        // Step 2: Filter vehicles based on mode
        let relevantVehicles = vehicles;
        
        if (filterByFavorites) {
          // Filter by favorite routes
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
            routesMapSize: routesMap.size
          });

          relevantVehicles = vehicles.filter(vehicle => 
            vehicle.routeId && favoriteRouteIds.includes(vehicle.routeId)
          );
        }

        // Step 3: Get stop_times data from cache to find which trips serve our target stations
        const allStopTimes = await enhancedTranzyApi.getStopTimes(parseInt(config.agencyId), undefined, undefined, false);
        
        if (!allStopTimes || allStopTimes.length === 0) {
          logger.warn('No stop_times data available');
          setStationVehicleGroups([]);
          return;
        }

        // Step 4: Build trip filtering logic
        let stationIds: string[];
        let relevantTripIds: Set<string>;

        if (filterByFavorites) {
          // For favorites: find stations that serve favorite routes
          const favoriteVehicleTripIds = new Set(
            relevantVehicles
              .map(v => v.tripId)
              .filter(tripId => tripId !== null && tripId !== undefined)
          );

          const stationsServedByFavoriteRoutes = new Set<string>();
          allStopTimes.forEach(stopTime => {
            if (favoriteVehicleTripIds.has(stopTime.tripId)) {
              stationsServedByFavoriteRoutes.add(stopTime.stopId);
            }
          });

          // Filter target stations to only those serving favorite routes
          const candidateStations = allStations.filter(station => 
            stationsServedByFavoriteRoutes.has(station.id)
          );

          // Fallback: if no stations found from active vehicles, use schedule data
          if (candidateStations.length === 0) {
            logger.debug('No stations found from active vehicles, falling back to schedule data');
            
            const trips = await enhancedTranzyApi.getTrips(parseInt(config.agencyId), undefined, false);
            const tripToRouteMap = new Map(trips.map(trip => [trip.id, trip.routeId]));
            
            const favoriteRouteNames = favoriteRoutes.map(route => 
              typeof route === 'string' ? route : route.routeName
            );
            
            const favoriteRouteStations = new Set<string>();
            allStopTimes.forEach(stopTime => {
              const routeId = tripToRouteMap.get(stopTime.tripId);
              if (routeId) {
                const route = routeIdMap.get(routeId);
                if (route && favoriteRouteNames.includes(route.routeName)) {
                  favoriteRouteStations.add(stopTime.stopId);
                }
              }
            });
            
            stationIds = Array.from(favoriteRouteStations);
          } else {
            stationIds = candidateStations.map(s => s.id);
          }

          relevantTripIds = new Set<string>();
          allStopTimes.forEach(stopTime => {
            if (stationIds.includes(stopTime.stopId)) {
              relevantTripIds.add(stopTime.tripId);
            }
          });
        } else {
          // For station display: use target station IDs directly
          stationIds = targetStations.map(ts => ts.station.id);
          relevantTripIds = new Set<string>();
          
          allStopTimes.forEach(stopTime => {
            if (stationIds.includes(stopTime.stopId)) {
              relevantTripIds.add(stopTime.tripId);
            }
          });
        }

        // Step 5: Filter vehicles by relevant trip IDs
        const matchingVehicles = relevantVehicles.filter(vehicle => 
          vehicle.tripId && relevantTripIds.has(vehicle.tripId)
        );

        // Step 6: Build a map of trip_id -> stop sequence data for efficient lookup
        const tripStopSequenceMap = new Map<string, Array<{stopId: string, sequence: number}>>();
        
        // Process stop times more efficiently
        for (const stopTime of allStopTimes) {
          let tripStops = tripStopSequenceMap.get(stopTime.tripId);
          if (!tripStops) {
            tripStops = [];
            tripStopSequenceMap.set(stopTime.tripId, tripStops);
          }
          tripStops.push({
            stopId: stopTime.stopId,
            sequence: stopTime.sequence
          });
        }

        // Step 7: Get trips data from cache to get proper headsigns for destinations
        const trips = await enhancedTranzyApi.getTrips(parseInt(config.agencyId), undefined, false);
        const tripsMap = new Map(trips.map(trip => [trip.id, trip]));

        // Step 8: Create base enhanced vehicles with proper trip headsign destinations
        const baseEnhancedVehicles = matchingVehicles.map(vehicle => {
          const route = routeIdMap.get(vehicle.routeId || '');
          
          // Get trip data for headsign
          const tripData = tripsMap.get(vehicle.tripId);
          const destination = tripData?.headsign || route?.routeDesc || 'Unknown destination';

          // Debug logging to see what headsign data we're getting
          if (import.meta.env.DEV) {
            logger.debug('Vehicle destination data in useVehicleProcessing', {
              vehicleId: vehicle.id,
              tripId: vehicle.tripId,
              tripHeadsign: tripData?.headsign,
              routeDesc: route?.routeDesc,
              finalDestination: destination
            }, 'HOOK');
          }
          
          return {
            id: vehicle.id,
            routeId: vehicle.routeId || '',
            route: route?.routeName || `Route ${vehicle.routeId}`,
            destination: destination,
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

        // Step 9: Determine which stations to process based on mode
        let stationsToProcess: Array<{ station: Station; distance: number }>;
        
        if (filterByFavorites) {
          // For favorites: find closest station that serves favorite routes
          const candidateStations = allStations.filter(station => 
            stationIds.includes(station.id)
          );

          const stationsWithDistances = candidateStations
            .map(station => {
              try {
                const distance = calculateDistance(effectiveLocationForDisplay!, station.coordinates);
                return { station, distance };
              } catch (error) {
                return null;
              }
            })
            .filter(item => item !== null)
            .sort((a, b) => a.distance - b.distance);

          stationsToProcess = stationsWithDistances.slice(0, 1); // Only closest station for favorites
        } else {
          // For station display: use target stations directly
          stationsToProcess = targetStations;
        }

        // Step 10: Create station groups for display
        const allStationVehicleGroups = stationsToProcess.map(stationInfo => {
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
              stationInfo.station,
              tripStopSequenceMap
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
          
          // Apply vehicle selection logic based on mode
          let finalVehicles: EnhancedVehicleInfoWithDirection[];
          
          if (showAllVehiclesPerRoute) {
            // Show all vehicles (favorites mode)
            finalVehicles = enhancedVehiclesForStation
              .sort((a, b) => {
                // Priority sorting
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
            // Deduplicate by route and apply limits (station display mode)
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
                  
                  return a.minutesAway - b.minutesAway;
                })
                .slice(0, maxVehiclesPerStation);
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
                .slice(0, maxVehiclesPerStation);
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

        // Step 11: Apply station proximity rules
        let finalStationGroups = [];
        
        // Filter to only include stations that have vehicles
        const stationsWithVehicles = allStationVehicleGroups.filter(group => group.vehicles.length > 0);

        if (stationsWithVehicles.length > 0) {
          // Always include the closest station with vehicles
          finalStationGroups.push(stationsWithVehicles[0]);
          
          // For station display mode, check if there's a second station within proximity threshold
          if (!filterByFavorites && stationsWithVehicles.length > 1 && maxStations > 1) {
            const firstStation = stationsWithVehicles[0].station.station;
            
            for (let i = 1; i < stationsWithVehicles.length; i++) {
              const candidateStation = stationsWithVehicles[i].station.station;
              
              try {
                const distanceBetweenStations = calculateDistance(
                  firstStation.coordinates,
                  candidateStation.coordinates
                );
                
                // Only add second station if it's within proximity threshold
                if (distanceBetweenStations <= proximityThreshold) {
                  finalStationGroups.push(stationsWithVehicles[i]);
                  break; // Only add one additional station
                }
              } catch (error) {
                // Skip this station if distance calculation fails
                continue;
              }
            }
          }
        }

        logger.debug('Vehicle processing completed', {
          filterByFavorites,
          targetStations: stationsToProcess.map(ts => ({
            id: ts.station.id,
            name: ts.station.name,
            distance: Math.round(ts.distance)
          })),
          totalMatchingVehicles: matchingVehicles.length,
          stationGroups: finalStationGroups.length,
          vehiclesByStation: finalStationGroups.map(group => ({
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
        
        return finalStationGroups;
      },
      {
        errorMessage: 'Failed to process vehicles',
        logCategory: 'VEHICLE_PROCESSING',
      }
    ).then(result => {
      if (result) {
        setStationVehicleGroups(result);
      } else {
        setStationVehicleGroups([]);
      }
      setIsProcessingVehicles(false);
    }).catch(() => {
      setIsProcessingVehicles(false);
    });
  }, [
    // Use primitive values and stable references only
    targetStations.length, // Use length instead of the array itself
    vehicles.length, // Use length instead of the array itself
    config?.agencyId, 
    filterByFavorites, 
    favoriteRoutes.length, // Use length instead of the array itself
    allStations.length, // Use length instead of the array itself
    maxVehiclesPerStation,
    showAllVehiclesPerRoute,
    maxStations,
    proximityThreshold,
    // Use stable hash for data changes - memoized to prevent recalculation
    React.useMemo(() => targetStations.map(ts => ts.station.id).join(','), [targetStations]),
    React.useMemo(() => vehicles.map(v => `${v.id}-${v.tripId}`).join(','), [vehicles]),
  ]); // Fixed infinite loop by using primitive values and memoized hashes

  return {
    stationVehicleGroups,
    isLoading: isLoadingStations || isLoadingVehicles || isProcessingVehicles,
    isLoadingStations,
    isLoadingVehicles,
    isProcessingVehicles,
    effectiveLocationForDisplay,
    favoriteRoutes,
    allStations,
    vehicles,
  };
};