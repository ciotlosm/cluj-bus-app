import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  useTheme,
  alpha,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { ExpandMore, ExpandLess, LocationOn, RadioButtonUnchecked, PersonPin } from '@mui/icons-material';

import { BusCard } from '../../../ui/Card';
import { BusRouteMapModal } from './BusRouteMapModal';
import { SimplifiedRouteDisplay } from './SimplifiedRouteDisplay';
import { useConfigStore } from '../../../../stores/configStore';
import { useLocationStore } from '../../../../stores/locationStore';
import { googleTransitService } from '../../../../services/googleTransitService';
import type { FavoriteBusInfo } from '../../../../services/favoriteBusService';

interface FavoriteBusCardProps {
  bus: FavoriteBusInfo;
  index: number;
}

export const FavoriteBusCard: React.FC<FavoriteBusCardProps> = ({ bus }) => {
  const theme = useTheme();
  const [showStops, setShowStops] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [transitEstimate, setTransitEstimate] = useState<{ durationMinutes: number; confidence: string } | null>(null);
  
  // Get user location and city from stores
  const { config } = useConfigStore();
  const { currentLocation } = useLocationStore();
  
  const displayRouteName = String(bus?.routeShortName || ''); // Just show the route number, not the full description
  const avatarRouteNumber = String(bus?.routeShortName || 'N/A');


  
  // Calculate time since last update with validation
  const getUpdateText = () => {
    if (!bus?.lastUpdate || !(bus.lastUpdate instanceof Date)) {
      return 'Unknown';
    }
    const timeSinceUpdate = Math.floor((Date.now() - bus.lastUpdate.getTime()) / 1000);
    if (timeSinceUpdate <= 5) return 'now';
    return timeSinceUpdate < 60 ? `${timeSinceUpdate}s ago` : `${Math.floor(timeSinceUpdate / 60)}m ago`;
  };

  // Format distance for better readability - show meters for short distances, km for long distances
  const formatDistance = (distanceInMeters: number) => {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m`;
    }
    return `${(distanceInMeters / 1000).toFixed(1)}km`;
  };

  // Calculate Google Transit estimate when bus is approaching
  useEffect(() => {
    const calculateTransitEstimate = async () => {
      if (!bus.stopSequence || bus.stopSequence.length === 0) return;

      const userStop = bus.stopSequence.find(stop => stop.isClosestToUser);
      const currentStop = bus.stopSequence.find(stop => stop.isCurrent);
      
      if (!userStop || !currentStop || !userStop.coordinates || !currentStop.coordinates) return;

      const userStopIndex = bus.stopSequence.findIndex(stop => stop.isClosestToUser);
      const currentStopIndex = bus.stopSequence.findIndex(stop => stop.isCurrent);

      // Only calculate if bus is approaching (not missed or at stop)
      if (currentStopIndex < userStopIndex) {
        try {
          const estimate = await googleTransitService.calculateTransitTime({
            origin: {
              latitude: currentStop.coordinates.latitude,
              longitude: currentStop.coordinates.longitude,
            },
            destination: {
              latitude: userStop.coordinates.latitude,
              longitude: userStop.coordinates.longitude,
            },
            departureTime: new Date(),
            mode: 'transit'
          });

          // Adjust for vehicle's last update time
          const adjustedEstimate = googleTransitService.calculateAdjustedETA(
            estimate,
            bus.lastUpdate
          );

          setTransitEstimate({
            durationMinutes: adjustedEstimate.durationMinutes,
            confidence: adjustedEstimate.confidence
          });
        } catch (error) {
          console.warn('Failed to calculate transit estimate:', error);
          // Fall back to simple calculation
          const fallbackMinutes = Math.max(1, (userStopIndex - currentStopIndex) * 1);
          setTransitEstimate({
            durationMinutes: fallbackMinutes,
            confidence: 'low'
          });
        }
      }
    };

    calculateTransitEstimate();
  }, [bus?.stopSequence, bus?.lastUpdate]);

  // Check if Google Maps API key is configured
  const isGoogleMapsConfigured = () => {
    return !!(config.googleMapsApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  };

  // Check if vehicle data is stale (configurable threshold)
  const isDataStale = () => {
    if (!bus?.lastUpdate || !(bus.lastUpdate instanceof Date)) {
      return true; // Consider unknown update time as stale
    }
    const timeSinceUpdate = (Date.now() - bus.lastUpdate.getTime()) / 1000 / 60; // Convert to minutes
    const threshold = config?.staleDataThreshold || 2; // Default to 2 minutes if not configured
    return timeSinceUpdate > threshold;
  };

  // Calculate arrival status based on bus direction and user location
  const getArrivalStatus = () => {
    const isStale = isDataStale();
    const updateText = getUpdateText();
    
    if (!bus?.stopSequence || bus.stopSequence.length === 0) {
      return { 
        status: 'unknown', 
        message: 'Route information unavailable',
        color: theme.palette.text.secondary,
        isOffline: false,
        isStale
      };
    }

    const userStop = bus.stopSequence.find(stop => stop.isClosestToUser);
    const currentStop = bus.stopSequence.find(stop => stop.isCurrent);
    
    if (!userStop || !currentStop) {
      return { 
        status: 'unknown', 
        message: 'Location information unavailable',
        color: theme.palette.text.secondary,
        isOffline: false,
        isStale
      };
    }

    // Compare stop sequences to determine if bus is coming or going
    const userStopIndex = bus.stopSequence.findIndex(stop => stop.isClosestToUser);
    const currentStopIndex = bus.stopSequence.findIndex(stop => stop.isCurrent);

    if (currentStopIndex > userStopIndex) {
      // Bus has passed the user's stop
      return { 
        status: 'missed', 
        message: `You missed this one (${updateText})`,
        color: theme.palette.error.main,
        isOffline: false,
        isStale
      };
    } else if (currentStopIndex < userStopIndex) {
      // Bus is approaching the user's stop - use Google Transit estimate or fallback
      const hasGoogleMaps = isGoogleMapsConfigured();
      const estimatedMinutes = transitEstimate?.durationMinutes || Math.max(1, (userStopIndex - currentStopIndex) * 1); // 1 min per stop fallback
      const confidence = transitEstimate?.confidence || 'low';
      
      // Add confidence indicator to message
      const confidenceIndicator = confidence === 'high' ? '' : confidence === 'medium' ? '~' : '≈';
      
      return { 
        status: 'arriving', 
        message: `Arriving in ${confidenceIndicator}${estimatedMinutes} min (${updateText})`,
        color: theme.palette.success.main,
        isOffline: !hasGoogleMaps || !transitEstimate,
        isStale
      };
    } else {
      // Bus is at the user's stop
      return { 
        status: 'at-stop', 
        message: `Bus is at your stop! (${updateText})`,
        color: theme.palette.warning.main,
        isOffline: false,
        isStale
      };
    }
  };
  
  // Validate bus data
  if (!bus) {
    return null;
  }

  const arrivalStatus = getArrivalStatus();

  return (
    <Box sx={{ position: 'relative' }}>
      <BusCard
        routeId={avatarRouteNumber}
        routeName={displayRouteName}
        arrivalTime=""
        isRealTime={true}
        delay={0}
        isFavorite={true}
        onToggleFavorite={() => {
          console.log('Toggle favorite for route:', bus.routeShortName);
        }}
        onMapClick={() => setShowMap(true)}
        arrivalStatus={arrivalStatus}
        customContent={
          <Box>
            {/* Route display - either simplified or expanded */}
            {!showStops ? (
              <Box>
                <SimplifiedRouteDisplay 
                  stopSequence={bus.stopSequence || []}
                  destination={bus.destination}
                />
                
                {/* Route Stops button right under final destination */}
                {bus.stopSequence && bus.stopSequence.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <IconButton
                        size="small"
                        onClick={() => setShowStops(true)}
                        sx={{ p: 0.5 }}
                      >
                        <ExpandMore fontSize="small" />
                      </IconButton>
                      <Typography variant="caption" color="text.secondary">
                        Stops ({bus.stopSequence.length})
                      </Typography>
                    </Stack>
                  </Box>
                )}
              </Box>
            ) : (
              <Box>
                {/* Collapse button to return to simplified view */}
                <Box sx={{ mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconButton
                      size="small"
                      onClick={() => setShowStops(false)}
                      sx={{ p: 0.5 }}
                    >
                      <ExpandLess fontSize="small" />
                    </IconButton>
                    <Typography variant="subtitle2" color="text.primary">
                      Stops ({bus.stopSequence?.length || 0})
                    </Typography>
                  </Stack>
                </Box>

                {/* Expanded route stops list */}
                <List dense sx={{ py: 0 }}>
                  {bus.stopSequence?.map((stop) => {
                    const isCurrent = stop.isCurrent;
                    const isClosestToUser = stop.isClosestToUser;
                    
                    return (
                      <ListItem
                        key={`expanded-${bus.routeShortName}-${stop.id}-${stop.sequence}`}
                        sx={{
                          py: 0.5,
                          px: 1,
                          borderRadius: 1,
                          bgcolor: isCurrent
                            ? alpha(theme.palette.primary.main, 0.1)
                            : isClosestToUser
                            ? alpha(theme.palette.info.main, 0.1)
                            : 'transparent',
                          border: isCurrent
                            ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                            : isClosestToUser
                            ? `1px solid ${alpha(theme.palette.info.main, 0.3)}`
                            : '1px solid transparent',
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          {isCurrent ? (
                            <LocationOn 
                              fontSize="small" 
                              color="primary"
                            />
                          ) : isClosestToUser ? (
                            <PersonPin 
                              fontSize="small" 
                              color="info"
                            />
                          ) : (
                            <RadioButtonUnchecked 
                              fontSize="small" 
                              sx={{ color: theme.palette.text.disabled }}
                            />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography 
                              variant="caption" 
                              color={isCurrent ? 'primary' : isClosestToUser ? 'info' : 'text.secondary'}
                              sx={{ fontWeight: (isCurrent || isClosestToUser) ? 600 : 400 }}
                            >
                              {stop.name}
                            </Typography>
                          }
                          secondary={
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              {stop.arrivalTime && (
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                  {stop.arrivalTime}
                                </Typography>
                              )}
                              {isClosestToUser && stop.distanceToUser && (
                                <Typography variant="caption" color="info.main" sx={{ fontSize: '0.65rem' }}>
                                  You are {formatDistance(stop.distanceToUser)} away from this station.
                                </Typography>
                              )}
                              {isCurrent && stop.distanceFromBus && (
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                  Bus is {formatDistance(stop.distanceFromBus)} from station.
                                </Typography>
                              )}
                            </Stack>
                          }
                          slotProps={{
                            secondary: {
                              component: 'div'
                            }
                          }}
                        />
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {isCurrent && (
                            <Chip
                              label={bus.currentStation?.isAtStation ? "At Station" : "Current"}
                              size="small"
                              color="primary"
                              variant="outlined"
                              clickable
                              onClick={() => setShowMap(true)}
                              sx={{
                                height: 16,
                                fontSize: '0.6rem',
                                '& .MuiChip-label': { px: 0.5 },
                                cursor: 'pointer',
                                '&:hover': {
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                }
                              }}
                            />
                          )}
                          {isClosestToUser && (
                            <Chip
                              label="Closest to You"
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{
                                height: 16,
                                fontSize: '0.6rem',
                                '& .MuiChip-label': { px: 0.5 }
                              }}
                            />
                          )}
                        </Stack>
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            )}
          </Box>
        }
      >
      </BusCard>

      {/* Map Modal */}
      <BusRouteMapModal
        open={showMap}
        onClose={() => setShowMap(false)}
        bus={bus}
        userLocation={currentLocation}
        cityName={config.city}
      />
    </Box>
  );
};