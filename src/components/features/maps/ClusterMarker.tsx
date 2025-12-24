/**
 * ClusterMarker - Marker component for clustered map points
 * Displays multiple vehicles or stations as a single clustered marker
 * Improves performance in high-density areas
 */

import type { FC } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Box, Typography, List, ListItem, ListItemText, Chip } from '@mui/material';
import type { Cluster } from '../../../utils/maps/performanceUtils';
import type { TranzyVehicleResponse, TranzyStopResponse } from '../../../types/rawTranzyApi';
import { createClusterIcon } from '../../../utils/maps/iconUtils';

interface ClusterMarkerProps {
  cluster: Cluster;
  onClick?: (cluster: Cluster) => void;
  color?: string;
}

export const ClusterMarker: FC<ClusterMarkerProps> = ({
  cluster,
  onClick,
  color = '#2196F3',
}) => {
  const icon = createClusterIcon({ 
    count: cluster.size, 
    color,
    size: Math.min(60, 30 + cluster.size * 2) // Scale size with cluster size
  });

  // Determine if cluster contains vehicles or stations
  const firstPoint = cluster.points[0];
  const isVehicleCluster = 'latitude' in firstPoint.data;
  const clusterType = isVehicleCluster ? 'vehicles' : 'stations';

  return (
    <Marker
      position={[cluster.center.lat, cluster.center.lon]}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(cluster),
      }}
    >
      <Popup maxWidth={400}>
        <Box sx={{ minWidth: 300, maxHeight: 400, overflow: 'auto' }}>
          {/* Cluster header */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 2,
            pb: 1,
            borderBottom: '1px solid #eee'
          }}>
            <Typography variant="h6" sx={{ color }}>
              {cluster.size} {clusterType}
            </Typography>
            <Chip 
              label={`Cluster ${cluster.id.split('-')[1]}`}
              size="small"
              variant="outlined"
            />
          </Box>

          {/* Cluster items list */}
          <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
            {cluster.points.map((point, index) => {
              if (isVehicleCluster) {
                const vehicle = point.data as TranzyVehicleResponse;
                return (
                  <ListItem key={point.id} divider={index < cluster.points.length - 1}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            Vehicle {vehicle.label}
                          </Typography>
                          {vehicle.speed !== undefined && (
                            <Chip 
                              label={`${vehicle.speed} km/h`}
                              size="small"
                              color={vehicle.speed === 0 ? 'default' : 'primary'}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          {vehicle.route_id && (
                            <Typography variant="caption" display="block">
                              Route: {vehicle.route_id}
                            </Typography>
                          )}
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {vehicle.latitude?.toFixed(4)}, {vehicle.longitude?.toFixed(4)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                );
              } else {
                const station = point.data as TranzyStopResponse;
                return (
                  <ListItem key={point.id} divider={index < cluster.points.length - 1}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {station.stop_name}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            ID: {station.stop_id}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {station.stop_lat?.toFixed(4)}, {station.stop_lon?.toFixed(4)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                );
              }
            })}
          </List>

          {/* Cluster summary */}
          <Box sx={{ 
            mt: 2, 
            pt: 1, 
            borderTop: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Center: {cluster.center.lat.toFixed(4)}, {cluster.center.lon.toFixed(4)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Zoom in to see individual items
            </Typography>
          </Box>
        </Box>
      </Popup>
    </Marker>
  );
};