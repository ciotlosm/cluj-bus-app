import React from 'react';
import { Box, Typography, Stack, useTheme } from '@mui/material';
import { LocationOn, DirectionsBus, PersonPin } from '@mui/icons-material';
import type { BusStopInfo } from '../../../../services/favoriteBusService';

interface SimplifiedRouteDisplayProps {
  stopSequence: BusStopInfo[];
  destination?: string;
}

export const SimplifiedRouteDisplay: React.FC<SimplifiedRouteDisplayProps> = ({
  stopSequence,
  destination,
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

    // Create ordered list of key stops
    const keyStops = [];

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

    // Add destination (last stop in sequence)
    const lastStop = stopSequence[stopSequence.length - 1];
    if (lastStop && lastStop.id !== currentStop.id && lastStop.id !== userStop.id) {
      keyStops.push({
        ...lastStop,
        type: 'destination',
        order: stopSequence.length - 1,
      });
    } else if (destination) {
      // If no distinct last stop, create a virtual destination
      keyStops.push({
        id: 'destination',
        name: destination,
        sequence: 999,
        coordinates: { latitude: 0, longitude: 0 },
        type: 'destination',
        order: 999,
      });
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
    <Box sx={{ py: 0.5 }}>
      {/* Bus Stop Sequence */}
      <Stack direction="column" spacing={1}>
        {keyStops.map((stop, index) => (
          <Box key={stop.id}>
            {/* Stop Item */}
            <Stack direction="row" spacing={1} alignItems="center">
              {/* Icon with connecting line */}
              <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                {/* Vertical connecting line (except for last item) */}
                {index < keyStops.length - 1 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '2px',
                      height: '20px',
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
                    bgcolor: stop.type === 'bus' 
                      ? theme.palette.primary.main 
                      : stop.type === 'user' 
                      ? theme.palette.info.main 
                      : theme.palette.success.main,
                    zIndex: 1,
                  }}
                >
                  {stop.type === 'bus' ? (
                    <DirectionsBus 
                      sx={{ 
                        fontSize: 14, 
                        color: 'white'
                      }} 
                    />
                  ) : stop.type === 'user' ? (
                    <PersonPin 
                      sx={{ 
                        fontSize: 14, 
                        color: 'white'
                      }} 
                    />
                  ) : (
                    <LocationOn 
                      sx={{ 
                        fontSize: 14, 
                        color: 'white'
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
                    fontWeight: stop.type === 'bus' ? 600 : stop.type === 'user' ? 500 : 400,
                    color: stop.type === 'bus' 
                      ? theme.palette.primary.main 
                      : stop.type === 'user' 
                      ? theme.palette.info.main 
                      : theme.palette.success.main,
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
                  {stop.type === 'bus' ? 'Current bus location' : stop.type === 'user' ? 'Your stop' : 'Final destination'}
                </Typography>
              </Box>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};