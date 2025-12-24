// StationVehicleList - Display vehicles serving routes that pass through a specific station
// Receives vehicle data as props for better performance and simpler architecture
// Includes performance optimizations with memoization to prevent unnecessary re-renders

import type { FC } from 'react';
import { memo, useState, useMemo } from 'react';
import { 
  List, ListItem, ListItemText, Typography, Chip, Stack, Box,
  Divider, Button, Switch, FormControlLabel
} from '@mui/material';
import { 
  DirectionsBus as BusIcon, AccessibleForward as WheelchairIcon,
  DirectionsBike as BikeIcon, Speed as SpeedIcon, Schedule as TimeIcon,
  AccessTime as ArrivalIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { formatTimestamp, formatSpeed, getAccessibilityFeatures, formatArrivalTime } from '../../../utils/vehicle/vehicleFormatUtils';
import { sortStationVehiclesByArrival } from '../../../utils/station/stationVehicleUtils';
import { groupVehiclesForDisplay } from '../../../utils/station/vehicleGroupingUtils';
import { VEHICLE_DISPLAY } from '../../../utils/core/constants';
import type { StationVehicle } from '../../../types/stationFilter';

interface StationVehicleListProps {
  vehicles: StationVehicle[];
  expanded: boolean;
  onVehicleClick?: (vehicleId: number) => void;
  stationRouteCount?: number;
}

/**
 * Local state interface for vehicle display optimization
 */
interface VehicleDisplayState {
  isGrouped: boolean;
  showingAll: boolean;
  showOffRouteVehicles: boolean; // Local state, resets on view change
  displayedVehicles: StationVehicle[];
  hiddenVehicleCount: number;
}

export const StationVehicleList: FC<StationVehicleListProps> = memo(({ vehicles, expanded, onVehicleClick, stationRouteCount = 1 }) => {
  // Don't render when collapsed (performance optimization) - MUST be before any hooks
  if (!expanded) return null;

  // Local state for display optimization
  const [showingAll, setShowingAll] = useState(false);
  const [showOffRouteVehicles, setShowOffRouteVehicles] = useState(false);

  // Empty state - no vehicles found
  if (vehicles.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2, fontStyle: 'italic' }}>
        No active vehicles serving this station
      </Typography>
    );
  }

  // Calculate display state using grouping logic
  const displayState: VehicleDisplayState = useMemo(() => {
    const groupingResult = groupVehiclesForDisplay(vehicles, {
      maxVehicles: VEHICLE_DISPLAY.VEHICLE_DISPLAY_THRESHOLD,
      includeOffRoute: showOffRouteVehicles,
      routeCount: stationRouteCount
    });

    const isGrouped = groupingResult.groupingApplied;
    const displayedVehicles = showingAll ? 
      (showOffRouteVehicles ? vehicles : vehicles.filter(v => (v.arrivalTime?.status ?? 'off_route') !== 'off_route')) :
      groupingResult.displayed;
    
    return {
      isGrouped,
      showingAll,
      showOffRouteVehicles,
      displayedVehicles,
      hiddenVehicleCount: groupingResult.hidden.length // Always use the original hidden count, not 0 when showingAll
    };
  }, [vehicles, showingAll, showOffRouteVehicles, stationRouteCount]);

  // Sort vehicles by arrival time using existing utility
  const sortedVehicles = sortStationVehiclesByArrival(displayState.displayedVehicles);

  return (
    <Box>
      <Divider sx={{ my: 1 }} />
      
      {/* Header with vehicle count and off-route toggle */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Active Vehicles ({displayState.displayedVehicles.length}
          {displayState.hiddenVehicleCount > 0 && ` of ${vehicles.length}`})
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={showOffRouteVehicles}
              onChange={(e) => setShowOffRouteVehicles(e.target.checked)}
            />
          }
          label={
            <Typography variant="caption" color="text.secondary">
              Off-route
            </Typography>
          }
          sx={{ m: 0 }}
        />
      </Stack>
      
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
              slotProps={{ 
                secondary: { component: 'div' }
              }}
            />
          </ListItem>
        ))}
      </List>
      
      {/* Show more/less button when grouping is applied */}
      {((displayState.isGrouped && (displayState.hiddenVehicleCount > 0 || showingAll)) || 
        (vehicles.length > displayState.displayedVehicles.length)) && (
        <Box sx={{ px: 2, pb: 2 }}> {/* Increased bottom padding from 1 to 2 */}
          <Button
            size="small"
            variant="text"
            startIcon={showingAll ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowingAll(!showingAll)}
            sx={{ textTransform: 'none' }}
          >
            {showingAll 
              ? 'Show less' 
              : `Show ${displayState.hiddenVehicleCount} more vehicle${displayState.hiddenVehicleCount > 1 ? 's' : ''}`
            }
          </Button>
        </Box>
      )}
    </Box>
  );
});

// Display name for debugging
StationVehicleList.displayName = 'StationVehicleList';