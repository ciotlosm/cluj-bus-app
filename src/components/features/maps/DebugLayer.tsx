/**
 * DebugLayer - Renders debug visualization for distance calculations
 * Shows debug lines, projections, and distance labels for troubleshooting arrival time accuracy
 * Implements requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

import type { FC } from 'react';
import { Polyline, Marker, Popup, Circle } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
import type { DebugLayerProps } from '../../../types/interactiveMap';

// Create debug marker icons with distinct shapes for different purposes
const createDebugIcon = (color: string, shape: 'circle' | 'square' | 'triangle' = 'circle', size: number = 12) => {
  let shapeElement: string;
  
  switch (shape) {
    case 'square':
      shapeElement = `<rect x="2" y="2" width="8" height="8" fill="${color}" stroke="#fff" stroke-width="1"/>`;
      break;
    case 'triangle':
      shapeElement = `<polygon points="6,2 10,10 2,10" fill="${color}" stroke="#fff" stroke-width="1"/>`;
      break;
    case 'circle':
    default:
      shapeElement = `<circle cx="6" cy="6" r="4" fill="${color}" stroke="#fff" stroke-width="1"/>`;
      break;
  }

  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        ${shapeElement}
      </svg>
    `)}`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2],
  });
};

// Create distance label with enhanced styling and color coding
const createDistanceLabelIcon = (
  distance: string, 
  type: 'direct' | 'route' | 'projection' = 'direct',
  confidence?: 'high' | 'medium' | 'low'
) => {
  let backgroundColor: string;
  let textColor = 'white';
  
  // Color code based on confidence level
  switch (confidence) {
    case 'high':
      backgroundColor = 'rgba(76, 175, 80, 0.9)'; // Green
      break;
    case 'medium':
      backgroundColor = 'rgba(255, 152, 0, 0.9)'; // Orange
      break;
    case 'low':
      backgroundColor = 'rgba(244, 67, 54, 0.9)'; // Red
      break;
    default:
      backgroundColor = 'rgba(0, 0, 0, 0.8)'; // Default black
      break;
  }

  // Add type indicator
  const typeIndicator = type === 'direct' ? '↔' : type === 'route' ? '↗' : '⊥';
  
  return new DivIcon({
    html: `
      <div style="
        background: ${backgroundColor}; 
        color: ${textColor}; 
        padding: 4px 8px; 
        border-radius: 6px; 
        font-size: 11px; 
        font-weight: bold;
        white-space: nowrap;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.3);
      ">
        ${typeIndicator} ${distance}
      </div>
    `,
    className: 'debug-distance-label',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

// Calculate midpoint between two coordinates
const calculateMidpoint = (coord1: { lat: number; lon: number }, coord2: { lat: number; lon: number }) => ({
  lat: (coord1.lat + coord2.lat) / 2,
  lon: (coord1.lon + coord2.lon) / 2,
});

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (coord1: { lat: number; lon: number }, coord2: { lat: number; lon: number }): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const DebugLayer: FC<DebugLayerProps> = ({
  debugData,
  visible,
  colorScheme,
}) => {
  if (!visible) return null;

  const {
    vehiclePosition,
    targetStationPosition,
    vehicleProjection,
    stationProjection,
    routeShape,
    distanceCalculation,
  } = debugData;

  // Calculate various distances for display
  const directDistance = calculateDistance(vehiclePosition, targetStationPosition);
  const vehicleToProjectionDistance = calculateDistance(vehiclePosition, vehicleProjection.closestPoint);
  const stationToProjectionDistance = calculateDistance(targetStationPosition, stationProjection.closestPoint);

  return (
    <>
      {/* 1. Vehicle to station direct distance line (Requirement 4.1) */}
      <Polyline
        positions={[
          [vehiclePosition.lat, vehiclePosition.lon],
          [targetStationPosition.lat, targetStationPosition.lon],
        ]}
        pathOptions={{
          color: colorScheme.debug.distanceLine,
          weight: 3,
          opacity: 0.8,
          dashArray: '8, 4',
        }}
      >
        <Popup>
          <div style={{ minWidth: '200px' }}>
            <div style={{ 
              fontWeight: 'bold', 
              fontSize: '14px', 
              marginBottom: '8px',
              color: colorScheme.debug.distanceLine 
            }}>
              Direct Distance Line
            </div>
            <div><strong>Distance:</strong> {directDistance.toFixed(0)}m</div>
            <div><strong>Calculation Method:</strong> {distanceCalculation.method}</div>
            <div><strong>Confidence:</strong> {distanceCalculation.confidence}</div>
            <div><strong>Total Distance:</strong> {distanceCalculation.totalDistance.toFixed(0)}m</div>
            <div style={{ 
              fontSize: '11px', 
              color: '#666', 
              marginTop: '6px',
              fontStyle: 'italic'
            }}>
              This line shows the straight-line distance between vehicle and target station
            </div>
          </div>
        </Popup>
      </Polyline>

      {/* 2. Vehicle projection line (Requirement 4.2) */}
      <Polyline
        positions={[
          [vehiclePosition.lat, vehiclePosition.lon],
          [vehicleProjection.closestPoint.lat, vehicleProjection.closestPoint.lon],
        ]}
        pathOptions={{
          color: colorScheme.debug.projectionLine,
          weight: 2,
          opacity: 0.9,
          lineCap: 'round',
        }}
      >
        <Popup>
          <div style={{ minWidth: '180px' }}>
            <div style={{ 
              fontWeight: 'bold', 
              fontSize: '14px', 
              marginBottom: '8px',
              color: colorScheme.debug.projectionLine 
            }}>
              Vehicle Projection
            </div>
            <div><strong>Distance to Route:</strong> {vehicleProjection.distanceToShape.toFixed(1)}m</div>
            <div><strong>Segment Index:</strong> {vehicleProjection.segmentIndex}</div>
            <div><strong>Position on Segment:</strong> {(vehicleProjection.positionAlongSegment * 100).toFixed(1)}%</div>
            <div style={{ 
              fontSize: '11px', 
              color: '#666', 
              marginTop: '6px',
              fontStyle: 'italic'
            }}>
              Shows how vehicle position projects onto the route shape
            </div>
          </div>
        </Popup>
      </Polyline>

      {/* 3. Station projection line (Requirement 4.3) */}
      <Polyline
        positions={[
          [targetStationPosition.lat, targetStationPosition.lon],
          [stationProjection.closestPoint.lat, stationProjection.closestPoint.lon],
        ]}
        pathOptions={{
          color: colorScheme.debug.projectionLine,
          weight: 2,
          opacity: 0.9,
          lineCap: 'round',
        }}
      >
        <Popup>
          <div style={{ minWidth: '180px' }}>
            <div style={{ 
              fontWeight: 'bold', 
              fontSize: '14px', 
              marginBottom: '8px',
              color: colorScheme.debug.projectionLine 
            }}>
              Station Projection
            </div>
            <div><strong>Distance to Route:</strong> {stationProjection.distanceToShape.toFixed(1)}m</div>
            <div><strong>Segment Index:</strong> {stationProjection.segmentIndex}</div>
            <div><strong>Position on Segment:</strong> {(stationProjection.positionAlongSegment * 100).toFixed(1)}%</div>
            <div style={{ 
              fontSize: '11px', 
              color: '#666', 
              marginTop: '6px',
              fontStyle: 'italic'
            }}>
              Shows how station position projects onto the route shape
            </div>
          </div>
        </Popup>
      </Polyline>

      {/* Route shape highlight with enhanced styling */}
      <Polyline
        positions={routeShape.points.map(p => [p.lat, p.lon] as [number, number])}
        pathOptions={{
          color: colorScheme.debug.routeShape,
          weight: 5,
          opacity: 0.7,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      >
        <Popup>
          <div style={{ minWidth: '180px' }}>
            <div style={{ 
              fontWeight: 'bold', 
              fontSize: '14px', 
              marginBottom: '8px',
              color: colorScheme.debug.routeShape 
            }}>
              Route Shape (Debug)
            </div>
            <div><strong>Shape ID:</strong> {routeShape.id}</div>
            <div><strong>Total Points:</strong> {routeShape.points.length}</div>
            <div><strong>Segments:</strong> {routeShape.segments.length}</div>
            {routeShape.segments.length > 0 && (
              <div><strong>Total Length:</strong> {routeShape.segments.reduce((sum, seg) => sum + seg.distance, 0).toFixed(0)}m</div>
            )}
            <div style={{ 
              fontSize: '11px', 
              color: '#666', 
              marginTop: '6px',
              fontStyle: 'italic'
            }}>
              Highlighted route shape used for distance calculations
            </div>
          </div>
        </Popup>
      </Polyline>

      {/* Debug markers with distinct shapes (Requirement 4.4) */}
      
      {/* Vehicle projection point */}
      <Marker
        position={[vehicleProjection.closestPoint.lat, vehicleProjection.closestPoint.lon]}
        icon={createDebugIcon(colorScheme.debug.projectionLine, 'square', 14)}
      >
        <Popup>
          <div>
            <strong>Vehicle Projection Point</strong>
            <br />
            Closest point on route to vehicle
            <br />
            Distance: {vehicleProjection.distanceToShape.toFixed(1)}m
            <br />
            Coordinates: {vehicleProjection.closestPoint.lat.toFixed(6)}, {vehicleProjection.closestPoint.lon.toFixed(6)}
          </div>
        </Popup>
      </Marker>

      {/* Station projection point */}
      <Marker
        position={[stationProjection.closestPoint.lat, stationProjection.closestPoint.lon]}
        icon={createDebugIcon(colorScheme.debug.projectionLine, 'triangle', 14)}
      >
        <Popup>
          <div>
            <strong>Station Projection Point</strong>
            <br />
            Closest point on route to station
            <br />
            Distance: {stationProjection.distanceToShape.toFixed(1)}m
            <br />
            Coordinates: {stationProjection.closestPoint.lat.toFixed(6)}, {stationProjection.closestPoint.lon.toFixed(6)}
          </div>
        </Popup>
      </Marker>

      {/* Vehicle position marker */}
      <Marker
        position={[vehiclePosition.lat, vehiclePosition.lon]}
        icon={createDebugIcon('#FF5722', 'circle', 16)}
      >
        <Popup>
          <div>
            <strong>Vehicle Position (Debug)</strong>
            <br />
            Current vehicle location
            <br />
            Coordinates: {vehiclePosition.lat.toFixed(6)}, {vehiclePosition.lon.toFixed(6)}
          </div>
        </Popup>
      </Marker>

      {/* Target station marker */}
      <Marker
        position={[targetStationPosition.lat, targetStationPosition.lon]}
        icon={createDebugIcon('#9C27B0', 'circle', 16)}
      >
        <Popup>
          <div>
            <strong>Target Station (Debug)</strong>
            <br />
            Destination station location
            <br />
            Coordinates: {targetStationPosition.lat.toFixed(6)}, {targetStationPosition.lon.toFixed(6)}
          </div>
        </Popup>
      </Marker>

      {/* Distance labels with color coding (Requirement 4.5) */}
      
      {/* Direct distance label */}
      <Marker
        position={[
          calculateMidpoint(vehiclePosition, targetStationPosition).lat,
          calculateMidpoint(vehiclePosition, targetStationPosition).lon,
        ]}
        icon={createDistanceLabelIcon(
          `${directDistance.toFixed(0)}m`, 
          'direct', 
          distanceCalculation.confidence
        )}
      />

      {/* Vehicle projection distance label */}
      {vehicleToProjectionDistance > 10 && ( // Only show if significant distance
        <Marker
          position={[
            calculateMidpoint(vehiclePosition, vehicleProjection.closestPoint).lat,
            calculateMidpoint(vehiclePosition, vehicleProjection.closestPoint).lon,
          ]}
          icon={createDistanceLabelIcon(
            `${vehicleToProjectionDistance.toFixed(0)}m`, 
            'projection'
          )}
        />
      )}

      {/* Station projection distance label */}
      {stationToProjectionDistance > 10 && ( // Only show if significant distance
        <Marker
          position={[
            calculateMidpoint(targetStationPosition, stationProjection.closestPoint).lat,
            calculateMidpoint(targetStationPosition, stationProjection.closestPoint).lon,
          ]}
          icon={createDistanceLabelIcon(
            `${stationToProjectionDistance.toFixed(0)}m`, 
            'projection'
          )}
        />
      )}

      {/* Accuracy circles around key points */}
      <Circle
        center={[vehiclePosition.lat, vehiclePosition.lon]}
        radius={Math.max(10, vehicleProjection.distanceToShape)}
        pathOptions={{
          color: colorScheme.debug.projectionLine,
          weight: 1,
          opacity: 0.3,
          fillOpacity: 0.1,
        }}
      />

      <Circle
        center={[targetStationPosition.lat, targetStationPosition.lon]}
        radius={Math.max(10, stationProjection.distanceToShape)}
        pathOptions={{
          color: colorScheme.debug.projectionLine,
          weight: 1,
          opacity: 0.3,
          fillOpacity: 0.1,
        }}
      />
    </>
  );
};