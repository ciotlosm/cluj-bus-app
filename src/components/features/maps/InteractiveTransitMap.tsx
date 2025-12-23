/**
 * InteractiveTransitMap - Main map component for visualizing real-time transit data
 * Built with React-Leaflet, supports multiple display modes and debugging capabilities
 * Follows established component patterns from the codebase
 */

import { useState, useEffect, useMemo } from 'react';
import type { FC } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { Box, CircularProgress, Alert } from '@mui/material';
import type { 
  InteractiveTransitMapProps, 
  MapState, 
  MapColorScheme,
  MapPerformanceConfig
} from '../../../types/interactiveMap';
import { 
  MapMode, 
  VehicleColorStrategy,
  DEFAULT_MAP_COLORS, 
  DEFAULT_MAP_PERFORMANCE,
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
  onVehicleClick,
  onStationClick,
  onRouteClick,
}) => {
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
  const handleModeChange = (newMode: MapMode) => {
    setMapState(prev => ({ ...prev, mode: newMode }));
  };

  // Handle debug toggle
  const handleDebugToggle = (enabled: boolean) => {
    setMapState(prev => ({ ...prev, showDebugInfo: enabled }));
  };

  // Handle user location toggle
  const handleUserLocationToggle = (enabled: boolean) => {
    setMapState(prev => ({ ...prev, showUserLocation: enabled }));
  };

  // Error boundary for map rendering
  if (!vehicles && !routes && !stations) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No transit data available to display on map.
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

        {/* Vehicle layer */}
        {mapState.showVehicles && vehicles.length > 0 && (
          <VehicleLayer
            vehicles={vehicles}
            routes={routesMap}
            onVehicleClick={onVehicleClick}
            highlightedVehicleId={mapState.selectedVehicleId}
            colorStrategy={vehicleColorStrategy}
            colorScheme={colorScheme}
          />
        )}

        {/* Route shape layer */}
        {mapState.showRouteShapes && routeShapes.size > 0 && (
          <RouteShapeLayer
            routeShapes={routeShapes}
            routes={routesMap}
            highlightedRouteIds={mapState.selectedRouteId ? [mapState.selectedRouteId] : undefined}
            showDirectionArrows={true}
            colorScheme={colorScheme}
          />
        )}

        {/* Station layer */}
        {mapState.showStations && stations.length > 0 && (
          <StationLayer
            stations={stations}
            onStationClick={onStationClick}
            highlightedStationId={mapState.selectedStationId}
            colorScheme={colorScheme}
          />
        )}

        {/* User location layer */}
        {mapState.showUserLocation && currentPosition && (
          <UserLocationLayer
            position={currentPosition}
            showAccuracyCircle={true}
            colorScheme={colorScheme}
          />
        )}

        {/* Debug layer */}
        {mapState.showDebugInfo && debugData && (
          <DebugLayer
            debugData={debugData}
            visible={true}
            colorScheme={colorScheme}
          />
        )}
      </MapContainer>

      {/* Map controls overlay */}
      <MapControls
        mode={mapState.mode}
        onModeChange={handleModeChange}
        debugMode={mapState.showDebugInfo}
        onDebugToggle={handleDebugToggle}
        showUserLocation={mapState.showUserLocation}
        onUserLocationToggle={handleUserLocationToggle}
      />
    </Box>
  );
};