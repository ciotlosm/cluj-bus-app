/**
 * UserLocationLayer - Renders user's GPS position on the map
 * Shows user location with a styled icon that matches other map icons
 * Includes optional accuracy circle for GPS precision indication
 */

import type { FC } from 'react';
import { Marker, Circle, Popup } from 'react-leaflet';
import type { UserLocationLayerProps } from '../../../types/interactiveMap';
import { createUserLocationIcon } from '../../../utils/maps/iconUtils';

export const UserLocationLayer: FC<UserLocationLayerProps> = ({
  position,
  showAccuracyCircle = false,
  colorScheme,
}) => {
  // Don't render if no position available
  if (!position) {
    return null;
  }

  const { latitude, longitude, accuracy } = position.coords;
  
  // Create user location icon with consistent styling
  const userIcon = createUserLocationIcon({
    color: colorScheme.stations.userLocation, // Use the user location color from scheme
    size: 20
  });

  return (
    <>
      {/* User location marker */}
      <Marker
        position={[latitude, longitude]}
        icon={userIcon}
      >
        <Popup>
          <div style={{ minWidth: '200px' }}>
            <div style={{ 
              fontWeight: 'bold', 
              fontSize: '16px', 
              marginBottom: '8px',
              color: colorScheme.stations.userLocation,
              borderBottom: '1px solid #eee',
              paddingBottom: '6px'
            }}>
              📍 Your Location
            </div>
            
            <div style={{ marginBottom: '6px' }}>
              <strong>Coordinates:</strong> {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
            
            {accuracy !== null && accuracy !== undefined && (
              <div style={{ marginBottom: '6px' }}>
                <strong>Accuracy:</strong> ±{Math.round(accuracy)}m
                {accuracy === 0 && <span style={{ color: 'orange' }}> (Very precise)</span>}
              </div>
            )}
            
            <div style={{ marginBottom: '6px', fontSize: '12px', color: '#666' }}>
              <strong>Debug:</strong> accuracy={accuracy}, type={typeof accuracy}
            </div>
            
            <div style={{ 
              fontSize: '12px', 
              color: '#666', 
              marginTop: '8px',
              borderTop: '1px solid #eee',
              paddingTop: '4px'
            }}>
              Updated: {new Date(position.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </Popup>
      </Marker>

      {/* Optional accuracy circle */}
      {showAccuracyCircle && accuracy !== null && accuracy !== undefined && accuracy >= 0 && (
        <Circle
          center={[latitude, longitude]}
          radius={accuracy === 0 ? 10 : accuracy} // Show 10m circle for 0 accuracy (very precise GPS)
          pathOptions={{
            color: colorScheme.stations.userLocation,
            fillColor: colorScheme.stations.userLocation,
            fillOpacity: accuracy === 0 ? 0.05 : 0.1, // Lighter for precise GPS
            weight: accuracy === 0 ? 1 : 2,
            opacity: accuracy === 0 ? 0.3 : 0.5,
          }}
        />
      )}
    </>
  );
};