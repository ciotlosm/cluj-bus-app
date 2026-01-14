// StationVehicleList - Display vehicles serving routes that pass through a specific station
// Receives vehicle data as props for better performance and simpler architecture
// Includes performance optimizations with memoization to prevent unnecessary re-renders

import type { FC } from 'react';
import { memo, useState, useMemo } from 'react';
import { 
  Card, CardContent, Typography, Chip, Stack, Box, Avatar, IconButton,
  Collapse, List, ListItem, ListItemText, Tooltip
} from '@mui/material';
import { 
  AccessibleForward as WheelchairIcon,
  DirectionsBike as BikeIcon, Speed as SpeedIcon, Schedule as TimeIcon,
  AccessTime as ArrivalIcon, ExpandMore as ExpandMoreIcon, Map as MapIcon,
  LocationOn as TargetStationIcon, Favorite as FavoriteIcon
} from '@mui/icons-material';
import { formatTimestamp, formatSpeed, getAccessibilityFeatures, formatArrivalTime } from '../../../utils/vehicle/vehicleFormatUtils';
import { formatAbsoluteTime, formatRelativeTime } from '../../../utils/time/timestampFormatUtils';
import { sortStationVehiclesByArrival } from '../../../utils/station/stationVehicleUtils';
import { groupVehiclesForDisplay } from '../../../utils/station/vehicleGroupingUtils';
import { VEHICLE_DISPLAY } from '../../../utils/core/constants';
import { getTripStopSequence } from '../../../utils/arrival/tripUtils';
import { determineTargetStopRelation } from '../../../utils/arrival/arrivalUtils';
import { generateConfidenceDebugInfo, formatConfidenceDebugTooltip } from '../../../utils/debug/confidenceDebugUtils';
import { useTripStore } from '../../../stores/tripStore';
import { useStopTimeStore } from '../../../stores/stopTimeStore';
import { useStationStore } from '../../../stores/stationStore';
import { useVehicleStore } from '../../../stores/vehicleStore';
import { useRouteStore } from '../../../stores/routeStore';
import { VehicleMapDialog } from '../maps/VehicleMapDialog';
import type { StationVehicle } from '../../../types/stationFilter';
import { useFavoritesStore } from '../../../stores/favoritesStore';

// VehicleDisplayState interface removed as it's not used in the current implementation
// The component uses direct state variables instead

interface StationVehicleListProps {
  vehicles: StationVehicle[];
  expanded: boolean;
  station: any; // The station these vehicles are being displayed for
  stationRouteCount?: number; // Number of routes serving this station
  selectedRouteId?: number | null; // NEW: route filter
  vehicleRefreshTimestamp?: number | null; // Timestamp when vehicle data was last refreshed
}

