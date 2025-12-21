import React from 'react';
import { Box, Typography } from '@mui/material';
import { DirectionsBus, LocationOn } from '@mui/icons-material';
import { useThemeUtils } from '../../../../../hooks';

interface ShortStopsListProps {
  stopsToShow: Array<{
    stopId: string;
    stopName: string;
    sequence: number;
    isCurrent: boolean;
    isDestination: boolean;
  }>;
  stationId?: string;
  vehicleId: string;
}

export const ShortStopsList: React.FC<ShortStopsListProps> = ({
  stopsToShow,
  stationId,
  vehicleId
}) => {
  const { alpha, theme } = useThemeUtils();

  if (stopsToShow.length === 0) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {stopsToShow.map((stop) => (
          <Box
            key={`${vehicleId}-short-stop-${stop.stopId}-${stop.sequence}`}
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
  );
};