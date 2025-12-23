/**
 * UserLocationLayer - Renders user's current GPS location with accuracy circle
 * Integrates with location store for real-time position updates
 * Placeholder implementation for core map infrastructure task
 */

import type { FC } from 'react';
import { Marker, Circle, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import type { UserLocationLayerProps } from '../../../types/interactiveMap';

// Create user location icon
const createUserLocationIcon = (color: string) => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="8" fill="${color}" stroke="#fff" stroke-width="2"/>
        <circle cx="10" cy="10" r="3" fill="#fff"/>
      </svg>
    `)}`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

export const UserLocationLayer: FC<UserLocationLayerProps> = ({
  position,
  showAccuracyCircle = true,
  colorScheme,
}) => {
  if (!position) return null;

  const { latitude, longitude, accuracy } = position.coords;
  const icon = createUserLocationIcon(colorScheme.stations.userLocation);

  return (
    <>
      {/* Accuracy circle */}
      {showAccuracyCircle && accuracy && (
        <Circle
          center={[latitude, longitude]}
          radius={accuracy}
          pathOptions={{
            color: colorScheme.stations.userLocation,
            fillColor: colorScheme.stations.userLocation,
            fillOpacity: 0.1,
            weight: 2,
            opacity: 0.5,
          }}
        />
      )}

      {/* User location marker */}
      <Marker
        position={[latitude, longitude]}
        icon={icon}
      >
        <Popup>
          <div>
            <strong>Your Location</strong>
            <br />
            Accuracy: {accuracy ? `±${accuracy.toFixed(0)}m` : 'Unknown'}
            <br />
            Last Update: {new Date(position.timestamp).toLocaleTimeString()}
            <br />
            Speed: {position.coords.speed ? `${position.coords.speed.toFixed(1)} m/s` : 'Unknown'}
          </div>
        </Popup>
      </Marker>
    </>
  );
};