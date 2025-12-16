import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  alpha,
  useTheme,
} from '@mui/material';
import { 
  ExpandMore, 
  ExpandLess, 
  DirectionsBus, 
  FlagOutlined,
  Map as MapIcon,
  LocationOn,
  PersonPin
} from '@mui/icons-material';
import { formatTime24 } from '../../../utils/timeFormat';
import type { EnhancedVehicleInfo } from '../../../types';

interface EnhancedVehicleInfoWithDirection extends EnhancedVehicleInfo {
  _internalDirection?: 'arriving' | 'departing' | 'unknown';
  stopSequence?: Array<{
    stopId: string;
    stopName: string;
    sequence: number;
    isCurrent: boolean;
    isDestination: boolean;
  }>;
}

interface VehicleCardProps {
  vehicle: EnhancedVehicleInfoWithDirection;
  stationId?: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onShowMap: () => void;
  onRouteClick?: () => void;
  showShortStopList?: boolean; // Show short stop list always visible in card
  showFullStopsButton?: boolean; // Show "Show stops" button for full expandable list
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  stationId,
  isExpanded,
  onToggleExpanded,
  onShowMap,
  onRouteClick,
  showShortStopList = false,
  showFullStopsButton = true
}) => {
  const theme = useTheme();

  // Determine which stops to show based on showShortStopList
  const stopsToShow = React.useMemo(() => {
    if (!vehicle.stopSequence || !showShortStopList) {
      return vehicle.stopSequence || [];
    }

    // For short list in Routes view, show: current vehicle station and closest station (target)
    // Destination is now shown in the title, so we don't need it in the stop list
    const allStops = vehicle.stopSequence;
    const currentStop = allStops.find(stop => stop.isCurrent);
    const targetStop = allStops.find(stop => stop.stopId === stationId); // The station from the group header

    // Get the stops we want to show (excluding destination since it's in the title)
    const stopsToInclude = [];
    if (currentStop) stopsToInclude.push(currentStop);
    if (targetStop && targetStop.stopId !== currentStop?.stopId) stopsToInclude.push(targetStop);

    // Sort by sequence to maintain route order
    return stopsToInclude.sort((a, b) => a.sequence - b.sequence);
  }, [vehicle.stopSequence, showShortStopList, stationId]);

  const isDeparted = vehicle._internalDirection === 'departing';

  return (
    <Card
      sx={{
        position: 'relative',
        bgcolor: isDeparted 
          ? alpha(theme.palette.background.paper, 0.3)
          : theme.palette.background.paper,
        backdropFilter: 'blur(16px)',
        border: `1px solid ${alpha(theme.palette.divider, isDeparted ? 0.3 : 0.5)}`,
        transition: 'all 0.2s ease-in-out',
        opacity: isDeparted ? 0.7 : 1,
        boxShadow: theme.shadows[1],
        '&:hover': {
          bgcolor: isDeparted 
            ? alpha(theme.palette.background.paper, 0.5)
            : alpha(theme.palette.background.paper, 0.9),
          border: `1px solid ${alpha(theme.palette.divider, isDeparted ? 0.5 : 0.7)}`,
          boxShadow: theme.shadows[2],
        },
        // Add overlay for departed vehicles
        '&::before': isDeparted ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: alpha(theme.palette.action.disabled, 0.2),
          borderRadius: 'inherit',
          pointerEvents: 'none',
          zIndex: 1,
        } : {},
      }}
    >
      <CardContent sx={{ 
        py: { xs: 1.5, sm: 2 }, 
        px: { xs: 1.5, sm: 2 },
        position: 'relative', 
        zIndex: 2,
        '&:last-child': {
          pb: { xs: 1.5, sm: 2 }
        }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, width: '100%' }}>
          <Box 
            onClick={onRouteClick}
            sx={{
              minWidth: 48,
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: isDeparted ? alpha(theme.palette.primary.main, 0.4) : 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: onRouteClick ? 'pointer' : 'default',
              transition: 'all 0.2s ease-in-out',
              flexShrink: 0,
              ...(onRouteClick && {
                '&:hover': {
                  bgcolor: isDeparted ? alpha(theme.palette.primary.main, 0.5) : 'primary.dark',
                  transform: 'scale(1.05)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                }
              })
            }}
          >
            <Typography variant="h6" sx={{ 
              color: isDeparted 
                ? alpha(theme.palette.primary.contrastText, 0.7) 
                : theme.palette.primary.contrastText, 
              fontWeight: 'bold',
              fontSize: '1rem'
            }}>
              {vehicle.route}
            </Typography>
          </Box>
          
          <Box sx={{ 
            flexGrow: 1, 
            minWidth: 0, // Allow shrinking below content size
            overflow: 'hidden' // Prevent overflow
          }}>
            <Typography variant="body1" sx={{ 
              color: isDeparted 
                ? alpha(theme.palette.text.primary, 0.6) 
                : theme.palette.text.primary, 
              fontWeight: 600,
              fontSize: { xs: '0.9rem', sm: '1rem' },
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {vehicle.destination || 'Unknown destination'}
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' }, 
              gap: { xs: 0.5, sm: 1 }, 
              mt: 0.5,
              width: '100%'
            }}>
              <Typography variant="body2" sx={{ 
                color: isDeparted 
                  ? alpha(theme.palette.text.secondary, 0.6) 
                  : theme.palette.text.secondary,
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flexShrink: 1
              }}>
                Vehicle: {vehicle.vehicle?.label || vehicle.vehicle?.id || 'Unknown'}
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 0.5, sm: 1 },
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexWrap: 'wrap'
              }}>
                {vehicle._internalDirection !== 'unknown' && (
                  <Chip
                    label={
                      vehicle._internalDirection === 'arriving' 
                        ? vehicle.minutesAway === 0 
                          ? 'At station'
                          : vehicle.minutesAway === 1 
                            ? 'Arriving next'
                            : `Arriving in ${vehicle.minutesAway}min`
                        : `Already left`
                    }
                    size="small"
                    sx={{
                      bgcolor: vehicle._internalDirection === 'arriving' 
                        ? vehicle.minutesAway === 0
                          ? alpha(theme.palette.warning.main, 0.1) // Warning color for "At station"
                          : alpha(theme.palette.success.main, 0.1) // Success color for "Arriving"
                        : alpha(theme.palette.error.main, 0.1), // Error color for "Already left"
                      color: vehicle._internalDirection === 'arriving' 
                        ? vehicle.minutesAway === 0
                          ? isDeparted 
                            ? alpha(theme.palette.warning.main, 0.6)
                            : theme.palette.warning.main
                          : isDeparted 
                            ? alpha(theme.palette.success.main, 0.6)
                            : theme.palette.success.main
                        : isDeparted 
                          ? alpha(theme.palette.error.main, 0.6)
                          : theme.palette.error.main,
                      border: vehicle._internalDirection === 'arriving' 
                        ? vehicle.minutesAway === 0
                          ? `1px solid ${alpha(theme.palette.warning.main, isDeparted ? 0.2 : 0.3)}`
                          : `1px solid ${alpha(theme.palette.success.main, isDeparted ? 0.2 : 0.3)}`
                        : `1px solid ${alpha(theme.palette.error.main, isDeparted ? 0.2 : 0.3)}`,
                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      height: { xs: 18, sm: 20 },
                      opacity: isDeparted ? 0.7 : 1,
                      flexShrink: 0,
                    }}
                  />
                )}
              </Box>
            </Box>
            
            {/* Short stop list (always visible for favorite routes) */}
            {showShortStopList && stopsToShow.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ color: 'grey.500', mb: 0.5, display: 'block' }}>
                  Next stops:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {stopsToShow.map((stop, index) => (
                    <Box
                      key={`${vehicle.id}-short-stop-${stop.stopId}-${stop.sequence}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: stop.isCurrent
                          ? alpha(theme.palette.primary.main, 0.1)
                          : stop.stopId === stationId
                          ? alpha(theme.palette.info.main, 0.1)
                          : alpha(theme.palette.action.hover, 0.5),
                        border: stop.isCurrent
                          ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                          : stop.stopId === stationId
                          ? `1px solid ${alpha(theme.palette.info.main, 0.3)}`
                          : `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                      }}
                    >
                      {/* Icon circle */}
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          flexShrink: 0,
                        }}
                      >
                        {stop.isCurrent ? (
                          <DirectionsBus 
                            sx={{ 
                              fontSize: 10, 
                              color: theme.palette.primary.main
                            }} 
                          />
                        ) : stop.stopId === stationId ? (
                          <LocationOn 
                            sx={{ 
                              fontSize: 10, 
                              color: theme.palette.info.main
                            }} 
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              bgcolor: theme.palette.text.disabled,
                            }}
                          />
                        )}
                      </Box>
                      
                      {/* Stop name */}
                      <Typography 
                        variant="caption" 
                        sx={{
                          fontSize: '0.7rem',
                          fontWeight: stop.isCurrent ? 600 : 400,
                          color: stop.isCurrent 
                            ? theme.palette.primary.main 
                            : stop.stopId === stationId
                            ? theme.palette.info.main
                            : theme.palette.text.secondary,
                          lineHeight: 1,
                        }}
                      >
                        {stop.stopName}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Expandable stops toggle and map button */}
            {vehicle.stopSequence && vehicle.stopSequence.length > 0 && (
              <Box sx={{ 
                mt: 1, 
                display: 'flex', 
                gap: 1,
                width: '100%',
                alignItems: 'stretch', // Make buttons same height
                mx: 0, // Ensure no horizontal margin
                px: 0  // Ensure no horizontal padding
              }}>
                {/* Stops toggle button (only show if showFullStopsButton is true) */}
                {showFullStopsButton && (
                  <Box
                    onClick={onToggleExpanded}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      py: 0.5,
                      px: 1,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.action.hover, 0.5),
                      flex: 1, // Take up all available space on the left
                      minWidth: 0, // Allow shrinking
                      maxWidth: 'calc(100% - 52px)', // Reserve space for map button (44px + 8px gap)
                      '&:hover': {
                        bgcolor: alpha(theme.palette.action.hover, 0.7),
                      },
                      '&:active': {
                        bgcolor: alpha(theme.palette.action.hover, 0.9),
                      }
                    }}
                  >
                    <Box sx={{ mr: 1, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      {isExpanded ? (
                        <ExpandLess fontSize="small" />
                      ) : (
                        <ExpandMore fontSize="small" />
                      )}
                    </Box>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ 
                        fontSize: { xs: '0.65rem', sm: '0.7rem' }, // Smaller font for mobile
                        flexGrow: 1,
                        whiteSpace: 'nowrap', // Prevent text wrapping
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      Stops ({vehicle.stopSequence.length})
                    </Typography>
                  </Box>
                )}
                
                {/* Map button */}
                <Box
                  onClick={onShowMap}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    py: 0.5,
                    px: { xs: 1.5, sm: 1 },
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                    flexShrink: 0, // Don't shrink the map button
                    minWidth: { xs: 44, sm: 36 },
                    ...(showFullStopsButton ? {} : { 
                      flex: 1, 
                      justifyContent: 'center',
                      minWidth: 'auto'
                    }),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.2),
                    },
                    '&:active': {
                      bgcolor: alpha(theme.palette.primary.main, 0.3),
                    }
                  }}
                >
                  <MapIcon 
                    fontSize="small" 
                    sx={{ 
                      color: theme.palette.primary.main,
                      fontSize: { xs: '1rem', sm: '1.25rem' }
                    }} 
                  />
                  {!showFullStopsButton && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        ml: 1, 
                        color: theme.palette.primary.main,
                        fontSize: { xs: '0.7rem', sm: '0.75rem' }
                      }}
                    >
                      View on map
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>

          <Box sx={{ 
            textAlign: 'right',
            flexShrink: 0,
            minWidth: { xs: 40, sm: 60 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
          }}>
            <Typography variant="body2" sx={{ 
              color: isDeparted 
                ? alpha(theme.palette.success.main, 0.5) 
                : theme.palette.success.main, 
              fontWeight: 600,
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
              lineHeight: 1
            }}>
              Live
            </Typography>
            <Typography variant="caption" sx={{ 
              color: isDeparted 
                ? alpha(theme.palette.text.secondary, 0.6) 
                : theme.palette.text.secondary,
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}>
              {formatTime24(
                vehicle.vehicle?.timestamp instanceof Date 
                  ? vehicle.vehicle.timestamp 
                  : vehicle.vehicle?.timestamp 
                    ? new Date(vehicle.vehicle.timestamp)
                    : new Date()
              )}
            </Typography>
          </Box>
        </Box>
      </CardContent>
      
      {/* Collapsible stops list (always shows full route) */}
      <Collapse in={isExpanded}>
        <Box sx={{ px: 2, pb: 2 }}>

          <List dense sx={{ py: 0 }}>
            {(vehicle.stopSequence || []).map((stop) => (
              <ListItem
                key={`${vehicle.id}-stop-${stop.stopId}-${stop.sequence}`}
                sx={{
                  py: 0.5,
                  px: 1,
                  borderRadius: 1,
                  bgcolor: stop.isCurrent
                    ? alpha(theme.palette.primary.main, 0.1)
                    : stop.stopId === stationId
                    ? alpha(theme.palette.info.main, 0.1)
                    : 'transparent',
                  border: stop.isCurrent
                    ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                    : stop.stopId === stationId
                    ? `1px solid ${alpha(theme.palette.info.main, 0.3)}`
                    : '1px solid transparent',
                  mb: 0.5,
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    {stop.isCurrent ? (
                      <DirectionsBus 
                        sx={{ 
                          fontSize: 14, 
                          color: theme.palette.primary.main
                        }} 
                      />
                    ) : stop.stopId === stationId ? (
                      <PersonPin 
                        sx={{ 
                          fontSize: 14, 
                          color: theme.palette.info.main
                        }} 
                      />
                    ) : stop.isDestination ? (
                      <FlagOutlined 
                        sx={{ 
                          fontSize: 14, 
                          color: theme.palette.success.main
                        }} 
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: theme.palette.text.disabled,
                        }}
                      />
                    )}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography 
                      variant="body2" 
                      sx={{
                        fontSize: '0.8rem',
                        fontWeight: stop.isCurrent || stop.stopId === stationId ? 600 : 400,
                        color: stop.isCurrent 
                          ? theme.palette.primary.main 
                          : stop.stopId === stationId
                          ? theme.palette.info.main
                          : theme.palette.text.primary,
                        lineHeight: 1.2,
                      }}
                    >
                      {stop.stopName}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                      {stop.isCurrent && 'Bus is currently closest to this stop'}
                      {stop.stopId === stationId && 'Your closest station'}
                      {stop.isDestination && 'Final destination'}
                      {!stop.isCurrent && !stop.isDestination && stop.stopId !== stationId && `Stop ${stop.sequence}`}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Collapse>
    </Card>
  );
};