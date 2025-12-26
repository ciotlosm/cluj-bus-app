// StationVehicleList - Display vehicles serving routes that pass through a specific station
// Receives vehicle data as props for better performance and simpler architecture
// Includes performance optimizations with memoization to prevent unnecessary re-renders

import type { FC } from 'react';
import { memo, useState } from 'react';
import { 
  Card, CardContent, Typography, Chip, Stack, Box, Avatar, IconButton,
  Collapse, List, ListItem, ListItemText, Tooltip
} from '@mui/material';
import { 
  AccessibleForward as WheelchairIcon,
  DirectionsBike as BikeIcon, Speed as SpeedIcon, Schedule as TimeIcon,
  AccessTime as ArrivalIcon, ExpandMore as ExpandMoreIcon, Map as MapIcon,
  LocationOn as TargetStationIcon
} from '@mui/icons-material';
import { formatTimestamp, formatSpeed, getAccessibilityFeatures, formatArrivalTime } from '../../../utils/vehicle/vehicleFormatUtils';
import { sortStationVehiclesByArrival } from '../../../utils/station/stationVehicleUtils';
import { groupVehiclesForDisplay } from '../../../utils/station/vehicleGroupingUtils';
import { VEHICLE_DISPLAY } from '../../../utils/core/constants';
import { getTripStopSequence } from '../../../utils/arrival/tripUtils';
import { determineTargetStopRelation } from '../../../utils/arrival/arrivalUtils';
import { generateConfidenceDebugInfo, formatConfidenceDebugTooltip } from '../../../utils/debug/confidenceDebugUtils';
import { useTripStore } from '../../../stores/tripStore';
import { useStationStore } from '../../../stores/stationStore';
import { useVehicleStore } from '../../../stores/vehicleStore';
import { useRouteStore } from '../../../stores/routeStore';
import { VehicleMapDialog } from '../maps/VehicleMapDialog';
import type { StationVehicle } from '../../../types/stationFilter';

// VehicleDisplayState interface removed as it's not used in the current implementation
// The component uses direct state variables instead

interface StationVehicleListProps {
  vehicles: StationVehicle[];
  expanded: boolean;
  station: any; // The station these vehicles are being displayed for
  stationRouteCount?: number; // Number of routes serving this station
  selectedRouteId?: number | null; // NEW: route filter
}

