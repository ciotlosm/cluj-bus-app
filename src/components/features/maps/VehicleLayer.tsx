/**
 * VehicleLayer - Renders vehicle markers on the map with route-based coloring
 * Handles vehicle click events and popup functionality
 * Supports multiple coloring strategies: by route, by confidence, uniform
 * Includes performance optimizations and loading states
 */

import type { FC } from 'react';
import { useMemo, useState, useCallback } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import { CircularProgress, Box } from '@mui/material';
import type { VehicleLayerProps } from '../../../types/interactiveMap';
import { VehicleColorStrategy, DEFAULT_MAP_PERFORMANCE } from '../../../types/interactiveMap';
import { formatTimestamp } from '../../../utils/vehicle/vehicleFormatUtils';
import { createVehicleIcon } from '../../../utils/maps/iconUtils';
import { useOptimizedVehicles, useDebouncedLoading } from '../../../utils/maps/performanceUtils';

// Extend window object for tracking logged vehicles
declare global {
  interface Window {
    loggedInvalidVehicles?: Set<number>;
  }
}

export const VehicleLayer: FC<VehicleLayerProps> = ({
  vehicles,
  routes,
  onVehicleClick,
  highlightedVehicleId,
  colorStrategy = VehicleColorStrategy.BY_ROUTE,
  colorScheme,
  performanceConfig = DEFAULT_MAP_PERFORMANCE,
  loading = false,
}) => {
  const map = useMap();
  const [mapBounds, setMapBounds] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(map.getZoom());

  // Update bounds and zoom when map changes
  const updateMapState = useCallback(() => {
    const bounds = map.getBounds();
    setMapBounds({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
    setZoomLevel(map.getZoom());
  }, [map]);

  // Listen to map events for performance optimization
  useMemo(() => {
    map.on('moveend', updateMapState);
    map.on('zoomend', updateMapState);
    updateMapState(); // Initial call
    
    return () => {
      map.off('moveend', updateMapState);
      map.off('zoomend', updateMapState);
    };
  }, [map, updateMapState]);

  // Filter out vehicles with invalid coordinates upfront to prevent spam
  const validVehicles = useMemo(() => {
    const valid = vehicles.filter(vehicle => {
      const hasValidCoords = vehicle.latitude != null && vehicle.longitude != null && 
                           !isNaN(vehicle.latitude) && !isNaN(vehicle.longitude);
      
      // Only log once per vehicle ID to prevent spam
      if (!hasValidCoords && !window.loggedInvalidVehicles?.has(vehicle.id)) {
        if (!window.loggedInvalidVehicles) {
          window.loggedInvalidVehicles = new Set();
        }
        window.loggedInvalidVehicles.add(vehicle.id);
        console.warn(`Vehicle ${vehicle.id} has invalid coordinates:`, vehicle.latitude, vehicle.longitude);
      }
      
      return hasValidCoords;
    });
    
    return valid;
  }, [vehicles]);

  // Apply performance optimizations
  const { optimizedVehicles } = useOptimizedVehicles(
    validVehicles,
    mapBounds,
    performanceConfig,
    zoomLevel
  );

  // Debounce loading state to prevent flicker
  const debouncedLoading = useDebouncedLoading(loading, 300);

  // Get color for vehicle based on strategy - always use station blue
  const getVehicleColor = useCallback((vehicle: typeof vehicles[0]): string => {
    switch (colorStrategy) {
      case VehicleColorStrategy.BY_ROUTE:
        // Always use station blue instead of route-based colors
        return '#3182CE'; // Station blue
      
      case VehicleColorStrategy.BY_CONFIDENCE:
        // Use speed as a proxy for confidence - stationary vehicles might have lower confidence
        // In a real implementation, this would use actual arrival confidence data
        if (vehicle.speed === 0) {
          return colorScheme.vehicles.lowConfidence;
        } else if (vehicle.speed < 10) {
          // Medium confidence for slow-moving vehicles
          return '#FFA726'; // Orange for medium confidence
        } else {
          // High confidence for normal-speed vehicles
          return '#4CAF50'; // Green for high confidence
        }
      
      case VehicleColorStrategy.UNIFORM:
      default:
        return '#3182CE'; // Station blue
    }
  }, [colorStrategy, colorScheme]);

  // Get vehicle status text
  const getVehicleStatus = useCallback((vehicle: typeof vehicles[0]): string => {
    if (vehicle.speed === 0) {
      return 'Stopped';
    } else if (vehicle.speed < 5) {
      return 'Moving slowly';
    } else {
      return 'In transit';
    }
  }, []);

  // Handle cluster click
  const handleClusterClick = useCallback((cluster) => {
    // Zoom to cluster bounds
    const bounds = cluster.points.map(point => [point.position.lat, point.position.lon]);
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map]);

  // Show loading indicator if data is loading
  if (debouncedLoading && optimizedVehicles.length === 0) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 1,
          p: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <CircularProgress size={16} />
        <span style={{ fontSize: '12px' }}>Loading vehicles...</span>
      </Box>
    );
  }

  // Render individual vehicle markers
  return (
    <>
      {optimizedVehicles.map(vehicle => {
        const isSelected = vehicle.id === highlightedVehicleId;
        const color = '#3182CE'; // Always use station blue, even when selected
        const icon = createVehicleIcon({ 
          color, 
          isSelected, 
          speed: vehicle.speed,
          size: 24 
        });
        const route = vehicle.route_id ? routes.get(vehicle.route_id) : null;

        return (
          <Marker
            key={vehicle.id}
            position={[vehicle.latitude, vehicle.longitude]}
            icon={icon}
            eventHandlers={{
              click: () => onVehicleClick?.(vehicle),
            }}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '16px', 
                  marginBottom: '8px',
                  color: color 
                }}>
                  Vehicle {vehicle.label}
                </div>
                
                {route && (
                  <div style={{ marginBottom: '6px' }}>
                    <strong>Route:</strong> {route.route_short_name} - {route.route_long_name}
                  </div>
                )}
                
                <div style={{ marginBottom: '4px' }}>
                  <strong>Status:</strong> {getVehicleStatus(vehicle)}
                </div>
                
                <div style={{ marginBottom: '4px' }}>
                  <strong>Speed:</strong> {vehicle.speed} km/h
                </div>
                
                <div style={{ marginBottom: '4px' }}>
                  <strong>Last Update:</strong> {formatTimestamp(vehicle.timestamp)}
                </div>
                
                {vehicle.trip_id && (
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Trip:</strong> {vehicle.trip_id}
                  </div>
                )}
                
                <div style={{ 
                  fontSize: '12px', 
                  color: '#666', 
                  marginTop: '8px',
                  borderTop: '1px solid #eee',
                  paddingTop: '4px'
                }}>
                  ID: {vehicle.id} | Lat: {vehicle.latitude?.toFixed(6) ?? 'N/A'}, Lon: {vehicle.longitude?.toFixed(6) ?? 'N/A'}
                </div>
                
                {/* Accessibility info */}
                {(vehicle.wheelchair_accessible === 'WHEELCHAIR_ACCESSIBLE' || 
                  vehicle.bike_accessible === 'BIKE_ACCESSIBLE') && (
                  <div style={{ 
                    fontSize: '12px', 
                    marginTop: '4px',
                    color: '#4CAF50'
                  }}>
                    {vehicle.wheelchair_accessible === 'WHEELCHAIR_ACCESSIBLE' && '♿ '}
                    {vehicle.bike_accessible === 'BIKE_ACCESSIBLE' && '🚲 '}
                    Accessible
                  </div>
                )}

                {/* Performance info for debugging */}
                {process.env.NODE_ENV === 'development' && (
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#999', 
                    marginTop: '4px',
                    borderTop: '1px solid #eee',
                    paddingTop: '2px'
                  }}>
                    Showing {optimizedVehicles.length} of {vehicles.length} vehicles
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};