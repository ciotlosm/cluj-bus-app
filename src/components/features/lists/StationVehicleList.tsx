// StationVehicleList - Display vehicles serving routes that pass through a specific station
// Receives vehicle data as props for better performance and simpler architecture
// Includes performance optimizations with memoization to prevent unnecessary re-renders

import type { FC } from 'react';
import { memo, useState } from 'react';
import { 
  Card, CardContent, Typography, Chip, Stack, Box, Avatar, IconButton,
  Collapse, List, ListItem, ListItemText
} from '@mui/material';
import { 
  AccessibleForward as WheelchairIcon,
  DirectionsBike as BikeIcon, Speed as SpeedIcon, Schedule as TimeIcon,
  AccessTime as ArrivalIcon, ExpandMore as ExpandMoreIcon, Map as MapIcon,
  LocationOn as TargetStationIcon
} from '@mui/icons-material';
import { formatTimestamp, formatSpeed, getAccessibilityFeatures, formatArrivalTime } from '../../../utils/vehicle/vehicleFormatUtils';
import { sortStationVehiclesByArrival } from '../../../utils/station/stationVehicleUtils';
import { getTripStopSequence } from '../../../utils/arrival/tripUtils';
import { determineTargetStopRelation } from '../../../utils/arrival/arrivalUtils';
import { useTripStore } from '../../../stores/tripStore';
import { useStationStore } from '../../../stores/stationStore';
import type { StationVehicle } from '../../../types/stationFilter';

interface StationVehicleListProps {
  vehicles: StationVehicle[];
  expanded: boolean;
  station: any; // The station these vehicles are being displayed for
}

export const StationVehicleList: FC<StationVehicleListProps> = memo(({ vehicles, expanded, station }) => {
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
    <Stack spacing={2} sx={{ p: 2 }}>
      {sortedVehicles.map(({ vehicle, route, trip, arrivalTime }) => (
        <VehicleCard 
          key={vehicle.id}
          vehicle={vehicle}
          route={route}
          trip={trip}
          arrivalTime={arrivalTime}
          station={station}
        />
      ))}
    </Stack>
  );
});

// Individual Vehicle Card Component
interface VehicleCardProps {
  vehicle: any;
  route: any;
  trip: any;
  arrivalTime?: any;
  station: any;
}