export const StationVehicleList: FC<StationVehicleListProps> = memo(({ vehicles, expanded, station, stationRouteCount, selectedRouteId }) => {
  // State for expansion functionality
  const [showingAll, setShowingAll] = useState(false);
  
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

  // Apply route filtering before sorting and grouping
  const filteredVehicles = selectedRouteId 
    ? vehicles.filter(({ route }) => route?.route_id === selectedRouteId)
    : vehicles;

  // Handle empty state when route filter is active but no vehicles match
  if (selectedRouteId && filteredVehicles.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2, fontStyle: 'italic' }}>
        No active vehicles for this route
      </Typography>
    );
  }

  // Sort vehicles by arrival time using existing utility
  const sortedVehicles = sortStationVehiclesByArrival(filteredVehicles);

  // Skip grouping when route filter is active
  const shouldApplyGrouping = !selectedRouteId && 
                             (stationRouteCount || 1) > 1 && 
                             sortedVehicles.length > VEHICLE_DISPLAY.VEHICLE_DISPLAY_THRESHOLD;

  // Apply grouping logic if needed
  const groupingResult = shouldApplyGrouping 
    ? groupVehiclesForDisplay(sortedVehicles, {
        maxVehicles: VEHICLE_DISPLAY.VEHICLE_DISPLAY_THRESHOLD,
        routeCount: stationRouteCount || 1
      })
    : {
        displayed: sortedVehicles,
        hidden: [],
        groupingApplied: false
      };

  // Determine which vehicles to display based on expansion state
  const vehiclesToDisplay = showingAll 
    ? sortedVehicles 
    : groupingResult.displayed;

  const hiddenVehicleCount = showingAll ? 0 : groupingResult.hidden.length;

  return (
    <Stack spacing={2} sx={{ pt: 2
     }}>
      {vehiclesToDisplay.map(({ vehicle, route, trip, arrivalTime }) => (
        <VehicleCard 
          key={vehicle.id}
          vehicle={vehicle}
          route={route}
          trip={trip}
          arrivalTime={arrivalTime}
          station={station}
        />
      ))}
      
      {/* Show more/less button when grouping is applied */}
      {groupingResult.groupingApplied && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1, pb: 4 }}>
          <Chip
            label={showingAll 
              ? "Show less" 
              : `More ${hiddenVehicleCount} vehicle${hiddenVehicleCount !== 1 ? 's' : ''}`
            }
            onClick={() => setShowingAll(!showingAll)}
            variant="outlined"
            color="primary"
            sx={{ cursor: 'pointer' }}
          />
        </Box>
      )}
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
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  
  // Get real stop data from stores
  const { stopTimes, trips } = useTripStore();
  const { stops } = useStationStore();
  
  // Get all data needed for the map dialog
  const { vehicles } = useVehicleStore();
  const { routes } = useRouteStore();
  
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
    <Card 
      variant="vehicle"
      sx={{ 
        borderRadius: 2,
        boxShadow: 1
      }}
    >
      <CardContent sx={{ 
        p: { xs: 1.5, sm: 2 }, 
        '&:last-child': { pb: { xs: 1.5, sm: 2 } } 
      }}>
        {/* Header with route badge, headsign, and vehicle ID */}
        <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 1.5 }}>
          {/* Circular route badge - smaller on mobile */}
          <Avatar sx={{ 
            bgcolor: 'primary.main', 
            width: { xs: 40, sm: 48 }, 
            height: { xs: 40, sm: 48 },
            fontSize: { xs: '1rem', sm: '1.1rem' },
            fontWeight: 'bold',
            flexShrink: 0
          }}>
            {routeShortName}
          </Avatar>
          
          {/* Route name and vehicle info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '0.95rem', sm: '1.1rem' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1
                }}
              >
                {headsign}
              </Typography>
              
              {/* Vehicle ID chip - inline with headsign */}
            </Box>
          </Box>
          
          {/* Timestamp - compact */}
          <Box display="flex" alignItems="center" gap={0.5} sx={{ flexShrink: 0 }}>
            <TimeIcon fontSize="small" color="action" />
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                whiteSpace: 'nowrap'
              }}
            >
              {formatTimestamp(vehicle.timestamp)}
            </Typography>
          </Box>
        </Stack>

        {/* Vehicle details row - compact horizontal layout */}
        <Stack 
          direction="row" 
          alignItems="center" 
          spacing={{ xs: 1.5, sm: 2 }} 
          sx={{ mb: 1.5, flexWrap: 'wrap' }}
        >
              <Chip 
                label={`${vehicle.label}`} 
                size="small" 
                variant="outlined"
                sx={{ 
                  fontSize: '0.7rem',
                  height: { xs: 20, sm: 24 },
                  flexShrink: 0
                }}
              />
          {/* Speed */}
          <Box display="flex" alignItems="center" gap={0.5} sx={{ flexShrink: 0 }}>
            <SpeedIcon fontSize="small" color="action" />
            <Typography 
              variant="caption"
              sx={{ 
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                whiteSpace: 'nowrap'
              }}
            >
              {formatSpeed(vehicle.speed)}
            </Typography>
          </Box>
          
          {/* Accessibility information */}
          {getAccessibilityFeatures(vehicle.wheelchair_accessible, vehicle.bike_accessible).map(feature => (
            <Box key={feature.type} display="flex" alignItems="center" gap={0.25} sx={{ flexShrink: 0 }}>
              {feature.type === 'wheelchair' ? (
                <WheelchairIcon fontSize="small" color="primary" />
              ) : (
                <BikeIcon fontSize="small" color="primary" />
              )}
              <Typography 
                variant="caption" 
                color="primary"
                sx={{ 
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  whiteSpace: 'nowrap'
                }}
              >
                {feature.label}
              </Typography>
            </Box>
          ))}
        </Stack>

        {/* Arrival time information */}
        {arrivalTime && (
          <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
            {(() => {
              // Generate debug info for low confidence arrivals
              const debugInfo = arrivalTime?.confidence === 'low' 
                ? generateConfidenceDebugInfo({ vehicle, route, trip, arrivalTime }) 
                : null;
              
              const chip = (
                <Chip
                  icon={<ArrivalIcon />}
                  label={formatArrivalTime(arrivalTime)}
                  color={arrivalTime.statusMessage.includes('Departed') ? 'default' : 'success'}
                  variant="filled"
                  size="small"
                  sx={{ 
                    fontWeight: 'medium',
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    '& .MuiChip-icon': { color: 'inherit' },
                    cursor: debugInfo ? 'help' : 'default'
                  }}
                />
              );

              // Only show tooltip for low confidence arrivals (or all in development)
              const shouldShowTooltip = debugInfo || (process.env.NODE_ENV === 'development' && arrivalTime);
              
              if (shouldShowTooltip) {
                const tooltipContent = debugInfo 
                  ? formatConfidenceDebugTooltip(debugInfo)
                  : `Development Mode\nConfidence: ${arrivalTime?.confidence}\nStatus: ${arrivalTime?.statusMessage}`;
                
                return (
                  <Tooltip
                    title={tooltipContent}
                    placement="top"
                    arrow
                    slotProps={{
                      tooltip: {
                        sx: {
                          fontSize: '0.75rem',
                          maxWidth: 400,
                          whiteSpace: 'pre-line',
                          fontFamily: 'monospace',
                          backgroundColor: 'rgba(0, 0, 0, 0.9)'
                        }
                      }
                    }}
                  >
                    {chip}
                  </Tooltip>
                );
              }

              return chip;
            })()}
          </Box>
        )}



       

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
            
            <IconButton 
              size="small" 
              color="primary"
              onClick={() => setMapDialogOpen(true)}
            >
              <MapIcon />
            </IconButton>
          </Stack>

          <Collapse in={stopsExpanded} timeout="auto" unmountOnExit>
            <List dense sx={{ mt: 1 }}>
              {tripStops.length > 0 ? (
                tripStops.map((stop) => (
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
                      slotProps={{ 
                        primary: { 
                          variant: 'body2',
                          color: 'text.secondary',
                          fontStyle: 'italic'
                        }
                      }}
                    />
                  </ListItem>
              )}
            </List>
          </Collapse>
        </Box>
      </CardContent>
      
      {/* Vehicle Map Dialog */}
      <VehicleMapDialog
        open={mapDialogOpen}
        onClose={() => setMapDialogOpen(false)}
        vehicleId={vehicle.id}
        targetStationId={station?.stop_id || null}
        vehicles={vehicles}
        routes={routes}
        stations={stops}
        trips={trips}
        stopTimes={stopTimes}
      />
    </Card>
  );
});

// Display name for debugging
StationVehicleList.displayName = 'StationVehicleList';