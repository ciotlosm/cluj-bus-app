/**
 * DebugLayer - Renders debug visualization for distance calculations
 * Shows debug lines, projections, and distance labels for troubleshooting arrival time accuracy
 * Implements requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

import type { FC } from 'react';
import { Polyline, Marker, Popup, Circle } from 'react-leaflet';
import type { DebugLayerProps } from '../../../types/interactiveMap';
import { calculateDistance } from '../../../utils/location/distanceUtils';
import { createDebugIcon, createDistanceLabelIcon } from '../../../utils/maps/iconUtils';

// Calculate midpoint between two coordinates
const calculateMidpoint = (coord1: { lat: number; lon: number }, coord2: { lat: number; lon: number }) => ({
  lat: (coord1.lat + coord2.lat) / 2,
  lon: (coord1.lon + coord2.lon) / 2,
});

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

      {/* Route segment between vehicle and target station */}
      {(() => {
        // Extract only the route segment between vehicle and target station projections
        const startSegmentIndex = Math.min(vehicleProjection.segmentIndex, stationProjection.segmentIndex);
        const endSegmentIndex = Math.max(vehicleProjection.segmentIndex, stationProjection.segmentIndex);
        
        // Build the route segment points
        const segmentPoints: [number, number][] = [];
        
        // Add vehicle projection point as start
        segmentPoints.push([vehicleProjection.closestPoint.lat, vehicleProjection.closestPoint.lon]);
        
        // Add intermediate segment points
        for (let i = startSegmentIndex; i <= endSegmentIndex; i++) {
          const segment = routeShape.segments[i];
          if (segment) {
            // Add segment end point (start point is already added from previous segment)
            segmentPoints.push([segment.end.lat, segment.end.lon]);
          }
        }
        
        // Add station projection point as end
        segmentPoints.push([stationProjection.closestPoint.lat, stationProjection.closestPoint.lon]);
        
        // Remove duplicate consecutive points
        const uniquePoints = segmentPoints.filter((point, index) => {
          if (index === 0) return true;
          const prevPoint = segmentPoints[index - 1];
          return !(point[0] === prevPoint[0] && point[1] === prevPoint[1]);
        });
        
        const segmentDistance = routeShape.segments
          .slice(startSegmentIndex, endSegmentIndex + 1)
          .reduce((sum, seg) => sum + seg.distance, 0);
        
        return (
          <Polyline
            positions={uniquePoints}
            pathOptions={{
              color: colorScheme.debug.routeShape,
              weight: 6,
              opacity: 0.8,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '14px', 
                  marginBottom: '8px',
                  color: colorScheme.debug.routeShape 
                }}>
                  Route Segment (Vehicle → Station)
                </div>
                <div><strong>Shape ID:</strong> {routeShape.id}</div>
                <div><strong>Segment Range:</strong> {startSegmentIndex} → {endSegmentIndex}</div>
                <div><strong>Segment Points:</strong> {uniquePoints.length}</div>
                <div><strong>Segment Distance:</strong> {segmentDistance.toFixed(0)}m</div>
                <div><strong>Total Distance:</strong> {distanceCalculation.totalDistance.toFixed(0)}m</div>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#666', 
                  marginTop: '6px',
                  fontStyle: 'italic'
                }}>
                  Route segment used for distance calculation from vehicle to target station
                </div>
              </div>
            </Popup>
          </Polyline>
        );
      })()}

      {/* Debug markers with distinct shapes (Requirement 4.4) */}
      
      {/* Vehicle projection point */}
      <Marker
        position={[vehicleProjection.closestPoint.lat, vehicleProjection.closestPoint.lon]}
        icon={createDebugIcon({ color: colorScheme.debug.projectionLine, shape: 'square', size: 14 })}
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
        icon={createDebugIcon({ color: colorScheme.debug.projectionLine, shape: 'triangle', size: 14 })}
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
        icon={createDebugIcon({ color: '#FF5722', shape: 'circle', size: 16 })}
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
        icon={createDebugIcon({ color: '#9C27B0', shape: 'circle', size: 16 })}
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