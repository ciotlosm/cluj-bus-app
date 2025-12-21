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
  Chip,
  Stack,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Polyline, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { enhancedTranzyApi } from '../../../services/api/tranzyApiService';
import { logger } from '../../../utils/shared/logger';
import { calculateDistance } from '../../../utils/data-processing/distanceUtils';
import { useAsyncOperation } from '../../../hooks/shared/useAsyncOperation';
import type { Station, Coordinates } from '../../../types';

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
      <circle cx="12" cy="6" r="4" fill="#2196f3" stroke="#ffffff" stroke-width="2"/>
      <rect x="7" y="10" width="10" height="12" rx="3" ry="3" fill="#2196f3" stroke="#ffffff" stroke-width="2"/>
    </svg>
  `),
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

// Station will use CircleMarker instead of custom icon for solid circle appearance

// Create dynamic bus icon with custom color and filtering state
const createBusIcon = (color: string, isDeparted: boolean = false, isFiltered: boolean = false, isSelected: boolean = false) => {
  let opacity = isDeparted ? 0.5 : 1;
  let iconColor = color;
  let size = 28;
  
  if (isFiltered) {
    opacity = 0.3;
    iconColor = '#cccccc';
    size = 24; // Smaller when dimmed
  } else if (isSelected) {
    opacity = 1;
    size = 32; // Larger when selected
  }
  
  return new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${iconColor}" width="${size}" height="${size}" opacity="${opacity}">
        <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
      </svg>
    `),
    iconSize: [size, size],
    iconAnchor: [size/2, size],
    popupAnchor: [0, -size],
  });
};

interface VehicleInfo {
  id: string;
  routeId: string;
  route: string;
  destination: string;
  vehicle?: {
    position: Coordinates;
    tripId?: string;
  };
  minutesAway: number;
  _internalDirection?: 'arriving' | 'departing' | 'unknown';
}

interface StationMapModalProps {
  open: boolean;
  onClose: () => void;
  station: Station;
  vehicles: VehicleInfo[];
  userLocation?: Coordinates;
  cityName?: string;
  agencyId?: string;
}