export const StationVehicleList: FC<StationVehicleListProps> = memo(({ vehicles, expanded, station, stationRouteCount, selectedRouteId, vehicleRefreshTimestamp }) => {
  // State for expansion functionality
  const [showingAll, setShowingAll] = useState(false);
  
  // Apply route filtering with departed vehicle limiting (must be before any returns)
  const filteredVehicles = useMemo(() => {
    if (!selectedRouteId) {
      return vehicles;
    }

    // Filter vehicles by selected route
    const routeVehicles = vehicles.filter(({ route }) => route?.route_id === selectedRouteId);
    
    // Group vehicles by trip_id and status
    const vehiclesByTrip = new Map<string, StationVehicle[]>();
    const nonDepartedVehicles: StationVehicle[] = [];
    
    for (const vehicle of routeVehicles) {
      const isDeparted = vehicle.arrivalTime?.statusMessage?.includes('Departed') || false;
      
      if (!isDeparted) {
        // Non-departed vehicles: include all
        nonDepartedVehicles.push(vehicle);
      } else if (vehicle.trip && vehicle.trip.trip_id) {
        // Departed vehicles: group by trip_id
        const tripId = vehicle.trip.trip_id;
        if (!vehiclesByTrip.has(tripId)) {
          vehiclesByTrip.set(tripId, []);
        }
        vehiclesByTrip.get(tripId)!.push(vehicle);
      }
    }
    
    // For departed vehicles, take only 1 per trip (the first one after sorting by arrival time)
    const departedVehicles: StationVehicle[] = [];
    for (const tripVehicles of vehiclesByTrip.values()) {
      // Sort by arrival time and take the first (most relevant) one
      const sortedTripVehicles = sortStationVehiclesByArrival(tripVehicles);
      if (sortedTripVehicles.length > 0) {
        departedVehicles.push(sortedTripVehicles[0]);
      }
    }
    
    // Combine non-departed and limited departed vehicles
    return [...nonDepartedVehicles, ...departedVehicles];
  }, [vehicles, selectedRouteId]);
  
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
          vehicleRefreshTimestamp={vehicleRefreshTimestamp}
          allStationVehicles={vehicles}
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
  vehicleRefreshTimestamp?: number | null;
  allStationVehicles: StationVehicle[]; // Keep this for the map dialog
}

const VehicleCard: FC<VehicleCardProps> = memo(({ vehicle, route, trip, arrivalTime, station, vehicleRefreshTimestamp, allStationVehicles }) => {
  const [stopsExpanded, setStopsExpanded] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  
  // Check if this vehicle's route is a favorite
  const { isFavorite } = useFavoritesStore();
  const isRouteFavorite = route && isFavorite(String(route.route_id));
  
  // Get real stop data from stores
  const { stopTimes } = useStopTimeStore();
  const { trips } = useTripStore();
  const { stops } = useStationStore();
  
  // Get all data needed for the map dialog
  const { vehicles: allVehicles } = useVehicleStore();
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
            <Box sx={{ textAlign: 'right' }}>
              <Tooltip 
                title={vehicleRefreshTimestamp ? `Fetched ${formatRelativeTime(vehicleRefreshTimestamp)}` : ''}
                arrow
              >
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ 
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    whiteSpace: 'nowrap',
                    display: 'block',
                    cursor: vehicleRefreshTimestamp ? 'help' : 'default'
                  }}
                >
                  {formatTimestamp(vehicle.timestamp)}
                </Typography>
              </Tooltip>
            </Box>
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
          
          {/* Favorite route indicator */}
          {isRouteFavorite && (
            <Box display="flex" alignItems="center" sx={{ flexShrink: 0 }}>
              <FavoriteIcon 
                fontSize="small" 
                sx={{ 
                  color: 'error.main',
                  fontSize: { xs: '0.8rem', sm: '0.9rem' }
                }} 
              />
            </Box>
          )}
        </Stack>

        {/* Arrival time information */}
        {arrivalTime && (
          <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
            {(() => {
              // Generate enhanced debug info for all arrivals to help troubleshoot 15-second updates
              const enhancedDebugInfo = {
                // Basic arrival info
                confidence: arrivalTime?.confidence || 'unknown',
                status: arrivalTime?.statusMessage || 'unknown',
                arrivalText: formatArrivalTime(arrivalTime),
                
                // Timing details for troubleshooting
                vehicleTimestamp: vehicle.timestamp,
                vehicleAge: vehicle.timestamp ? `${Math.round((Date.now() - new Date(vehicle.timestamp).getTime()) / 1000)}s ago` : 'unknown',
                currentTime: new Date().toLocaleTimeString(),
                
                // Vehicle position details
                vehicleId: vehicle.label || vehicle.id, // Use label first (user-facing number), fallback to ID
                vehicleSpeed: vehicle.speed ? `${Number(vehicle.speed).toFixed(2)} km/h` : 'stopped',
                vehiclePosition: `${vehicle.latitude?.toFixed(6)}, ${vehicle.longitude?.toFixed(6)}`,
                
                // Prediction calculation details
                method: arrivalTime?.calculationMethod || 'unknown',
                estimatedArrival: arrivalTime?.estimatedMinutes !== undefined 
                  ? new Date(Date.now() + (arrivalTime.estimatedMinutes * 60 * 1000)).toLocaleTimeString()
                  : 'unknown',
                estimatedMinutes: arrivalTime?.estimatedMinutes !== undefined 
                  ? `${arrivalTime.estimatedMinutes} min`
                  : 'unknown',
                
                // Store refresh info
                lastRefresh: vehicleRefreshTimestamp ? new Date(vehicleRefreshTimestamp).toLocaleTimeString() : 'unknown'
              };
              
              // Generate debug info for low confidence arrivals (existing functionality)
              const lowConfidenceDebugInfo = arrivalTime?.confidence === 'low' 
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
                    cursor: 'help' // Always show cursor since we always have tooltip now
                  }}
                />
              );

              // Always show enhanced tooltip for troubleshooting 15-second updates
              const shouldShowTooltip = true;
              
              if (shouldShowTooltip) {
                // Create simplified tooltip content
                let tooltipContent = '';
                
                // Essential vehicle info
                tooltipContent += `🚌 Vehicle ${enhancedDebugInfo.vehicleId}\n`;
                tooltipContent += `📍 ${enhancedDebugInfo.vehiclePosition}\n`;
                tooltipContent += `⚡ ${enhancedDebugInfo.vehicleSpeed}`;
                
                // Show API speed if different from predicted speed
                if (vehicle.apiSpeed !== vehicle.speed) {
                  tooltipContent += ` (API: ${Number(vehicle.apiSpeed).toFixed(2)} km/h)`;
                }
                tooltipContent += `\n⏰ ${enhancedDebugInfo.arrivalText}\n\n`;
                
                // Vehicle data age
                tooltipContent += `📡 Vehicle Data: ${enhancedDebugInfo.vehicleAge}\n`;
                tooltipContent += `🎯 Precise ETA: ${enhancedDebugInfo.estimatedMinutes}\n\n`;
                
                // Position prediction info (compact format)
                if (vehicle.predictionMetadata?.positionMethod && vehicle.predictionMetadata?.positionApplied) {
                  const positionConfidence = vehicle.predictionMetadata.timestampAge < 60000 ? 'high' : 
                                            vehicle.predictionMetadata.timestampAge < 120000 ? 'medium' : 'low';
                  tooltipContent += `📍 Position: ${vehicle.predictionMetadata.positionMethod} (${positionConfidence})\n`;
                }
                
                // Speed prediction info
                if (vehicle.predictionMetadata?.speedMethod) {
                  tooltipContent += `🏃 Speed: ${vehicle.predictionMetadata.speedMethod} (${vehicle.predictionMetadata.speedConfidence})\n`;
                }
                
                // Add low confidence debug info if available
                if (lowConfidenceDebugInfo) {
                  tooltipContent += `\n--- Low Confidence Details ---\n`;
                  tooltipContent += formatConfidenceDebugTooltip(lowConfidenceDebugInfo);
                }
                
                return (
                  <Tooltip
                    title={tooltipContent}
                    placement="top"
                    arrow
                    slotProps={{
                      tooltip: {
                        sx: {
                          fontSize: '0.7rem',
                          maxWidth: 500,
                          whiteSpace: 'pre-line',
                          fontFamily: 'monospace',
                          backgroundColor: 'rgba(0, 0, 0, 0.95)',
                          lineHeight: 1.3
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
        vehicles={allStationVehicles}
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