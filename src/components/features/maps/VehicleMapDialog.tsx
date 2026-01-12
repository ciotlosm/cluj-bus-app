/**
 * VehicleMapDialog - Full-screen map dialog for vehicle tracking
 * Opens when clicking on a vehicle in the StationVehicleList
 * Shows a focused map with the selected vehicle, its route, and trip stations
 */

import type { FC } from 'react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  IconButton,
  Typography,
  Box,
  Avatar
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { VehicleLayer } from './VehicleLayer';
import { RouteShapeLayer } from './RouteShapeLayer';
import { StationLayer } from './StationLayer';
import { UserLocationLayer } from './UserLocationLayer';
import { DebugLayer } from './DebugLayer';
import { MapControls } from './MapControls';
import { MapMode, VehicleColorStrategy } from '../../../types/interactiveMap';
import { fetchRouteShapesForTrips } from '../../../services/routeShapeService';
import { projectPointToShape, calculateDistanceAlongShape } from '../../../utils/arrival/distanceUtils';
import { determineNextStop } from '../../../utils/arrival/vehiclePositionUtils';
import { 
  calculateRouteOverviewViewport,
  calculateVehicleTrackingViewport,
  calculateComprehensiveViewport,
  calculateVehicleComprehensiveViewport
} from '../../../utils/maps/viewportUtils';
import type { RouteShape, ProjectionResult } from '../../../types/arrivalTime';
import type { DebugVisualizationData } from '../../../types/interactiveMap';
import { DEFAULT_MAP_COLORS, MAP_DEFAULTS } from '../../../types/interactiveMap';
import type { 
  TranzyVehicleResponse, 
  TranzyRouteResponse, 
  TranzyStopResponse,
  TranzyTripResponse,
  TranzyStopTimeResponse
} from '../../../types/rawTranzyApi';
import type { StationVehicle } from '../../../types/stationFilter';
import { useLocationStore } from '../../../stores/locationStore';
import { HeaderControls } from '../../layout/HeaderControls';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// ============================================================================
// Map Controller Component
// ============================================================================

interface MapControllerProps {
  onMapReady: (map: LeafletMap) => void;
}

const MapController: FC<MapControllerProps> = ({ onMapReady }) => {
  const map = useMap();
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    if (map && !hasInitialized.current) {
      hasInitialized.current = true;
      onMapReady(map);
    }
  }, [map, onMapReady]);
  
  // Reset initialization flag when component unmounts
  useEffect(() => {
    return () => {
      hasInitialized.current = false;
    };
  }, []);
  
  return null;
};

interface VehicleMapDialogProps {
  open: boolean;
  onClose: () => void;
  vehicleId: number | null;
  targetStationId?: number | null; // NEW: The station where the user clicked the vehicle
  vehicles: StationVehicle[];
  routes: TranzyRouteResponse[];
  stations: TranzyStopResponse[];
  trips: TranzyTripResponse[];
  stopTimes: TranzyStopTimeResponse[];
}

