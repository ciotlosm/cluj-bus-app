/**
 * StationLayer - Renders station markers with customizable symbols
 * Supports different symbol types (circle, user-location, terminus, nearby)
 * Implements station click handlers and comprehensive information display
 * Requirements: 1.3, 2.3, 3.1, 7.1, 7.2, 7.3, 7.4
 * Includes performance optimizations and clustering for high-density areas
 */

import type { FC } from 'react';
import { useMemo, useState, useCallback } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import { CircularProgress, Box } from '@mui/material';
import type { StationLayerProps } from '../../../types/interactiveMap';
import { StationSymbolType, DEFAULT_MAP_PERFORMANCE } from '../../../types/interactiveMap';
import { createStationIcon } from '../../../utils/maps/iconUtils';
import { getStationTypeName, getLocationTypeDescription } from '../../../utils/station/stationDisplayUtils';
import { useOptimizedStations, useDebouncedLoading } from '../../../utils/maps/performanceUtils';
import { ClusterMarker } from './ClusterMarker';

export const StationLayer: FC<StationLayerProps> = ({
  stations,
  stationTypes = new Map(),
  onStationClick,
  highlightedStationId,
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

  // Filter out stations with invalid coordinates
  const validStations = useMemo(() => {
    return stations.filter(station => {
      const hasValidCoords = station.stop_lat != null && station.stop_lon != null && 
                           !isNaN(station.stop_lat) && !isNaN(station.stop_lon);
      
      if (!hasValidCoords) {
        console.warn(`Station ${station.stop_id} has invalid coordinates:`, station.stop_lat, station.stop_lon);
      }
      
      return hasValidCoords;
    });
  }, [stations]);

  // Apply performance optimizations
  const { optimizedStations, clusters, shouldCluster } = useOptimizedStations(
    validStations,
    mapBounds,
    performanceConfig,
    zoomLevel
  );

  // Debounce loading state to prevent flicker
  const debouncedLoading = useDebouncedLoading(loading, 300);

  // Handle cluster click
  const handleClusterClick = useCallback((cluster) => {
    // Zoom to cluster bounds
    const bounds = cluster.points.map(point => [point.position.lat, point.position.lon]);
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map]);

  // Show loading indicator if data is loading
  if (debouncedLoading && optimizedStations.length === 0) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 40,
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
        <span style={{ fontSize: '12px' }}>Loading stations...</span>
      </Box>
    );
  }

  // Render clusters if clustering is enabled
  if (shouldCluster && clusters.length > 0) {
    return (
      <>
        {clusters.map(cluster => (
          <ClusterMarker
            key={cluster.id}
            cluster={cluster}
            onClick={handleClusterClick}
            color={colorScheme.stations.default}
          />
        ))}
      </>
    );
  }

  // Render individual station markers
  return (
    <>
      {optimizedStations.map(station => {
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
        const icon = createStationIcon({
          color,
          isSelected,
          symbolType: stationType,
          customSize
        });

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
                  <strong>Type:</strong> {getStationTypeName(stationType as any)}
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
                  <strong>Coordinates:</strong> {station.stop_lat?.toFixed(6) ?? 'N/A'}, {station.stop_lon?.toFixed(6) ?? 'N/A'}
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

                {/* Performance info for debugging */}
                {process.env.NODE_ENV === 'development' && (
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#999', 
                    marginTop: '4px',
                    borderTop: '1px solid #eee',
                    paddingTop: '2px'
                  }}>
                    Showing {optimizedStations.length} of {stations.length} stations
                    {shouldCluster && ` (${clusters.length} clusters)`}
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