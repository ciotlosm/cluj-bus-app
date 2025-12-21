import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Polyline, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { enhancedTranzyApi } from '../../../services/api/tranzyApiService';
import { agencyService } from '../../../services/agencyService';
import { logger } from '../../../utils/shared/logger';
import { calculateDistance } from '../../../utils/data-processing/distanceUtils';
import { arePointsOverlapping, calculateOverlapBounds, logOverlapDetection } from '../../../utils/mapUtils';
import { useAsyncOperation } from '../../../hooks/shared/useAsyncOperation';
import type { MapModalBusInfo } from '../../../types/mapModal';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
      <!-- Head (circle) -->
      <circle cx="12" cy="6" r="4" fill="#2196f3" stroke="#ffffff" stroke-width="2"/>
      <!-- Body (rounded rectangle) -->
      <rect x="7" y="10" width="10" height="12" rx="3" ry="3" fill="#2196f3" stroke="#ffffff" stroke-width="2"/>
    </svg>
  `),
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

const busIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ff5722" width="32" height="32">
      <path d="M18,11H6V6H18M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M4,16C4,16.88 4.39,17.67 5,18.22V20A1,1 0 0,0 6,21H7A1,1 0 0,0 8,20V19H16V20A1,1 0 0,0 17,21H18A1,1 0 0,0 19,20V18.22C19.61,17.67 20,16.88 20,16V6C20,2.5 16.42,2 12,2C7.58,2 4,2.5 4,6V16Z"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Bus stop icons (matching the favorite card design)
const createBusStopIcon = (type: 'bus' | 'user' | 'destination', size: number = 24) => {
  const colors = {
    bus: '#1976d2', // Primary blue
    user: '#0288d1', // Info blue  
    destination: '#2e7d32' // Success green
  };

  const icons = {
    bus: `<path d="M18,11H6V6H18M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M4,16C4,16.88 4.39,17.67 5,18.22V20A1,1 0 0,0 6,21H7A1,1 0 0,0 8,20V19H16V20A1,1 0 0,0 17,21H18A1,1 0 0,0 19,20V18.22C19.61,17.67 20,16.88 20,16V6C20,2.5 16.42,2 12,2C7.58,2 4,2.5 4,6V16Z"/>`,
    user: `<path d="M12,2A3,3 0 0,1 15,5A3,3 0 0,1 12,8A3,3 0 0,1 9,5A3,3 0 0,1 12,2M12,10C16.42,10 20,11.79 20,14V16H4V14C4,11.79 7.58,10 12,10Z" fill="white"/><circle cx="12" cy="20" r="2" fill="white"/>`,
    destination: `<path d="M12,2C15.31,2 18,4.66 18,7.95C18,12.41 12,19 12,19S6,12.41 6,7.95C6,4.66 8.69,2 12,2M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6Z" fill="white"/>`
  };

  return new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">
        <circle cx="12" cy="12" r="12" fill="${colors[type]}" stroke="#ffffff" stroke-width="2"/>
        ${icons[type]}
      </svg>
    `),
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2],
  });
};

interface BusRouteMapModalProps {
  open: boolean;
  onClose: () => void;
  bus: MapModalBusInfo;
  userLocation?: { latitude: number; longitude: number } | null;
  cityName: string;
}

interface ShapePoint {
  latitude: number;
  longitude: number;
  sequence: number;
}

// Component to handle map bounds updates
const MapBoundsUpdater: React.FC<{ bounds: [[number, number], [number, number]] | null }> = ({ bounds }) => {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, bounds]);
  
  return null;
};

