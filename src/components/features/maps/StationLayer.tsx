/**
 * StationLayer - Renders station markers with customizable symbols
 * Supports different symbol types (circle, user-location, terminus, nearby)
 * Implements station click handlers and comprehensive information display
 * Requirements: 1.3, 2.3, 3.1, 7.1, 7.2, 7.3, 7.4
 */

import type { FC } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import type { StationLayerProps } from '../../../types/interactiveMap';
import { StationSymbolType } from '../../../types/interactiveMap';

// Create station icons based on type with enhanced customization
const createStationIcon = (
  type: StationSymbolType, 
  color: string, 
  isSelected: boolean = false,
  customSize?: number
) => {
  const baseSize = customSize || 16;
  const size = isSelected ? baseSize + 6 : baseSize;
  const strokeWidth = isSelected ? 3 : 2;
  const innerRadius = Math.max(2, size / 4);
  
  // Create different symbol shapes based on type
  let symbolSvg = '';
  
  switch (type) {
    case StationSymbolType.USER_LOCATION:
      // User location: filled circle with crosshairs
      symbolSvg = `
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - strokeWidth}" fill="${color}" stroke="#fff" stroke-width="${strokeWidth}"/>
        <circle cx="${size/2}" cy="${size/2}" r="${innerRadius}" fill="#fff"/>
        <line x1="${size/2 - innerRadius/2}" y1="${size/2}" x2="${size/2 + innerRadius/2}" y2="${size/2}" stroke="${color}" stroke-width="1"/>
        <line x1="${size/2}" y1="${size/2 - innerRadius/2}" x2="${size/2}" y2="${size/2 + innerRadius/2}" stroke="${color}" stroke-width="1"/>
      `;
      break;
      
    case StationSymbolType.TERMINUS:
      // Terminus: square with inner square
      symbolSvg = `
        <rect x="${strokeWidth}" y="${strokeWidth}" width="${size - 2*strokeWidth}" height="${size - 2*strokeWidth}" 
              fill="${color}" stroke="#fff" stroke-width="${strokeWidth}" rx="2"/>
        <rect x="${size/2 - innerRadius/2}" y="${size/2 - innerRadius/2}" width="${innerRadius}" height="${innerRadius}" 
              fill="#fff" rx="1"/>
      `;
      break;
      
    case StationSymbolType.NEARBY:
      // Nearby: diamond shape with inner circle
      const halfSize = size / 2;
      symbolSvg = `
        <polygon points="${halfSize},${strokeWidth} ${size-strokeWidth},${halfSize} ${halfSize},${size-strokeWidth} ${strokeWidth},${halfSize}" 
                 fill="${color}" stroke="#fff" stroke-width="${strokeWidth}"/>
        <circle cx="${halfSize}" cy="${halfSize}" r="${innerRadius/2}" fill="#fff"/>
      `;
      break;
      
    case StationSymbolType.DEFAULT:
    default:
      // Default: simple circle
      symbolSvg = `
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - strokeWidth}" fill="${color}" stroke="#fff" stroke-width="${strokeWidth}"/>
        <circle cx="${size/2}" cy="${size/2}" r="${innerRadius/2}" fill="#fff"/>
      `;
  }

  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        ${symbolSvg}
      </svg>
    `)}`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2],
  });
};

// Get readable station type name for display
const getStationTypeName = (type: StationSymbolType): string => {
  switch (type) {
    case StationSymbolType.USER_LOCATION:
      return 'User Location';
    case StationSymbolType.TERMINUS:
      return 'Terminus';
    case StationSymbolType.NEARBY:
      return 'Nearby Station';
    case StationSymbolType.DEFAULT:
    default:
      return 'Transit Stop';
  }
};

// Get location type description
const getLocationTypeDescription = (locationType: number): string => {
  switch (locationType) {
    case 0:
      return 'Stop/Platform';
    case 1:
      return 'Station';
    case 2:
      return 'Station Entrance/Exit';
    case 3:
      return 'Generic Node';
    case 4:
      return 'Boarding Area';
    default:
      return 'Transit Location';
  }
};

export const StationLayer: FC<StationLayerProps> = ({
  stations,
  stationTypes = new Map(),
  onStationClick,
  highlightedStationId,
  colorScheme,
}) => {
  return (
    <>
      {stations.map(station => {
        const isSelected = station.stop_id === highlightedStationId;
        const stationType = stationTypes.get(station.stop_id) || StationSymbolType.DEFAULT;
        
        // Get color based on station type
        let color = colorScheme.stations.default;
        switch (stationType) {
          case StationSymbolType.USER_LOCATION:
            color = colorScheme.stations.userLocation;
            break;
          case StationSymbolType.TERMINUS:
            color = colorScheme.stations.terminus;
            break;
          case StationSymbolType.NEARBY:
            color = colorScheme.stations.nearby;
            break;
        }

        // Override with selection color if selected
        if (isSelected) {
          color = '#FF9800'; // Orange for selected
        }

        // Create icon with appropriate size based on type and selection
        const customSize = stationType === StationSymbolType.USER_LOCATION ? 20 : 
                          stationType === StationSymbolType.TERMINUS ? 18 : 16;
        const icon = createStationIcon(stationType, color, isSelected, customSize);

        return (
          <Marker
            key={station.stop_id}
            position={[station.stop_lat, station.stop_lon]}
            icon={icon}
            eventHandlers={{
              click: () => onStationClick?.(station),
            }}
          >
            <Popup>
              <div style={{ minWidth: '220px' }}>
                {/* Station header with name and type */}
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '16px', 
                  marginBottom: '8px',
                  color: color,
                  borderBottom: '1px solid #eee',
                  paddingBottom: '6px'
                }}>
                  {station.stop_name}
                </div>
                
                {/* Station type and location type */}
                <div style={{ marginBottom: '6px' }}>
                  <strong>Type:</strong> {getStationTypeName(stationType)}
                </div>
                
                <div style={{ marginBottom: '6px' }}>
                  <strong>Location:</strong> {getLocationTypeDescription(station.location_type)}
                </div>
                
                {/* Stop code if available */}
                {station.stop_code && (
                  <div style={{ marginBottom: '6px' }}>
                    <strong>Stop Code:</strong> {station.stop_code}
                  </div>
                )}
                
                {/* Coordinates */}
                <div style={{ marginBottom: '6px' }}>
                  <strong>Coordinates:</strong> {station.stop_lat.toFixed(6)}, {station.stop_lon.toFixed(6)}
                </div>
                
                {/* Station ID for debugging */}
                <div style={{ 
                  fontSize: '12px', 
                  color: '#666', 
                  marginTop: '8px',
                  borderTop: '1px solid #eee',
                  paddingTop: '4px'
                }}>
                  Station ID: {station.stop_id}
                </div>
                
                {/* Visual indicator for special station types */}
                {stationType !== StationSymbolType.DEFAULT && (
                  <div style={{ 
                    fontSize: '12px', 
                    marginTop: '4px',
                    padding: '2px 6px',
                    backgroundColor: color,
                    color: '#fff',
                    borderRadius: '3px',
                    display: 'inline-block'
                  }}>
                    {stationType === StationSymbolType.USER_LOCATION && '📍 Your Location'}
                    {stationType === StationSymbolType.TERMINUS && '🔚 Route End'}
                    {stationType === StationSymbolType.NEARBY && '📍 Nearby'}
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