const VehicleCard: FC<VehicleCardProps> = memo(({ vehicle, route, trip, arrivalTime, station }) => {
  const [stopsExpanded, setStopsExpanded] = useState(false);
  
  // Get real stop data from stores
  const { stopTimes, trips } = useTripStore();
  const { stops } = useStationStore();
  
  // Get actual stops for this vehicle's trip
  const tripStopTimes = getTripStopSequence(vehicle, stopTimes);
  
  // Convert stop times to stop data with names and actual status using existing utility
  const tripStops = tripStopTimes.map((stopTime) => {
    const stopData = stops.find(stop => stop.stop_id === stopTime.stop_id);
    
    // Use existing utility to determine if this stop is passed, current, or upcoming
    const stopRelation = determineTargetStopRelation(vehicle, stopData || { stop_id: stopTime.stop_id } as any, trips, stopTimes, stops);
    
    // Convert the relation to our status format
    let status: 'passed' | 'current' | 'upcoming';
    if (stopRelation === 'passed') {
      status = 'passed';
    } else if (stopRelation === 'not_in_trip') {
      status = 'upcoming'; // Fallback
    } else {
      // For 'upcoming', we need to determine if it's the next stop (current) or future
      // Simple heuristic: if it's the first upcoming stop in sequence, mark as current
      const upcomingStops = tripStopTimes.filter(st => {
        const tempStopData = stops.find(s => s.stop_id === st.stop_id);
        if (!tempStopData) return false;
        const relation = determineTargetStopRelation(vehicle, tempStopData, trips, stopTimes, stops);
        return relation === 'upcoming';
      });
      status = upcomingStops[0]?.stop_id === stopTime.stop_id ? 'current' : 'upcoming';
    }
    
    return {
      name: stopData?.stop_name || `Stop ${stopTime.stop_id}`,
      stopId: stopTime.stop_id,
      sequence: stopTime.stop_sequence,
      status
    };
  });

  const routeShortName = route?.route_short_name || vehicle.route_id?.toString() || '?';
  const headsign = trip?.trip_headsign || 'Unknown Destination';

  return (
    <Card sx={{ 
      backgroundColor: 'background.paper',
      borderRadius: 2,
      boxShadow: 1
    }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header with route badge, headsign, and vehicle ID */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          {/* Circular route badge */}
          <Avatar sx={{ 
            bgcolor: 'primary.main', 
            width: 48, 
            height: 48,
            fontSize: '1.1rem',
            fontWeight: 'bold'
          }}>
            {routeShortName}
          </Avatar>
          
          {/* Route name and vehicle info */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              {headsign}
            </Typography>
            <Chip 
              label={`${vehicle.label}`} 
              size="small" 
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
            
          </Box>
          
          {/* Timestamp */}
          <Box display="flex" alignItems="center" gap={0.5}>
            <TimeIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {formatTimestamp(vehicle.timestamp)}
            </Typography>
          </Box>
        </Stack>

        {/* Arrival time information */}
        {arrivalTime && (
          <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
            <Chip
              icon={<ArrivalIcon />}
              label={formatArrivalTime(arrivalTime)}
              color="success"
              variant="filled"
              size="small"
              sx={{ 
                fontWeight: 'medium',
                '& .MuiChip-icon': { color: 'inherit' }
              }}
            />
          </Box>
        )}

        {/* Vehicle details */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <SpeedIcon fontSize="small" color="action" />
            <Typography variant="caption">
              {formatSpeed(vehicle.speed)}
            </Typography>
          </Box>
          
          {/* Accessibility information */}
          {getAccessibilityFeatures(vehicle.wheelchair_accessible, vehicle.bike_accessible).map(feature => (
            <Box key={feature.type} display="flex" alignItems="center" gap={0.25}>
              {feature.type === 'wheelchair' ? (
                <WheelchairIcon fontSize="small" color="primary" />
              ) : (
                <BikeIcon fontSize="small" color="primary" />
              )}
              <Typography variant="caption" color="primary">
                {feature.label}
              </Typography>
            </Box>
          ))}
        </Stack>

        {/* Stops section */}
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box 
              display="flex" 
              alignItems="center" 
              gap={1}
              sx={{ cursor: 'pointer' }}
              onClick={() => setStopsExpanded(!stopsExpanded)}
            >
              <IconButton 
                size="small"
                sx={{ 
                  transform: stopsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Stops ({tripStops.length})
              </Typography>
            </Box>
            
            <IconButton size="small" color="primary">
              <MapIcon />
            </IconButton>
          </Stack>

          <Collapse in={stopsExpanded} timeout="auto" unmountOnExit>
            <List dense sx={{ mt: 1 }}>
              {tripStops.length > 0 ? (
                tripStops.map((stop, index) => (
                  <ListItem key={stop.stopId} sx={{ py: 0.5, px: 0 }}>
                    <Box 
                      sx={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        bgcolor: stop.status === 'current' ? 'primary.main' : 
                                 stop.status === 'passed' ? 'success.main' : 'grey.400',
                        mr: 2,
                        mt: 0.5
                      }} 
                    />
                    <ListItemText 
                      primary={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography 
                            variant="body2"
                            color={stop.status === 'current' ? 'primary.main' : 'text.primary'}
                          >
                            {stop.name}
                          </Typography>
                          {stop.stopId === station?.stop_id && (
                            <TargetStationIcon 
                              fontSize="small" 
                              color="primary" 
                              sx={{ opacity: 0.7 }}
                            />
                          )}
                        </Stack>
                      }
                    />
                  </ListItem>
                ))
              ) : (
                <ListItem sx={{ py: 0.5, px: 0 }}>
                  <ListItemText 
                    primary="No stop data available"
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      color: 'text.secondary',
                      fontStyle: 'italic'
                    }}
                  />
                </ListItem>
              )}
            </List>
          </Collapse>
        </Box>
      </CardContent>
    </Card>
  );
});

// Display name for debugging
StationVehicleList.displayName = 'StationVehicleList';