export const BusRouteMapModal: React.FC<BusRouteMapModalProps> = ({
  open,
  onClose,
  bus,
  userLocation,
  cityName,
}) => {
  const [shapePoints, setShapePoints] = useState<ShapePoint[]>([]);
  const routeShapeOperation = useAsyncOperation<ShapePoint[]>();

  useEffect(() => {
    if (open && bus.tripId) {
      loadRouteShape();
    }
  }, [open, bus.tripId]);

  const loadRouteShape = async () => {
    const result = await routeShapeOperation.execute(
      async () => {
        // Get agency ID for the city
        const agencyId = await agencyService.getAgencyIdForCity(cityName);
        if (!agencyId) {
          throw new Error('No agency found for city');
        }

        // Get trip data from cache to find shape_id
        const trips = await enhancedTranzyApi.getTrips(agencyId, undefined, false);
        const trip = trips.find(t => t.id === bus.tripId);
        
        if (!trip || !trip.shapeId) {
          throw new Error('No shape data found for this trip');
        }

        // Get shape points from cache for this trip
        const rawShapePoints = await enhancedTranzyApi.getShapes(agencyId, trip.shapeId, false);
        
        if (!rawShapePoints || rawShapePoints.length === 0) {
          throw new Error('No shape points found for this route');
        }

        // Sort shape points by sequence and convert to our format
        const sortedShapePoints = rawShapePoints
          .sort((a, b) => a.sequence - b.sequence)
          .map(point => ({
            latitude: point.latitude,
            longitude: point.longitude,
            sequence: point.sequence,
          }));

        logger.info('Loaded route shape', {
          tripId: bus.tripId,
          shapeId: trip.shapeId,
          pointCount: sortedShapePoints.length,
        });

        return sortedShapePoints;
      },
      {
        errorMessage: 'Failed to load route shape',
        logCategory: 'BUS_ROUTE_MAP_MODAL',
      }
    );

    if (result) {
      setShapePoints(result);
    }
  };



  // Calculate map bounds to fit all points
  const getMapBounds = (): [[number, number], [number, number]] | null => {
    const points: [number, number][] = [];
    
    // Add shape points
    shapePoints.forEach(point => {
      points.push([point.latitude, point.longitude]);
    });
    
    // Add bus position
    points.push([bus.latitude, bus.longitude]);
    
    // Add user position if available
    if (userLocation) {
      points.push([userLocation.latitude, userLocation.longitude]);
    }

    if (points.length === 0) return null;

    const busPosition = { latitude: bus.latitude, longitude: bus.longitude };

    // Check for bus-user overlap
    if (userLocation && arePointsOverlapping(busPosition, userLocation)) {
      const bounds = calculateOverlapBounds(busPosition, userLocation);
      const distance = calculateDistance(busPosition, userLocation);
      
      logOverlapDetection(
        'Bus-user',
        { ...busPosition, name: `Bus ${bus.label || bus.vehicleId}` },
        { ...userLocation, name: 'User location' },
        distance,
        bounds
      );
      
      return bounds;
    }

    // Check for bus-station overlap (for station view)
    const targetStation = bus.stopSequence?.find(stop => stop.isClosestToUser);
    if (targetStation?.coordinates && arePointsOverlapping(busPosition, targetStation.coordinates)) {
      const bounds = calculateOverlapBounds(busPosition, targetStation.coordinates);
      const distance = calculateDistance(busPosition, targetStation.coordinates);
      
      logOverlapDetection(
        'Bus-station',
        { ...busPosition, name: `Bus ${bus.label || bus.vehicleId}` },
        { ...targetStation.coordinates, name: targetStation.name },
        distance,
        bounds
      );
      
      return bounds;
    }

    // Normal bounds calculation for when they're not very close
    const lats = points.map(p => p[0]);
    const lngs = points.map(p => p[1]);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add some padding (10% of the range)
    const latPadding = (maxLat - minLat) * 0.1;
    const lngPadding = (maxLng - minLng) * 0.1;

    // Ensure minimum padding for very small ranges
    const minPadding = 0.001; // ~111 meters
    const finalLatPadding = Math.max(latPadding, minPadding);
    const finalLngPadding = Math.max(lngPadding, minPadding);

    return [
      [minLat - finalLatPadding, minLng - finalLngPadding],
      [maxLat + finalLatPadding, maxLng + finalLngPadding],
    ];
  };

  const mapBounds = getMapBounds();
  const routePolyline: [number, number][] = shapePoints.map(point => [point.latitude, point.longitude]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      disableRestoreFocus
      keepMounted={false}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Route {bus.routeName} - Live Map
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, height: '100%' }}>
        {routeShapeOperation.isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Loading route map...
            </Typography>
          </Box>
        )}

        {routeShapeOperation.error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">
              {routeShapeOperation.error}
            </Alert>
          </Box>
        )}

        {!routeShapeOperation.isLoading && !routeShapeOperation.error && mapBounds && (
          <MapContainer
            center={[bus.latitude, bus.longitude]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <MapBoundsUpdater bounds={mapBounds} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Route shape polyline */}
            {routePolyline.length > 0 && (
              <Polyline
                positions={routePolyline}
                color="#9c27b0"
                weight={4}
                opacity={0.8}
              />
            )}

            {/* Station markers along the route */}
            {bus.stopSequence && bus.stopSequence
              .filter(stop => stop.coordinates && 
                typeof stop.coordinates.latitude === 'number' && 
                typeof stop.coordinates.longitude === 'number' &&
                !isNaN(stop.coordinates.latitude) && 
                !isNaN(stop.coordinates.longitude))
              .map((stop, index, filteredStops) => {
                // Check if this is the final destination (last stop in the sequence)
                const isLastStop = index === filteredStops.length - 1;
                
                // Use custom marker only for special stops (current bus, user, or final destination)
                if (stop.isCurrent) {
                  return (
                    <Marker
                      key={stop.id}
                      position={[stop.coordinates.latitude, stop.coordinates.longitude]}
                      icon={createBusStopIcon('bus', 20)}
                    >
                      <Popup>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {stop.name}
                          </Typography>
                          {stop.arrivalTime && (
                            <Typography variant="caption" display="block">
                              Arrival: {stop.arrivalTime}
                            </Typography>
                          )}
                          <Typography variant="caption" display="block" color="error">
                            Current bus location
                          </Typography>
                          {stop.distanceToUser && (
                            <Typography variant="caption" display="block">
                              Distance: {(stop.distanceToUser / 1000).toFixed(1)}km from you
                            </Typography>
                          )}
                        </Box>
                      </Popup>
                    </Marker>
                  );
                } else if (stop.isClosestToUser) {
                  return (
                    <Marker
                      key={stop.id}
                      position={[stop.coordinates.latitude, stop.coordinates.longitude]}
                      icon={createBusStopIcon('user', 20)}
                    >
                      <Popup>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {stop.name}
                          </Typography>
                          {stop.arrivalTime && (
                            <Typography variant="caption" display="block">
                              Arrival: {stop.arrivalTime}
                            </Typography>
                          )}
                          <Typography variant="caption" display="block" color="primary">
                            Closest to you
                          </Typography>
                          {stop.distanceToUser && (
                            <Typography variant="caption" display="block">
                              Distance: {(stop.distanceToUser / 1000).toFixed(1)}km from you
                            </Typography>
                          )}
                        </Box>
                      </Popup>
                    </Marker>
                  );
                } else if (isLastStop) {
                  // Final destination gets the location marker icon
                  return (
                    <Marker
                      key={stop.id}
                      position={[stop.coordinates.latitude, stop.coordinates.longitude]}
                      icon={createBusStopIcon('destination', 20)}
                    >
                      <Popup>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {stop.name}
                          </Typography>
                          {stop.arrivalTime && (
                            <Typography variant="caption" display="block">
                              Arrival: {stop.arrivalTime}
                            </Typography>
                          )}
                          <Typography variant="caption" display="block" color="success.main">
                            Final destination
                          </Typography>
                        </Box>
                      </Popup>
                    </Marker>
                  );
                } else {
                  // Regular stops use solid circles
                  return (
                    <CircleMarker
                      key={stop.id}
                      center={[stop.coordinates.latitude, stop.coordinates.longitude]}
                      radius={5}
                      pathOptions={{
                        color: '#ffffff',
                        fillColor: '#9c27b0',
                        fillOpacity: 1.0,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {stop.name}
                          </Typography>
                          {stop.arrivalTime && (
                            <Typography variant="caption" display="block">
                              Arrival: {stop.arrivalTime}
                            </Typography>
                          )}
                        </Box>
                      </Popup>
                    </CircleMarker>
                  );
                }
              })}
            
            {/* Bus position marker */}
            <Marker
              position={[bus.latitude, bus.longitude]}
              icon={busIcon}
            >
              <Popup>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Bus {bus.label || bus.vehicleId}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Route: {bus.routeName}
                  </Typography>
                  {bus.destination && (
                    <Typography variant="caption" display="block">
                      To: {bus.destination}
                    </Typography>
                  )}
                  {bus.speed && (
                    <Typography variant="caption" display="block">
                      Speed: {bus.speed} km/h
                    </Typography>
                  )}
                  <Typography variant="caption" display="block" color="text.secondary">
                    {bus.lastUpdate.toLocaleTimeString()}
                  </Typography>
                </Box>
              </Popup>
            </Marker>
            
            {/* Dotted line from user to closest station (if > 300m) */}
            {userLocation && bus.stopSequence && (() => {
              const closestStop = bus.stopSequence.find(stop => stop.isClosestToUser);
              if (closestStop && closestStop.distanceToUser && closestStop.distanceToUser > 300 && closestStop.coordinates) {
                return (
                  <Polyline
                    positions={[
                      [userLocation.latitude, userLocation.longitude],
                      [closestStop.coordinates.latitude, closestStop.coordinates.longitude]
                    ]}
                    pathOptions={{
                      color: '#2196f3',
                      weight: 2,
                      opacity: 0.7,
                      dashArray: '5, 10',
                    }}
                  />
                );
              }
              return null;
            })()}

            {/* User position marker */}
            {userLocation && (
              <Marker
                position={[userLocation.latitude, userLocation.longitude]}
                icon={userIcon}
              >
                <Popup>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Your Location
                    </Typography>
                    <Typography variant="caption" display="block">
                      Lat: {userLocation.latitude.toFixed(6)}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Lng: {userLocation.longitude.toFixed(6)}
                    </Typography>
                    {(() => {
                      const closestStop = bus.stopSequence?.find(stop => stop.isClosestToUser);
                      if (closestStop && closestStop.distanceToUser) {
                        return (
                          <Typography variant="caption" display="block">
                            Distance to closest stop: {(closestStop.distanceToUser / 1000).toFixed(1)}km
                          </Typography>
                        );
                      }
                      return null;
                    })()}
                  </Box>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        )}
      </DialogContent>
    </Dialog>
  );
};