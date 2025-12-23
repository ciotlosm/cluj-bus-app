/**
 * MapModeController - Handles viewport management and bounds fitting for different map modes
 * Automatically positions the map based on the selected mode and target entities
 * Uses React-Leaflet hooks for map interaction
 * 
 * Requirements addressed:
 * - 1.5: Center view on tracked vehicle and route for optimal visibility
 * - 2.5: Fit all route shapes within visible map bounds
 * - 3.5: Center view on selected station with appropriate zoom level
 * - 6.3: Support for different display modes
 */

import { useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useMap } from 'react-leaflet';
import type { LatLngBounds } from 'leaflet';
import { MapMode } from '../../../types/interactiveMap';
import type { 
  Coordinates,
  RouteShape
} from '../../../types/interactiveMap';
import type { 
  TranzyVehicleResponse, 
  TranzyRouteResponse, 
  TranzyStopResponse,
  TranzyTripResponse,
  TranzyStopTimeResponse
} from '../../../types/rawTranzyApi';

interface MapModeControllerProps {
  mode: MapMode;
  vehicles: TranzyVehicleResponse[];
  routes: TranzyRouteResponse[];
  stations: TranzyStopResponse[];
  routeShapes: Map<string, RouteShape>;
  trips?: TranzyTripResponse[];
  stopTimes?: TranzyStopTimeResponse[];
  targetVehicleId?: number;
  targetRouteId?: number;
  targetStationId?: number;
  onViewportChange: (center: Coordinates, zoom: number, bounds?: [number, number, number, number]) => void;
}

// Zoom levels for different modes
const ZOOM_LEVELS = {
  VEHICLE_TRACKING: 15,
  ROUTE_OVERVIEW: 13,
  STATION_CENTERED: 16,
  SINGLE_POINT: 15,
  DEFAULT: 13,
} as const;

