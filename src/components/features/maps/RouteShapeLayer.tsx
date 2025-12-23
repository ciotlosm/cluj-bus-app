/**
 * RouteShapeLayer - Renders route shapes as colored lines with direction indicators
 * Supports multiple route shapes with distinct styling and direction arrows
 * Implements requirements 1.2, 2.1, 2.2, 2.4, 3.2, 3.4
 */

import type { FC } from 'react';
import { Polyline, Popup, Marker } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
import type { RouteShapeLayerProps, MapColorScheme } from '../../../types/interactiveMap';
import type { Coordinates } from '../../../types/interactiveMap';
import type { TranzyRouteResponse } from '../../../types/rawTranzyApi';

// Calculate bearing between two points for direction arrows
const calculateBearing = (start: Coordinates, end: Coordinates): number => {
  const startLat = start.lat * Math.PI / 180;
  const startLon = start.lon * Math.PI / 180;
  const endLat = end.lat * Math.PI / 180;
  const endLon = end.lon * Math.PI / 180;

  const dLon = endLon - startLon;
  const y = Math.sin(dLon) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLon);

  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
};

// Create direction arrow icon
const createDirectionArrow = (color: string, bearing: number): DivIcon => {
  return new DivIcon({
    html: `
      <div style="
        width: 0; 
        height: 0; 
        border-left: 6px solid transparent; 
        border-right: 6px solid transparent; 
        border-bottom: 12px solid ${color}; 
        transform: rotate(${bearing}deg);
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
      "></div>
    `,
    className: 'direction-arrow',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

// Find route associated with a shape ID
const findRouteForShape = (shapeId: string, routes: Map<number, TranzyRouteResponse>): TranzyRouteResponse | null => {
  // Look for routes that might use this shape
  // In a real implementation, this would use trip data to map shapes to routes
  // For now, we'll try to extract route info from shape ID if it follows a pattern
  const routeIdMatch = shapeId.match(/^(\d+)_/);
  if (routeIdMatch) {
    const routeId = parseInt(routeIdMatch[1], 10);
    return routes.get(routeId) || null;
  }
  
  // Fallback: return first route if no pattern match
  return routes.values().next().value || null;
};

// Get color for route shape
const getRouteShapeColor = (
  shapeId: string, 
  routes: Map<number, TranzyRouteResponse>, 
  colorScheme: MapColorScheme,
  isHighlighted: boolean
): string => {
  const route = findRouteForShape(shapeId, routes);
  
  if (route && colorScheme.routes.has(route.route_id)) {
    return colorScheme.routes.get(route.route_id) as string;
  }
  
  // Use route_color from API if available
  if (route && route.route_color) {
    return `#${route.route_color}`;
  }
  
  // Fallback to default colors
  const defaultColors = Array.from(colorScheme.routes.values()) as string[];
  const colorIndex = Math.abs(shapeId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % defaultColors.length;
  return defaultColors[colorIndex] || '#2196F3';
};

// Calculate direction arrow positions along the route
const calculateArrowPositions = (points: Coordinates[], maxArrows: number = 5): Array<{
  position: Coordinates;
  bearing: number;
}> => {
  if (points.length < 2) return [];
  
  const arrows: Array<{ position: Coordinates; bearing: number }> = [];
  const totalPoints = points.length;
  const interval = Math.max(1, Math.floor(totalPoints / (maxArrows + 1)));
  
  for (let i = interval; i < totalPoints - 1; i += interval) {
    if (arrows.length >= maxArrows) break;
    
    const current = points[i];
    const next = points[i + 1];
    const bearing = calculateBearing(current, next);
    
    arrows.push({
      position: current,
      bearing,
    });
  }
  
  return arrows;
};

export const RouteShapeLayer: FC<RouteShapeLayerProps> = ({
  routeShapes,
  routes,
  highlightedRouteIds = [],
  showDirectionArrows = false,
  colorScheme,
}) => {
  return (
    <>
      {Array.from(routeShapes.entries()).map(([shapeId, routeShape]) => {
        // Convert coordinates to Leaflet format
        const positions = routeShape.points.map(point => [point.lat, point.lon] as [number, number]);
        
        if (positions.length < 2) {
          // Skip shapes with insufficient points
          return null;
        }
        
        // Find associated route for this shape
        const associatedRoute = findRouteForShape(shapeId, routes);
        const isHighlighted = associatedRoute && highlightedRouteIds.includes(associatedRoute.route_id);
        
        // Get color for this route shape
        const color = getRouteShapeColor(shapeId, routes, colorScheme, isHighlighted);
        
        // Calculate direction arrows if enabled
        const arrows = showDirectionArrows ? calculateArrowPositions(routeShape.points) : [];
        
        return (
          <div key={shapeId}>
            {/* Route shape polyline */}
            <Polyline
              positions={positions}
              pathOptions={{
                color,
                weight: isHighlighted ? 6 : 4,
                opacity: isHighlighted ? 1.0 : 0.8,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    fontSize: '16px', 
                    marginBottom: '8px',
                    color 
                  }}>
                    Route Shape
                  </div>
                  
                  {associatedRoute && (
                    <>
                      <div style={{ marginBottom: '6px' }}>
                        <strong>Route:</strong> {associatedRoute.route_short_name} - {associatedRoute.route_long_name}
                      </div>
                      <div style={{ marginBottom: '6px' }}>
                        <strong>Type:</strong> {associatedRoute.route_desc || 'Transit'}
                      </div>
                    </>
                  )}
                  
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Shape ID:</strong> {shapeId}
                  </div>
                  
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Points:</strong> {routeShape.points.length}
                  </div>
                  
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Segments:</strong> {routeShape.segments.length}
                  </div>
                  
                  {routeShape.segments.length > 0 && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#666', 
                      marginTop: '8px',
                      borderTop: '1px solid #eee',
                      paddingTop: '4px'
                    }}>
                      Total Distance: {routeShape.segments.reduce((sum, seg) => sum + seg.distance, 0).toFixed(0)}m
                    </div>
                  )}
                </div>
              </Popup>
            </Polyline>
            
            {/* Direction arrows */}
            {showDirectionArrows && arrows.map((arrow, index) => (
              <Marker
                key={`${shapeId}-arrow-${index}`}
                position={[arrow.position.lat, arrow.position.lon]}
                icon={createDirectionArrow(color, arrow.bearing)}
                interactive={false} // Arrows shouldn't be clickable
              />
            ))}
          </div>
        );
      })}
    </>
  );
};