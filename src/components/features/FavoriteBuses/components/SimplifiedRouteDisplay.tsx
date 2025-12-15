import React from 'react';
import { Box, Typography, Stack, useTheme, alpha, Chip } from '@mui/material';
import { LocationOn, DirectionsBus, PersonPin } from '@mui/icons-material';
import type { BusStopInfo } from '../../../../services/favoriteBusService';

interface SimplifiedRouteDisplayProps {
  stopSequence: BusStopInfo[];
  destination?: string;
  onMapClick?: () => void;
}

export const SimplifiedRouteDisplay: React.FC<SimplifiedRouteDisplayProps> = ({
  stopSequence,
  destination,
  onMapClick,
}) => {
  const theme = useTheme();

  // Get the three key stops in order
  const getKeyStops = () => {
    if (!stopSequence || stopSequence.length === 0) {
      return [];
    }

    const userStop = stopSequence.find(stop => stop.isClosestToUser);
    const currentStop = stopSequence.find(stop => stop.isCurrent);
    
    if (!userStop || !currentStop) {
      return [];
    }

    const userStopIndex = stopSequence.findIndex(stop => stop.isClosestToUser);
    const currentStopIndex = stopSequence.findIndex(stop => stop.isCurrent);

    // Check if bus is at user's stop
    const isBusAtUserStop = currentStop.id === userStop.id;

    // Create ordered list of key stops
    const keyStops = [];

    if (isBusAtUserStop) {
      // Bus is at user's stop - combine into single item
      keyStops.push({
        ...userStop,
        type: 'bus-at-user',
        order: userStopIndex,
      });
    } else {
      // Add current bus stop
      keyStops.push({
        ...currentStop,
        type: 'bus',
        order: currentStopIndex,
      });

      // Add user stop
      keyStops.push({
        ...userStop,
        type: 'user',
        order: userStopIndex,
      });
    }

    // Check if user stop is the final destination
    const lastStop = stopSequence[stopSequence.length - 1];
    const isUserStopFinalDestination = lastStop && lastStop.id === userStop.id;
    
    // Add destination only if it's different from user stop and current stop
    if (lastStop && lastStop.id !== currentStop.id && lastStop.id !== userStop.id) {
      keyStops.push({
        ...lastStop,
        type: 'destination',
        order: stopSequence.length - 1,
      });
    } else if (destination && !isUserStopFinalDestination) {
      // If no distinct last stop and user stop is not final destination, create a virtual destination
      keyStops.push({
        id: 'destination',
        name: destination,
        sequence: 999,
        coordinates: { latitude: 0, longitude: 0 },
        type: 'destination',
        order: 999,
      });
    }
    
    // Mark user stop as final destination if it is
    if (isUserStopFinalDestination) {
      const userStopInList = keyStops.find(stop => stop.type === 'user' || stop.type === 'bus-at-user');
      if (userStopInList) {
        userStopInList.isFinalDestination = true;
      }
    }

    // Sort by actual route order
    return keyStops.sort((a, b) => a.order - b.order);
  };

  const keyStops = getKeyStops();

  if (keyStops.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Route information unavailable
      </Typography>
    );
  }

  return (
    <Box sx={{ py: 1, mb: 1 }}>
      {/* Bus Stop Sequence */}
      <Stack direction="column" spacing={1}>
        {keyStops.map((stop, index) => {
          const isCurrent = stop.type === 'bus';
          const isClosestToUser = stop.type === 'user';
          const isBusAtUser = stop.type === 'bus-at-user';
          
          return (
            <Box 
              key={`simplified-${stop.id}-${stop.type}-${index}`}
              sx={{
                py: 1,
                px: 1.5,
                borderRadius: 1,
                bgcolor: isCurrent
                  ? alpha(theme.palette.primary.main, 0.1)
                  : (isClosestToUser || isBusAtUser)
                  ? alpha(theme.palette.info.main, 0.1)
                  : 'transparent',
                border: isCurrent
                  ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                  : (isClosestToUser || isBusAtUser)
                  ? `1px solid ${alpha(theme.palette.info.main, 0.3)}`
                  : '1px solid transparent',
              }}
            >
              {/* Stop Item */}
              <Stack direction="row" spacing={1.5} alignItems="center">
                {/* Icon with connecting line */}
                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: 36 }}>
                  {/* Vertical connecting line (except for last item) */}
                  {index < keyStops.length - 1 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '28px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '2px',
                        height: '28px',
                        bgcolor: theme.palette.divider,
                        zIndex: 0,
                      }}
                    />
                  )}
                  
                  {/* Stop Icon */}
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
                      zIndex: 1,
                    }}
                  >
                    {stop.type === 'bus' ? (
                      <DirectionsBus 
                        sx={{ 
                          fontSize: 14, 
                          color: theme.palette.primary.main
                        }} 
                      />
                    ) : stop.type === 'user' ? (
                      <PersonPin 
                        sx={{ 
                          fontSize: 14, 
                          color: theme.palette.info.main
                        }} 
                      />
                    ) : stop.type === 'bus-at-user' ? (
                      <PersonPin 
                        sx={{ 
                          fontSize: 14, 
                          color: theme.palette.info.main
                        }} 
                      />
                    ) : (
                      <LocationOn 
                        sx={{ 
                          fontSize: 14, 
                          color: theme.palette.text.secondary
                        }} 
                      />
                    )}
                  </Box>
                </Box>
                
                {/* Stop Information */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.8rem',
                      fontWeight: stop.type === 'bus' ? 600 : (stop.type === 'user' || stop.type === 'bus-at-user') ? 500 : 400,
                      color: stop.type === 'bus' 
                        ? theme.palette.primary.main 
                        : (stop.type === 'user' || stop.type === 'bus-at-user')
                        ? theme.palette.info.main 
                        : theme.palette.text.primary,
                      lineHeight: 1.2,
                    }}
                  >
                    {stop.name}
                  </Typography>
                  
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.65rem',
                      color: theme.palette.text.secondary,
                      display: 'block',
                      mt: 0.25,
                    }}
                  >
                    {stop.type === 'bus' 
                      ? 'Current bus location' 
                      : stop.type === 'user' 
                      ? 'Your stop'
                      : stop.type === 'bus-at-user'
                      ? 'Bus at your stop'
                      : 'Final destination'}
                  </Typography>
                </Box>
                
                {/* Chips for user stop */}
                <Stack direction="row" spacing={0.5}>
                  {/* Bus at stop chip */}
                  {stop.type === 'bus-at-user' && (
                    <Chip
                      icon={<DirectionsBus sx={{ fontSize: '12px !important' }} />}
                      label="Bus Here"
                      size="small"
                      variant="outlined"
                      clickable
                      onClick={onMapClick}
                      sx={{
                        height: 20,
                        fontSize: '0.6rem',
                        '& .MuiChip-label': { px: 0.5 },
                        '& .MuiChip-icon': { 
                          fontSize: 12,
                          color: theme.palette.primary.main 
                        },
                        borderColor: theme.palette.primary.main,
                        color: theme.palette.primary.main,
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                        }
                      }}
                    />
                  )}
                  
                  {/* Final destination chip */}
                  {(stop.type === 'user' || stop.type === 'bus-at-user') && stop.isFinalDestination && (
                    <Chip
                      icon={<LocationOn sx={{ fontSize: '12px !important' }} />}
                      label="Final"
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 20,
                        fontSize: '0.6rem',
                        '& .MuiChip-label': { px: 0.5 },
                        '& .MuiChip-icon': { 
                          fontSize: 12,
                          color: theme.palette.text.secondary 
                        },
                        borderColor: theme.palette.text.disabled,
                        color: theme.palette.text.secondary,
                      }}
                    />
                  )}
                </Stack>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};