export const StationMapModal: React.FC<StationMapModalProps> = ({
  open,
  onClose,
  station,
  vehicles,
  userLocation,
  cityName = 'Cluj-Napoca',
  agencyId
}) => {
  const [routeShapes, setRouteShapes] = useState<Map<string, Coordinates[]>>(new Map());
  const [routeStations, setRouteStations] = useState<Map<string, Coordinates[]>>(new Map());
  const routeDataOperation = useAsyncOperation();
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string | null>(null);

  // Get unique route IDs from vehicles
  const uniqueRouteIds = React.useMemo(() => {
    return Array.from(new Set(vehicles.map(v => v.routeId).filter(Boolean)));
  }, [vehicles]);

  // Load route shapes when modal opens
  useEffect(() => {
    if (!open || uniqueRouteIds.length === 0) return;

    const loadRouteShapes = async () => {
      const result = await routeDataOperation.execute(async () => {
        logger.debug('Loading route shapes for station map', {
          routeIds: uniqueRouteIds
        }, 'STATION_MAP');

        // Check if we have agency ID
        if (!agencyId) {
          logger.warn('No agency ID provided for route shapes', {}, 'STATION_MAP');
          setRouteShapes(new Map());
          return;
        }

        const parsedAgencyId = parseInt(agencyId);

        const shapes = new Map<string, Coordinates[]>();
        
        // Get unique trip IDs from vehicles that have them
        const vehicleTrips = vehicles
          .filter(vehicle => vehicle.vehicle?.tripId)
          .map(vehicle => ({
            routeId: vehicle.routeId,
            tripId: vehicle.vehicle!.tripId!,
            route: vehicle.route
          }));

        logger.debug(`Found ${vehicleTrips.length} vehicles with trip IDs`, {
          vehicleTrips: vehicleTrips.map(vt => ({ routeId: vt.routeId, tripId: vt.tripId }))
        }, 'STATION_MAP');

        if (vehicleTrips.length === 0) {
          logger.warn('No vehicles have trip IDs, cannot load route shapes', {}, 'STATION_MAP');
          setRouteShapes(new Map());
          return;
        }

        // Get trips to find shape IDs for the specific trips our vehicles are on
        for (const vehicleTrip of vehicleTrips) {
          try {
            logger.debug(`Loading trip data for trip ${vehicleTrip.tripId}`, {}, 'STATION_MAP');
            
            // Get all trips for this route to find the specific trip
            const parsedRouteId = parseInt(vehicleTrip.routeId);
            if (isNaN(parsedRouteId)) {
              logger.warn(`Invalid route ID: ${vehicleTrip.routeId}`, {}, 'STATION_MAP');
              continue;
            }
            
            const trips = await enhancedTranzyApi.getTrips(parsedAgencyId, parsedRouteId, false);
            
            if (trips && trips.length > 0) {
              // Find the specific trip for this vehicle
              const specificTrip = trips.find(trip => trip.id === vehicleTrip.tripId);
              
              if (specificTrip && specificTrip.shapeId) {
                logger.debug(`Found shape ID ${specificTrip.shapeId} for trip ${vehicleTrip.tripId}`, {}, 'STATION_MAP');
                
                try {
                  // Load the shape from cache for this specific trip
                  const shapeData = await enhancedTranzyApi.getShapes(parsedAgencyId, specificTrip.shapeId, false);
                  
                  if (shapeData && shapeData.length > 0) {
                    // Transform shape data to coordinates
                    const coordinates: Coordinates[] = shapeData
                      .sort((a, b) => a.sequence - b.sequence)
                      .map(point => ({
                        latitude: point.latitude,
                        longitude: point.longitude
                      }));

                    if (coordinates.length > 0) {
                      // Use route ID as key - this will show one shape per route
                      // If multiple vehicles on same route have different shapes, the last one wins
                      shapes.set(vehicleTrip.routeId, coordinates);
                      logger.debug(`Loaded ${coordinates.length} shape points for route ${vehicleTrip.routeId} (trip ${vehicleTrip.tripId})`, {}, 'STATION_MAP');
                    }
                  }
                } catch (shapeError) {
                  logger.warn(`Failed to load shape ${specificTrip.shapeId} for trip ${vehicleTrip.tripId}`, { 
                    shapeError 
                  }, 'STATION_MAP');
                }
              } else {
                logger.warn(`Trip ${vehicleTrip.tripId} not found or has no shape ID`, {}, 'STATION_MAP');
              }
            }
          } catch (routeError) {
            logger.warn(`Failed to load trips for route ${vehicleTrip.routeId}`, { routeError }, 'STATION_MAP');
          }
        }
        
        logger.debug(`Loaded shapes for ${shapes.size} routes`, {
          routesWithShapes: Array.from(shapes.keys())
        }, 'STATION_MAP');
        
        // TODO: Implement proper route-specific station isLoading
        // For now, disable station isLoading to prevent performance issues
        
        return { shapes, stations: new Map() };
      }, {
        errorMessage: 'Failed to load route information',
        logCategory: 'STATION_MAP',
      });

      if (result) {
        setRouteShapes(result.shapes);
        setRouteStations(result.stations);
      }
    };

    loadRouteShapes();
  }, [open, uniqueRouteIds, vehicles, agencyId]);

  // Calculate map bounds to fit all vehicles and station
  const mapBounds = React.useMemo(() => {
    const points: Coordinates[] = [station.coordinates];
    
    if (userLocation) {
      points.push(userLocation);
    }
    
    vehicles.forEach(vehicle => {
      if (vehicle.vehicle?.position) {
        points.push(vehicle.vehicle.position);
      }
    });

    if (points.length === 0) return null;

    const lats = points.map(p => p.latitude);
    const lngs = points.map(p => p.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Add padding
    const latPadding = (maxLat - minLat) * 0.1 || 0.01;
    const lngPadding = (maxLng - minLng) * 0.1 || 0.01;
    
    return [
      [minLat - latPadding, minLng - lngPadding],
      [maxLat + latPadding, maxLng + lngPadding]
    ] as [[number, number], [number, number]];
  }, [station, vehicles, userLocation]);

  // Group vehicles by route for color coding
  const routeColors = React.useMemo(() => {
    const colors = ['#ff5722', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#f44336', '#00bcd4', '#795548'];
    const colorMap = new Map<string, string>();
    
    uniqueRouteIds.forEach((routeId, index) => {
      colorMap.set(routeId, colors[index % colors.length]);
    });
    
    return colorMap;
  }, [uniqueRouteIds]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Box>
          <Typography variant="h6" component="div">
            Station Map: {station.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} • {uniqueRouteIds.length} route{uniqueRouteIds.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {routeDataOperation.error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {routeDataOperation.error}
          </Alert>
        )}
        
        {routeDataOperation.isLoading && (
          <Box sx={{ 
            position: 'absolute', 
            top: 16, 
            left: 16, 
            zIndex: 1000,
            bgcolor: 'background.paper',
            p: 1,
            borderRadius: 1,
            boxShadow: 1
          }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={16} />
              <Typography variant="caption">Loading routes...</Typography>
            </Stack>
          </Box>
        )}

        {/* Route legend */}
        {uniqueRouteIds.length > 0 && (
          <Box sx={{ 
            position: 'absolute', 
            top: 16, 
            right: 16, 
            zIndex: 1000,
            bgcolor: 'background.paper',
            p: 2,
            borderRadius: 1,
            boxShadow: 1,
            maxWidth: 200
          }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Routes
            </Typography>
            <Stack spacing={0.5}>
              {uniqueRouteIds.map(routeId => {
                const vehicle = vehicles.find(v => v.routeId === routeId);
                const color = routeColors.get(routeId);
                const vehicleCount = vehicles.filter(v => v.routeId === routeId).length;
                const isSelected = selectedRouteFilter === routeId;
                const isFiltered = selectedRouteFilter !== null && !isSelected;
                
                return (
                  <Chip
                    key={routeId}
                    label={`${vehicle?.route || routeId} (${vehicleCount})`}
                    size="small"
                    clickable
                    onClick={() => {
                      // Toggle selection: if already selected, clear filter; otherwise select this route
                      const newFilter = isSelected ? null : routeId;
                      logger.debug('Route filter changed', { routeId, newFilter, isSelected }, 'STATION_MAP_MODAL');
                      setSelectedRouteFilter(newFilter);
                    }}
                    sx={{
                      bgcolor: isSelected 
                        ? color 
                        : isFiltered 
                        ? '#f5f5f5' 
                        : color + '20',
                      color: isSelected 
                        ? '#ffffff' 
                        : isFiltered 
                        ? '#999999' 
                        : color,
                      border: isSelected 
                        ? `2px solid ${color}` 
                        : isFiltered 
                        ? '1px solid #cccccc' 
                        : `1px solid ${color}40`,
                      fontSize: '0.7rem',
                      height: 24,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        bgcolor: isSelected 
                          ? color 
                          : isFiltered 
                          ? '#e0e0e0' 
                          : color + '40',
                        transform: 'scale(1.05)',
                      },
                      '&:active': {
                        transform: 'scale(0.95)',
                      }
                    }}
                  />
                );
              })}
            </Stack>
          </Box>
        )}
        
        {mapBounds && (
          <MapContainer
            bounds={mapBounds}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* User location marker */}
            {userLocation && (
              <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
                <Popup>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    Your Location
                  </Typography>
                </Popup>
              </Marker>
            )}
            
            {/* Station marker - solid circle */}
            <CircleMarker 
              center={[station.coordinates.latitude, station.coordinates.longitude]}
              radius={8}
              pathOptions={{
                color: '#ffffff',
                fillColor: '#10b981',
                fillOpacity: 1.0,
                weight: 2,
              }}
            >
              <Popup>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {station.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Station • {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Popup>
            </CircleMarker>
            
            {/* Route shapes */}
            {Array.from(routeShapes.entries()).map(([routeId, coordinates]) => {
              const color = routeColors.get(routeId) || '#666';
              const isSelected = selectedRouteFilter === routeId;
              const isFiltered = selectedRouteFilter !== null && !isSelected;
              
              return (
                <Polyline
                  key={`route-${routeId}-${selectedRouteFilter || 'none'}`}
                  positions={coordinates.map(coord => [coord.latitude, coord.longitude])}
                  pathOptions={{
                    color: isFiltered ? '#dddddd' : color,
                    weight: isSelected ? 6 : isFiltered ? 1.5 : 3,
                    opacity: isFiltered ? 0.2 : isSelected ? 1.0 : 0.7,
                    dashArray: isSelected ? undefined : isFiltered ? '5, 10' : undefined,
                  }}
                />
              );
            })}
            
            {/* Route stations - DISABLED: Feature temporarily isDisabled due to performance issues */}
            
            {/* Vehicle markers */}
            {vehicles.map((vehicle) => {
              const color = routeColors.get(vehicle.routeId) || '#ff5722';
              const isDeparted = vehicle._internalDirection === 'departing';
              const isSelected = selectedRouteFilter === vehicle.routeId;
              const isFiltered = selectedRouteFilter !== null && !isSelected;
              
              if (!vehicle.vehicle?.position) return null;
              
              return (
                <Marker
                  key={vehicle.id}
                  position={[vehicle.vehicle.position.latitude, vehicle.vehicle.position.longitude]}
                  icon={createBusIcon(color, isDeparted, isFiltered, isSelected)}
                >
                  <Popup>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Route {vehicle.route}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {vehicle.destination}
                      </Typography>
                      <br />
                      <Typography variant="caption">
                        Vehicle: {vehicle.id}
                      </Typography>
                      <br />
                      <Typography variant="caption">
                        {vehicle._internalDirection === 'arriving' 
                          ? vehicle.minutesAway === 0 
                            ? 'At station'
                            : `Arriving in ${vehicle.minutesAway}min`
                          : 'Already departed'
                        }
                      </Typography>
                    </Box>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </DialogContent>
    </Dialog>
  );
};