export const VehicleMapDialog: FC<VehicleMapDialogProps> = React.memo(({
  open,
  onClose,
  vehicleId,
  targetStationId,
  vehicles,
  routes,
  stations,
  trips,
  stopTimes
}) => {
  // State for route shapes and layer visibility - MUST be first, before any conditionals
  const [routeShapes, setRouteShapes] = useState<Map<string, RouteShape>>(new Map());
  const [loadingShapes, setLoadingShapes] = useState(false);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showRouteShapes, setShowRouteShapes] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [showUserLocation, setShowUserLocation] = useState(true);
  
  // Get user location from store
  const { currentPosition, requestLocation } = useLocationStore();
  
  // Request location when user location is enabled
  useEffect(() => {
    if (showUserLocation && !currentPosition) {
      requestLocation();
    }
  }, [showUserLocation, currentPosition, requestLocation]);
  
  // Map mode and viewport management
  const [currentMode, setCurrentMode] = useState<MapMode>(MapMode.VEHICLE_TRACKING);
  const mapRef = useRef<LeafletMap | null>(null);
  
  // Generate a stable key for the map that changes when dialog opens/closes or vehicle changes
  const mapKey = useMemo(() => {
    if (!open || !vehicleId) return 'map-closed';
    return `vehicle-map-${vehicleId}`;
  }, [open, vehicleId]);
  
  // Find the target vehicle and trip
  const targetStationVehicle = vehicleId ? vehicles.find(sv => sv.vehicle.id === vehicleId) : null;
  const targetVehicle = targetStationVehicle?.vehicle || null; // Already enhanced
  const vehicleTrip = targetVehicle ? trips.find(trip => trip.trip_id === targetVehicle.trip_id) : null;

  // Handle map instance ready
  const handleMapReady = (map: LeafletMap) => {
    mapRef.current = map;
    
    // Set initial comprehensive viewport that includes target station, vehicle, and next stop
    if (targetVehicle) {
      const targetStation = targetStationId 
        ? stations.find(s => s.stop_id === targetStationId) 
        : null;
      
      const viewport = calculateVehicleComprehensiveViewport(
        { lat: targetVehicle.latitude, lon: targetVehicle.longitude },
        targetStation,
        nextStop,
        map.getContainer().clientWidth,
        map.getContainer().clientHeight
      );
      
      if (viewport && viewport.bounds) {
        // Use fitBounds for comprehensive initial view
        const bounds: [[number, number], [number, number]] = [
          [viewport.bounds.south, viewport.bounds.west],
          [viewport.bounds.north, viewport.bounds.east]
        ];
        map.fitBounds(bounds, { 
          padding: [20, 20],
          maxZoom: 16
        });
      }
      // If comprehensive viewport fails, the MapContainer's initial center/zoom will be used
    }
  };

  // Load route shapes when dialog opens and we have trip data
  useEffect(() => {
    if (open && vehicleTrip && vehicleTrip.shape_id) {
      setLoadingShapes(true);
      fetchRouteShapesForTrips([vehicleTrip])
        .then(shapes => {
          
          // Validate that we got the correct shape
          const requestedShape = shapes.get(vehicleTrip.shape_id);
          if (requestedShape) {
            
            // Use the raw shape data - should now be filtered correctly by the API
            const singleShape = new Map([[vehicleTrip.shape_id, requestedShape]]);
            setRouteShapes(singleShape);
          } else {
            console.warn(`Requested shape ${vehicleTrip.shape_id} not found in response`);
            setRouteShapes(new Map());
          }
        })
        .catch(error => {
          console.warn('Failed to load route shapes:', error);
          setRouteShapes(new Map());
        })
        .finally(() => {
          setLoadingShapes(false);
        });
    } else {
      setRouteShapes(new Map());
    }
  }, [open, vehicleTrip]);

  // Clear route shapes when dialog closes
  useEffect(() => {
    if (!open) {
      setRouteShapes(new Map());
      setLoadingShapes(false);
      // Clear map reference when dialog closes - but don't dispose the map
      if (mapRef.current) {
        mapRef.current = null;
      }
    }
  }, [open]);

  // Early returns after all hooks
  if (!vehicleId || !targetVehicle) {
    return null;
  }

  // Simple data filtering - moved after state declarations
  const filteredVehicles = targetVehicle ? [targetVehicle] : [];
  const filteredRoutes = targetVehicle?.route_id 
    ? routes.filter(route => route.route_id === targetVehicle.route_id)
    : [];
  
  // Filter stations for this trip
  let filteredStations = stations;
  if (targetVehicle?.trip_id) {
    const tripStopTimes = stopTimes.filter(st => st.trip_id === targetVehicle.trip_id);
    if (tripStopTimes.length > 0) {
      const tripStationIds = new Set(tripStopTimes.map(st => st.stop_id));
      filteredStations = stations.filter(station => tripStationIds.has(station.stop_id));
    }
  }

  // Use API route shapes if available and valid, otherwise fallback to station-based route
  let displayRouteShapes = new Map<string, RouteShape>();
  
  if (routeShapes.size > 0) {
    // Use cleaned API route shapes
    displayRouteShapes = routeShapes;
  } else if (filteredStations.length >= 2 && vehicleTrip?.shape_id) {
    // Fallback to station-based route
    const tripStopTimes = stopTimes
      .filter(st => st.trip_id === targetVehicle.trip_id)
      .sort((a, b) => (a.stop_sequence || 0) - (b.stop_sequence || 0));
    
    if (tripStopTimes.length >= 2) {
      const orderedStations = tripStopTimes
        .map(st => {
          let station = filteredStations.find(s => s.stop_id === st.stop_id);
          if (!station) {
            station = stations.find(s => s.stop_id === st.stop_id);
          }
          return station;
        })
        .filter(station => {
          if (!station) return false;
          if (station.stop_lat == null || station.stop_lon == null) return false;
          if (station.stop_lat === 0 || station.stop_lon === 0) return false;
          return true;
        });
      
      
      if (orderedStations.length >= 2) {
        const points = orderedStations.map(s => ({ lat: s!.stop_lat, lon: s!.stop_lon }));
        const segments = [];
        
        for (let i = 0; i < points.length - 1; i++) {
          segments.push({
            start: points[i],
            end: points[i + 1],
            distance: 1000
          });
        }
        
        const fallbackShape = {
          id: vehicleTrip.shape_id,
          points,
          segments
        };
        
        displayRouteShapes = new Map([[vehicleTrip.shape_id, fallbackShape]]);
      }
    }
  }

  // Handle mode changes with viewport updates
  const handleModeChange = (newMode: MapMode) => {
    if (!mapRef.current || !targetVehicle) return;
    
    setCurrentMode(newMode);
    
    // Get target station for comprehensive viewport calculations
    const targetStation = targetStationId 
      ? stations.find(s => s.stop_id === targetStationId) 
      : null;
    
    switch (newMode) {
      case MapMode.VEHICLE_TRACKING: {
        // Use comprehensive viewport that includes target station, vehicle, and next stop
        const viewport = calculateVehicleComprehensiveViewport(
          { lat: targetVehicle.latitude, lon: targetVehicle.longitude },
          targetStation,
          nextStop,
          mapRef.current.getContainer().clientWidth,
          mapRef.current.getContainer().clientHeight
        );
        
        if (viewport && viewport.bounds) {
          // Use fitBounds for comprehensive view
          const bounds: [[number, number], [number, number]] = [
            [viewport.bounds.south, viewport.bounds.west],
            [viewport.bounds.north, viewport.bounds.east]
          ];
          mapRef.current.fitBounds(bounds, { 
            padding: [20, 20],
            maxZoom: 16
          });
        } else {
          // Fallback to simple vehicle centering
          mapRef.current.setView([targetVehicle.latitude, targetVehicle.longitude], 15);
        }
        break;
      }
      
      case MapMode.ROUTE_OVERVIEW: {
        const viewport = calculateRouteOverviewViewport(
          displayRouteShapes,
          filteredStations,
          mapRef.current.getContainer().clientWidth,
          mapRef.current.getContainer().clientHeight
        );
        if (viewport) {
          // Use Leaflet's fitBounds for more accurate viewport fitting
          const bounds: [[number, number], [number, number]] = [
            [viewport.bounds.south, viewport.bounds.west],
            [viewport.bounds.north, viewport.bounds.east]
          ];
          mapRef.current.fitBounds(bounds, { 
            padding: [20, 20], // 20px padding instead of percentage
            maxZoom: 16 // Prevent over-zooming
          });
        }
        break;
      }
    }
  };

  // Determine the vehicle's next stop (used by both debug and regular rendering)
  const nextStop = targetVehicle ? determineNextStop(
    targetVehicle, 
    trips, 
    stopTimes, 
    stations
  ) : null;

  // Create debug data using REAL distance calculations
  const debugData: DebugVisualizationData | null = debugMode && displayRouteShapes.size > 0 && filteredStations.length > 0 ? (() => {
    try {
      const vehiclePosition = { lat: targetVehicle.latitude, lon: targetVehicle.longitude };
      const routeShape = displayRouteShapes.values().next().value!;
      
      // Use the target station (where user clicked the vehicle) if available
      let targetStation: TranzyStopResponse;
      let targetStationPosition: { lat: number; lon: number };
      
      if (targetStationId) {
        // Find the specific target station
        const foundTargetStation = stations.find(s => s.stop_id === targetStationId);
        if (foundTargetStation) {
          targetStation = foundTargetStation;
          targetStationPosition = { lat: targetStation.stop_lat, lon: targetStation.stop_lon };
        } else {
          // Fallback to first filtered station if target station not found
          targetStation = filteredStations[0];
          targetStationPosition = { lat: targetStation.stop_lat, lon: targetStation.stop_lon };
        }
      } else {
        // Fallback: find a station ahead of the vehicle on the route
        targetStation = filteredStations[filteredStations.length - 1]; // Default to last station
        targetStationPosition = { lat: targetStation.stop_lat, lon: targetStation.stop_lon };
        
        // Try to find a station ahead of the vehicle
        const vehicleProjection = projectPointToShape(vehiclePosition, routeShape);
        
        for (let i = 0; i < filteredStations.length; i++) {
          const station = filteredStations[i];
          const stationPos = { lat: station.stop_lat, lon: station.stop_lon };
          const stationProjection = projectPointToShape(stationPos, routeShape);
          
          // Use the first station that's ahead of the vehicle
          if (stationProjection.segmentIndex > vehicleProjection.segmentIndex) {
            targetStation = station;
            targetStationPosition = stationPos;
            break;
          }
        }
      }
      
      // Get vehicle projection for debug data
      const vehicleProjection = projectPointToShape(vehiclePosition, routeShape);
      
      console.log('Debug: Next stop determination');
      console.log('Vehicle trip ID:', targetVehicle.trip_id);
      console.log('Vehicle position:', vehiclePosition);
      console.log('Available stations for trip:', filteredStations.map(s => ({ id: s.stop_id, name: s.stop_name })));
      console.log('Determined next stop:', nextStop ? { id: nextStop.stop_id, name: nextStop.stop_name } : 'None');
      
      let nextStationPosition: { lat: number; lon: number } | undefined;
      let nextStationProjection: ProjectionResult | undefined;
      let nextStationInfo: { stop_id: number; stop_name: string; isTargetStation: boolean } | undefined;
      
      if (nextStop) {
        nextStationPosition = { lat: nextStop.stop_lat, lon: nextStop.stop_lon };
        nextStationProjection = projectPointToShape(nextStationPosition, routeShape);
        nextStationInfo = {
          stop_id: nextStop.stop_id,
          stop_name: nextStop.stop_name,
          isTargetStation: nextStop.stop_id === targetStation.stop_id
        };
      }
      
      console.log('Debug: Creating real distance calculations');
      console.log('Vehicle position:', vehiclePosition);
      console.log('Target station ID (from click):', targetStationId);
      console.log('Selected target station:', targetStation.stop_name);
      console.log('Target station position:', targetStationPosition);
      console.log('Next station (GPS-based):', nextStop?.stop_name || 'None determined');
      console.log('Next station is target:', nextStationInfo?.isTargetStation || false);
      console.log('Route shape points:', routeShape.points.length);
      console.log('Route shape segments:', routeShape.segments.length);
      console.log('Vehicle projection:', vehicleProjection);
      
      const finalStationProjection = projectPointToShape(targetStationPosition, routeShape);
      console.log('Station projection:', finalStationProjection);
      
      const distanceResult = calculateDistanceAlongShape(
        vehiclePosition, 
        targetStationPosition, 
        routeShape
      );
      console.log('Distance result:', distanceResult);
      
      return {
        vehiclePosition,
        targetStationPosition,
        nextStationPosition,
        vehicleProjection,
        stationProjection: finalStationProjection,
        nextStationProjection,
        routeShape,
        distanceCalculation: distanceResult,
        nextStationInfo
      };
    } catch (error) {
      console.error('Error creating debug data:', error);
      return null;
    }
  })() : null;

  // Center map on vehicle location
  const mapCenter = { lat: targetVehicle.latitude, lon: targetVehicle.longitude };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'background.default'
          }
        }
      }}
      // Improve accessibility and focus management
      aria-labelledby="vehicle-map-dialog-title"
      disableRestoreFocus={true}
      disableEnforceFocus={false}
      disableAutoFocus={false}
      keepMounted={false} // Ensure complete unmounting when closed
    >
      <DialogTitle 
        id="vehicle-map-dialog-title"
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          pb: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Circular route badge */}
          {filteredRoutes[0] && (
            <Avatar sx={{ 
              bgcolor: 'primary.main', 
              width: 40, 
              height: 40,
              fontSize: '1rem',
              fontWeight: 'bold',
              flexShrink: 0
            }}>
              {filteredRoutes[0].route_short_name}
            </Avatar>
          )}
          
          {/* Headsign */}
          <Typography variant="h6" component="div">
            {vehicleTrip?.trip_headsign || 'Live Tracking'}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Reusable header controls */}
          <HeaderControls />
          
          <IconButton
            edge="end"
            color="inherit"
            onClick={onClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, height: '100%' }}>
        <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
          {loadingShapes && (
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 16, 
                right: 16, 
                zIndex: 1000,
                bgcolor: 'background.paper',
                borderRadius: 1,
                p: 1,
                boxShadow: 1
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Loading route...
              </Typography>
            </Box>
          )}

          {/* Custom map without automatic viewport management */}
          <MapContainer
            key={mapKey} // Use stable key that changes only when needed
            center={[mapCenter.lat, mapCenter.lon]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            minZoom={MAP_DEFAULTS.MIN_ZOOM}
            maxZoom={MAP_DEFAULTS.MAX_ZOOM}
            zoomControl={true}
            scrollWheelZoom={true}
          >
            {/* Map controller for viewport management */}
            <MapController onMapReady={handleMapReady} />

            {/* Base tile layer */}
            <TileLayer
              url={MAP_DEFAULTS.TILE_URL}
              attribution={MAP_DEFAULTS.ATTRIBUTION}
            />

            {/* Vehicle layer - only the selected vehicle */}
            {showVehicles && (
              <VehicleLayer
                vehicles={filteredVehicles}
                routes={new Map(filteredRoutes.map(r => [r.route_id, r]))}
                highlightedVehicleId={vehicleId}
                colorStrategy={VehicleColorStrategy.BY_ROUTE}
                colorScheme={DEFAULT_MAP_COLORS}
              />
            )}

            {/* Route shape layer - only render when not loading */}
            {showRouteShapes && displayRouteShapes.size > 0 && !loadingShapes && (
              <RouteShapeLayer
                key={`route-shapes-${Array.from(displayRouteShapes.keys()).join('-')}-${loadingShapes}`}
                routeShapes={displayRouteShapes}
                routes={new Map(filteredRoutes.map(r => [r.route_id, r]))}
                highlightedRouteIds={targetVehicle.route_id ? [targetVehicle.route_id] : undefined}
                showDirectionArrows={true}
                colorScheme={DEFAULT_MAP_COLORS}
              />
            )}

            {/* Station layer - all trip stations when enabled */}
            {showStations && (
              <StationLayer
                stations={filteredStations}
                targetStationId={targetStationId}
                nextStationId={nextStop?.stop_id}
                colorScheme={DEFAULT_MAP_COLORS}
              />
            )}

            {/* Important stations layer - always show target and next station */}
            {!showStations && (
              <StationLayer
                stations={filteredStations.filter(station => 
                  station.stop_id === targetStationId || 
                  station.stop_id === nextStop?.stop_id
                )}
                targetStationId={targetStationId}
                nextStationId={nextStop?.stop_id}
                colorScheme={DEFAULT_MAP_COLORS}
              />
            )}

            {/* User location layer */}
            {showUserLocation && (
              <UserLocationLayer
                position={currentPosition}
                showAccuracyCircle={true}
                colorScheme={DEFAULT_MAP_COLORS}
              />
            )}

            {/* Debug layer - shows which shape is used for distance calculations */}
            {debugMode && debugData && (
              <DebugLayer
                debugData={debugData}
                visible={true}
                colorScheme={DEFAULT_MAP_COLORS}
                vehicles={filteredVehicles}
              />
            )}
          </MapContainer>

          {/* Map controls overlay */}
          <MapControls
            mode={currentMode}
            showVehicles={showVehicles}
            showRouteShapes={showRouteShapes}
            showStations={showStations}
            showUserLocation={showUserLocation}
            debugMode={debugMode}
            onModeChange={handleModeChange}
            onVehiclesToggle={setShowVehicles}
            onRouteShapesToggle={setShowRouteShapes}
            onStationsToggle={setShowStations}
            onUserLocationToggle={setShowUserLocation}
            onDebugToggle={setDebugMode}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
});