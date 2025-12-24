/**
 * VehicleMapDialog - Full-screen map dialog for vehicle tracking
 * Opens when clicking on a vehicle in the StationVehicleList
 * Shows a focused map with the selected vehicle, its route, and trip stations
 */

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  IconButton,
  Typography,
  Box
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { MapContainer, TileLayer } from 'react-leaflet';
import { VehicleLayer } from './VehicleLayer';
import { RouteShapeLayer } from './RouteShapeLayer';
import { StationLayer } from './StationLayer';
import { DebugLayer } from './DebugLayer';
import { MapControls } from './MapControls';
import { MapMode, VehicleColorStrategy } from '../../../types/interactiveMap';
import { fetchRouteShapesForTrips } from '../../../services/routeShapeService';
import { distanceCalculator } from '../../../utils/arrival/DistanceCalculator';
import { determineNextStop } from '../../../utils/arrival/vehiclePositionUtils';
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

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

interface VehicleMapDialogProps {
  open: boolean;
  onClose: () => void;
  vehicleId: number | null;
  targetStationId?: number | null; // NEW: The station where the user clicked the vehicle
  vehicles: TranzyVehicleResponse[];
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
  const [showUserLocation, setShowUserLocation] = useState(false);

  // Find the target vehicle and trip
  const targetVehicle = vehicleId ? vehicles.find(v => v.id === vehicleId) : null;
  const vehicleTrip = targetVehicle ? trips.find(trip => trip.trip_id === targetVehicle.trip_id) : null;

  // Load route shapes when dialog opens and we have trip data
  useEffect(() => {
    if (open && vehicleTrip && vehicleTrip.shape_id) {
      console.log(`Requesting route shape for trip ${vehicleTrip.trip_id} with shape_id: ${vehicleTrip.shape_id}`);
      setLoadingShapes(true);
      fetchRouteShapesForTrips([vehicleTrip])
        .then(shapes => {
          console.log(`Received ${shapes.size} shapes:`, Array.from(shapes.keys()));
          
          // Validate that we got the correct shape
          const requestedShape = shapes.get(vehicleTrip.shape_id);
          if (requestedShape) {
            console.log(`Found requested shape ${vehicleTrip.shape_id} with ${requestedShape.points.length} points`);
            
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
    }
  }, [open]);

  // Early returns after all hooks
  if (!vehicleId || !targetVehicle) {
    return null;
  }

  // Simple data filtering - moved after state declarations
  const filteredVehicles = [targetVehicle];
  const filteredRoutes = targetVehicle.route_id 
    ? routes.filter(route => route.route_id === targetVehicle.route_id)
    : [];
  
  // Filter stations for this trip
  let filteredStations = stations;
  if (targetVehicle.trip_id) {
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
      
      console.log(`Fallback route stations: ${tripStopTimes.length} stop times → ${orderedStations.length} valid stations`);
      console.log('Station sequence:', orderedStations.map((s, i) => `${i+1}. ${s!.stop_name} (${s!.stop_lat}, ${s!.stop_lon})`));
      
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
        const vehicleProjection = distanceCalculator.projectPointToShape(vehiclePosition, routeShape);
        
        for (let i = 0; i < filteredStations.length; i++) {
          const station = filteredStations[i];
          const stationPos = { lat: station.stop_lat, lon: station.stop_lon };
          const stationProjection = distanceCalculator.projectPointToShape(stationPos, routeShape);
          
          // Use the first station that's ahead of the vehicle
          if (stationProjection.segmentIndex > vehicleProjection.segmentIndex) {
            targetStation = station;
            targetStationPosition = stationPos;
            break;
          }
        }
      }
      
      // Get vehicle projection for debug data
      const vehicleProjection = distanceCalculator.projectPointToShape(vehiclePosition, routeShape);
      
      // NEW: Determine the vehicle's next stop using GPS-based logic
      const nextStop = determineNextStop(
        targetVehicle, 
        trips, 
        stopTimes, 
        stations, 
        routeShape
      );
      
      let nextStationPosition: { lat: number; lon: number } | undefined;
      let nextStationProjection: ProjectionResult | undefined;
      let nextStationInfo: { stop_id: number; stop_name: string; isTargetStation: boolean } | undefined;
      
      if (nextStop) {
        nextStationPosition = { lat: nextStop.stop_lat, lon: nextStop.stop_lon };
        nextStationProjection = distanceCalculator.projectPointToShape(nextStationPosition, routeShape);
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
      
      const finalStationProjection = distanceCalculator.projectPointToShape(targetStationPosition, routeShape);
      console.log('Station projection:', finalStationProjection);
      
      const distanceResult = distanceCalculator.calculateDistanceAlongShape(
        vehiclePosition, 
        targetStation, 
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
  // Get vehicle label for dialog title
  const vehicleLabel = targetVehicle.label || `Vehicle ${vehicleId}`;
  const routeInfo = filteredRoutes[0];
  const dialogTitle = routeInfo 
    ? `${vehicleLabel} - Route ${routeInfo.route_short_name} (${routeInfo.route_long_name})`
    : `${vehicleLabel} - Live Tracking`;
  
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
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Typography variant="h6" component="div">
          {dialogTitle}
        </Typography>
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
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
            center={[mapCenter.lat, mapCenter.lon]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            minZoom={MAP_DEFAULTS.MIN_ZOOM}
            maxZoom={MAP_DEFAULTS.MAX_ZOOM}
            zoomControl={true}
            scrollWheelZoom={true}
          >
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

            {/* Station layer - only trip stations */}
            {showStations && (
              <StationLayer
                stations={filteredStations}
                colorScheme={DEFAULT_MAP_COLORS}
              />
            )}

            {/* Debug layer - shows which shape is used for distance calculations */}
            {debugMode && debugData && (
              <DebugLayer
                debugData={debugData}
                visible={true}
                colorScheme={DEFAULT_MAP_COLORS}
              />
            )}
          </MapContainer>

          {/* Map controls overlay */}
          <MapControls
            mode={MapMode.VEHICLE_TRACKING}
            showVehicles={showVehicles}
            showRouteShapes={showRouteShapes}
            showStations={showStations}
            showUserLocation={showUserLocation}
            debugMode={debugMode}
            onModeChange={() => {}} // No mode changes in vehicle dialog
            onVehiclesToggle={setShowVehicles}
            onRouteShapesToggle={setShowRouteShapes}
            onStationsToggle={setShowStations}
            onUserLocationToggle={setShowUserLocation}
            onDebugToggle={setDebugMode}
          />
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 1 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
});