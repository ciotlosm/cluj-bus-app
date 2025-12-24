// StationVehicleList - Display vehicles serving routes that pass through a specific station
// Receives vehicle data as props for better performance and simpler architecture
// Includes performance optimizations with memoization to prevent unnecessary re-renders

import type { FC } from 'react';
import { memo } from 'react';
import { 
  List, ListItem, ListItemText, Typography, Chip, Stack, Box,
  Divider
} from '@mui/material';
import { 
  DirectionsBus as BusIcon, AccessibleForward as WheelchairIcon,
  DirectionsBike as BikeIcon, Speed as SpeedIcon, Schedule as TimeIcon,
  AccessTime as ArrivalIcon
} from '@mui/icons-material';
import { formatTimestamp, formatSpeed, getAccessibilityFeatures, formatArrivalTime } from '../../../utils/vehicle/vehicleFormatUtils';
import { sortStationVehiclesByArrival } from '../../../utils/station/stationVehicleUtils';
import type { StationVehicle } from '../../../types/stationFilter';

interface StationVehicleListProps {
  vehicles: StationVehicle[];
  expanded: boolean;
  onVehicleClick?: (vehicleId: number) => void;
}

export const StationVehicleList: FC<StationVehicleListProps> = memo(({ vehicles, expanded, onVehicleClick }) => {
  // Don't render when collapsed (performance optimization)
  if (!expanded) return null;

  // Empty state - no vehicles found
  if (vehicles.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2, fontStyle: 'italic' }}>
        No active vehicles serving this station
      </Typography>
    );
  }

  // Sort vehicles by arrival time using existing utility
  const sortedVehicles = sortStationVehiclesByArrival(vehicles);

  return (
    <Box>
      <Divider sx={{ my: 1 }} />
      <Typography variant="caption" color="text.secondary" sx={{ px: 2, display: 'block' }}>
        Active Vehicles ({vehicles.length})
      </Typography>
      
      <List dense>
        {sortedVehicles.map(({ vehicle, route, trip, arrivalTime }) => (
          <ListItem 
            key={vehicle.id} 
            sx={{ py: 1 }}
            component="div"
            onClick={() => onVehicleClick?.(vehicle.id)}
            style={{ cursor: 'pointer' }}
          >
            <ListItemText
              primary={
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                  <BusIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2" component="span">{vehicle.label}</Typography>
                  
                  {/* Route information */}
                  {route ? (
                    <Chip label={route.route_short_name} size="small" color="primary" variant="outlined" />
                  ) : vehicle.route_id && (
                    <Chip label={`Route ${vehicle.route_id}`} size="small" color="default" variant="outlined" />
                  )}
                  
                  {/* Headsign information */}
                  {trip?.trip_headsign && (
                    <Typography variant="caption" color="text.secondary" component="span">
                      → {trip.trip_headsign}
                    </Typography>
                  )}
                </Stack>
              }
              secondary={
                <Stack spacing={0.5} sx={{ mt: 0.5 }} component="span">
                  {/* Arrival time information */}
                  {arrivalTime && (
                    <Box display="flex" alignItems="center" gap={0.5} component="span">
                      <ArrivalIcon fontSize="small" color="primary" />
                      <Typography 
                        variant="caption" 
                        component="span"
                        color="primary"
                        sx={{ fontWeight: 'medium' }}
                      >
                        {formatArrivalTime(arrivalTime)}
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Speed and timestamp */}
                  <Stack direction="row" alignItems="center" spacing={2} component="span">
                    <Box display="flex" alignItems="center" gap={0.5} component="span">
                      <SpeedIcon fontSize="small" color="action" />
                      <Typography variant="caption" component="span">{formatSpeed(vehicle.speed)}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5} component="span">
                      <TimeIcon fontSize="small" color="action" />
                      <Typography variant="caption" component="span">{formatTimestamp(vehicle.timestamp)}</Typography>
                    </Box>
                  </Stack>
                  
                  {/* Accessibility information */}
                  <Stack direction="row" alignItems="center" spacing={1} component="span">
                    {getAccessibilityFeatures(vehicle.wheelchair_accessible, vehicle.bike_accessible).map(feature => (
                      <Box key={feature.type} display="flex" alignItems="center" gap={0.25} component="span">
                        {feature.type === 'wheelchair' ? (
                          <WheelchairIcon fontSize="small" color="primary" />
                        ) : (
                          <BikeIcon fontSize="small" color="primary" />
                        )}
                        <Typography variant="caption" color="primary" component="span">
                          {feature.label}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              }
              secondaryTypographyProps={{ component: 'div' }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
});

// Display name for debugging
StationVehicleList.displayName = 'StationVehicleList';