export const MapModeController: FC<MapModeControllerProps> = ({
  mode,
  vehicles,
  routes,
  stations,
  routeShapes,
  trips = [],
  stopTimes = [],
  targetVehicleId,
  targetRouteId,
  targetStationId,
  onViewportChange,
}) => {
  const map = useMap();

  // Helper function to get route shapes for a specific route
  const getRouteShapesForRoute = useCallback((routeId: number): RouteShape[] => {
    const routeTrips = trips.filter(trip => trip.route_id === routeId);
    const shapeIds = [...new Set(routeTrips.map(trip => trip.shape_id).filter(Boolean))];
    
    return shapeIds
      .map(shapeId => routeShapes.get(shapeId))
      .filter((shape): shape is RouteShape => shape !== undefined);
  }, [trips, routeShapes]);

  // Helper function to get stations for a specific route
  const getStationsForRoute = useCallback((routeId: number): TranzyStopResponse[] => {
    const routeTrips = trips.filter(trip => trip.route_id === routeId);
    const tripIds = routeTrips.map(trip => trip.trip_id);
    
    const routeStopIds = new Set(
      stopTimes
        .filter(stopTime => tripIds.includes(stopTime.trip_id))
        .map(stopTime => stopTime.stop_id)
    );
    
    return stations.filter(station => routeStopIds.has(station.stop_id));
  }, [trips, stopTimes, stations]);

  // Helper function to get vehicles serving a specific station
  const getVehiclesForStation = useCallback((stationId: number): TranzyVehicleResponse[] => {
    const stationStopTimes = stopTimes.filter(stopTime => stopTime.stop_id === stationId);
    const tripIds = new Set(stationStopTimes.map(stopTime => stopTime.trip_id));
    
    return vehicles.filter(vehicle => vehicle.trip_id && tripIds.has(vehicle.trip_id));
  }, [vehicles, stopTimes]);

  // Helper function to fit map bounds to coordinates with proper error handling
  const fitBoundsToCoordinates = useCallback((coordinates: Coordinates[], zoomLevel?: number) => {
    if (!map || coordinates.length === 0) {
      console.warn('MapModeController: No coordinates provided for bounds fitting');
      return;
    }

    try {
      if (coordinates.length === 1) {
        // Single point - center and zoom
        const coord = coordinates[0];
        const zoom = zoomLevel || ZOOM_LEVELS.SINGLE_POINT;
        map.setView([coord.lat, coord.lon], zoom);
        return;
      }

      // Multiple points - create bounds and fit
      const latLngs = coordinates.map(coord => [coord.lat, coord.lon] as [number, number]);
      
      // Create bounds from first point
      let bounds = map.getBounds();
      bounds = bounds.extend(latLngs[0]);
      
      // Extend bounds to include all points
      latLngs.forEach(latLng => {
        bounds = bounds.extend(latLng);
      });

      // Fit bounds with padding and max zoom
      const maxZoom = zoomLevel || ZOOM_LEVELS.DEFAULT;
      map.fitBounds(bounds, { 
        padding: [20, 20],
        maxZoom 
      });
    } catch (error) {
      console.error('MapModeController: Error fitting bounds:', error);
      // Fallback to default center if bounds fitting fails
      if (coordinates.length > 0) {
        const firstCoord = coordinates[0];
        map.setView([firstCoord.lat, firstCoord.lon], ZOOM_LEVELS.DEFAULT);
      }
    }
  }, [map]);

  // Vehicle tracking mode: center on vehicle and its route (Requirement 1.5)
  const handleVehicleTrackingMode = useCallback(() => {
    if (!targetVehicleId) {
      console.warn('MapModeController: No target vehicle ID provided for vehicle tracking mode');
      return;
    }

    const targetVehicle = vehicles.find(v => v.id === targetVehicleId);
    if (!targetVehicle) {
      console.warn(`MapModeController: Vehicle with ID ${targetVehicleId} not found`);
      return;
    }

    const bounds: Coordinates[] = [];
    
    // Add vehicle position
    bounds.push({ lat: targetVehicle.latitude, lon: targetVehicle.longitude });

    // Add route shape points if available
    if (targetVehicle.trip_id) {
      const trip = trips.find(t => t.trip_id === targetVehicle.trip_id);
      if (trip?.shape_id) {
        const routeShape = routeShapes.get(trip.shape_id);
        if (routeShape) {
          bounds.push(...routeShape.points);
        }
      }
    }

    // Add stations along the route if we have route information
    if (targetVehicle.route_id) {
      const routeStations = getStationsForRoute(targetVehicle.route_id);
      routeStations.forEach(station => {
        bounds.push({ lat: station.stop_lat, lon: station.stop_lon });
      });
    }

    fitBoundsToCoordinates(bounds, ZOOM_LEVELS.VEHICLE_TRACKING);
  }, [targetVehicleId, vehicles, trips, routeShapes, getStationsForRoute, fitBoundsToCoordinates]);

  // Route overview mode: fit all route shapes and stations (Requirement 2.5)
  const handleRouteOverviewMode = useCallback(() => {
    if (!targetRouteId) {
      console.warn('MapModeController: No target route ID provided for route overview mode');
      return;
    }

    const bounds: Coordinates[] = [];

    // Add all route shapes for this route
    const routeShapes = getRouteShapesForRoute(targetRouteId);
    routeShapes.forEach(shape => {
      bounds.push(...shape.points);
    });

    // Add stations for this route
    const routeStations = getStationsForRoute(targetRouteId);
    routeStations.forEach(station => {
      bounds.push({ lat: station.stop_lat, lon: station.stop_lon });
    });

    if (bounds.length === 0) {
      console.warn(`MapModeController: No route data found for route ID ${targetRouteId}`);
      return;
    }

    fitBoundsToCoordinates(bounds, ZOOM_LEVELS.ROUTE_OVERVIEW);
  }, [targetRouteId, getRouteShapesForRoute, getStationsForRoute, fitBoundsToCoordinates]);

  // Station centered mode: center on station and show serving vehicles (Requirement 3.5)
  const handleStationCenteredMode = useCallback(() => {
    if (!targetStationId) {
      console.warn('MapModeController: No target station ID provided for station centered mode');
      return;
    }

    const targetStation = stations.find(s => s.stop_id === targetStationId);
    if (!targetStation) {
      console.warn(`MapModeController: Station with ID ${targetStationId} not found`);
      return;
    }

    const bounds: Coordinates[] = [];
    
    // Add station position
    bounds.push({ lat: targetStation.stop_lat, lon: targetStation.stop_lon });

    // Add vehicles serving this station
    const servingVehicles = getVehiclesForStation(targetStationId);
    servingVehicles.forEach(vehicle => {
      bounds.push({ lat: vehicle.latitude, lon: vehicle.longitude });
    });

    // Add route shapes for serving vehicles
    servingVehicles.forEach(vehicle => {
      if (vehicle.trip_id) {
        const trip = trips.find(t => t.trip_id === vehicle.trip_id);
        if (trip?.shape_id) {
          const routeShape = routeShapes.get(trip.shape_id);
          if (routeShape) {
            bounds.push(...routeShape.points);
          }
        }
      }
    });

    fitBoundsToCoordinates(bounds, ZOOM_LEVELS.STATION_CENTERED);
  }, [targetStationId, stations, getVehiclesForStation, trips, routeShapes, fitBoundsToCoordinates]);

  // Handle viewport changes based on mode
  useEffect(() => {
    if (!map) return;

    const updateViewport = () => {
      try {
        switch (mode) {
          case MapMode.VEHICLE_TRACKING:
            handleVehicleTrackingMode();
            break;
          case MapMode.ROUTE_OVERVIEW:
            handleRouteOverviewMode();
            break;
          case MapMode.STATION_CENTERED:
            handleStationCenteredMode();
            break;
          default:
            console.warn(`MapModeController: Unknown map mode: ${mode}`);
        }
      } catch (error) {
        console.error('MapModeController: Error updating viewport:', error);
      }
    };

    // Small delay to ensure map is fully initialized
    const timeoutId = setTimeout(updateViewport, 100);
    
    return () => clearTimeout(timeoutId);
  }, [
    mode, 
    targetVehicleId, 
    targetRouteId, 
    targetStationId, 
    vehicles, 
    routes, 
    stations, 
    routeShapes,
    trips,
    stopTimes,
    handleVehicleTrackingMode,
    handleRouteOverviewMode,
    handleStationCenteredMode
  ]);

  // Listen for map events to update parent state
  useEffect(() => {
    if (!map) return;

    const handleMapChange = () => {
      try {
        const center = map.getCenter();
        const zoom = map.getZoom();
        const bounds = map.getBounds();
        
        onViewportChange(
          { lat: center.lat, lon: center.lng },
          zoom,
          [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()]
        );
      } catch (error) {
        console.error('MapModeController: Error handling map change:', error);
      }
    };

    map.on('moveend', handleMapChange);
    map.on('zoomend', handleMapChange);

    return () => {
      map.off('moveend', handleMapChange);
      map.off('zoomend', handleMapChange);
    };
  }, [map, onViewportChange]);

  // This component doesn't render anything - it's just for map control
  return null;
};