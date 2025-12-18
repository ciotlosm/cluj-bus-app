/**
 * Debug hook for nearby view troubleshooting
 * Exposes debug function with real app data to browser console
 */

import { useEffect, useState } from 'react';
import { useConfigStore } from '../../stores/configStore';
import { useLocationStore } from '../../stores/locationStore';
import { useVehicleStore } from '../../stores/vehicleStore';
import { debugNearbyViewConsole } from '../../utils/nearbyViewDebugger';
import { logger } from '../../utils/logger';

export const useDebugNearbyView = () => {
  const { config } = useConfigStore();
  const { currentLocation } = useLocationStore();
  
  // Get agency ID for data fetching
  const agencyId = config?.agencyId;
  
  // Use vehicle store for data access
  const { 
    vehicles: storeVehicles, 
    stations: storeStations,
    fetchRouteData,
    fetchStopTimesData
  } = useVehicleStore();

  // Local state for routes and stop times
  const [routes, setRoutes] = useState<any[]>([]);
  const [stopTimes, setStopTimes] = useState<any[]>([]);

  // Fetch additional data when needed
  useEffect(() => {
    if (!agencyId) return;

    const fetchDebugData = async () => {
      try {
        const [routeData, stopTimesData] = await Promise.all([
          fetchRouteData({ forceRefresh: false }),
          fetchStopTimesData({ forceRefresh: false })
        ]);
        setRoutes(routeData);
        setStopTimes(stopTimesData);
      } catch (error) {
        logger.warn('Failed to fetch debug data', { error }, 'DEBUG');
      }
    };

    fetchDebugData();
  }, [agencyId, fetchRouteData, fetchStopTimesData]);

  // Extract data with safe fallbacks
  const stations = storeStations || [];
  const vehicles = storeVehicles || [];
  const trips: any[] = []; // Trips data not currently used in nearby view

  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      // Only set up debug functions if we have basic data structure
      const safeStations = stations || [];
      const safeRoutes = routes || [];
      const safeVehicles = vehicles || [];
      const safeStopTimes = stopTimes || [];
      const safeTrips = trips || [];
      // Create a debug function with current app data
      (window as any).debugNearbyViewWithData = () => {
        if (!currentLocation) {
          console.warn('🔍 No GPS location available. Using Cluj center as fallback.');
          const fallbackLocation = { latitude: 46.7712, longitude: 23.6236 };
          debugNearbyViewConsole(fallbackLocation, safeStations, safeRoutes, safeStopTimes, safeTrips);
          return;
        }

        console.log('🔍 Running nearby view debug with current app data...');
        debugNearbyViewConsole(currentLocation, safeStations, safeRoutes, safeStopTimes, safeTrips);
      };

      // Also expose individual data for manual debugging
      (window as any).debugData = {
        userLocation: currentLocation,
        stations: safeStations,
        routes: safeRoutes,
        vehicles: safeVehicles,
        stopTimes: safeStopTimes,
        trips: safeTrips,
        config
      };

      logger.debug('Debug functions exposed to console', {
        hasLocation: !!currentLocation,
        stationsCount: safeStations.length,
        routesCount: safeRoutes.length,
        vehiclesCount: safeVehicles.length,
        stopTimesCount: safeStopTimes.length,
        tripsCount: safeTrips.length
      }, 'DEBUG');

      console.log('🔍 Debug functions available:');
      console.log('  debugNearbyViewWithData() - Run debug with current app data');
      console.log('  debugData - Access to all current app data');
      console.log('  debugNearbyView(userLocation, stations, routes, stopTimes, trips) - Manual debug');
      console.log(`📊 Current data: ${safeStations.length} stations, ${safeRoutes.length} routes, ${safeVehicles.length} vehicles`);
    }
  }, [currentLocation, stations, routes, vehicles, stopTimes, trips, config]);

  // Use safe variables for consistent data access
  const safeStations = stations || [];
  const safeRoutes = routes || [];
  const safeVehicles = vehicles || [];
  const safeStopTimes = stopTimes || [];
  const safeTrips = trips || [];

  return {
    hasData: safeStations.length > 0 && safeRoutes.length > 0,
    dataStatus: {
      hasLocation: !!currentLocation,
      stationsCount: safeStations.length,
      routesCount: safeRoutes.length,
      vehiclesCount: safeVehicles.length,
      stopTimesCount: safeStopTimes.length,
      tripsCount: safeTrips.length
    }
  };
};