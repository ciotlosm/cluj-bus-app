/**
 * InteractiveTransitMap - Main map component for visualizing real-time transit data
 * Built with React-Leaflet, supports multiple display modes and debugging capabilities
 * Follows established component patterns from the codebase
 * 
 * Task 11: Integration and wiring - All layers properly wired with data flow and event handlers
 * Requirements: All requirements (1.1-8.5) - Complete integration of all map functionality
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FC } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { Box, Alert } from '@mui/material';
import type { 
  InteractiveTransitMapProps, 
  MapState, 
  MapColorScheme,
  MapPerformanceConfig,
  MapLoadingState
} from '../../../types/interactiveMap';
import { 
  MapMode, 
  VehicleColorStrategy,
  DEFAULT_MAP_COLORS, 
  DEFAULT_MAP_PERFORMANCE,
  DEFAULT_LOADING_STATE,
  MAP_DEFAULTS 
} from '../../../types/interactiveMap';
import { useLocationStore } from '../../../stores/locationStore';
import { MapModeController } from './MapModeController';
import { VehicleLayer } from './VehicleLayer';
import { RouteShapeLayer } from './RouteShapeLayer';
import { StationLayer } from './StationLayer';
import { DebugLayer } from './DebugLayer';
import { UserLocationLayer } from './UserLocationLayer';
import { MapControls } from './MapControls';
import { MapLoadingOverlay } from './MapLoadingOverlay';
import { throttle } from '../../../utils/core/performanceUtils';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

export const InteractiveTransitMap: FC<InteractiveTransitMapProps> = ({
  mode,
  vehicles = [],
  routes = [],
  stations = [],
  routeShapes = new Map(),
  trips = [],
  stopTimes = [],
  targetVehicleId,
  targetRouteId,
  targetStationId,
  debugMode = false,
  debugData,
  vehicleColorStrategy = VehicleColorStrategy.BY_ROUTE,
  colorScheme: customColorScheme,
  initialCenter = MAP_DEFAULTS.CENTER,
  initialZoom = MAP_DEFAULTS.ZOOM,
  showUserLocation = true,
  performanceConfig: customPerformanceConfig,
  loadingState,
  onLoadingChange,
  onVehicleClick,
  onStationClick,
  onRouteClick,
}) => {
  // Validate required props and provide helpful error messages
  if (!mode) {
    console.error('InteractiveTransitMap: mode prop is required');
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Map mode is required. Please specify VEHICLE_TRACKING, ROUTE_OVERVIEW, or STATION_CENTERED.
      </Alert>
    );
  }

  // Validate mode-specific requirements
  const validateModeRequirements = useCallback(() => {
    switch (mode) {
      case MapMode.VEHICLE_TRACKING:
        if (!targetVehicleId) {
          console.warn('InteractiveTransitMap: targetVehicleId recommended for VEHICLE_TRACKING mode');
        }
        if (vehicles.length === 0) {
          console.warn('InteractiveTransitMap: No vehicles provided for VEHICLE_TRACKING mode');
        }
        break;
      case MapMode.ROUTE_OVERVIEW:
        if (!targetRouteId) {
          console.warn('InteractiveTransitMap: targetRouteId recommended for ROUTE_OVERVIEW mode');
        }
        if (routeShapes.size === 0) {
          console.warn('InteractiveTransitMap: No route shapes provided for ROUTE_OVERVIEW mode');
        }
        break;
      case MapMode.STATION_CENTERED:
        if (!targetStationId) {
          console.warn('InteractiveTransitMap: targetStationId recommended for STATION_CENTERED mode');
        }
        if (stations.length === 0) {
          console.warn('InteractiveTransitMap: No stations provided for STATION_CENTERED mode');
        }
        break;
    }
  }, [mode, targetVehicleId, targetRouteId, targetStationId, vehicles.length, routeShapes.size, stations.length]);

  // Run validation on mount and when relevant props change
  useEffect(() => {
    validateModeRequirements();
  }, [validateModeRequirements]);

  // Local state for map interaction
  const [mapState, setMapState] = useState<MapState>({
    mode,
    center: initialCenter,
    zoom: initialZoom,
    showVehicles: true,
    showRouteShapes: true,
    showStations: true,
    showUserLocation,
    showDebugInfo: debugMode,
    selectedVehicleId: targetVehicleId,
    selectedRouteId: targetRouteId,
    selectedStationId: targetStationId,
  });

  // Get user location from store
  const { currentPosition } = useLocationStore();

  // Merge color schemes with defaults
  const colorScheme: MapColorScheme = useMemo(() => {
    const merged = { ...DEFAULT_MAP_COLORS };
    
    if (customColorScheme) {
      if (customColorScheme.routes) {
        merged.routes = new Map([...merged.routes, ...customColorScheme.routes]);
      }
      if (customColorScheme.vehicles) {
        merged.vehicles = { ...merged.vehicles, ...customColorScheme.vehicles };
      }
      if (customColorScheme.stations) {
        merged.stations = { ...merged.stations, ...customColorScheme.stations };
      }
      if (customColorScheme.debug) {
        merged.debug = { ...merged.debug, ...customColorScheme.debug };
      }
    }

    // Populate vehicle colors from route colors when using BY_ROUTE strategy
    if (vehicleColorStrategy === VehicleColorStrategy.BY_ROUTE) {
      merged.vehicles.byRoute = new Map(merged.routes);
    }

    return merged;
  }, [customColorScheme, vehicleColorStrategy]);

  // Merge performance config with defaults
  const performanceConfig: MapPerformanceConfig = useMemo(() => ({
    ...DEFAULT_MAP_PERFORMANCE,
    ...customPerformanceConfig,
  }), [customPerformanceConfig]);

  // Manage loading states
  const [internalLoadingState, setInternalLoadingState] = useState<MapLoadingState>({
    ...DEFAULT_LOADING_STATE,
  });

  // Merge external and internal loading states
  const currentLoadingState = useMemo(() => ({
    ...internalLoadingState,
    ...loadingState,
  }), [internalLoadingState, loadingState]);

  // Throttled loading state updates to prevent excessive re-renders
  const throttledLoadingUpdate = useMemo(
    () => throttle((newState: MapLoadingState) => {
      onLoadingChange?.(newState);
    }, performanceConfig.updateThrottleMs),
    [onLoadingChange, performanceConfig.updateThrottleMs]
  );

  // Update loading state when internal state changes
  useEffect(() => {
    throttledLoadingUpdate(currentLoadingState);
  }, [currentLoadingState, throttledLoadingUpdate]);

  // Convert routes array to Map for efficient lookups
  const routesMap = useMemo(() => {
    const map = new Map<number, typeof routes[0]>();
    routes.forEach(route => map.set(route.route_id, route));
    return map;
  }, [routes]);

  // Update map state when props change
  useEffect(() => {
    setMapState(prev => ({
      ...prev,
      mode,
      selectedVehicleId: targetVehicleId,
      selectedRouteId: targetRouteId,
      selectedStationId: targetStationId,
      showDebugInfo: debugMode,
    }));
  }, [mode, targetVehicleId, targetRouteId, targetStationId, debugMode]);

  // Handle mode changes from controls
  const handleModeChange = useCallback((newMode: MapMode) => {
    try {
      setMapState(prev => ({ ...prev, mode: newMode }));
      console.log(`InteractiveTransitMap: Mode changed to ${newMode}`);
    } catch (error) {
      console.error('InteractiveTransitMap: Error changing mode:', error);
    }
  }, []);

  // Handle debug toggle
  const handleDebugToggle = useCallback((enabled: boolean) => {
    try {
      setMapState(prev => ({ ...prev, showDebugInfo: enabled }));
      console.log(`InteractiveTransitMap: Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('InteractiveTransitMap: Error toggling debug mode:', error);
    }
  }, []);

  // Handle user location toggle
  const handleUserLocationToggle = useCallback((enabled: boolean) => {
    try {
      setMapState(prev => ({ ...prev, showUserLocation: enabled }));
      console.log(`InteractiveTransitMap: User location ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('InteractiveTransitMap: Error toggling user location:', error);
    }
  }, []);

  // Handle layer visibility toggles
  const handleVehiclesToggle = useCallback((enabled: boolean) => {
    try {
      setMapState(prev => ({ ...prev, showVehicles: enabled }));
      console.log(`InteractiveTransitMap: Vehicles layer ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('InteractiveTransitMap: Error toggling vehicles layer:', error);
    }
  }, []);

  const handleRouteShapesToggle = useCallback((enabled: boolean) => {
    try {
      setMapState(prev => ({ ...prev, showRouteShapes: enabled }));
      console.log(`InteractiveTransitMap: Route shapes layer ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('InteractiveTransitMap: Error toggling route shapes layer:', error);
    }
  }, []);

  const handleStationsToggle = useCallback((enabled: boolean) => {
    try {
      setMapState(prev => ({ ...prev, showStations: enabled }));
      console.log(`InteractiveTransitMap: Stations layer ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('InteractiveTransitMap: Error toggling stations layer:', error);
    }
  }, []);

  // Enhanced event handlers with error handling and state updates
  const handleVehicleClick = useCallback((vehicle: typeof vehicles[0]) => {
    try {
      setMapState(prev => ({ ...prev, selectedVehicleId: vehicle.id }));
      onVehicleClick?.(vehicle);
      console.log(`InteractiveTransitMap: Vehicle ${vehicle.id} clicked`);
    } catch (error) {
      console.error('InteractiveTransitMap: Error handling vehicle click:', error);
    }
  }, [onVehicleClick]);

  const handleStationClick = useCallback((station: typeof stations[0]) => {
    try {
      setMapState(prev => ({ ...prev, selectedStationId: station.stop_id }));
      onStationClick?.(station);
      console.log(`InteractiveTransitMap: Station ${station.stop_id} clicked`);
    } catch (error) {
      console.error('InteractiveTransitMap: Error handling station click:', error);
    }
  }, [onStationClick]);

  const handleRouteClick = useCallback((route: typeof routes[0]) => {
    try {
      setMapState(prev => ({ ...prev, selectedRouteId: route.route_id }));
      onRouteClick?.(route);
      console.log(`InteractiveTransitMap: Route ${route.route_id} clicked`);
    } catch (error) {
      console.error('InteractiveTransitMap: Error handling route click:', error);
    }
  }, [onRouteClick]);

  // Enhanced error boundary for map rendering with better data validation
  if (!vehicles && !routes && !stations) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No transit data available to display on map.
      </Alert>
    );
  }

  // Validate coordinate data to prevent map rendering errors
  const hasValidData = useMemo(() => {
    const hasValidVehicles = vehicles.some(v => 
      typeof v.latitude === 'number' && 
      typeof v.longitude === 'number' && 
      !isNaN(v.latitude) && 
      !isNaN(v.longitude)
    );
    
    const hasValidStations = stations.some(s => 
      typeof s.stop_lat === 'number' && 
      typeof s.stop_lon === 'number' && 
      !isNaN(s.stop_lat) && 
      !isNaN(s.stop_lon)
    );
    
    const hasValidRouteShapes = Array.from(routeShapes.values()).some(shape => 
      shape.points && shape.points.length > 0 && 
      shape.points.some(point => 
        typeof point.lat === 'number' && 
        typeof point.lon === 'number' && 
        !isNaN(point.lat) && 
        !isNaN(point.lon)
      )
    );

    return hasValidVehicles || hasValidStations || hasValidRouteShapes;
  }, [vehicles, stations, routeShapes]);

  if (!hasValidData) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No valid coordinate data available. Please check that vehicles, stations, or route shapes contain valid latitude/longitude values.
      </Alert>
    );
  }

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Map Container */}
      <MapContainer
        center={[mapState.center.lat, mapState.center.lon]}
        zoom={mapState.zoom}
        style={{ height: '100%', width: '100%' }}
        minZoom={MAP_DEFAULTS.MIN_ZOOM}
        maxZoom={MAP_DEFAULTS.MAX_ZOOM}
      >
        {/* Base tile layer */}
        <TileLayer
          url={MAP_DEFAULTS.TILE_URL}
          attribution={MAP_DEFAULTS.ATTRIBUTION}
        />

        {/* Map mode controller - handles viewport management */}
        <MapModeController
          mode={mapState.mode}
          vehicles={vehicles}
          routes={routes}
          stations={stations}
          routeShapes={routeShapes}
          trips={trips}
          stopTimes={stopTimes}
          targetVehicleId={mapState.selectedVehicleId}
          targetRouteId={mapState.selectedRouteId}
          targetStationId={mapState.selectedStationId}
          onViewportChange={(center, zoom, bounds) => {
            setMapState(prev => ({ ...prev, center, zoom, bounds }));
          }}
        />

        {/* Vehicle layer - with enhanced error handling and event wiring */}
        {mapState.showVehicles && vehicles.length > 0 && (
          <VehicleLayer
            vehicles={vehicles}
            routes={routesMap}
            onVehicleClick={handleVehicleClick}
            highlightedVehicleId={mapState.selectedVehicleId}
            colorStrategy={vehicleColorStrategy}
            colorScheme={colorScheme}
            performanceConfig={performanceConfig}
            loading={currentLoadingState.vehicles}
          />
        )}

        {/* Route shape layer - with enhanced event wiring */}
        {mapState.showRouteShapes && routeShapes.size > 0 && (
          <RouteShapeLayer
            routeShapes={routeShapes}
            routes={routesMap}
            highlightedRouteIds={mapState.selectedRouteId ? [mapState.selectedRouteId] : undefined}
            showDirectionArrows={true}
            colorScheme={colorScheme}
            onRouteClick={handleRouteClick}
            performanceConfig={performanceConfig}
            loading={currentLoadingState.routeShapes}
          />
        )}

        {/* Station layer - with enhanced event wiring */}
        {mapState.showStations && stations.length > 0 && (
          <StationLayer
            stations={stations}
            onStationClick={handleStationClick}
            highlightedStationId={mapState.selectedStationId}
            colorScheme={colorScheme}
            performanceConfig={performanceConfig}
            loading={currentLoadingState.stations}
          />
        )}

        {/* User location layer - with proper error handling */}
        {mapState.showUserLocation && currentPosition && (
          <UserLocationLayer
            position={currentPosition}
            showAccuracyCircle={true}
            colorScheme={colorScheme}
          />
        )}

        {/* Debug layer - with proper visibility control */}
        {mapState.showDebugInfo && debugData && (
          <DebugLayer
            debugData={debugData}
            visible={true}
            colorScheme={colorScheme}
          />
        )}
      </MapContainer>

      {/* Loading overlay */}
      <MapLoadingOverlay
        loading={currentLoadingState}
        visible={currentLoadingState.overall || Object.values(currentLoadingState).some(state => state)}
      />

      {/* Map controls overlay - all event handlers properly wired */}
      <MapControls
        mode={mapState.mode}
        onModeChange={handleModeChange}
        debugMode={mapState.showDebugInfo}
        onDebugToggle={handleDebugToggle}
        showUserLocation={mapState.showUserLocation}
        onUserLocationToggle={handleUserLocationToggle}
        showVehicles={mapState.showVehicles}
        onVehiclesToggle={handleVehiclesToggle}
        showRouteShapes={mapState.showRouteShapes}
        onRouteShapesToggle={handleRouteShapesToggle}
        showStations={mapState.showStations}
        onStationsToggle={handleStationsToggle}
      />
    </Box>
  );
};