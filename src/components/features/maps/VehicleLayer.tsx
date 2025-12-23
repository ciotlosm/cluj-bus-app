/**
 * VehicleLayer - Renders vehicle markers on the map with route-based coloring
 * Handles vehicle click events and popup functionality
 * Supports multiple coloring strategies: by route, by confidence, uniform
 */

import type { FC } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import type { VehicleLayerProps } from '../../../types/interactiveMap';
import { VehicleColorStrategy } from '../../../types/interactiveMap';

// Vehicle icon SVG template with directional arrow
const createVehicleIcon = (color: string, isSelected: boolean = false, speed: number = 0) => {
  const size = isSelected ? 28 : 24;
  const radius = isSelected ? 12 : 10;
  const strokeWidth = isSelected ? 3 : 2;
  
  // Show directional arrow if vehicle is moving (speed > 0)
  const showArrow = speed > 0;
  
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="${color}" stroke="#fff" stroke-width="${strokeWidth}"/>
        ${showArrow ? `
          <polygon points="${size/2},${size/2-4} ${size/2-3},${size/2+2} ${size/2+3},${size/2+2}" 
                   fill="#fff" stroke="none"/>
        ` : `
          <circle cx="${size/2}" cy="${size/2}" r="3" fill="#fff"/>
        `}
      </svg>
    `)}`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2],
  });
};

export const VehicleLayer: FC<VehicleLayerProps> = ({
  vehicles,
  routes,
  onVehicleClick,
  highlightedVehicleId,
  colorStrategy = VehicleColorStrategy.BY_ROUTE,
  colorScheme,
}) => {
  // Get color for vehicle based on strategy
  const getVehicleColor = (vehicle: typeof vehicles[0]): string => {
    switch (colorStrategy) {
      case VehicleColorStrategy.BY_ROUTE:
        if (vehicle.route_id && colorScheme.vehicles.byRoute.has(vehicle.route_id)) {
          return colorScheme.vehicles.byRoute.get(vehicle.route_id)!;
        }
        return colorScheme.vehicles.default;
      
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
        return colorScheme.vehicles.default;
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Unknown';
    }
  };

  // Get vehicle status text
  const getVehicleStatus = (vehicle: typeof vehicles[0]): string => {
    if (vehicle.speed === 0) {
      return 'Stopped';
    } else if (vehicle.speed < 5) {
      return 'Moving slowly';
    } else {
      return 'In transit';
    }
  };

  return (
    <>
      {vehicles.map(vehicle => {
        const isSelected = vehicle.id === highlightedVehicleId;
        const color = isSelected ? colorScheme.vehicles.selected : getVehicleColor(vehicle);
        const icon = createVehicleIcon(color, isSelected, vehicle.speed);
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
                  ID: {vehicle.id} | Lat: {vehicle.latitude.toFixed(6)}, Lon: {vehicle.longitude.toFixed(6)}
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
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};